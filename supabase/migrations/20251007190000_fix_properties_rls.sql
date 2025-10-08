-- Fix Properties Table RLS for Trading Platform
-- Allow all authenticated users to view open and funded properties

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "properties_select_own" ON public.properties;
DROP POLICY IF EXISTS "properties_select_authenticated" ON public.properties;
DROP POLICY IF EXISTS "authenticated_users_view_active_properties" ON public.properties;
DROP POLICY IF EXISTS "admins_view_all_properties" ON public.properties;

-- Create new policy: all authenticated users can view open/funded properties
CREATE POLICY "authenticated_users_view_open_properties"
ON public.properties
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND property_status IN ('open', 'funded')
);

-- Allow admins to view all properties (including upcoming/closed)
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

COMMENT ON POLICY "authenticated_users_view_open_properties" ON public.properties IS
'Allow all logged-in users to view open and funded properties for trading platform';
