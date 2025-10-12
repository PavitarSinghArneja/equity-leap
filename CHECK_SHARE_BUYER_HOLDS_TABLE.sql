-- Check the share_buyer_holds table structure

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'share_buyer_holds'
ORDER BY ordinal_position;
