-- Fix ambiguous column reference in recalc_user_property_position_fifo
-- The issue is in the loop where r.total_investment is used

CREATE OR REPLACE FUNCTION public.recalc_user_property_position_fifo(p_user_id uuid, p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_shares numeric := 0;
  v_cost numeric := 0;
  v_avg numeric := 0;
  v_fifo_lots jsonb := '[]'::jsonb;
  r record;
  v_inv_shares numeric;
  v_inv_price numeric;
  v_inv_total numeric;
  v_inv_date timestamptz;
  v_inv_id uuid;
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
    -- Extract values to avoid ambiguity
    v_inv_id := r.id;
    v_inv_shares := r.shares_owned;
    v_inv_price := r.price_per_share;
    v_inv_total := r.total_investment;
    v_inv_date := r.investment_date;

    -- Accumulate totals using extracted variables
    v_shares := v_shares + v_inv_shares;
    v_cost := v_cost + v_inv_total;

    -- Add to FIFO lots array using extracted variables
    v_fifo_lots := v_fifo_lots || jsonb_build_object(
      'investment_id', v_inv_id,
      'shares', v_inv_shares,
      'price', v_inv_price,
      'date', v_inv_date,
      'cost', v_inv_total
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
END $function$;
