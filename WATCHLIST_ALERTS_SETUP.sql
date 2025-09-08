-- Watchlist Alert System Setup
-- Run these queries in your Supabase SQL editor

-- 1. Function to create watchlist alerts when shares become available for sold-out properties
CREATE OR REPLACE FUNCTION create_watchlist_share_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create alerts for active sell requests
  IF NEW.status = 'active' THEN
    -- Create alerts for users who have this property in their watchlist
    INSERT INTO user_alerts (user_id, alert_type, title, message, property_id, created_at)
    SELECT 
      w.user_id,
      'shares_sellable',
      p.title || ' - Shares Available!',
      'Great news! A property from your watchlist now has shares available for purchase. An investor is selling ' || 
      NEW.shares_to_sell || ' shares at ₹' || NEW.price_per_share || ' each. Act fast before someone else buys them!',
      NEW.property_id,
      NOW()
    FROM watchlist w
    JOIN properties p ON p.id = w.property_id
    WHERE w.property_id = NEW.property_id
      AND p.property_status = 'funded' -- Only for sold-out properties
      AND p.shares_sellable = true; -- Only if shares are sellable

    -- Also create audit trail entries for the alerts created
    INSERT INTO user_audit_trail (user_id, action_type, description, related_entity_type, related_entity_id, metadata)
    SELECT 
      w.user_id,
      'watchlist_alert_created',
      'Watchlist alert created for ' || p.title || ' - shares now available',
      'property',
      NEW.property_id,
      jsonb_build_object(
        'sell_request_id', NEW.id,
        'shares_available', NEW.shares_to_sell,
        'price_per_share', NEW.price_per_share,
        'alert_type', 'shares_sellable'
      )
    FROM watchlist w
    JOIN properties p ON p.id = w.property_id
    WHERE w.property_id = NEW.property_id
      AND p.property_status = 'funded'
      AND p.shares_sellable = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger for watchlist alerts when sell requests are created
DROP TRIGGER IF EXISTS watchlist_alert_trigger ON share_sell_requests;
CREATE TRIGGER watchlist_alert_trigger
  AFTER INSERT ON share_sell_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_watchlist_share_alert();

-- 3. Function to clean up alerts when sell requests are completed/cancelled
CREATE OR REPLACE FUNCTION cleanup_watchlist_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark related alerts as read when sell request is no longer active
  IF OLD.status = 'active' AND NEW.status IN ('completed', 'cancelled', 'expired') THEN
    UPDATE user_alerts 
    SET is_read = true 
    WHERE property_id = NEW.property_id 
      AND alert_type = 'shares_sellable'
      AND created_at >= (NEW.created_at - INTERVAL '1 day') -- Only recent alerts related to this request
      AND is_read = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for cleaning up alerts
DROP TRIGGER IF EXISTS cleanup_watchlist_alerts_trigger ON share_sell_requests;
CREATE TRIGGER cleanup_watchlist_alerts_trigger
  AFTER UPDATE ON share_sell_requests
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_watchlist_alerts();

-- 5. Enhanced function to create property alerts (updated version)
CREATE OR REPLACE FUNCTION create_property_alert(
  p_property_id UUID,
  p_alert_type TEXT,
  p_title TEXT,
  p_message TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Create alerts for users who have invested in this property
  INSERT INTO user_alerts (user_id, alert_type, title, message, property_id)
  SELECT DISTINCT 
    i.user_id,
    p_alert_type,
    p_title,
    p_message,
    p_property_id
  FROM investments i
  WHERE i.property_id = p_property_id
    AND i.investment_status = 'confirmed';
  
  -- For 'shares_sellable' alerts, also notify watchlist users
  IF p_alert_type = 'shares_sellable' THEN
    INSERT INTO user_alerts (user_id, alert_type, title, message, property_id)
    SELECT DISTINCT 
      w.user_id,
      p_alert_type,
      p_title,
      p_message || ' This property is in your watchlist.',
      p_property_id
    FROM watchlist w
    WHERE w.property_id = p_property_id
      AND w.user_id NOT IN (
        -- Exclude users who already have investments in this property
        SELECT DISTINCT user_id 
        FROM investments 
        WHERE property_id = p_property_id 
          AND investment_status = 'confirmed'
      );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to get watchlist properties with available shares
CREATE OR REPLACE FUNCTION get_watchlist_with_available_shares(p_user_id UUID)
RETURNS TABLE (
  watchlist_id UUID,
  property_id UUID,
  property_title TEXT,
  has_available_shares BOOLEAN,
  available_share_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id as watchlist_id,
    w.property_id,
    p.title as property_title,
    CASE 
      WHEN p.property_status = 'funded' AND p.shares_sellable = true AND EXISTS (
        SELECT 1 FROM share_sell_requests sr 
        WHERE sr.property_id = w.property_id 
          AND sr.status = 'active'
          AND sr.expires_at > NOW()
      ) THEN true
      ELSE false
    END as has_available_shares,
    COALESCE((
      SELECT SUM(sr.shares_to_sell)
      FROM share_sell_requests sr 
      WHERE sr.property_id = w.property_id 
        AND sr.status = 'active'
        AND sr.expires_at > NOW()
    ), 0)::INTEGER as available_share_count
  FROM watchlist w
  JOIN properties p ON p.id = w.property_id
  WHERE w.user_id = p_user_id
  ORDER BY w.added_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION create_watchlist_share_alert TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_watchlist_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION get_watchlist_with_available_shares TO authenticated;

-- 8. Create some sample data for testing (optional - run only if you want test data)
-- Insert a sample property that's sold out but allows share selling
INSERT INTO properties (
  id,
  title,
  description,
  city,
  country,
  address,
  property_type,
  total_value,
  share_price,
  minimum_investment,
  maximum_investment,
  expected_annual_return,
  funding_goal,
  funded_amount,
  available_shares,
  property_status,
  shares_sellable,
  images
) VALUES (
  gen_random_uuid(),
  'Premium Office Complex - Mumbai',
  'Grade-A office space in Bandra Kurla Complex with high rental yields and excellent appreciation potential.',
  'Mumbai',
  'India',
  'Bandra Kurla Complex, Mumbai, Maharashtra',
  'Commercial',
  50000000,
  25000,
  250000,
  2500000,
  14.5,
  50000000,
  50000000, -- Fully funded
  0, -- No shares available for new investment
  'funded',
  true, -- Shares are sellable
  ARRAY['/village-aerial.jpg']
) ON CONFLICT DO NOTHING;

-- Check if the setup worked
SELECT 'Watchlist alert system setup complete!' as status;