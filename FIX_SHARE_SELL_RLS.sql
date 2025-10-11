-- Fix RLS policies for share_sell_requests table
-- This allows users to create sell requests for shares they own

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own sell requests" ON share_sell_requests;
DROP POLICY IF EXISTS "Users can view all active sell requests" ON share_sell_requests;
DROP POLICY IF EXISTS "Users can update their own sell requests" ON share_sell_requests;
DROP POLICY IF EXISTS "Users can delete their own sell requests" ON share_sell_requests;

-- Enable RLS
ALTER TABLE share_sell_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can INSERT sell requests for their own shares
CREATE POLICY "Users can insert their own sell requests"
ON share_sell_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seller_id
  AND
  -- Verify user owns enough shares
  EXISTS (
    SELECT 1 FROM investments
    WHERE investments.user_id = auth.uid()
      AND investments.property_id = share_sell_requests.property_id
      AND investments.shares_owned >= share_sell_requests.shares_to_sell
      AND investments.investment_status = 'confirmed'
  )
);

-- Policy 2: Users can VIEW all active sell requests (for buying)
CREATE POLICY "Users can view all active sell requests"
ON share_sell_requests
FOR SELECT
TO authenticated
USING (
  status = 'active'
  OR
  seller_id = auth.uid()
);

-- Policy 3: Users can UPDATE their own sell requests
CREATE POLICY "Users can update their own sell requests"
ON share_sell_requests
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Policy 4: Users can DELETE their own sell requests
CREATE POLICY "Users can delete their own sell requests"
ON share_sell_requests
FOR DELETE
TO authenticated
USING (seller_id = auth.uid());

-- Verify the policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'share_sell_requests'
ORDER BY policyname;
