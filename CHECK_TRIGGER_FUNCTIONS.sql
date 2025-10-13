-- Get the definitions of the trigger functions
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN (
  'update_user_tier_after_investment',
  'fn_investments_recalc_position_fifo',
  'update_user_tier'
)
AND n.nspname = 'public'
ORDER BY p.proname;
