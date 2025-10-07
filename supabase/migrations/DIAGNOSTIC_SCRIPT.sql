-- =====================================================
-- SUPABASE MIGRATIONS DIAGNOSTIC REPORT
-- =====================================================
-- This script checks all migration components and provides
-- a comprehensive diagnostic report.
--
-- INSTRUCTIONS:
-- 1. Copy this entire script
-- 2. Paste into Supabase SQL Editor
-- 3. Run the script
-- 4. Review the results to verify all migrations are correct
-- =====================================================

-- Create a temporary table to store diagnostic results
CREATE TEMP TABLE IF NOT EXISTS diagnostic_results (
  check_id SERIAL PRIMARY KEY,
  category TEXT,
  check_name TEXT,
  status TEXT,
  details TEXT,
  notes TEXT
);

-- =====================================================
-- SECTION 1: TABLE EXISTENCE CHECKS
-- =====================================================

-- Check: user_events table exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Tables',
  'user_events table exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_events'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_events'
  ) THEN 'Table exists in public schema' ELSE 'Table NOT found' END;

-- Check: share_buyer_holds table exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Tables',
  'share_buyer_holds table exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'share_buyer_holds'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'share_buyer_holds'
  ) THEN 'Table exists in public schema' ELSE 'Table NOT found' END;

-- Check: share_reservations table exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Tables',
  'share_reservations table exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'share_reservations'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'share_reservations'
  ) THEN 'Table exists in public schema' ELSE 'Table NOT found' END;

-- Check: share_parks table exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Tables',
  'share_parks table exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'share_parks'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'share_parks'
  ) THEN 'Table exists in public schema' ELSE 'Table NOT found' END;

-- Check: share_order_events table exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Tables',
  'share_order_events table exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'share_order_events'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'share_order_events'
  ) THEN 'Table exists in public schema' ELSE 'Table NOT found' END;

-- =====================================================
-- SECTION 2: USER_EVENTS TABLE SCHEMA VERIFICATION
-- =====================================================

-- Check: user_events columns
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Schema',
  'user_events has all required columns',
  CASE WHEN COUNT(*) = 5 THEN 'PASS' ELSE 'FAIL' END,
  'Found ' || COUNT(*) || ' columns: ' || STRING_AGG(column_name, ', ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_events'
  AND column_name IN ('id', 'user_id', 'event_name', 'property_id', 'event_props', 'created_at');

-- Check: user_events RLS enabled
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Schema',
  'user_events RLS enabled',
  CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN relrowsecurity THEN 'RLS is enabled' ELSE 'RLS is NOT enabled' END
FROM pg_class
WHERE relname = 'user_events' AND relnamespace = 'public'::regnamespace;

-- =====================================================
-- SECTION 3: RLS POLICIES VERIFICATION
-- =====================================================

-- Check: users_view_own_events policy exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'RLS Policies',
  'users_view_own_events policy exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_events'
      AND policyname = 'users_view_own_events'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_events'
      AND policyname = 'users_view_own_events'
  ) THEN 'Policy exists for SELECT' ELSE 'Policy NOT found' END;

-- Check: users_insert_own_events policy exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'RLS Policies',
  'users_insert_own_events policy exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_events'
      AND policyname = 'users_insert_own_events'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_events'
      AND policyname = 'users_insert_own_events'
  ) THEN 'Policy exists for INSERT' ELSE 'Policy NOT found' END;

-- Check: admins_view_all_events policy exists (CRITICAL)
INSERT INTO diagnostic_results (category, check_name, status, details, notes)
SELECT
  'RLS Policies',
  'admins_view_all_events policy exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_events'
      AND policyname = 'admins_view_all_events'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_events'
      AND policyname = 'admins_view_all_events'
  ) THEN 'Policy exists - admins can SELECT all events' ELSE 'Policy NOT found - admins CANNOT view events' END,
  'This policy is required for admin analytics dashboard';

-- Get detailed policy information
INSERT INTO diagnostic_results (category, check_name, status, details, notes)
SELECT
  'RLS Policies',
  'Policy: ' || policyname,
  'INFO',
  'Command: ' || cmd || ', Permissive: ' || CASE WHEN permissive = 'PERMISSIVE' THEN 'YES' ELSE 'NO' END,
  'Qual: ' || COALESCE(qual::text, 'N/A')
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_events'
ORDER BY policyname;

