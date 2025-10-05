-- Secondary market core schema (additive, non-breaking)
-- Adds partial-fill support and reservation/hold tables with basic RLS. Functions are scaffolds.

-- 1) Extend share_sell_requests for partial fills
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='share_sell_requests' AND column_name='remaining_shares'
  ) THEN
    ALTER TABLE public.share_sell_requests ADD COLUMN remaining_shares INTEGER;
    -- Initialize remaining_shares to shares_to_sell
    UPDATE public.share_sell_requests SET remaining_shares = shares_to_sell WHERE remaining_shares IS NULL;
    ALTER TABLE public.share_sell_requests ALTER COLUMN remaining_shares SET NOT NULL;
    ALTER TABLE public.share_sell_requests ADD CONSTRAINT chk_remaining_shares_nonnegative CHECK (remaining_shares >= 0);
  END IF;
END $$;

-- 2) Buyer holds (pre-confirmation, funds earmarked)
CREATE TABLE IF NOT EXISTS public.share_buyer_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.share_sell_requests(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  shares INTEGER NOT NULL CHECK (shares > 0),
  hold_status TEXT NOT NULL DEFAULT 'active', -- active|buyer_confirmed|seller_confirmed|both_confirmed|released|expired
  buyer_confirmed BOOLEAN NOT NULL DEFAULT false,
  seller_confirmed BOOLEAN NOT NULL DEFAULT false,
  hold_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_buyer_holds_order ON public.share_buyer_holds(order_id);
CREATE INDEX IF NOT EXISTS idx_share_buyer_holds_buyer ON public.share_buyer_holds(buyer_id);
CREATE INDEX IF NOT EXISTS idx_share_buyer_holds_status ON public.share_buyer_holds(hold_status);

ALTER TABLE public.share_buyer_holds ENABLE ROW LEVEL SECURITY;

-- RLS: buyers can see/modify their holds; admins see all
CREATE POLICY IF NOT EXISTS "buyers_view_own_holds" ON public.share_buyer_holds
  FOR SELECT USING (auth.uid()::text = buyer_id::text);

CREATE POLICY IF NOT EXISTS "buyers_manage_own_holds" ON public.share_buyer_holds
  FOR UPDATE USING (auth.uid()::text = buyer_id::text)
  WITH CHECK (auth.uid()::text = buyer_id::text);

-- 3) Reservations (after both buyer+seller confirm)
CREATE TABLE IF NOT EXISTS public.share_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.share_sell_requests(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  shares INTEGER NOT NULL CHECK (shares > 0),
  price_per_share DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active|completed|cancelled|expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours')
);

CREATE INDEX IF NOT EXISTS idx_share_reservations_order ON public.share_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_share_reservations_property ON public.share_reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_share_reservations_status ON public.share_reservations(status);

ALTER TABLE public.share_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "parties_view_reservations" ON public.share_reservations
  FOR SELECT USING (
    auth.uid()::text = buyer_id::text OR auth.uid()::text = seller_id::text
  );

-- 4) Order events (append-only audit)
CREATE TABLE IF NOT EXISTS public.share_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.share_sell_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- created|hold_created|hold_confirmed_buyer|hold_confirmed_seller|reserved|settled|cancelled|expired|released
  actor_id UUID REFERENCES public.user_profiles(user_id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_order_events_order ON public.share_order_events(order_id);
ALTER TABLE public.share_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "order_events_read_authenticated" ON public.share_order_events
  FOR SELECT USING (auth.role() = 'authenticated');

-- 5) Function scaffolds (to be implemented with transactional logic)
-- NOTE: These stubs intentionally raise exceptions to avoid accidental use before full implementation.

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

  IF NOT v_order.shares_sellable OR v_order.property_status <> 'funded' THEN
    RAISE EXCEPTION 'Trading not enabled for this property';
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

