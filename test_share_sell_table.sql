-- Simple test to understand the share_sell_requests table structure
-- Run this first to see what columns exist

SELECT 'Table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'share_sell_requests' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data
SELECT 'Sample data (first 3 records):' as info;
SELECT * FROM share_sell_requests LIMIT 3;