-- Migration: Add Trading Transaction Types to Enum
-- Purpose: Add 'share_purchase' and 'share_sale' to transaction_type enum
-- Required for instant_buy_shares() function to work correctly

-- Add new enum values for secondary market trading
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'share_purchase';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'share_sale';

-- Add comment
COMMENT ON TYPE transaction_type IS
'Transaction types: deposit, withdrawal, investment, dividend, fee, share_purchase, share_sale';
