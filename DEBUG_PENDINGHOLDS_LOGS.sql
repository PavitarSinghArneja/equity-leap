-- Debug why PendingHolds is still showing empty

-- 1. Check if there are any holds with the exact status we're filtering for
SELECT
  COUNT(*) as total_holds,
  COUNT(CASE WHEN hold_status = 'buyer_confirmed' THEN 1 END) as buyer_confirmed_holds,
  COUNT(CASE WHEN buyer_confirmed = true AND seller_confirmed = false THEN 1 END) as needs_seller_approval
FROM share_buyer_holds;

-- 2. Check the most recent hold details
SELECT
  h.id,
  h.order_id,
  h.hold_status,
  h.buyer_confirmed,
  h.seller_confirmed,
  h.created_at,
  ssr.seller_id,
  ssr.property_id
FROM share_buyer_holds h
JOIN share_sell_requests ssr ON ssr.id = h.order_id
ORDER BY h.created_at DESC
LIMIT 3;

-- 3. Check for this specific seller
SELECT
  h.*,
  ssr.seller_id,
  ssr.property_id,
  p.title
FROM share_buyer_holds h
JOIN share_sell_requests ssr ON ssr.id = h.order_id
JOIN properties p ON p.id = ssr.property_id
WHERE ssr.seller_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'
  AND h.buyer_confirmed = true
  AND h.seller_confirmed = false
ORDER BY h.created_at DESC;
