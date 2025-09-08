-- Add tier override functionality to user_profiles table
-- This allows admins to manually set user tiers that won't be overridden by automatic calculations

-- Add a column to track admin tier overrides
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS tier_override_by_admin BOOLEAN DEFAULT FALSE;

-- Add a column to track when the override was set and by whom
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS tier_override_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add a column to store the admin who made the override (optional)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS tier_override_by UUID DEFAULT NULL;

-- Add comments to document the new columns
COMMENT ON COLUMN user_profiles.tier_override_by_admin IS 
'Flag indicating if the user tier was manually set by an admin. When TRUE, automatic tier calculations are skipped.';

COMMENT ON COLUMN user_profiles.tier_override_at IS 
'Timestamp when the tier was last manually overridden by an admin.';

COMMENT ON COLUMN user_profiles.tier_override_by IS 
'User ID of the admin who performed the tier override.';

-- Create an index for better performance when filtering by override status
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier_override ON user_profiles(tier_override_by_admin);

-- View the updated table structure (use this query instead of \d)
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('tier_override_by_admin', 'tier_override_at', 'tier_override_by')
ORDER BY ordinal_position;