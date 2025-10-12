-- Debug: Check what the user actually owns vs what they're trying to sell
-- Replace 'YOUR_USER_ID' with the actual user_id from the error logs
-- Replace 'YOUR_PROPERTY_ID' with the property_id they're trying to sell

-- First, find the current user's investments for the property
SELECT
  user_id,
  property_id,
  shares_owned,
  investment_status,
  created_at
FROM investments
WHERE user_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'  -- From error logs
  AND property_id = 'c9e6e4e1-aad8-4526-9f21-277f7e96a685'  -- From error logs
ORDER BY created_at DESC;

-- Check if there are multiple investment records that need to be consolidated
SELECT
  property_id,
  COUNT(*) as num_records,
  SUM(shares_owned) as total_shares,
  array_agg(investment_status) as statuses
FROM investments
WHERE user_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'
  AND property_id = 'c9e6e4e1-aad8-4526-9f21-277f7e96a685'
GROUP BY property_id;

-- Also check the investment_status enum values to ensure 'confirmed' matches
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'investment_status'::regtype
ORDER BY enumsortorder;