-- =====================================================
-- SECTION 4: FUNCTION EXISTENCE AND VALIDITY
-- =====================================================

-- Check: log_user_event function exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Functions',
  'log_user_event function exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'log_user_event'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'log_user_event'
  ) THEN 'Function exists and is callable' ELSE 'Function NOT found' END;

-- Check: create_buyer_hold function exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Functions',
  'create_buyer_hold function exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_buyer_hold'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_buyer_hold'
  ) THEN 'Function exists for buyer holds' ELSE 'Function NOT found' END;

-- Check: buyer_confirm_hold function exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Functions',
  'buyer_confirm_hold function exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'buyer_confirm_hold'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'buyer_confirm_hold'
  ) THEN 'Function exists' ELSE 'Function NOT found' END;

-- Check: seller_confirm_hold function exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Functions',
  'seller_confirm_hold function exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'seller_confirm_hold'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'seller_confirm_hold'
  ) THEN 'Function exists' ELSE 'Function NOT found' END;

-- Check: admin_settle_reservation function exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Functions',
  'admin_settle_reservation function exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_settle_reservation'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_settle_reservation'
  ) THEN 'Function exists for admin settlement' ELSE 'Function NOT found' END;

-- Check: expire_holds_and_reservations function exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Functions',
  'expire_holds_and_reservations function exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'expire_holds_and_reservations'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'expire_holds_and_reservations'
  ) THEN 'Function exists - should be called periodically' ELSE 'Function NOT found' END;

-- Check: compute_free_shares function exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Functions',
  'compute_free_shares function exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'compute_free_shares'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'compute_free_shares'
  ) THEN 'Function exists for share parking logic' ELSE 'Function NOT found' END;

-- =====================================================
-- SECTION 5: TRIGGER VERIFICATION
-- =====================================================

-- Check: trg_alert_on_hold trigger exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Triggers',
  'trg_alert_on_hold trigger exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table = 'share_buyer_holds'
      AND trigger_name = 'trg_alert_on_hold'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table = 'share_buyer_holds'
      AND trigger_name = 'trg_alert_on_hold'
  ) THEN 'Trigger fires AFTER INSERT on share_buyer_holds' ELSE 'Trigger NOT found' END;

-- Check: trg_alert_on_reservation trigger exists
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Triggers',
  'trg_alert_on_reservation trigger exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table = 'share_reservations'
      AND trigger_name = 'trg_alert_on_reservation'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table = 'share_reservations'
      AND trigger_name = 'trg_alert_on_reservation'
  ) THEN 'Trigger fires AFTER INSERT on share_reservations' ELSE 'Trigger NOT found' END;

-- Check: Share sell request triggers
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Triggers',
  'before_insert_share_sell_requests trigger',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table = 'share_sell_requests'
      AND trigger_name = 'before_insert_share_sell_requests'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table = 'share_sell_requests'
      AND trigger_name = 'before_insert_share_sell_requests'
  ) THEN 'Trigger sets remaining_shares on new orders' ELSE 'Trigger NOT found' END;

INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Triggers',
  'after_insert_share_sell_requests trigger',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table = 'share_sell_requests'
      AND trigger_name = 'after_insert_share_sell_requests'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table = 'share_sell_requests'
      AND trigger_name = 'after_insert_share_sell_requests'
  ) THEN 'Trigger creates share parking on new orders' ELSE 'Trigger NOT found' END;

-- =====================================================
-- SECTION 6: INDEX VERIFICATION
-- =====================================================

-- Check indexes on user_events
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Indexes',
  'user_events indexes',
  CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'WARNING' END,
  'Found ' || COUNT(*) || ' indexes: ' || STRING_AGG(indexname, ', ' ORDER BY indexname)
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'user_events';

-- Check indexes on share_buyer_holds
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Indexes',
  'share_buyer_holds indexes',
  CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'WARNING' END,
  'Found ' || COUNT(*) || ' indexes: ' || STRING_AGG(indexname, ', ' ORDER BY indexname)
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'share_buyer_holds';

-- =====================================================
-- SECTION 7: COLUMN ADDITIONS VERIFICATION
-- =====================================================

-- Check: last_activity_at column on user_profiles
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Schema',
  'user_profiles.last_activity_at column exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'last_activity_at'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'last_activity_at'
  ) THEN 'Column exists for user activity tracking' ELSE 'Column NOT found' END;

