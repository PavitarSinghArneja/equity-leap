/*
  # Add dummy test users for development

  1. Test Users
    - Explorer user: test@example.com
    - Small investor: investor@example.com  
    - Large investor: premium@example.com
    - KYC approved user: approved@example.com

  2. Security
    - All users will have proper profiles created
    - Different tiers and KYC statuses for testing
*/

-- Insert dummy user profiles (these will be linked when users sign up)
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  tier,
  kyc_status,
  trial_started_at,
  trial_expires_at,
  subscription_active
) VALUES 
(
  gen_random_uuid(),
  'test@example.com',
  'Test Explorer',
  'explorer',
  'pending',
  now(),
  now() + interval '14 days',
  false
),
(
  gen_random_uuid(),
  'investor@example.com',
  'Small Investor',
  'small_investor',
  'under_review',
  now() - interval '5 days',
  now() + interval '9 days',
  false
),
(
  gen_random_uuid(),
  'premium@example.com',
  'Premium Investor',
  'large_investor',
  'approved',
  now() - interval '10 days',
  now() + interval '4 days',
  true
),
(
  gen_random_uuid(),
  'approved@example.com',
  'Approved User',
  'small_investor',
  'approved',
  now() - interval '3 days',
  now() + interval '11 days',
  false
)
ON CONFLICT (email) DO NOTHING;

-- Add some dummy escrow balances
INSERT INTO escrow_balances (
  user_id,
  available_balance,
  pending_balance,
  total_invested,
  total_returns
)
SELECT 
  up.user_id,
  CASE 
    WHEN up.tier = 'explorer' THEN 0
    WHEN up.tier = 'small_investor' THEN 5000
    WHEN up.tier = 'large_investor' THEN 25000
    ELSE 1000
  END as available_balance,
  CASE 
    WHEN up.tier = 'large_investor' THEN 2500
    ELSE 0
  END as pending_balance,
  CASE 
    WHEN up.tier = 'small_investor' THEN 15000
    WHEN up.tier = 'large_investor' THEN 75000
    ELSE 0
  END as total_invested,
  CASE 
    WHEN up.tier = 'small_investor' THEN 1200
    WHEN up.tier = 'large_investor' THEN 8500
    ELSE 0
  END as total_returns
FROM user_profiles up
WHERE up.email IN ('test@example.com', 'investor@example.com', 'premium@example.com', 'approved@example.com')
  AND up.user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;