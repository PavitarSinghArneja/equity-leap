-- Fix Properties Table RLS for Trading Platform
-- Allow all authenticated users to view active properties

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "properties_select_own" ON public.properties;
DROP POLICY IF EXISTS "properties_select_authenticated" ON public.properties;

-- Create new policy: all authenticated users can view active properties
CREATE POLICY "authenticated_users_view_active_properties"
ON public.properties
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND status = 'active'
);

-- Allow admins to view all properties (including draft/inactive)
CREATE POLICY "admins_view_all_properties"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

COMMENT ON POLICY "authenticated_users_view_active_properties" ON public.properties IS
'Allow all logged-in users to view active properties for trading platform';
