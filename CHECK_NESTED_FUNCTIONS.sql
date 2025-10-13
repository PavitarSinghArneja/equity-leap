-- Get the definitions of functions called by the triggers
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN (
  'recalc_user_property_position_fifo',
  'calculate_user_tier'
)
AND n.nspname = 'public'
ORDER BY p.proname;
