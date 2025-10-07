-- =====================================================
-- ADD MISSING COMPONENTS FOR FULL FUNCTIONALITY
-- =====================================================
-- This migration adds missing components referenced by other migrations:
-- 1. is_admin column on user_profiles (required for admin RLS policies)
-- 2. user_alerts table (required by alert triggers)
-- 3. Admin RLS policies for all secondary market tables
--
-- Run this AFTER running all other migrations to ensure completeness.
-- =====================================================

-- =====================================================
-- SECTION 1: Add is_admin column to user_profiles
-- =====================================================
-- Required for: admins_view_all_events policy on user_events

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;

    -- Add comment for documentation
    COMMENT ON COLUMN public.user_profiles.is_admin IS 'Admin flag for elevated permissions (analytics, settlement, etc.)';
  END IF;
END $$;

-- Create index for admin lookups (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin
ON public.user_profiles(is_admin)
WHERE is_admin = true;

-- =====================================================
-- SECTION 2: Create user_alerts table
-- =====================================================
-- Required by: trg_alert_on_hold() and trg_alert_on_reservation() triggers

CREATE TABLE IF NOT EXISTS public.user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON public.user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_created_at ON public.user_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_alerts_unread ON public.user_alerts(user_id, read_at)
WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view and manage their own alerts
DROP POLICY IF EXISTS "users_view_own_alerts" ON public.user_alerts;
CREATE POLICY "users_view_own_alerts" ON public.user_alerts
  FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "users_update_own_alerts" ON public.user_alerts
  FOR UPDATE USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "users_delete_own_alerts" ON public.user_alerts
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Admins can view all alerts
DROP POLICY IF EXISTS "admins_view_all_alerts" ON public.user_alerts;
CREATE POLICY "admins_view_all_alerts" ON public.user_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- =====================================================
-- SECTION 3: Add admin RLS policies for secondary market tables
-- =====================================================
-- Admins need full visibility for settlement and support

-- share_buyer_holds: Admins can view all holds
DROP POLICY IF EXISTS "admins_view_all_holds" ON public.share_buyer_holds;
CREATE POLICY "admins_view_all_holds" ON public.share_buyer_holds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- share_reservations: Admins can view all reservations
DROP POLICY IF EXISTS "admins_view_all_reservations" ON public.share_reservations;
CREATE POLICY "admins_view_all_reservations" ON public.share_reservations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- share_parks: Admins can view all parked shares
DROP POLICY IF EXISTS "admins_view_all_parks" ON public.share_parks;
CREATE POLICY "admins_view_all_parks" ON public.share_parks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- share_order_events: Admins can view all order events
DROP POLICY IF EXISTS "admins_view_all_order_events" ON public.share_order_events;
CREATE POLICY "admins_view_all_order_events" ON public.share_order_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- =====================================================
-- SECTION 4: Add helper function to mark alerts as read
-- =====================================================

CREATE OR REPLACE FUNCTION public.mark_alert_read(p_alert_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_alerts
  SET read_at = now()
  WHERE id = p_alert_id
    AND user_id = v_user
    AND read_at IS NULL;
END;
$$;

-- =====================================================
-- SECTION 5: Add helper function to get unread alert count
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_unread_alert_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.user_alerts
  WHERE user_id = v_user
    AND read_at IS NULL;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- =====================================================
-- SECTION 6: Add admin check helper function
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_admin INTO v_is_admin
  FROM public.user_profiles
  WHERE user_id = v_user;

  RETURN COALESCE(v_is_admin, false);
END;
$$;

-- =====================================================
-- SECTION 7: Grant necessary permissions
-- =====================================================

GRANT SELECT ON public.user_alerts TO authenticated;
GRANT UPDATE (read_at) ON public.user_alerts TO authenticated;
GRANT DELETE ON public.user_alerts TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES (for debugging)
-- =====================================================

-- Check if is_admin column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'is_admin'
  ) THEN
    RAISE NOTICE 'SUCCESS: is_admin column exists on user_profiles';
  ELSE
    RAISE WARNING 'FAILED: is_admin column NOT found on user_profiles';
  END IF;
END $$;

-- Check if user_alerts table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_alerts'
  ) THEN
    RAISE NOTICE 'SUCCESS: user_alerts table exists';
  ELSE
    RAISE WARNING 'FAILED: user_alerts table NOT found';
  END IF;
END $$;

-- Check if admin policies exist
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname LIKE 'admins_view_all_%';

  RAISE NOTICE 'INFO: Found % admin view policies', v_count;
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
