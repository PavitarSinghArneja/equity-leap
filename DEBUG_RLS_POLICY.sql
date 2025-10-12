-- Debug the INSERT policy to see what's actually configured

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,  -- USING clause (for SELECT/UPDATE/DELETE)
  with_check  -- WITH CHECK clause (for INSERT/UPDATE)
FROM pg_policies
WHERE tablename = 'share_sell_requests'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Expected: The WITH CHECK clause should verify share ownership
-- If with_check is NULL, the policy isn't properly validating inserts
