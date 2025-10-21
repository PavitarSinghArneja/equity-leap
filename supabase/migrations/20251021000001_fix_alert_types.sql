-- Fix user_alerts constraint to allow trade_completed alert type
-- The instant_buy_shares function creates alerts with type 'trade_completed'
-- but the constraint doesn't allow it

-- First, drop the existing constraint if it exists
ALTER TABLE public.user_alerts
DROP CONSTRAINT IF EXISTS valid_alert_type;

-- Add the constraint with all valid alert types including trade_completed
ALTER TABLE public.user_alerts
ADD CONSTRAINT valid_alert_type CHECK (
  alert_type IN (
    'hold_created',
    'hold_confirmed',
    'reservation_created',
    'settlement_completed',
    'trade_completed',  -- Added for instant_buy_shares
    'order_expired',
    'order_cancelled',
    'investment_confirmed',
    'dividend_received',
    'withdrawal_completed',
    'deposit_confirmed',
    'system_notification'
  )
);

COMMENT ON CONSTRAINT valid_alert_type ON public.user_alerts IS
'Allowed alert types for user notifications including trading alerts';