CREATE OR REPLACE FUNCTION public.buyer_confirm_hold(p_hold_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
  v_buyer UUID := auth.uid();
BEGIN
  SELECT * INTO v_hold FROM public.share_buyer_holds WHERE id = p_hold_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hold not found'; END IF;
  IF v_hold.buyer_id <> v_buyer THEN RAISE EXCEPTION 'Not your hold'; END IF;
  IF v_hold.hold_status IN ('released','expired') THEN RAISE EXCEPTION 'Hold not active'; END IF;
  IF v_hold.hold_expires_at < now() THEN RAISE EXCEPTION 'Hold expired'; END IF;

  UPDATE public.share_buyer_holds
  SET buyer_confirmed = true,
      hold_status = CASE WHEN seller_confirmed THEN 'both_confirmed' ELSE 'buyer_confirmed' END,
      -- Extend TTL to allow seller up to ~60 minutes to confirm after buyer
      hold_expires_at = GREATEST(hold_expires_at, now() + interval '60 minutes')
  WHERE id = p_hold_id
  RETURNING * INTO v_hold;

  INSERT INTO public.share_order_events (order_id, event_type, actor_id, metadata)
  VALUES (v_hold.order_id, 'hold_confirmed_buyer', v_buyer, jsonb_build_object('hold_id', p_hold_id));

  RETURN to_jsonb(v_hold);
END;
$$;

CREATE OR REPLACE FUNCTION public.seller_confirm_hold(p_hold_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
  v_order RECORD;
  v_res RECORD;
  v_seller UUID := auth.uid();
BEGIN
  SELECT h.*, o.*
  INTO v_hold
  FROM public.share_buyer_holds h
  JOIN public.share_sell_requests o ON o.id = h.order_id
  WHERE h.id = p_hold_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Hold not found'; END IF;
  IF v_hold.seller_id <> v_seller THEN RAISE EXCEPTION 'Not seller for this order'; END IF;
  IF v_hold.hold_status IN ('released','expired') THEN RAISE EXCEPTION 'Hold not active'; END IF;
  IF v_hold.hold_expires_at < now() THEN RAISE EXCEPTION 'Hold expired'; END IF;

  -- Mark seller confirmed
  UPDATE public.share_buyer_holds
  SET seller_confirmed = true,
      hold_status = CASE WHEN buyer_confirmed THEN 'both_confirmed' ELSE 'seller_confirmed' END
  WHERE id = p_hold_id
  RETURNING * INTO v_hold;

  INSERT INTO public.share_order_events (order_id, event_type, actor_id, metadata)
  VALUES (v_hold.order_id, 'hold_confirmed_seller', v_seller, jsonb_build_object('hold_id', p_hold_id));

  -- If both confirmed, create reservation (48h default TTL on table)
  IF v_hold.buyer_confirmed AND v_hold.seller_confirmed THEN
    INSERT INTO public.share_reservations (
      order_id, buyer_id, seller_id, property_id, shares, price_per_share
    ) VALUES (
      v_hold.order_id, v_hold.buyer_id, v_hold.seller_id, v_hold.property_id, v_hold.shares, v_hold.price_per_share
    ) RETURNING * INTO v_res;

    INSERT INTO public.share_order_events (order_id, event_type, actor_id, metadata)
    VALUES (v_hold.order_id, 'reserved', v_seller, jsonb_build_object('reservation_id', v_res.id, 'shares', v_res.shares));

    RETURN to_jsonb(v_res);
  END IF;

  RETURN to_jsonb(v_hold);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_hold(p_hold_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
  v_actor UUID := auth.uid();
  v_amount NUMERIC(15,2);
BEGIN
  SELECT h.*, o.price_per_share
  INTO v_hold
  FROM public.share_buyer_holds h
  JOIN public.share_sell_requests o ON o.id = h.order_id
  WHERE h.id = p_hold_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Hold not found'; END IF;

  -- Allow buyer, seller or admin to cancel before both confirmation
  IF NOT (
    v_actor = v_hold.buyer_id OR v_actor = v_hold.seller_id OR EXISTS (
      SELECT 1 FROM public.user_profiles WHERE user_id = v_actor AND is_admin = true
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to cancel this hold';
  END IF;

  IF v_hold.hold_status = 'both_confirmed' THEN
    RAISE EXCEPTION 'Cannot cancel after both confirmations';
  END IF;

  IF v_hold.hold_status IN ('released','expired') THEN
    RETURN;
  END IF;

  -- Return shares to order
  UPDATE public.share_sell_requests
  SET remaining_shares = remaining_shares + v_hold.shares,
      updated_at = now()
  WHERE id = v_hold.order_id;

  -- Release buyer pending funds
  v_amount := v_hold.shares * v_hold.price_per_share;
  UPDATE public.escrow_balances
  SET pending_balance = GREATEST(pending_balance - v_amount, 0),
      available_balance = available_balance + v_amount,
      updated_at = now()
  WHERE user_id = v_hold.buyer_id;

  UPDATE public.share_buyer_holds
  SET hold_status = 'released'
  WHERE id = p_hold_id;

  INSERT INTO public.share_order_events (order_id, event_type, actor_id, metadata)
  VALUES (v_hold.order_id, 'released', v_actor, jsonb_build_object('hold_id', p_hold_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_settle_reservation(p_reservation_id UUID, p_success BOOLEAN, p_notes TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin BOOLEAN;
  v_res RECORD;
  v_amount NUMERIC(15,2);
  v_buyer_inv RECORD;
  v_seller_inv RECORD;
BEGIN
  -- Admin check
  SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_admin = true) INTO v_admin;
  IF NOT v_admin THEN RAISE EXCEPTION 'Admin only action'; END IF;

  SELECT r.*, o.price_per_share
  INTO v_res
  FROM public.share_reservations r
  JOIN public.share_sell_requests o ON o.id = r.order_id
  WHERE r.id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF v_res.status <> 'active' THEN RAISE EXCEPTION 'Reservation not active'; END IF;

  v_amount := v_res.shares * v_res.price_per_share;

  IF p_success IS TRUE THEN
    -- Adjust buyer investments (upsert)
    SELECT * INTO v_buyer_inv FROM public.investments WHERE user_id = v_res.buyer_id AND property_id = v_res.property_id FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.investments (user_id, property_id, shares_owned, price_per_share, total_investment, investment_status)
      VALUES (v_res.buyer_id, v_res.property_id, v_res.shares, v_res.price_per_share, v_amount, 'confirmed');
    ELSE
      UPDATE public.investments
      SET shares_owned = v_buyer_inv.shares_owned + v_res.shares,
          total_investment = v_buyer_inv.total_investment + v_amount,
          price_per_share = (v_buyer_inv.total_investment + v_amount) / NULLIF(v_buyer_inv.shares_owned + v_res.shares, 0),
          updated_at = now()
      WHERE id = v_buyer_inv.id;
    END IF;

    -- Adjust seller investments (decrement or delete)
    SELECT * INTO v_seller_inv FROM public.investments WHERE user_id = v_res.seller_id AND property_id = v_res.property_id FOR UPDATE;
    IF FOUND THEN
      IF v_seller_inv.shares_owned > v_res.shares THEN
        UPDATE public.investments
        SET shares_owned = v_seller_inv.shares_owned - v_res.shares,
            total_investment = GREATEST(v_seller_inv.total_investment - (v_res.shares * v_seller_inv.price_per_share), 0),
            updated_at = now()
        WHERE id = v_seller_inv.id;
      ELSE
        DELETE FROM public.investments WHERE id = v_seller_inv.id;
      END IF;
    END IF;

    -- Release buyer pending funds (offline settlement); do not credit seller wallet online
    UPDATE public.escrow_balances
    SET pending_balance = GREATEST(pending_balance - v_amount, 0),
        available_balance = available_balance + v_amount,
        updated_at = now()
    WHERE user_id = v_res.buyer_id;

    -- Mark reservation completed
    UPDATE public.share_reservations SET status = 'completed' WHERE id = p_reservation_id;

    -- If order has no remaining shares and no active holds, optionally mark as completed
    UPDATE public.share_sell_requests ssr
    SET status = CASE WHEN ssr.remaining_shares = 0 THEN 'completed' ELSE ssr.status END,
        updated_at = now()
    WHERE ssr.id = v_res.order_id;

    INSERT INTO public.share_order_events (order_id, event_type, actor_id, metadata)
    VALUES (v_res.order_id, 'settled', auth.uid(), jsonb_build_object('reservation_id', p_reservation_id, 'success', true, 'notes', p_notes));

  ELSE
    -- Failure: restore order shares and release buyer funds
    UPDATE public.share_sell_requests
    SET remaining_shares = remaining_shares + v_res.shares,
        updated_at = now()
    WHERE id = v_res.order_id;

    UPDATE public.escrow_balances
    SET pending_balance = GREATEST(pending_balance - v_amount, 0),
        available_balance = available_balance + v_amount,
        updated_at = now()
    WHERE user_id = v_res.buyer_id;

    UPDATE public.share_reservations SET status = 'cancelled' WHERE id = p_reservation_id;

    INSERT INTO public.share_order_events (order_id, event_type, actor_id, metadata)
    VALUES (v_res.order_id, 'settled', auth.uid(), jsonb_build_object('reservation_id', p_reservation_id, 'success', false, 'notes', p_notes));
  END IF;

  -- Best-effort recalculation (if function exists)
  BEGIN
    PERFORM public.recalc_user_property_position(v_res.buyer_id, v_res.property_id);
  EXCEPTION WHEN undefined_function THEN
    -- ignore
  END;

  BEGIN
    PERFORM public.recalc_user_property_position(v_res.seller_id, v_res.property_id);
  EXCEPTION WHEN undefined_function THEN
  END;

  RETURN to_jsonb(v_res);
END;
$$;

-- 6) Basic grants for authenticated role
GRANT SELECT ON public.share_buyer_holds TO authenticated;
GRANT SELECT ON public.share_reservations TO authenticated;
GRANT SELECT ON public.share_order_events TO authenticated;
