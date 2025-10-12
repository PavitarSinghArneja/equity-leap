-- Investigate the share_parks table structure and relationship

-- 1. What columns does share_parks have?
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'share_parks'
ORDER BY ordinal_position;

-- 2. Check if share_sell_requests has any foreign key to share_parks
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  a.attname AS column_name,
  confrelid::regclass AS foreign_table_name,
  af.attname AS foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
  AND (c.conrelid::regclass::text = 'share_sell_requests'
       OR c.confrelid::regclass::text = 'share_parks');

-- 3. Check if there's an INSERT trigger or policy needed for share_parks
SELECT *
FROM pg_policies
WHERE tablename = 'share_parks';

-- 4. Check the actual table definition
SELECT
  pg_get_tabledef('public.share_parks'::regclass) AS table_definition;
