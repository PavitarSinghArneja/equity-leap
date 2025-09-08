-- Test script to verify share sell requests work for ALL users
-- Run this to check the system works universally

-- 1. Show all users who have share sell requests
SELECT 'Users with share sell requests:' as info;
SELECT DISTINCT 
    ssr.seller_id,
    up.email,
    up.full_name,
    COUNT(ssr.id) as total_requests
FROM share_sell_requests ssr
LEFT JOIN user_profiles up ON ssr.seller_id = up.user_id
GROUP BY ssr.seller_id, up.email, up.full_name
ORDER BY total_requests DESC;

-- 2. Show all share sell requests with full details
SELECT 'All share sell requests with details:' as info;
SELECT 
    ssr.id,
    ssr.seller_id,
    up.email as seller_email,
    up.full_name as seller_name,
    ssr.property_id,
    p.title as property_title,
    ssr.shares_to_sell,
    ssr.price_per_share,
    ssr.total_amount,
    ssr.status,
    ssr.created_at,
    ssr.expires_at
FROM share_sell_requests ssr
LEFT JOIN user_profiles up ON ssr.seller_id = up.user_id
LEFT JOIN properties p ON ssr.property_id = p.id
ORDER BY ssr.created_at DESC;

-- 3. Check for any watchlist entries that match available share requests
SELECT 'Watchlist matches with available shares:' as info;
SELECT 
    w.user_id as watcher_id,
    wp.email as watcher_email,
    w.property_id,
    p.title as property_title,
    ssr.seller_id,
    sp.email as seller_email,
    ssr.shares_to_sell,
    ssr.price_per_share,
    ssr.status
FROM watchlist w
LEFT JOIN user_profiles wp ON w.user_id = wp.user_id
LEFT JOIN properties p ON w.property_id = p.id
LEFT JOIN share_sell_requests ssr ON w.property_id = ssr.property_id AND ssr.status = 'active'
LEFT JOIN user_profiles sp ON ssr.seller_id = sp.user_id
WHERE ssr.id IS NOT NULL
ORDER BY w.added_at DESC;

-- 4. Show counts to verify everything is working
SELECT 'System overview:' as info;
SELECT 
    (SELECT COUNT(*) FROM user_profiles) as total_users,
    (SELECT COUNT(*) FROM properties) as total_properties,
    (SELECT COUNT(*) FROM watchlist) as total_watchlist_entries,
    (SELECT COUNT(*) FROM share_sell_requests) as total_share_requests,
    (SELECT COUNT(*) FROM share_sell_requests WHERE status = 'active') as active_share_requests;