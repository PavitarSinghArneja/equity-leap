-- Seller parking and expiry automation (additive)

-- 1) Parking table to logically lock seller shares per order
CREATE TABLE IF NOT EXISTS public.share_parks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.share_sell_requests(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  shares_parked INTEGER NOT NULL CHECK (shares_parked > 0),
  shares_released INTEGER NOT NULL DEFAULT 0 CHECK (shares_released >= 0),
  status TEXT NOT NULL DEFAULT 'active', -- active|released
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_share_parks_order ON public.share_parks(order_id);
CREATE INDEX IF NOT EXISTS idx_share_parks_seller ON public.share_parks(seller_id);
CREATE INDEX IF NOT EXISTS idx_share_parks_property ON public.share_parks(property_id);
ALTER TABLE public.share_parks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_view_own_parks" ON public.share_parks;
CREATE POLICY "seller_view_own_parks" ON public.share_parks
  FOR SELECT USING (auth.uid()::text = seller_id::text);

-- 2) Helper to compute seller free shares for a property
CREATE OR REPLACE FUNCTION public.compute_free_shares(p_user_id UUID, p_property_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owned INTEGER := 0;
  v_locked INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(shares_owned), 0) INTO v_owned
  FROM public.investments
  WHERE user_id = p_user_id AND property_id = p_property_id;

  SELECT COALESCE(SUM(shares_parked - shares_released), 0) INTO v_locked
  FROM public.share_parks
  WHERE seller_id = p_user_id AND property_id = p_property_id AND status = 'active';

  RETURN GREATEST(v_owned - v_locked, 0);
END;
$$;

-- 3) BEFORE trigger to set remaining_shares on new orders
CREATE OR REPLACE FUNCTION public.trg_before_insert_share_sell_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.remaining_shares IS NULL THEN
    NEW.remaining_shares := NEW.shares_to_sell;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_insert_share_sell_requests ON public.share_sell_requests;
CREATE TRIGGER before_insert_share_sell_requests
BEFORE INSERT ON public.share_sell_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_before_insert_share_sell_requests();

-- 4) AFTER trigger to validate and create parking
CREATE OR REPLACE FUNCTION public.trg_after_insert_share_sell_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_free INTEGER := 0;
BEGIN
  SELECT public.compute_free_shares(NEW.seller_id, NEW.property_id) INTO v_free;
  IF v_free < NEW.shares_to_sell THEN
    RAISE EXCEPTION 'Insufficient free shares to create sell request. Free: %, Requested: %', v_free, NEW.shares_to_sell;
  END IF;

  INSERT INTO public.share_parks (order_id, seller_id, property_id, shares_parked)
  VALUES (NEW.id, NEW.seller_id, NEW.property_id, NEW.shares_to_sell);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS after_insert_share_sell_requests ON public.share_sell_requests;
CREATE TRIGGER after_insert_share_sell_requests
AFTER INSERT ON public.share_sell_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_after_insert_share_sell_requests();

-- 5) Expiration worker to clean up holds and reservations
CREATE OR REPLACE FUNCTION public.expire_holds_and_reservations()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_hold RECORD;
  r_res RECORD;
  v_amount NUMERIC(15,2);
BEGIN
  -- Expire holds
  FOR r_hold IN
    SELECT h.*, o.price_per_share
    FROM public.share_buyer_holds h
    JOIN public.share_sell_requests o ON o.id = h.order_id
    WHERE h.hold_expires_at < now() AND h.hold_status IN ('active','buyer_confirmed','seller_confirmed')
    FOR UPDATE
  LOOP
    -- Return shares to order
    UPDATE public.share_sell_requests
    SET remaining_shares = remaining_shares + r_hold.shares,
        updated_at = now()
    WHERE id = r_hold.order_id;

    -- Release buyer funds
    v_amount := r_hold.shares * r_hold.price_per_share;
    UPDATE public.escrow_balances
    SET pending_balance = GREATEST(pending_balance - v_amount, 0),
        available_balance = available_balance + v_amount,
        updated_at = now()
    WHERE user_id = r_hold.buyer_id;

    UPDATE public.share_buyer_holds
    SET hold_status = 'expired'
    WHERE id = r_hold.id;

    INSERT INTO public.share_order_events (order_id, event_type, actor_id, metadata)
    VALUES (r_hold.order_id, 'expired', NULL, jsonb_build_object('hold_id', r_hold.id));
  END LOOP;

  -- Expire reservations
  FOR r_res IN
    SELECT r.*, o.price_per_share
    FROM public.share_reservations r
    JOIN public.share_sell_requests o ON o.id = r.order_id
    WHERE r.expires_at < now() AND r.status = 'active'
    FOR UPDATE
  LOOP
    -- Return shares to order
    UPDATE public.share_sell_requests
    SET remaining_shares = remaining_shares + r_res.shares,
        updated_at = now()
    WHERE id = r_res.order_id;

    -- Release buyer funds
    v_amount := r_res.shares * r_res.price_per_share;
    UPDATE public.escrow_balances
    SET pending_balance = GREATEST(pending_balance - v_amount, 0),
        available_balance = available_balance + v_amount,
        updated_at = now()
    WHERE user_id = r_res.buyer_id;

    UPDATE public.share_reservations SET status = 'expired' WHERE id = r_res.id;

    INSERT INTO public.share_order_events (order_id, event_type, actor_id, metadata)
    VALUES (r_res.order_id, 'expired', NULL, jsonb_build_object('reservation_id', r_res.id));
  END LOOP;
END;
$$;

-- 6) Optional helper: cancel order (seller/admin) releasing unused parked shares
CREATE OR REPLACE FUNCTION public.cancel_sell_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_actor UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_park RECORD;
BEGIN
  SELECT * INTO v_order FROM public.share_sell_requests WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id = v_actor AND is_admin = true) INTO v_is_admin;
  IF v_actor <> v_order.seller_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized to cancel this order';
  END IF;

  IF v_order.status <> 'active' THEN
    RAISE EXCEPTION 'Only active orders can be cancelled';
  END IF;

  -- Ensure no both-confirmed holds exist (which would be moving to reservation)
  IF EXISTS (
    SELECT 1 FROM public.share_buyer_holds WHERE order_id = p_order_id AND hold_status = 'both_confirmed'
  ) THEN
    RAISE EXCEPTION 'Order has confirmed holds; cannot cancel';
  END IF;

  UPDATE public.share_sell_requests SET status = 'cancelled', updated_at = now() WHERE id = p_order_id;

  SELECT * INTO v_park FROM public.share_parks WHERE order_id = p_order_id AND status = 'active' FOR UPDATE;
  IF FOUND THEN
    -- Release any remaining parked shares (remaining_shares at cancel time)
    UPDATE public.share_parks
    SET shares_released = shares_released + v_order.remaining_shares,
        status = 'released',
        released_at = now()
    WHERE id = v_park.id;
  END IF;

  INSERT INTO public.share_order_events (order_id, event_type, actor_id)
  VALUES (p_order_id, 'cancelled', v_actor);
END;
$$;

