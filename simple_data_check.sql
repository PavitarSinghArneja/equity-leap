-- Simple data check without authentication dependency
-- This should work regardless of auth context

-- Check table structure
SELECT 'Table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'share_sell_requests' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if RLS is enabled (this might be blocking queries)
SELECT 'RLS Status:' as info;
SELECT schemaname, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'share_sell_requests';

-- Try to get raw data (temporarily disable RLS if needed)
-- First, let's see if we can query at all
SELECT 'Raw data count:' as info;
SELECT COUNT(*) as total_records FROM share_sell_requests;

-- Show all data without filters
SELECT 'All share sell requests (raw):' as info;
SELECT * FROM share_sell_requests ORDER BY created_at DESC LIMIT 10;

-- If the above queries return 0 or empty, run this to temporarily disable RLS:
-- ALTER TABLE share_sell_requests DISABLE ROW LEVEL SECURITY;
-- Then re-run the queries above
-- Remember to re-enable it later with:
-- ALTER TABLE share_sell_requests ENABLE ROW LEVEL SECURITY;