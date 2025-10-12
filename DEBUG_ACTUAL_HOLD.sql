-- Check what the actual hold looks like in the database

-- 1. Check the most recent hold
SELECT
  h.id,
  h.order_id,
  h.buyer_id,
  h.shares,
  h.hold_status,
  h.buyer_confirmed,
  h.seller_confirmed,
  h.hold_expires_at,
  h.created_at,
  ssr.seller_id,
  ssr.property_id,
  ssr.price_per_share,
  ssr.status as order_status,
  p.title as property_title
FROM share_buyer_holds h
JOIN share_sell_requests ssr ON ssr.id = h.order_id
JOIN properties p ON p.id = ssr.property_id
WHERE ssr.seller_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'
ORDER BY h.created_at DESC
LIMIT 5;

-- 2. Check what the PendingHolds query would actually return
SELECT
  h.*,
  ssr.seller_id,
  ssr.property_id,
  ssr.price_per_share,
  p.title
FROM share_buyer_holds h
JOIN share_sell_requests ssr ON ssr.id = h.order_id
JOIN properties p ON p.id = ssr.property_id
WHERE ssr.seller_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'
  AND h.hold_status = 'buyer_confirmed'
  AND h.buyer_confirmed = true
  AND h.seller_confirmed = false
ORDER BY h.created_at DESC;
