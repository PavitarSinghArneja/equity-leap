-- Check the valid_sell_status constraint to see allowed values

SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'share_sell_requests'::regclass
  AND conname = 'valid_sell_status';

-- Also check if there's a status enum type
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%sell%status%'
ORDER BY e.enumsortorder;
