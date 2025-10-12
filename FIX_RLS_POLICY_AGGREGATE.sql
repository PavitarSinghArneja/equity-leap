-- Fix: RLS policy must check TOTAL shares across all investment records
-- Current issue: Policy checks individual records, fails when shares are split

DROP POLICY IF EXISTS "Users can insert their own sell requests" ON share_sell_requests;

CREATE POLICY "Users can insert their own sell requests"
ON share_sell_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seller_id
  AND
  -- Check TOTAL shares owned across ALL confirmed investments
  (
    SELECT COALESCE(SUM(shares_owned), 0)
    FROM investments
    WHERE investments.user_id = auth.uid()
      AND investments.property_id = share_sell_requests.property_id
      AND investments.investment_status = 'confirmed'
  ) >= share_sell_requests.shares_to_sell
);

-- Verify the fix
SELECT
  policyname,
  with_check
FROM pg_policies
WHERE tablename = 'share_sell_requests'
  AND cmd = 'INSERT';
