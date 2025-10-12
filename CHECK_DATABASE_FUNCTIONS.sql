-- Check the database functions that handle buy/sell flow
-- to understand if remaining_shares is being updated

-- 1. Check create_buyer_hold function
SELECT pg_get_functiondef('create_buyer_hold'::regproc);

-- 2. Check buyer_confirm_hold function
SELECT pg_get_functiondef('buyer_confirm_hold'::regproc);

-- 3. Check seller_confirm_hold function
SELECT pg_get_functiondef('seller_confirm_hold'::regproc);

-- 4. Check cancel_hold function
SELECT pg_get_functiondef('cancel_hold'::regproc);
