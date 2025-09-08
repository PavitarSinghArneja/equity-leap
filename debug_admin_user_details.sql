-- Debug script for admin user details issue
-- Run this in Supabase SQL editor to check database structure

-- Check if share_sell_requests table exists
SELECT 'share_sell_requests table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'share_sell_requests'
ORDER BY ordinal_position;

-- Check if transactions table exists
SELECT 'transactions table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Check investments table structure
SELECT 'investments table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'investments'
ORDER BY ordinal_position;

-- List all tables in public schema
SELECT 'All tables in public schema:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Test query to check data exists for a specific user
-- Replace 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4' with the actual user ID you're testing
SELECT 'Sample data check:' as info;

SELECT 'Transactions count:' as type, COUNT(*) as count
FROM transactions 
WHERE user_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'

UNION ALL

SELECT 'Investments count:' as type, COUNT(*) as count
FROM investments 
WHERE user_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4';

-- Check if foreign key relationships work for investments
SELECT 'Investment with property details:' as info;
SELECT i.id, i.user_id, i.shares_owned, i.total_investment, i.price_per_share,
       p.id as property_id, p.title, p.city, p.country
FROM investments i
LEFT JOIN properties p ON i.property_id = p.id
WHERE i.user_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'
LIMIT 5;