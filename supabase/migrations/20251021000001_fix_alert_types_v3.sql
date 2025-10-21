-- Fix user_alerts constraint to allow trade_completed alert type
-- Step 1: Drop the constraint
-- Step 2: Fix any existing invalid alert types
-- Step 3: Recreate the constraint with all valid types

-- First, drop the existing constraint so we can update rows
ALTER TABLE public.user_alerts
DROP CONSTRAINT IF EXISTS valid_alert_type;

-- Now fix any invalid alert types (if any exist)
DO $$
DECLARE
  invalid_alerts RECORD;
  v_count INTEGER;
BEGIN
  -- Find and migrate invalid alert types to 'system_notification'
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
    SELECT COUNT(*) INTO v_count
    FROM public.user_alerts
    WHERE alert_type = invalid_alerts.alert_type;

    RAISE NOTICE 'Found % alerts with type: %', v_count, invalid_alerts.alert_type;

    -- Migrate to system_notification
    UPDATE public.user_alerts
    SET alert_type = 'system_notification'
    WHERE alert_type = invalid_alerts.alert_type;

    RAISE NOTICE 'Migrated % alerts from "%" to "system_notification"', v_count, invalid_alerts.alert_type;
  END LOOP;
END $$;

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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Successfully updated valid_alert_type constraint';
  RAISE NOTICE 'Allowed types: hold_created, hold_confirmed, reservation_created, settlement_completed, trade_completed, order_expired, order_cancelled, investment_confirmed, dividend_received, withdrawal_completed, deposit_confirmed, system_notification, trade_executed, share_sold, share_purchased';
END $$;
