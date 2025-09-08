-- Fix tier enum values to include small_investor and large_investor
-- Run this in your Supabase SQL Editor

-- First check what values currently exist
SELECT enum_range(NULL::user_tier) as current_tier_values;

-- Add the missing enum values
BEGIN;
ALTER TYPE user_tier ADD VALUE IF NOT EXISTS 'small_investor';
ALTER TYPE user_tier ADD VALUE IF NOT EXISTS 'large_investor';
COMMIT;

-- Verify the changes
SELECT enum_range(NULL::user_tier) as updated_tier_values;

-- Check how many users have each tier
SELECT tier, COUNT(*) as user_count 
FROM user_profiles 
GROUP BY tier 
ORDER BY tier;