-- Debug: Check the actual state of a sell request after someone bought shares
-- Replace with your actual sell request ID

-- 1. Check the sell request details
SELECT
  id,
  seller_id,
  property_id,
  shares_to_sell,
  remaining_shares,
  price_per_share,
  status,
  created_at,
  updated_at
FROM share_sell_requests
WHERE property_id = 'c9e6e4e1-aad8-4526-9f21-277f7e96a685'
  AND seller_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if there are any active holds for this sell request
SELECT
  h.id as hold_id,
  h.order_id,
  h.buyer_id,
  h.seller_id,
  h.shares,
  h.buyer_confirmed,
  h.seller_confirmed,
  h.hold_status,
  h.hold_expires_at,
  h.created_at,
  ssr.remaining_shares as order_remaining_shares
FROM share_buyer_holds h
JOIN share_sell_requests ssr ON ssr.id = h.order_id
WHERE ssr.property_id = 'c9e6e4e1-aad8-4526-9f21-277f7e96a685'
  AND ssr.seller_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'
ORDER BY h.created_at DESC
LIMIT 10;

-- 3. Check if remaining_shares needs to be updated when all shares are held
-- This query will show if the status should be changed to 'completed' or 'sold_out'
SELECT
  id,
  shares_to_sell,
  remaining_shares,
  status,
  CASE
    WHEN remaining_shares = 0 AND status = 'active' THEN 'SHOULD_BE_SOLD_OUT'
    WHEN remaining_shares > 0 AND status = 'active' THEN 'CORRECTLY_ACTIVE'
    ELSE status
  END as suggested_status
FROM share_sell_requests
WHERE property_id = 'c9e6e4e1-aad8-4526-9f21-277f7e96a685'
  AND seller_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'
ORDER BY created_at DESC;
