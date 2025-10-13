-- Drop and recreate instant_buy_shares to ensure clean state
-- This ensures no old cached versions exist

-- First, drop the function completely
DROP FUNCTION IF EXISTS instant_buy_shares(UUID, INTEGER);

-- Now create it fresh with all fixes
CREATE FUNCTION instant_buy_shares(
  p_order_id UUID,
  p_shares INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_amount NUMERIC(15,2);
  v_buyer UUID := auth.uid();
  v_buyer_inv_id UUID;
  v_buyer_inv_shares INTEGER;
  v_buyer_inv_total NUMERIC(15,2);
  v_buyer_inv_price NUMERIC(15,2);
  v_seller_inv_id UUID;
  v_seller_inv_shares INTEGER;
  v_seller_inv_total NUMERIC(15,2);
  v_seller_inv_price NUMERIC(15,2);
  v_buyer_balance NUMERIC(15,2);
  v_new_buyer_shares INTEGER;
  v_new_buyer_total NUMERIC(15,2);
  v_new_seller_shares INTEGER;
  v_new_seller_total NUMERIC(15,2);
  v_result JSONB;
BEGIN
  IF p_shares IS NULL OR p_shares <= 0 THEN
    RAISE EXCEPTION 'Invalid shares requested';
  END IF;

  -- Lock and validate the sell order
  SELECT ssr.*, p.shares_sellable, p.property_status
  INTO v_order
  FROM share_sell_requests ssr
  JOIN properties p ON p.id = ssr.property_id
  WHERE ssr.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status <> 'active' THEN
    RAISE EXCEPTION 'Order not active';
  END IF;

  IF v_order.seller_id = v_buyer THEN
    RAISE EXCEPTION 'Cannot buy from your own order';
  END IF;

  IF NOT v_order.shares_sellable OR v_order.property_status <> 'funded' THEN
    RAISE EXCEPTION 'Trading not enabled for this property';
  END IF;

  IF v_order.remaining_shares < p_shares THEN
    RAISE EXCEPTION 'Not enough shares remaining';
  END IF;

  v_amount := p_shares * v_order.price_per_share;

  -- Verify buyer has sufficient balance
  SELECT available_balance INTO v_buyer_balance
  FROM escrow_balances
  WHERE user_id = v_buyer
  FOR UPDATE;

  IF COALESCE(v_buyer_balance, 0) < v_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- 1. Transfer funds: buyer -> seller
  UPDATE escrow_balances
  SET available_balance = available_balance - v_amount,
      updated_at = now()
  WHERE user_id = v_buyer;

  UPDATE escrow_balances
  SET available_balance = available_balance + v_amount,
      updated_at = now()
  WHERE user_id = v_order.seller_id;

  -- 2. Update remaining shares in the order
  UPDATE share_sell_requests
  SET remaining_shares = remaining_shares - p_shares,
      updated_at = now()
  WHERE id = p_order_id;

  -- 3. Transfer shares: seller -> buyer
  -- Get buyer's current investment (if exists)
  SELECT id, shares_owned, total_investment, price_per_share
  INTO v_buyer_inv_id, v_buyer_inv_shares, v_buyer_inv_total, v_buyer_inv_price
  FROM investments
  WHERE user_id = v_buyer AND property_id = v_order.property_id
  FOR UPDATE;

  IF v_buyer_inv_id IS NULL THEN
    -- Create new investment record for buyer
    INSERT INTO investments (user_id, property_id, shares_owned, price_per_share, total_investment, investment_status)
    VALUES (v_buyer, v_order.property_id, p_shares, v_order.price_per_share, v_amount, 'confirmed');
  ELSE
    -- Calculate new values
    v_new_buyer_shares := v_buyer_inv_shares + p_shares;
    v_new_buyer_total := v_buyer_inv_total + v_amount;

    -- Update existing investment with calculated values
    UPDATE investments
    SET shares_owned = v_new_buyer_shares,
        total_investment = v_new_buyer_total,
        price_per_share = v_new_buyer_total / NULLIF(v_new_buyer_shares, 0),
        updated_at = now()
    WHERE id = v_buyer_inv_id;
  END IF;

  -- Get seller's current investment
  SELECT id, shares_owned, total_investment, price_per_share
  INTO v_seller_inv_id, v_seller_inv_shares, v_seller_inv_total, v_seller_inv_price
  FROM investments
  WHERE user_id = v_order.seller_id AND property_id = v_order.property_id
  FOR UPDATE;

  IF v_seller_inv_id IS NOT NULL THEN
    IF v_seller_inv_shares > p_shares THEN
      -- Calculate new values for seller
      v_new_seller_shares := v_seller_inv_shares - p_shares;
      v_new_seller_total := GREATEST(v_seller_inv_total - (p_shares * v_seller_inv_price), 0);

      -- Reduce seller's shares with calculated values
      UPDATE investments
      SET shares_owned = v_new_seller_shares,
          total_investment = v_new_seller_total,
          updated_at = now()
      WHERE id = v_seller_inv_id;
    ELSE
      -- Seller sold all shares - delete the record
      DELETE FROM investments WHERE id = v_seller_inv_id;
    END IF;
  END IF;

  -- 4. Release parked shares
  UPDATE share_parks
  SET shares_released = shares_released + p_shares,
      status = CASE
        WHEN shares_released + p_shares >= shares_parked THEN 'released'
        ELSE status
      END,
      released_at = CASE
        WHEN shares_released + p_shares >= shares_parked THEN now()
        ELSE released_at
      END
  WHERE order_id = p_order_id
    AND seller_id = v_order.seller_id
    AND property_id = v_order.property_id
    AND status = 'active';

  -- 5. Log the transaction
  INSERT INTO share_order_events (order_id, event_type, actor_id, metadata)
  VALUES (
    p_order_id,
    'instant_purchase',
    v_buyer,
    jsonb_build_object(
      'shares', p_shares,
      'amount', v_amount,
      'buyer_id', v_buyer,
      'seller_id', v_order.seller_id
    )
  );

  -- 6. Send notifications
  INSERT INTO user_alerts (user_id, alert_type, title, message, property_id, created_at)
  VALUES (
    v_order.seller_id,
    'trade_completed',
    '💰 Shares Sold!',
    'Your ' || p_shares || ' shares were sold for ₹' || v_amount || '. Funds added to your wallet.',
    v_order.property_id,
    now()
  );

  INSERT INTO user_alerts (user_id, alert_type, title, message, property_id, created_at)
  VALUES (
    v_buyer,
    'trade_completed',
    '✅ Purchase Complete!',
    'You successfully purchased ' || p_shares || ' shares for ₹' || v_amount || '.',
    v_order.property_id,
    now()
  );

  -- 7. Recalculate positions if function exists
  BEGIN
    PERFORM recalc_user_property_position(v_buyer, v_order.property_id);
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  BEGIN
    PERFORM recalc_user_property_position(v_order.seller_id, v_order.property_id);
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  -- Return success
  v_result := jsonb_build_object(
    'success', true,
    'shares_purchased', p_shares,
    'amount_paid', v_amount,
    'property_id', v_order.property_id,
    'seller_id', v_order.seller_id
  );

  RETURN v_result;
END;
$$;
