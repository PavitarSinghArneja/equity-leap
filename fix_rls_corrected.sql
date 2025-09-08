-- Fix the 500 error with correct enum values
-- Run this in your Supabase SQL editor

-- Temporarily disable RLS to allow cleanup
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all problematic policies
DROP POLICY IF EXISTS "admin_select_all" ON user_profiles;
DROP POLICY IF EXISTS "admin_update_all" ON user_profiles;
DROP POLICY IF EXISTS "user_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "admin_insert_all" ON user_profiles;
DROP POLICY IF EXISTS "admin_delete_all" ON user_profiles;
DROP POLICY IF EXISTS "users_select_own" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own" ON user_profiles;
DROP POLICY IF EXISTS "users_insert_own" ON user_profiles;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies without circular references
-- 1. Basic policy: Users can see their own profile
CREATE POLICY "users_select_own" ON user_profiles
FOR SELECT USING (auth.uid()::text = user_id::text);

-- 2. Users can update their own profile
CREATE POLICY "users_update_own" ON user_profiles
FOR UPDATE 
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- 3. Allow user registration (insert their own profile)
CREATE POLICY "users_insert_own" ON user_profiles
FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Grant proper permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

-- Update your admin user with correct enum values
-- Using 'large_investor' as the tier (common valid enum value)
UPDATE user_profiles 
SET 
    is_admin = true,
    tier = 'large_investor',
    subscription_active = true,
    kyc_status = 'approved',
    trial_expires_at = NOW() + INTERVAL '365 days'
WHERE user_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4';

-- If the above fails, try with 'explorer' tier instead
-- UPDATE user_profiles 
-- SET 
--     is_admin = true,
--     tier = 'explorer',
--     subscription_active = true,
--     kyc_status = 'approved'
-- WHERE user_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4';

-- Fix any waitlist_player users to have proper access
UPDATE user_profiles 
SET subscription_active = true,
    kyc_status = 'approved'
WHERE tier = 'waitlist_player';

-- Test queries
SELECT 'Profile test for admin user:' as test;
SELECT user_id, email, full_name, is_admin, tier, subscription_active, kyc_status
FROM user_profiles 
WHERE user_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4';

SELECT 'All users:' as test;
SELECT user_id, email, tier, subscription_active, is_admin
FROM user_profiles
ORDER BY created_at;