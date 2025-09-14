-- Remove the old Codex version of user positions setup
-- Run this BEFORE installing the FIFO version

-- 1) Drop the view first (views depend on tables)
DROP VIEW IF EXISTS user_property_positions_with_value CASCADE;

-- 2) Drop triggers
DROP TRIGGER IF EXISTS trg_recalc_position ON investments;

-- 3) Drop functions
DROP FUNCTION IF EXISTS fn_investments_recalc_position_wrapper() CASCADE;
DROP FUNCTION IF EXISTS recalc_all_positions_for_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS recalc_user_property_position(uuid, uuid) CASCADE;

-- 4) Drop policies
DROP POLICY IF EXISTS "Users can read own positions" ON user_property_positions;

-- 5) Finally, drop the table
DROP TABLE IF EXISTS user_property_positions CASCADE;

-- Verify cleanup
SELECT 'Cleanup complete. You can now run FIFO_POSITIONS_SETUP.sql' as status;