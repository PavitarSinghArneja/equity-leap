-- Check the recalc_user_property_position function (non-FIFO version)
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'recalc_user_property_position'
AND n.nspname = 'public';
