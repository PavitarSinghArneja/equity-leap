-- Find triggers on share_sell_requests that might insert into share_parks

-- 1. List all triggers on share_sell_requests
SELECT
  t.tgname AS trigger_name,
  t.tgenabled AS enabled,
  t.tgtype AS trigger_type,
  CASE t.tgtype::integer & 1
    WHEN 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END AS level,
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
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'share_sell_requests'
  AND NOT t.tgisinternal;

-- 2. Also check triggers on share_parks that might be relevant
SELECT
  t.tgname AS trigger_name,
  t.tgenabled AS enabled,
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
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'share_parks'
  AND NOT t.tgisinternal;
