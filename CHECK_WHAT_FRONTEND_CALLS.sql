-- Check what's actually being called by looking at recent events

-- 1. Check recent share_order_events to see what functions are being called
SELECT
  event_type,
  actor_id,
  metadata,
  created_at
FROM share_order_events
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check share_buyer_holds table to see if holds are still being created
SELECT
  id,
  buyer_id,
  shares,
  hold_status,
  buyer_confirmed,
  seller_confirmed,
  created_at
FROM share_buyer_holds
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if instant_buy_shares function exists and is accessible
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.proacl AS permissions
FROM pg_proc p
WHERE p.proname = 'instant_buy_shares';
