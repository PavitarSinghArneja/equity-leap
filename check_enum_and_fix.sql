-- First, let's check the current enum values and existing user data
-- Run this in your Supabase SQL editor

-- Check what enum values are valid for user_tier
SELECT 'Valid user_tier enum values:' as info;
SELECT unnest(enum_range(NULL::user_tier)) as valid_tiers;

-- Check current user data to understand the structure
SELECT 'Current user profiles:' as info;
SELECT user_id, email, tier, subscription_active, is_admin, kyc_status
FROM user_profiles
ORDER BY created_at;

-- Check what enum values exist for kyc_status too
SELECT 'Valid kyc_status enum values:' as info;
SELECT unnest(enum_range(NULL::kyc_status)) as valid_kyc_status;