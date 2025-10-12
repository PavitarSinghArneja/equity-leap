-- Fix RLS policies for share_parks table
-- This table is used to "park" shares when creating a sell request
-- The trigger after_insert_share_sell_requests inserts into this table

-- Enable RLS if not already enabled
ALTER TABLE share_parks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own share parks" ON share_parks;
DROP POLICY IF EXISTS "Users can view their own share parks" ON share_parks;
DROP POLICY IF EXISTS "Users can update their own share parks" ON share_parks;

-- Policy 1: Allow users to INSERT their own parked shares
-- This happens automatically via trigger when creating a sell request
CREATE POLICY "Users can insert their own share parks"
ON share_parks
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seller_id
);

-- Policy 2: Allow users to SELECT their own parked shares
CREATE POLICY "Users can view their own share parks"
ON share_parks
FOR SELECT
TO authenticated
USING (
  auth.uid() = seller_id
);

-- Policy 3: Allow users to UPDATE their own parked shares (for releasing shares)
CREATE POLICY "Users can update their own share parks"
ON share_parks
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'share_parks'
ORDER BY cmd, policyname;
