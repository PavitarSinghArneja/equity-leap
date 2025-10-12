-- Auto-update sell request status when remaining_shares reaches 0
-- This ensures listings are marked as 'sold_out' automatically

-- Create trigger function
CREATE OR REPLACE FUNCTION trg_update_sell_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When remaining_shares reaches 0, mark as sold_out
  IF NEW.remaining_shares = 0 AND NEW.status = 'active' THEN
    NEW.status := 'sold_out';
    NEW.updated_at := now();
  END IF;

  -- When remaining_shares is restored (e.g., after hold cancellation)
  -- and was sold_out, reactivate if not expired
  IF NEW.remaining_shares > 0 AND OLD.remaining_shares = 0 AND OLD.status = 'sold_out' THEN
    IF NEW.expires_at > now() THEN
      NEW.status := 'active';
      NEW.updated_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_sell_request_status_trigger ON share_sell_requests;

-- Create the trigger
CREATE TRIGGER update_sell_request_status_trigger
  BEFORE UPDATE OF remaining_shares
  ON share_sell_requests
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_sell_request_status();

-- Also update any existing records that should be sold_out
UPDATE share_sell_requests
SET status = 'sold_out',
    updated_at = now()
WHERE remaining_shares = 0
  AND status = 'active';

-- Verify the fix
SELECT
  id,
  shares_to_sell,
  remaining_shares,
  status,
  updated_at
FROM share_sell_requests
WHERE seller_id = 'a43eb7fb-ae96-4c0b-b89c-f91ddb174ce4'
  AND property_id = 'c9e6e4e1-aad8-4526-9f21-277f7e96a685'
ORDER BY created_at DESC;
