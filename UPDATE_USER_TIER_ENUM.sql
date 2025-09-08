-- Update user_tier enum to support small_investor and large_investor
-- This script should be run in your Supabase SQL Editor

-- Step 1: Add the new enum values
ALTER TYPE user_tier ADD VALUE IF NOT EXISTS 'small_investor';
ALTER TYPE user_tier ADD VALUE IF NOT EXISTS 'large_investor';

-- Step 2: Update any existing 'investor' tier users to 'small_investor' as default
-- (You can manually adjust these later based on their actual share ownership)
UPDATE user_profiles 
SET tier = 'small_investor' 
WHERE tier = 'investor';

-- Optional: Add a comment to document the tier logic
COMMENT ON TYPE user_tier IS 
'User tier progression:
- explorer: Free trial users
- waitlist_player: Paid users who haven''t invested yet  
- small_investor: Users who own exactly 1 share of any property
- large_investor: Users who own more than 1 share of any property';

-- Optional: Add an index on tier for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(tier);

-- Verify the changes
SELECT enum_range(NULL::user_tier) as available_tiers;