-- Check current user_tier enum values
SELECT enum_range(NULL::user_tier) as current_tier_values;

-- If you need to add the missing tier values, run this:
-- Note: You might need to be a superuser or have appropriate permissions

-- First, check if the values already exist
-- If they don't exist, you'll need to recreate the enum type

-- Option 1: If you can ALTER TYPE (PostgreSQL 9.1+)
BEGIN;
ALTER TYPE user_tier ADD VALUE IF NOT EXISTS 'small_investor';
ALTER TYPE user_tier ADD VALUE IF NOT EXISTS 'large_investor';
COMMIT;

-- Option 2: If the above doesn't work, you'll need to recreate the enum
-- WARNING: This is more complex and requires careful handling
-- Only use this if Option 1 fails

/*
-- Step 1: Create new enum type
CREATE TYPE user_tier_new AS ENUM (
    'explorer',
    'waitlist_player', 
    'small_investor',
    'large_investor'
);

-- Step 2: Update the column to use new type
ALTER TABLE user_profiles 
ALTER COLUMN tier TYPE user_tier_new 
USING tier::text::user_tier_new;

-- Step 3: Drop old type and rename new one
DROP TYPE user_tier;
ALTER TYPE user_tier_new RENAME TO user_tier;
*/

-- Verify the changes
SELECT enum_range(NULL::user_tier) as updated_tier_values;