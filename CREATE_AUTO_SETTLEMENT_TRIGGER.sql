-- Create automatic settlement when reservation is created (seller approves)
-- This replaces the manual admin settlement with instant automatic transfer

CREATE OR REPLACE FUNCTION trg_auto_settle_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_amount NUMERIC(15,2);
  v_buyer_inv RECORD;
  v_seller_inv RECORD;
BEGIN
  -- Only auto-settle new active reservations
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  v_amount := NEW.shares * NEW.price_per_share;

  -- 1. Transfer shares from seller to buyer
  -- Buyer investments (upsert)
  SELECT * INTO v_buyer_inv
  FROM investments
  WHERE user_id = NEW.buyer_id AND property_id = NEW.property_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO investments (user_id, property_id, shares_owned, price_per_share, total_investment, investment_status)
    VALUES (NEW.buyer_id, NEW.property_id, NEW.shares, NEW.price_per_share, v_amount, 'confirmed');
  ELSE
    UPDATE investments
    SET shares_owned = v_buyer_inv.shares_owned + NEW.shares,
        total_investment = v_buyer_inv.total_investment + v_amount,
        price_per_share = (v_buyer_inv.total_investment + v_amount) / NULLIF(v_buyer_inv.shares_owned + NEW.shares, 0),
        updated_at = now()
    WHERE id = v_buyer_inv.id;
  END IF;

  -- Seller investments (decrement or delete)
  SELECT * INTO v_seller_inv
  FROM investments
  WHERE user_id = NEW.seller_id AND property_id = NEW.property_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_seller_inv.shares_owned > NEW.shares THEN
      UPDATE investments
      SET shares_owned = v_seller_inv.shares_owned - NEW.shares,
          total_investment = GREATEST(v_seller_inv.total_investment - (NEW.shares * v_seller_inv.price_per_share), 0),
          updated_at = now()
      WHERE id = v_seller_inv.id;
    ELSE
      -- Selling all shares, remove investment record
      DELETE FROM investments WHERE id = v_seller_inv.id;
    END IF;
  END IF;

  -- 2. Transfer funds from buyer (pending) to seller (available)
  -- Remove from buyer's pending balance
  UPDATE escrow_balances
  SET pending_balance = GREATEST(pending_balance - v_amount, 0),
      updated_at = now()
  WHERE user_id = NEW.buyer_id;

  -- Add to seller's available balance
  UPDATE escrow_balances
  SET available_balance = available_balance + v_amount,
      updated_at = now()
  WHERE user_id = NEW.seller_id;

  -- 3. Mark reservation as completed
  NEW.status := 'completed';

  -- 4. Log the settlement event
  INSERT INTO share_order_events (order_id, event_type, actor_id, metadata)
  VALUES (
    NEW.order_id,
    'auto_settled',
    NEW.seller_id,
    jsonb_build_object(
      'reservation_id', NEW.id,
      'shares', NEW.shares,
      'amount', v_amount,
      'settlement_type', 'automatic'
    )
  );

  -- 5. Best-effort recalculation (if function exists)
  BEGIN
    PERFORM recalc_user_property_position(NEW.buyer_id, NEW.property_id);
  EXCEPTION WHEN undefined_function THEN
    -- ignore if function doesn't exist
  END;

  BEGIN
    PERFORM recalc_user_property_position(NEW.seller_id, NEW.property_id);
  EXCEPTION WHEN undefined_function THEN
    -- ignore
  END;

  -- 6. Release shares from share_parks (unpark sold shares)
  UPDATE share_parks
  SET shares_released = shares_released + NEW.shares,
      status = CASE
        WHEN shares_released + NEW.shares >= shares_parked THEN 'released'
        ELSE status
      END,
      released_at = CASE
        WHEN shares_released + NEW.shares >= shares_parked THEN now()
        ELSE released_at
      END,
      updated_at = now()
  WHERE order_id = NEW.order_id
    AND seller_id = NEW.seller_id
    AND property_id = NEW.property_id
    AND status = 'active';

  RETURN NEW;
END;
$$;

-- Drop old alert trigger (we'll create a better one)
DROP TRIGGER IF EXISTS trg_alert_on_reservation ON share_reservations;

-- Drop existing auto-settlement trigger if it exists
DROP TRIGGER IF EXISTS trg_auto_settle_reservation ON share_reservations;

-- Create the auto-settlement trigger
CREATE TRIGGER trg_auto_settle_reservation
  BEFORE INSERT
  ON share_reservations
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_settle_reservation();

-- Create success alerts after settlement
CREATE OR REPLACE FUNCTION trg_alert_after_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    -- Alert buyer: shares transferred
    INSERT INTO user_alerts (user_id, alert_type, title, message, property_id, created_at)
    VALUES (
      NEW.buyer_id,
      'trade_completed',
      '✅ Trade Completed!',
      'You successfully purchased ' || NEW.shares || ' shares. They have been added to your portfolio.',
      NEW.property_id,
      now()
    );

    -- Alert seller: payment received
    INSERT INTO user_alerts (user_id, alert_type, title, message, property_id, created_at)
    VALUES (
      NEW.seller_id,
      'trade_completed',
      '💰 Payment Received!',
      'Your sale of ' || NEW.shares || ' shares is complete. Funds have been added to your wallet.',
      NEW.property_id,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create alert trigger after settlement
CREATE TRIGGER trg_alert_after_settlement
  AFTER INSERT OR UPDATE
  ON share_reservations
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION trg_alert_after_settlement();

-- Verify triggers are created
SELECT
  t.tgname AS trigger_name,
  t.tgenabled AS enabled,
  CASE t.tgtype::integer & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS timing,
  CASE
    WHEN t.tgtype::integer & 4 = 4 THEN 'INSERT'
    WHEN t.tgtype::integer & 8 = 8 THEN 'DELETE'
    WHEN t.tgtype::integer & 16 = 16 THEN 'UPDATE'
    ELSE 'TRUNCATE'
  END AS event,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'share_reservations'
  AND NOT t.tgisinternal
ORDER BY t.tgname;