-- Check: remaining_shares column on share_sell_requests
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Schema',
  'share_sell_requests.remaining_shares column exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'share_sell_requests'
      AND column_name = 'remaining_shares'
  ) THEN 'PASS' ELSE 'FAIL' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'share_sell_requests'
      AND column_name = 'remaining_shares'
  ) THEN 'Column exists for partial fills' ELSE 'Column NOT found' END;

-- =====================================================
-- SECTION 8: ADMIN ACCESS VERIFICATION
-- =====================================================

-- Check if is_admin column exists in user_profiles
INSERT INTO diagnostic_results (category, check_name, status, details, notes)
SELECT
  'Admin Access',
  'user_profiles.is_admin column exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'is_admin'
  ) THEN 'PASS' ELSE 'WARNING' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'is_admin'
  ) THEN 'Column exists - required for admin RLS policies'
    ELSE 'Column NOT found - admin policies may not work' END,
  'If missing, run: ALTER TABLE public.user_profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;';

-- =====================================================
-- SECTION 9: MIGRATION TRACKING
-- =====================================================

-- Check if migrations are being tracked
INSERT INTO diagnostic_results (category, check_name, status, details)
SELECT
  'Migration Tracking',
  'Supabase migrations table',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'supabase_migrations'
      AND table_name = 'schema_migrations'
  ) THEN 'PASS' ELSE 'INFO' END,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'supabase_migrations'
      AND table_name = 'schema_migrations'
  ) THEN 'Migration tracking is enabled'
    ELSE 'Migration tracking schema not found (may be normal)' END;

-- =====================================================
-- FINAL RESULTS DISPLAY
-- =====================================================

-- Display summary counts
SELECT
  '=== DIAGNOSTIC SUMMARY ===' as report_section,
  COUNT(*) FILTER (WHERE status = 'PASS') as passed,
  COUNT(*) FILTER (WHERE status = 'FAIL') as failed,
  COUNT(*) FILTER (WHERE status = 'WARNING') as warnings,
  COUNT(*) FILTER (WHERE status = 'INFO') as info_items,
  COUNT(*) as total_checks
FROM diagnostic_results;

-- Display all results
SELECT
  check_id,
  category,
  check_name,
  status,
  details,
  notes
FROM diagnostic_results
ORDER BY
  CASE category
    WHEN 'Tables' THEN 1
    WHEN 'Schema' THEN 2
    WHEN 'RLS Policies' THEN 3
    WHEN 'Functions' THEN 4
    WHEN 'Triggers' THEN 5
    WHEN 'Indexes' THEN 6
    WHEN 'Admin Access' THEN 7
    WHEN 'Migration Tracking' THEN 8
    ELSE 9
  END,
  check_id;

-- Display critical issues (if any)
SELECT
  '=== CRITICAL ISSUES ===' as report_section,
  category,
  check_name,
  details,
  COALESCE(notes, 'No additional notes') as resolution_notes
FROM diagnostic_results
WHERE status = 'FAIL'
ORDER BY check_id;

-- Display warnings (if any)
SELECT
  '=== WARNINGS ===' as report_section,
  category,
  check_name,
  details,
  COALESCE(notes, 'No additional notes') as resolution_notes
FROM diagnostic_results
WHERE status = 'WARNING'
ORDER BY check_id;

-- =====================================================
-- SECTION 10: FUNCTIONAL TESTS (OPTIONAL - COMMENTED OUT)
-- =====================================================
-- Uncomment to test actual functionality
-- NOTE: These will only work if you're authenticated

/*
-- Test log_user_event function (requires authentication)
DO $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    PERFORM public.log_user_event('test_event', NULL, '{"test": true}'::jsonb);
    INSERT INTO diagnostic_results (category, check_name, status, details)
    VALUES ('Functional Test', 'log_user_event execution', 'PASS', 'Function executed successfully');
  ELSE
    INSERT INTO diagnostic_results (category, check_name, status, details)
    VALUES ('Functional Test', 'log_user_event execution', 'SKIPPED', 'Not authenticated - cannot test');
  END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO diagnostic_results (category, check_name, status, details)
  VALUES ('Functional Test', 'log_user_event execution', 'FAIL', 'Error: ' || SQLERRM);
END $$;
*/

-- =====================================================
-- CLEANUP
-- =====================================================
-- Drop the temporary table (it will auto-drop at session end anyway)
-- DROP TABLE IF EXISTS diagnostic_results;
