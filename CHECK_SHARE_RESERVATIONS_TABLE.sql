-- Check the share_reservations table structure and any existing reservations

-- 1. Check table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'share_reservations'
ORDER BY ordinal_position;

-- 2. Check if there are any reservations for our test case
SELECT
  *
FROM share_reservations
WHERE property_id = 'c9e6e4e1-aad8-4526-9f21-277f7e96a685'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check for triggers on share_reservations
SELECT
  t.tgname AS trigger_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'share_reservations'
  AND NOT t.tgisinternal;
