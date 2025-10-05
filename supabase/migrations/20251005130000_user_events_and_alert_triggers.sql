-- User analytics events and trading alert triggers

-- 1) Add last activity column on user_profiles (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='last_activity_at'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN last_activity_at TIMESTAMPTZ;
    UPDATE public.user_profiles SET last_activity_at = GREATEST(trial_started_at, created_at);
  END IF;
END $$;

-- 2) user_events table
CREATE TABLE IF NOT EXISTS public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  event_props JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event ON public.user_events(event_name);
CREATE INDEX IF NOT EXISTS idx_user_events_property ON public.user_events(property_id);

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- RLS: users read own, admins read all, users insert own
CREATE POLICY IF NOT EXISTS "users_view_own_events" ON public.user_events
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY IF NOT EXISTS "users_insert_own_events" ON public.user_events
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 3) Helper function to log event and update last_activity_at
CREATE OR REPLACE FUNCTION public.log_user_event(p_event_name TEXT, p_property_id UUID DEFAULT NULL, p_props JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_events (user_id, event_name, property_id, event_props)
  VALUES (v_uid, p_event_name, p_property_id, p_props);

  UPDATE public.user_profiles
  SET last_activity_at = now(), updated_at = now()
  WHERE user_id = v_uid;
END;
$$;

-- 4) Trading alert triggers
-- Alert when a buyer hold is created: notify seller
CREATE OR REPLACE FUNCTION public.trg_alert_on_hold()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.share_sell_requests WHERE id = NEW.order_id;
  IF FOUND THEN
    INSERT INTO public.user_alerts (user_id, alert_type, title, message, property_id, created_at)
    VALUES (
      v_order.seller_id,
      'share_sell_request',
      'New buyer hold on your order',
      'A buyer has placed a hold on your listed shares. Please confirm to proceed.',
      v_order.property_id,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alert_on_hold ON public.share_buyer_holds;
CREATE TRIGGER trg_alert_on_hold
AFTER INSERT ON public.share_buyer_holds
FOR EACH ROW EXECUTE FUNCTION public.trg_alert_on_hold();

-- Alert when reservation is created: notify both buyer and seller
CREATE OR REPLACE FUNCTION public.trg_alert_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_alerts (user_id, alert_type, title, message, property_id, created_at)
  VALUES
    (NEW.buyer_id, 'share_sell_request', 'Reservation created', 'Your reservation is active. Admin will settle offline.', NEW.property_id, now()),
    (NEW.seller_id, 'share_sell_request', 'Reservation created', 'Your order is reserved. Admin will settle offline.', NEW.property_id, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alert_on_reservation ON public.share_reservations;
CREATE TRIGGER trg_alert_on_reservation
AFTER INSERT ON public.share_reservations
FOR EACH ROW EXECUTE FUNCTION public.trg_alert_on_reservation();

