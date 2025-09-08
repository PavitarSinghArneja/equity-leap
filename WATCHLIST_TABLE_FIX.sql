-- Fix Watchlist Table Issues
-- Run this if your watchlist isn't showing up

-- 1. Check if watchlist table exists
SELECT 'Checking if watchlist table exists:' as step;
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'watchlist'
) as watchlist_table_exists;

-- 2. If table exists, check its structure
SELECT 'Watchlist table columns:' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'watchlist' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT 'RLS policies on watchlist:' as step;
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'watchlist';

-- 4. Test your access (replace with your user ID or use auth.uid())
SELECT 'Testing your access to watchlist:' as step;
SELECT COUNT(*) as watchlist_count 
FROM watchlist 
WHERE user_id = auth.uid();

-- 5. If the table is missing, create it (from CREATE_WATCHLIST_TABLE.sql)
-- Uncomment and run this if the table doesn't exist:

/*
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  -- Ensure one property per user
  UNIQUE(user_id, property_id)
);

-- Add RLS
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own watchlist"
ON watchlist FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can add to their own watchlist"
ON watchlist FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can remove from their own watchlist"
ON watchlist FOR DELETE
USING (auth.uid()::text = user_id::text);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_property_id ON watchlist(property_id);
*/

-- 6. Test insert (uncomment to test with a real property ID)
/*
INSERT INTO watchlist (user_id, property_id, notes)
VALUES (auth.uid(), 'YOUR_PROPERTY_ID_HERE', 'Test watchlist entry')
ON CONFLICT (user_id, property_id) DO NOTHING;
*/

SELECT 'Watchlist table fix complete!' as result;