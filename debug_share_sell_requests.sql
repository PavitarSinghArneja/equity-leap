-- Debug script for share sell requests issue
-- Run this in Supabase SQL editor

-- Check if share_sell_requests table exists and has data
SELECT 'Total share sell requests in database:' as info;
SELECT COUNT(*) as total_requests FROM share_sell_requests;

-- Show all share sell requests with user and property details
SELECT 'All share sell requests:' as info;
SELECT 
    ssr.id,
    ssr.seller_id,
    ssr.buyer_id,
    ssr.property_id,
    ssr.shares_to_sell,
    ssr.price_per_share,
    ssr.status,
    ssr.created_at,
    up.email as seller_email,
    up.full_name as seller_name,
    p.title as property_title
FROM share_sell_requests ssr
LEFT JOIN user_profiles up ON ssr.seller_id = up.user_id
LEFT JOIN properties p ON ssr.property_id = p.id
ORDER BY ssr.created_at DESC;

-- Check RLS policies on share_sell_requests table
SELECT 'RLS policies for share_sell_requests:' as info;
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'share_sell_requests'
ORDER BY policyname;

-- Check if table has RLS enabled
SELECT 'RLS status:' as info;
SELECT schemaname, tablename, rowsecurity, 
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename = 'share_sell_requests' AND schemaname = 'public';

-- Test query as if you're the admin user (replace with actual seller_id)
-- This simulates what the admin panel is trying to do
SELECT 'Test admin query for specific seller:' as info;
SELECT ssr.*, p.title, p.city, p.country 
FROM share_sell_requests ssr
LEFT JOIN properties p ON ssr.property_id = p.id
WHERE ssr.seller_id = 'REPLACE_WITH_ACTUAL_USER_ID'
ORDER BY ssr.created_at DESC;

-- Show current user context (what auth.uid() returns)
SELECT 'Current authenticated user:' as info, auth.uid() as current_user;