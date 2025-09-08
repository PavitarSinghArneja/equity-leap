-- Add admin bypass policy to allow admin users to see all profiles
-- Run this in your Supabase SQL editor

-- First, let's see the current RLS policies
SELECT 'Current RLS policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Add admin bypass policy for SELECT operations
-- This allows users with is_admin = true to see all profiles
CREATE POLICY "admin_can_see_all_profiles" ON user_profiles
FOR SELECT 
USING (
    auth.uid()::text = user_id::text 
    OR 
    EXISTS (
        SELECT 1 FROM user_profiles admin_check
        WHERE admin_check.user_id = auth.uid() 
        AND admin_check.is_admin = true
    )
);

-- Drop the restrictive policy and replace it with the admin-aware one
DROP POLICY IF EXISTS "users_select_own" ON user_profiles;

-- Test: This should show both users when run by admin
SELECT 'Admin test - should show all users:' as test;
SELECT user_id, email, full_name, tier, subscription_active, is_admin
FROM user_profiles
ORDER BY created_at;

-- Show total count
SELECT 'Total user count:' as test, COUNT(*) as total_users
FROM user_profiles;