-- Fix: Allow admins to view all user_events

DROP POLICY IF EXISTS "admins_view_all_events" ON public.user_events;
CREATE POLICY "admins_view_all_events" ON public.user_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );
