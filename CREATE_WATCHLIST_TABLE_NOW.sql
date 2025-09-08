-- Create Watchlist Table
-- Run this in Supabase SQL Editor to create the missing watchlist table

-- 1. Create the watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  -- Ensure one property per user in watchlist
  UNIQUE(user_id, property_id)
);

-- 2. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_property_id ON watchlist(property_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON watchlist(added_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
CREATE POLICY "Users can view their own watchlist"
ON watchlist FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can add to their own watchlist"  
ON watchlist FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can remove from their own watchlist"
ON watchlist FOR DELETE
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own watchlist"
ON watchlist FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- 5. Add table comment
COMMENT ON TABLE watchlist IS 'User watchlist for saving properties of interest';

-- 6. Verify table was created successfully
SELECT 'Watchlist table created successfully!' as result;

-- 7. Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'watchlist' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Check RLS policies were created
SELECT 
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'watchlist';