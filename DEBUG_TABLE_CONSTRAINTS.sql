-- Check for foreign key constraints and triggers on share_sell_requests
-- that might be causing the "share_parks" RLS error

-- 1. Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'share_sell_requests';

-- 2. Check for triggers on share_sell_requests
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'share_sell_requests';

-- 3. Check what table "share_parks" actually is (might be old table name?)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%share%'
ORDER BY table_name;

-- 4. Check RLS policies on share_parks table (if it exists)
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
