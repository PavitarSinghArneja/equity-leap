-- Create proper RLS policies that allow admin access while maintaining security
-- Run this in your Supabase SQL editor

-- Re-enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- First, ensure your admin user has is_admin = true
UPDATE user_profiles 
SET is_admin = true 
WHERE user_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4';

-- Drop all existing policies to start clean (including the ones we just created)
DROP POLICY IF EXISTS "Users can only view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can only see their own data" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow user registration" ON user_profiles;
DROP POLICY IF EXISTS "admin_select_all" ON user_profiles;
DROP POLICY IF EXISTS "admin_update_all" ON user_profiles;
DROP POLICY IF EXISTS "user_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "admin_insert_all" ON user_profiles;
DROP POLICY IF EXISTS "admin_delete_all" ON user_profiles;

-- Create new comprehensive policies
-- 1. Admin users can see everything
CREATE POLICY "admin_select_all"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
  OR auth.uid()::text = user_profiles.user_id::text
);

-- 2. Admin users can update everything  
CREATE POLICY "admin_update_all"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
  OR auth.uid()::text = user_profiles.user_id::text
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
  OR auth.uid()::text = user_profiles.user_id::text
);

-- 3. Allow user registration (insert their own profile)
CREATE POLICY "user_insert_own"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

-- 4. Admin can insert any profile
CREATE POLICY "admin_insert_all"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- 5. Admin can delete profiles (if needed)
CREATE POLICY "admin_delete_all"
ON user_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Grant proper permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

-- Test query to verify admin can see all users
SELECT 'Admin Test Query:' as test;
SELECT user_id, email, full_name, is_admin, subscription_active, tier, created_at
FROM user_profiles
ORDER BY created_at;

-- Show final count
SELECT 'Total Users:' as info, COUNT(*) as count FROM user_profiles;