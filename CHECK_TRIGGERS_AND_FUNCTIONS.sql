-- Check for triggers on investments table that might be causing the ambiguous column error
SELECT
    t.tgname AS trigger_name,
    c.relname AS table_name,
    p.proname AS function_name,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'investments'
  AND t.tgisinternal = false
ORDER BY t.tgname;

-- Also check the recalc_user_property_position function definition
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'recalc_user_property_position'
  AND n.nspname = 'public';
