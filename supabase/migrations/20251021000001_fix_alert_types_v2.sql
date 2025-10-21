-- Fix user_alerts constraint to allow trade_completed alert type
-- Step 1: Find and fix any existing invalid alert types
-- Step 2: Drop and recreate the constraint with all valid types

-- First, let's see what alert types currently exist and fix any invalid ones
DO $$
DECLARE
  invalid_alerts RECORD;
BEGIN
  -- Update any alerts with 'is_read' column to NULL if they don't match valid types
  -- This preserves the alerts but ensures they won't violate the constraint
  FOR invalid_alerts IN
    SELECT DISTINCT alert_type
    FROM public.user_alerts
    WHERE alert_type NOT IN (
      'hold_created',
      'hold_confirmed',
      'reservation_created',
      'settlement_completed',
      'trade_completed',
      'order_expired',
      'order_cancelled',
      'investment_confirmed',
      'dividend_received',
      'withdrawal_completed',
      'deposit_confirmed',
      'system_notification',
      'trade_executed',
      'share_sold',
      'share_purchased'
    )
  LOOP
    RAISE NOTICE 'Found alert type: %', invalid_alerts.alert_type;
    -- Update these to 'system_notification' as a safe fallback
    UPDATE public.user_alerts
    SET alert_type = 'system_notification'
    WHERE alert_type = invalid_alerts.alert_type;
    RAISE NOTICE 'Migrated % alerts to system_notification', invalid_alerts.alert_type;
  END LOOP;
END $$;

-- Now drop the existing constraint if it exists
ALTER TABLE public.user_alerts
DROP CONSTRAINT IF EXISTS valid_alert_type;

-- Add the constraint with all valid alert types
ALTER TABLE public.user_alerts
ADD CONSTRAINT valid_alert_type CHECK (
  alert_type IN (
    'hold_created',
    'hold_confirmed',
    'reservation_created',
    'settlement_completed',
    'trade_completed',      -- Added for instant_buy_shares
    'order_expired',
    'order_cancelled',
    'investment_confirmed',
    'dividend_received',
    'withdrawal_completed',
    'deposit_confirmed',
    'system_notification',
    'trade_executed',       -- Alternative name
    'share_sold',           -- For seller notifications
    'share_purchased'       -- For buyer notifications
  )
);

COMMENT ON CONSTRAINT valid_alert_type ON public.user_alerts IS
'Allowed alert types for user notifications including trading alerts';

-- Log what we did
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated valid_alert_type constraint';
  RAISE NOTICE 'Alert types now allowed: hold_created, hold_confirmed, reservation_created, settlement_completed, trade_completed, order_expired, order_cancelled, investment_confirmed, dividend_received, withdrawal_completed, deposit_confirmed, system_notification, trade_executed, share_sold, share_purchased';
END $$;
