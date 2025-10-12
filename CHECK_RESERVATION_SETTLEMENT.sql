-- Check if there's a function that settles reservations and transfers shares/funds
-- seller_confirm_hold creates a reservation, but we need to see what settles it

-- 1. Check for reservation settlement functions
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
WHERE p.proname LIKE '%settle%'
  OR p.proname LIKE '%reservation%'
  OR p.proname LIKE '%transfer%'
ORDER BY p.proname;

-- 2. Check if there are any triggers on share_reservations table
SELECT
  t.tgname AS trigger_name,
  t.tgenabled AS enabled,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'share_reservations'
  AND NOT t.tgisinternal
ORDER BY t.tgname;
