-- Remove the old duplicate SELECT policy
DROP POLICY IF EXISTS "seller_view_own_parks" ON share_parks;

-- Verify only the new policies remain
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
