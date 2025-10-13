-- Check the valid alert types constraint
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_alerts'::regclass
  AND contype = 'c'
  AND conname = 'valid_alert_type';

-- Also check if there's an enum type for alert_type
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%alert%'
ORDER BY t.typname, e.enumsortorder;
