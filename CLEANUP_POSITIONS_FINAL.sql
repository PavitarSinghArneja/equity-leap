-- Final cleanup: Keep only TABLE user_property_positions
-- This implements Option A from the analysis

-- 1) Drop the view (optional cleanup)
DROP VIEW IF EXISTS user_property_positions_with_value CASCADE;

-- 2) Ensure RLS policy exists for the table
CREATE POLICY IF NOT EXISTS "Users can read own positions"
ON user_property_positions FOR SELECT
USING (auth.uid()::text = user_id::text);

-- 3) Backfill any missing positions (run once)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT DISTINCT user_id
    FROM investments
    WHERE user_id IS NOT NULL
      AND investment_status = 'confirmed'
  ) LOOP
    PERFORM recalc_all_positions_for_user(r.user_id);
  END LOOP;
END $$;

-- 4) Verify the setup
SELECT 'Setup complete. Use user_property_positions table only.' AS status;

-- Example query for your code:
-- SELECT
--   upp.property_id,
--   upp.shares,
--   upp.avg_price,
--   upp.cost_basis,
--   p.share_price as current_share_price,
--   (upp.shares * p.share_price) as current_value,
--   ((upp.shares * p.share_price) - upp.cost_basis) as pnl
-- FROM user_property_positions upp
-- JOIN properties p ON p.id = upp.property_id
-- WHERE upp.user_id = auth.uid();