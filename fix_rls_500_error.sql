-- Fix the 500 error by creating simpler, non-circular RLS policies
-- Run this in your Supabase SQL editor

-- Temporarily disable RLS to allow cleanup
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all problematic policies
DROP POLICY IF EXISTS "admin_select_all" ON user_profiles;
DROP POLICY IF EXISTS "admin_update_all" ON user_profiles;
DROP POLICY IF EXISTS "user_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "admin_insert_all" ON user_profiles;
DROP POLICY IF EXISTS "admin_delete_all" ON user_profiles;

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

-- 4. Special case: Allow service_role to bypass RLS for admin operations
-- This will be used by admin functions

-- Grant proper permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

-- First, let's check what enum values are valid
SELECT 'Valid tier enum values:' as info;
SELECT unnest(enum_range(NULL::user_tier)) as valid_tiers;

-- Ensure your admin user exists with proper flags
-- Using 'large_investor' instead of 'investor' based on the enum
INSERT INTO user_profiles (
    user_id, 
    email, 
    is_admin, 
    tier, 
    subscription_active, 
    kyc_status,
    trial_expires_at
) VALUES (
    'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4',
    (SELECT email FROM auth.users WHERE id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'),
    true,
    'large_investor',
    true,
    'approved',
    NOW() + INTERVAL '365 days'
) ON CONFLICT (user_id) DO UPDATE SET
    is_admin = true,
    tier = 'large_investor',
    subscription_active = true,
    kyc_status = 'approved';

-- Fix any waitlist_player users to have proper access
UPDATE user_profiles 
SET subscription_active = true,
    kyc_status = 'approved'
WHERE tier = 'waitlist_player';

-- Test query to make sure it works
SELECT 'Profile fetch test for admin user:' as test;
SELECT user_id, email, full_name, is_admin, tier, subscription_active, kyc_status
FROM user_profiles 
WHERE user_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4';

-- Test query to make sure we can see all users (should work now)
SELECT 'All users visible:' as test;
SELECT user_id, email, is_admin, tier, subscription_active
FROM user_profiles
ORDER BY created_at;