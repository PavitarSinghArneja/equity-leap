-- Fix RLS policies to allow admin users to see all user profiles
-- Run this in your Supabase SQL editor

-- First, let's check current RLS policies on user_profiles
-- (You can view these in the Supabase dashboard under Database > Policies)

-- Drop existing restrictive policies that might be limiting admin access
DROP POLICY IF EXISTS "Users can only view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can only see their own data" ON user_profiles;

-- Create comprehensive RLS policies for user_profiles table
-- 1. Allow admins to view all profiles
CREATE POLICY "Admins can view all user profiles"
ON user_profiles
FOR SELECT
USING (
  (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true
  OR auth.uid()::text = user_id::text
);

-- 2. Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON user_profiles
FOR SELECT
USING (auth.uid()::text = user_id::text);

-- 3. Allow admins to update all profiles
CREATE POLICY "Admins can update all user profiles"
ON user_profiles
FOR UPDATE
USING (
  (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true
  OR auth.uid()::text = user_id::text
)
WITH CHECK (
  (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true
  OR auth.uid()::text = user_id::text
);

-- 4. Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- 5. Allow admins to insert new user profiles (for user management)
CREATE POLICY "Admins can insert user profiles"
ON user_profiles
FOR INSERT
WITH CHECK (
  (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true
);

-- 6. Allow new user registration (for self-signup)
CREATE POLICY "Allow user registration"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

-- Grant necessary permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

-- Verify the current admin user has is_admin = true
-- Replace 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4' with your actual admin user ID
UPDATE user_profiles 
SET is_admin = true 
WHERE user_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4';

-- Check all users to verify the fix
SELECT user_id, email, full_name, is_admin, subscription_active, created_at
FROM user_profiles
ORDER BY created_at;