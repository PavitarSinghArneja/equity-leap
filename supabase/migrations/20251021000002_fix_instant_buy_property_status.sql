-- Fix instant_buy_shares to not check property_status
-- Only check shares_sellable flag, allow trading on any status

CREATE OR REPLACE FUNCTION instant_buy_shares(
  p_order_id UUID,
  p_shares INTEGER,
  p_transaction_id UUID DEFAULT NULL
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
  v_buyer_balance NUMERIC(15,2);
  v_buyer_inv RECORD;
  v_seller_inv RECORD;
  v_transaction_id UUID;
  v_result JSONB;
BEGIN
  IF p_shares IS NULL OR p_shares <= 0 THEN
    RAISE EXCEPTION 'Invalid shares requested: % (must be positive)', p_shares;
  END IF;

  v_transaction_id := COALESCE(p_transaction_id, gen_random_uuid());

  IF EXISTS (
    SELECT 1 FROM share_order_events
    WHERE order_id = p_order_id
    AND event_type = 'instant_purchase'
    AND metadata->>'transaction_id' = v_transaction_id::text
  ) THEN
    RAISE EXCEPTION 'Duplicate transaction detected. Purchase already processed.';
  END IF;

  SELECT ssr.*, p.shares_sellable, p.property_status, p.title
  INTO v_order
  FROM share_sell_requests ssr
  JOIN properties p ON p.id = ssr.property_id
  WHERE ssr.id = p_order_id
  FOR UPDATE OF ssr;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_order.status <> 'active' THEN
    RAISE EXCEPTION 'Order not active. Current status: %', v_order.status;
  END IF;

  IF v_order.seller_id = v_buyer THEN
    RAISE EXCEPTION 'Cannot buy from your own order';
  END IF;

  -- FIXED: Only check shares_sellable, not property_status
  IF v_order.shares_sellable = false THEN
    RAISE EXCEPTION 'Share trading is not enabled for this property';
  END IF;

  IF v_order.remaining_shares < p_shares THEN
    RAISE EXCEPTION 'Not enough shares remaining. Requested: %, Available: %', p_shares, v_order.remaining_shares;
  END IF;

  IF v_order.expires_at IS NOT NULL AND v_order.expires_at < NOW() THEN
    UPDATE share_sell_requests SET status = 'expired' WHERE id = p_order_id;
    RAISE EXCEPTION 'Order has expired';
  END IF;

  v_amount := p_shares * v_order.price_per_share;

  SELECT available_balance INTO v_buyer_balance
  FROM escrow_balances
  WHERE user_id = v_buyer
  FOR UPDATE;

  IF v_buyer_balance IS NULL THEN
    RAISE EXCEPTION 'Buyer wallet not found';
  END IF;

  IF v_buyer_balance < v_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', v_amount, v_buyer_balance;
  END IF;

  PERFORM 1 FROM escrow_balances
  WHERE user_id = v_order.seller_id
  FOR UPDATE;

  UPDATE escrow_balances
  SET
    available_balance = available_balance - v_amount,
    updated_at = NOW()
  WHERE user_id = v_buyer
  AND available_balance >= v_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Concurrent transaction detected - insufficient balance';
  END IF;

  UPDATE escrow_balances
  SET
    available_balance = available_balance + v_amount,
    updated_at = NOW()
  WHERE user_id = v_order.seller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seller wallet not found';
  END IF;

  UPDATE share_sell_requests
  SET
    remaining_shares = remaining_shares - p_shares,
    status = CASE
      WHEN remaining_shares - p_shares <= 0 THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_order_id;

  SELECT * INTO v_buyer_inv
  FROM investments
  WHERE user_id = v_buyer AND property_id = v_order.property_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO investments (
      user_id,
      property_id,
      shares_owned,
      price_per_share,
      total_investment,
      investment_status,
      investment_date
    )
    VALUES (
      v_buyer,
      v_order.property_id,
      p_shares,
      v_order.price_per_share,
      v_amount,
      'confirmed',
      NOW()
    );
  ELSE
    UPDATE investments
    SET
      shares_owned = v_buyer_inv.shares_owned + p_shares,
      total_investment = v_buyer_inv.total_investment + v_amount,
      price_per_share = (v_buyer_inv.total_investment + v_amount) / NULLIF(v_buyer_inv.shares_owned + p_shares, 0),
      updated_at = NOW()
    WHERE id = v_buyer_inv.id;
  END IF;

  SELECT * INTO v_seller_inv
  FROM investments
  WHERE user_id = v_order.seller_id AND property_id = v_order.property_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_seller_inv.shares_owned > p_shares THEN
      UPDATE investments
      SET
        shares_owned = v_seller_inv.shares_owned - p_shares,
        total_investment = GREATEST(
          v_seller_inv.total_investment - (p_shares * v_seller_inv.price_per_share),
          0
        ),
        updated_at = NOW()
      WHERE id = v_seller_inv.id;
    ELSIF v_seller_inv.shares_owned = p_shares THEN
      DELETE FROM investments WHERE id = v_seller_inv.id;
    ELSE
      RAISE EXCEPTION 'Data integrity error: Seller trying to sell more shares than owned';
    END IF;
  ELSE
    RAISE EXCEPTION 'Seller investment record not found';
  END IF;

  UPDATE share_parks
  SET
    shares_released = shares_released + p_shares,
    status = CASE
      WHEN shares_released + p_shares >= shares_parked THEN 'released'
      ELSE status
    END,
    released_at = CASE
      WHEN shares_released + p_shares >= shares_parked THEN NOW()
      ELSE released_at
    END
  WHERE order_id = p_order_id
    AND seller_id = v_order.seller_id
    AND property_id = v_order.property_id
    AND status = 'active';

  INSERT INTO share_order_events (order_id, event_type, actor_id, metadata, created_at)
  VALUES (
    p_order_id,
    'instant_purchase',
    v_buyer,
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'shares', p_shares,
      'amount', v_amount,
      'buyer_id', v_buyer,
      'seller_id', v_order.seller_id,
      'property_title', v_order.title
    ),
    NOW()
  );

  INSERT INTO transactions (
    user_id,
    transaction_type,
    amount,
    status,
    reference_id,
    description,
    property_id,
    created_at
  ) VALUES (
    v_buyer,
    'share_purchase',
    -v_amount,
    'completed',
    v_transaction_id,
    format('Purchased %s shares of %s', p_shares, v_order.title),
    v_order.property_id,
    NOW()
  );

  INSERT INTO transactions (
    user_id,
    transaction_type,
    amount,
    status,
    reference_id,
    description,
    property_id,
    created_at
  ) VALUES (
    v_order.seller_id,
    'share_sale',
    v_amount,
    'completed',
    v_transaction_id,
    format('Sold %s shares of %s', p_shares, v_order.title),
    v_order.property_id,
    NOW()
  );

  INSERT INTO user_alerts (user_id, alert_type, title, message, property_id, created_at)
  VALUES (
    v_order.seller_id,
    'trade_completed',
    '💰 Shares Sold!',
    format('Your %s shares of %s were sold for ₹%s. Funds added to your wallet.', p_shares, v_order.title, v_amount),
    v_order.property_id,
    NOW()
  );

  INSERT INTO user_alerts (user_id, alert_type, title, message, property_id, created_at)
  VALUES (
    v_buyer,
    'trade_completed',
    '✅ Purchase Complete!',
    format('You successfully purchased %s shares of %s for ₹%s.', p_shares, v_order.title, v_amount),
    v_order.property_id,
    NOW()
  );

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

  v_result := jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'shares_purchased', p_shares,
    'amount_paid', v_amount,
    'property_id', v_order.property_id,
    'property_title', v_order.title,
    'seller_id', v_order.seller_id,
    'order_completed', v_order.remaining_shares - p_shares <= 0
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION instant_buy_shares(UUID, INTEGER, UUID) TO authenticated;
