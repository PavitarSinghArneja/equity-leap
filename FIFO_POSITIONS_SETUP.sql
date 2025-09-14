-- FIFO-based position tracking for real estate fractional trading platform
-- This implements industry-standard FIFO (First In, First Out) methodology
-- Similar to how stock brokers like Zerodha, Charles Schwab, E*TRADE calculate P&L

-- Drop existing views if they exist
DROP VIEW IF EXISTS user_property_positions_with_value CASCADE;
DROP FUNCTION IF EXISTS recalc_user_property_position CASCADE;
DROP FUNCTION IF EXISTS recalc_all_positions_for_user CASCADE;

-- 1) Enhanced table to store per-user, per-property FIFO position
CREATE TABLE IF NOT EXISTS user_property_positions (
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  shares numeric NOT NULL DEFAULT 0,
  avg_price numeric NOT NULL DEFAULT 0,
  cost_basis numeric NOT NULL DEFAULT 0,
  -- FIFO specific: track remaining lots after sales
  fifo_lots jsonb DEFAULT '[]'::jsonb, -- Array of {shares, price, date, investment_id}
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);

-- 2) RLS policies
ALTER TABLE user_property_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own positions" ON user_property_positions;
CREATE POLICY "Users can read own positions" ON user_property_positions
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- 3) FIFO recalculation function
CREATE OR REPLACE FUNCTION recalc_user_property_position_fifo(p_user_id uuid, p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shares numeric := 0;
  v_cost numeric := 0;
  v_avg numeric := 0;
  v_fifo_lots jsonb := '[]'::jsonb;
  r record;
BEGIN
  -- Build FIFO lots from confirmed investments (oldest first)
  FOR r IN (
    SELECT
      id,
      shares_owned,
      price_per_share,
      total_investment,
      investment_date
    FROM investments
    WHERE user_id = p_user_id
      AND property_id = p_property_id
      AND investment_status = 'confirmed'
    ORDER BY investment_date ASC, id ASC  -- FIFO: oldest first
  ) LOOP
    v_shares := v_shares + r.shares_owned;
    v_cost := v_cost + r.total_investment;

    -- Add to FIFO lots array
    v_fifo_lots := v_fifo_lots || jsonb_build_object(
      'investment_id', r.id,
      'shares', r.shares_owned,
      'price', r.price_per_share,
      'date', r.investment_date,
      'cost', r.total_investment
    );
  END LOOP;

  -- Calculate weighted average price
  IF v_shares > 0 THEN
    v_avg := v_cost / v_shares;
  ELSE
    v_avg := 0;
    v_cost := 0;
  END IF;

  -- Upsert the position with FIFO lots
  INSERT INTO user_property_positions (
    user_id,
    property_id,
    shares,
    avg_price,
    cost_basis,
    fifo_lots,
    updated_at
  )
  VALUES (
    p_user_id,
    p_property_id,
    v_shares,
    v_avg,
    v_cost,
    v_fifo_lots,
    now()
  )
  ON CONFLICT (user_id, property_id)
  DO UPDATE SET
    shares = EXCLUDED.shares,
    avg_price = EXCLUDED.avg_price,
    cost_basis = EXCLUDED.cost_basis,
    fifo_lots = EXCLUDED.fifo_lots,
    updated_at = now();
END $$;

-- 4) Batch recalculation for all user positions
CREATE OR REPLACE FUNCTION recalc_all_positions_for_user_fifo(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT DISTINCT property_id
    FROM investments
    WHERE user_id = p_user_id
      AND property_id IS NOT NULL
  ) LOOP
    PERFORM recalc_user_property_position_fifo(p_user_id, r.property_id);
  END LOOP;
END $$;

-- 5) Enhanced view with FIFO-based P&L calculation
CREATE OR REPLACE VIEW user_property_positions_with_value AS
SELECT
  upp.user_id,
  upp.property_id,
  upp.shares,
  upp.avg_price,
  upp.cost_basis,
  upp.fifo_lots,
  upp.updated_at,
  p.share_price as current_share_price,
  (upp.shares * p.share_price) as current_value,
  -- FIFO P&L: current value minus cost basis
  ((upp.shares * p.share_price) - upp.cost_basis) as pnl,
  -- P&L percentage
  CASE
    WHEN upp.cost_basis > 0 THEN
      (((upp.shares * p.share_price) - upp.cost_basis) / upp.cost_basis * 100)
    ELSE 0
  END as pnl_percentage
