-- Debug Watchlist Issues
-- Run these queries in Supabase SQL Editor to troubleshoot

-- 1. Check if watchlist table exists and has data
SELECT 'Watchlist table check:' as debug_step;
SELECT * FROM watchlist ORDER BY added_at DESC LIMIT 10;

-- 2. Check your user ID (replace with your actual user ID if you know it)
SELECT 'Current authenticated user:' as debug_step;
SELECT auth.uid() as current_user_id;

-- 3. Check watchlist entries for your user (replace YOUR_USER_ID with your actual user ID)
SELECT 'Your watchlist entries:' as debug_step;
SELECT 
  w.*,
  p.title as property_title,
  p.city,
  p.property_status
FROM watchlist w
JOIN properties p ON p.id = w.property_id
WHERE w.user_id = auth.uid()  -- This will use your current session user ID
ORDER BY w.added_at DESC;

-- 4. Check if RLS policies are working correctly
SELECT 'RLS policies on watchlist:' as debug_step;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'watchlist';

-- 5. Check if you can insert into watchlist manually (test with a real property ID)
-- First, let's see available properties:
SELECT 'Available properties to test with:' as debug_step;
SELECT id, title, city, property_status FROM properties ORDER BY created_at DESC LIMIT 5;

-- 6. Test manual insert (replace PROPERTY_ID_HERE with an actual property ID from above)
-- INSERT INTO watchlist (user_id, property_id) 
-- VALUES (auth.uid(), 'PROPERTY_ID_HERE');

-- 7. Check if the insert worked
-- SELECT 'After manual insert:' as debug_step;
-- SELECT COUNT(*) as total_watchlist_items FROM watchlist WHERE user_id = auth.uid();