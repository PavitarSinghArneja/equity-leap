-- Fix shares_sellable column and validation
-- This migration:
-- 1. Adds shares_sellable column if it doesn't exist
-- 2. Removes property_status check from create_buyer_hold function

-- 1) Add shares_sellable column to properties table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='properties' AND column_name='shares_sellable'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN shares_sellable BOOLEAN DEFAULT true;
    COMMENT ON COLUMN public.properties.shares_sellable IS 'Controls whether shares can be traded on secondary market';
  END IF;
END $$;

-- 2) Fix create_buyer_hold function to only check shares_sellable, not property_status
-- This allows trading on properties with any status as long as shares_sellable is true
CREATE OR REPLACE FUNCTION public.create_buyer_hold(p_order_id UUID, p_shares INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_amount NUMERIC(15,2);
  v_hold RECORD;
  v_buyer UUID := auth.uid();
  v_escrow RECORD;
BEGIN
  IF p_shares IS NULL OR p_shares <= 0 THEN
    RAISE EXCEPTION 'Invalid shares requested';
  END IF;

  -- Lock order and ensure it's eligible
  SELECT ssr.*, p.shares_sellable, p.property_status
  INTO v_order
  FROM public.share_sell_requests ssr
  JOIN public.properties p ON p.id = ssr.property_id
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

  -- FIXED: Only check shares_sellable, not property_status
  -- This allows trading on properties with status 'open', 'funded', etc.
  IF v_order.shares_sellable = false THEN
    RAISE EXCEPTION 'Share trading is not enabled for this property';
  END IF;

  IF v_order.remaining_shares < p_shares THEN
    RAISE EXCEPTION 'Not enough shares remaining';
  END IF;

  v_amount := p_shares * v_order.price_per_share;

  -- Lock buyer escrow row and ensure sufficient available balance
  SELECT * INTO v_escrow FROM public.escrow_balances WHERE user_id = v_buyer FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow account not found for buyer';
  END IF;

  IF COALESCE(v_escrow.available_balance, 0) < v_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Move funds to pending (offline settlement later releases or finalizes)
  UPDATE public.escrow_balances
  SET available_balance = available_balance - v_amount,
      pending_balance = pending_balance + v_amount,
      updated_at = now()
  WHERE user_id = v_buyer;

  -- Decrement remaining shares to secure FCFS
  UPDATE public.share_sell_requests
  SET remaining_shares = remaining_shares - p_shares,
      updated_at = now()
  WHERE id = p_order_id AND remaining_shares >= p_shares;

  -- Create hold (10 min default TTL defined on table)
  INSERT INTO public.share_buyer_holds (order_id, buyer_id, shares)
  VALUES (p_order_id, v_buyer, p_shares)
  RETURNING * INTO v_hold;

  -- Audit
  INSERT INTO public.share_order_events (order_id, event_type, actor_id, metadata)
  VALUES (p_order_id, 'hold_created', v_buyer, jsonb_build_object('shares', p_shares, 'amount', v_amount));

  RETURN to_jsonb(v_hold);
END;
$$;
