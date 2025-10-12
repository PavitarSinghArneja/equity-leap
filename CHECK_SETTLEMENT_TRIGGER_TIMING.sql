-- Check when the auto-settlement trigger fires

SELECT
  t.tgname AS trigger_name,
  CASE t.tgtype::integer & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS timing,
  CASE
    WHEN t.tgtype::integer & 4 = 4 THEN 'INSERT'
    WHEN t.tgtype::integer & 8 = 8 THEN 'DELETE'
    WHEN t.tgtype::integer & 16 = 16 THEN 'UPDATE'
    ELSE 'TRUNCATE'
  END AS event,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'share_reservations'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Check if there are any recent reservations created
SELECT *
FROM share_reservations
ORDER BY created_at DESC
LIMIT 5;
