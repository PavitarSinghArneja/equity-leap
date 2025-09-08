-- Comprehensive verification script to ensure all fixes work universally
-- This verifies that the share sell request system works for ALL users

-- 1. Verify table structure is correct
SELECT 'Database Schema Verification:' as test_section;
SELECT 
    'share_sell_requests table columns:' as info,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'share_sell_requests' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check all users who have created share sell requests
SELECT 'Users with Share Sell Requests:' as test_section;
SELECT 
    ssr.seller_id,
    up.email,
    up.full_name,
    COUNT(ssr.id) as total_requests,
    COUNT(CASE WHEN ssr.status = 'active' THEN 1 END) as active_requests,
    COUNT(CASE WHEN ssr.status = 'pending' THEN 1 END) as pending_requests,
    COUNT(CASE WHEN ssr.status = 'sold' THEN 1 END) as sold_requests,
    MIN(ssr.created_at) as first_request,
    MAX(ssr.created_at) as latest_request
FROM share_sell_requests ssr
LEFT JOIN user_profiles up ON ssr.seller_id = up.user_id
GROUP BY ssr.seller_id, up.email, up.full_name
ORDER BY total_requests DESC;

-- 3. Test the exact query used in AdminUsers.tsx for each user
SELECT 'AdminUsers.tsx Query Test for Each User:' as test_section;
WITH user_requests AS (
    SELECT DISTINCT seller_id FROM share_sell_requests
)
SELECT 
    ur.seller_id,
    up.email,
    up.full_name,
    'Query Result:' as query_test,
    ssr.id,
    ssr.shares_to_sell,
    ssr.price_per_share,
    ssr.total_amount,
    ssr.status,
    ssr.created_at,
    p.title as property_title,
    p.city,
    p.country
FROM user_requests ur
LEFT JOIN user_profiles up ON ur.seller_id = up.user_id
LEFT JOIN share_sell_requests ssr ON ssr.seller_id = ur.seller_id
LEFT JOIN properties p ON ssr.property_id = p.id
ORDER BY ur.seller_id, ssr.created_at DESC;

-- 4. Test the watchlist alerts query used in WaitlistDashboard.tsx
SELECT 'WaitlistDashboard.tsx Watchlist Alerts Test:' as test_section;
SELECT 
    w.user_id as watcher_id,
    wp.email as watcher_email,
    w.property_id,
    prop.title as property_title,
    'Available shares for this watchlist item:' as alert_test,
    ssr.id as request_id,
    ssr.seller_id,
    sp.email as seller_email,
    ssr.shares_to_sell,
    ssr.price_per_share,
    ssr.status,
    ssr.created_at as request_created
FROM watchlist w
LEFT JOIN user_profiles wp ON w.user_id = wp.user_id
LEFT JOIN properties prop ON w.property_id = prop.id
LEFT JOIN share_sell_requests ssr ON w.property_id = ssr.property_id 
    AND ssr.status IN ('active', 'approved', 'pending')
    AND ssr.shares_to_sell > 0
LEFT JOIN user_profiles sp ON ssr.seller_id = sp.user_id
ORDER BY w.user_id, w.property_id, ssr.created_at DESC;

-- 5. Verify status handling for all possible values
SELECT 'Status Value Verification:' as test_section;
SELECT 
    status,
    COUNT(*) as count,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as latest_occurrence
FROM share_sell_requests
GROUP BY status
ORDER BY count DESC;

-- 6. Test foreign key relationships
SELECT 'Foreign Key Relationship Test:' as test_section;
SELECT 
    'Seller profiles linked correctly:' as relationship_test,
    COUNT(ssr.id) as total_requests,
    COUNT(up.user_id) as requests_with_valid_seller_profile,
    COUNT(ssr.id) - COUNT(up.user_id) as requests_missing_seller_profile
FROM share_sell_requests ssr
LEFT JOIN user_profiles up ON ssr.seller_id = up.user_id

UNION ALL

SELECT 
    'Property relationships linked correctly:' as relationship_test,
    COUNT(ssr.id) as total_requests,
    COUNT(p.id) as requests_with_valid_property,
    COUNT(ssr.id) - COUNT(p.id) as requests_missing_property
FROM share_sell_requests ssr
LEFT JOIN properties p ON ssr.property_id = p.id;

-- 7. System health overview
SELECT 'System Health Overview:' as test_section;
SELECT 
    (SELECT COUNT(*) FROM user_profiles WHERE is_admin = true) as admin_users,
    (SELECT COUNT(*) FROM user_profiles WHERE is_admin = false OR is_admin IS NULL) as regular_users,
    (SELECT COUNT(*) FROM properties) as total_properties,
    (SELECT COUNT(*) FROM share_sell_requests) as total_share_requests,
    (SELECT COUNT(*) FROM watchlist) as total_watchlist_entries,
    (SELECT COUNT(DISTINCT seller_id) FROM share_sell_requests) as users_who_created_requests,
    (SELECT COUNT(DISTINCT user_id) FROM watchlist) as users_with_watchlists;

-- 8. Test edge cases that could cause issues
SELECT 'Edge Case Testing:' as test_section;
SELECT 
    'Edge cases found:' as issue_type,
    COUNT(CASE WHEN ssr.seller_id IS NULL THEN 1 END) as requests_without_seller,
    COUNT(CASE WHEN ssr.property_id IS NULL THEN 1 END) as requests_without_property,
    COUNT(CASE WHEN ssr.shares_to_sell <= 0 THEN 1 END) as requests_with_invalid_shares,
    COUNT(CASE WHEN ssr.price_per_share <= 0 THEN 1 END) as requests_with_invalid_price,
    COUNT(CASE WHEN ssr.status NOT IN ('active', 'pending', 'sold', 'expired', 'cancelled') THEN 1 END) as requests_with_unknown_status
FROM share_sell_requests ssr;

-- Final verification message
SELECT 'VERIFICATION COMPLETE' as status, 
       'All queries above should return data if the system is working universally' as message,
       'Check each section for any issues or missing data' as instruction;