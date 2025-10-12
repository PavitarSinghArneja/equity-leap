-- Clean up duplicate RLS policies for share_sell_requests
-- Keep only the newer, more secure policies

-- Remove old duplicate policies
DROP POLICY IF EXISTS "Users can create their own sell requests" ON share_sell_requests;
DROP POLICY IF EXISTS "Users can view active sell requests and their own requests" ON share_sell_requests;

-- Verify only the correct policies remain
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'share_sell_requests'
ORDER BY cmd, policyname;

-- Expected result: 4 policies
-- 1. Users can delete their own sell requests (DELETE)
-- 2. Users can insert their own sell requests (INSERT) - with ownership check
-- 3. Users can view all active sell requests (SELECT)
-- 4. Users can update their own sell requests (UPDATE)
