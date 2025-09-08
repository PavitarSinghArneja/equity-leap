-- TEMPORARY: Disable RLS for testing
-- This allows admin users to see all data for debugging
-- ⚠️ SECURITY WARNING: Only use this temporarily for debugging

-- Disable RLS on share_sell_requests table
ALTER TABLE share_sell_requests DISABLE ROW LEVEL SECURITY;

-- Now test if you can see the data
SELECT 'After disabling RLS - Total requests:' as info;
SELECT COUNT(*) FROM share_sell_requests;

SELECT 'All share sell requests:' as info;
SELECT 
    id,
    seller_id, 
    property_id, 
    shares_to_sell, 
    price_per_share, 
    status, 
    created_at 
FROM share_sell_requests 
ORDER BY created_at DESC;

-- IMPORTANT: Re-enable RLS after testing
-- You MUST run this after testing:
-- ALTER TABLE share_sell_requests ENABLE ROW LEVEL SECURITY;