FROM user_property_positions upp
JOIN properties p ON p.id = upp.property_id;

-- 6) Trigger function for automatic recalculation
CREATE OR REPLACE FUNCTION fn_investments_recalc_position_fifo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_user uuid;
  v_property uuid;
BEGIN
  v_user := COALESCE(NEW.user_id, OLD.user_id);
  v_property := COALESCE(NEW.property_id, OLD.property_id);

  IF v_user IS NOT NULL AND v_property IS NOT NULL THEN
    PERFORM recalc_user_property_position_fifo(v_user, v_property);
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;

-- 7) Attach trigger to investments table
DROP TRIGGER IF EXISTS trg_recalc_position_fifo ON investments;
CREATE TRIGGER trg_recalc_position_fifo
AFTER INSERT OR UPDATE OR DELETE ON investments
FOR EACH ROW EXECUTE FUNCTION fn_investments_recalc_position_fifo();

-- 8) Function to handle FIFO sales (when share selling is implemented)
CREATE OR REPLACE FUNCTION process_share_sale_fifo(
  p_user_id uuid,
  p_property_id uuid,
  p_shares_to_sell numeric,
  p_sale_price numeric
)
RETURNS TABLE (
  realized_pnl numeric,
  remaining_shares numeric,
  sold_lots jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_position record;
  v_remaining_to_sell numeric;
  v_realized_pnl numeric := 0;
  v_sold_lots jsonb := '[]'::jsonb;
  v_new_lots jsonb := '[]'::jsonb;
  v_lot jsonb;
BEGIN
  -- Get current position
  SELECT * INTO v_position
  FROM user_property_positions
  WHERE user_id = p_user_id AND property_id = p_property_id;

  IF NOT FOUND OR v_position.shares < p_shares_to_sell THEN
    RAISE EXCEPTION 'Insufficient shares to sell';
  END IF;

  v_remaining_to_sell := p_shares_to_sell;

  -- Process FIFO lots
  FOR v_lot IN SELECT * FROM jsonb_array_elements(v_position.fifo_lots)
  LOOP
    IF v_remaining_to_sell <= 0 THEN
      -- Keep remaining lots
      v_new_lots := v_new_lots || v_lot;
    ELSE
      DECLARE
        v_lot_shares numeric := (v_lot->>'shares')::numeric;
        v_lot_price numeric := (v_lot->>'price')::numeric;
        v_shares_from_lot numeric;
      BEGIN
        IF v_lot_shares <= v_remaining_to_sell THEN
          -- Sell entire lot
          v_shares_from_lot := v_lot_shares;
          v_remaining_to_sell := v_remaining_to_sell - v_lot_shares;
        ELSE
          -- Partial lot sale
          v_shares_from_lot := v_remaining_to_sell;
          v_remaining_to_sell := 0;

          -- Keep remainder of lot
          v_new_lots := v_new_lots || jsonb_build_object(
            'investment_id', v_lot->>'investment_id',
            'shares', v_lot_shares - v_shares_from_lot,
            'price', v_lot_price,
            'date', v_lot->>'date',
            'cost', (v_lot_shares - v_shares_from_lot) * v_lot_price
          );
        END IF;

        -- Calculate realized P&L for this lot
        v_realized_pnl := v_realized_pnl + (v_shares_from_lot * (p_sale_price - v_lot_price));

        -- Track sold lots
        v_sold_lots := v_sold_lots || jsonb_build_object(
          'shares', v_shares_from_lot,
          'purchase_price', v_lot_price,
          'sale_price', p_sale_price,
          'pnl', v_shares_from_lot * (p_sale_price - v_lot_price)
        );
      END;
    END IF;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT
    v_realized_pnl,
    v_position.shares - p_shares_to_sell,
    v_sold_lots;
END $$;

-- 9) Initialize positions for all existing users
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT DISTINCT user_id
    FROM investments
    WHERE investment_status = 'confirmed'
  ) LOOP
    PERFORM recalc_all_positions_for_user_fifo(r.user_id);
  END LOOP;
END $$;

-- Grant necessary permissions
GRANT SELECT ON user_property_positions TO authenticated;
GRANT SELECT ON user_property_positions_with_value TO authenticated;

-- Sample query to verify FIFO positions
-- SELECT * FROM user_property_positions_with_value WHERE user_id = auth.uid();