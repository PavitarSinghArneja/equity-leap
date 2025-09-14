-- Database functions for Retreat Slice platform
-- Run these functions in your Supabase SQL editor

-- Function to create property alerts for all relevant users
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
  
  -- For 'shares_sellable' alerts, also notify waitlist users
  IF p_alert_type = 'shares_sellable' THEN
    INSERT INTO user_alerts (user_id, alert_type, title, message, property_id)
    SELECT DISTINCT 
      up.user_id,
      p_alert_type,
      p_title,
      p_message || ' As a waitlist member, you can purchase available shares.',
      p_property_id
    FROM user_profiles up
    WHERE up.tier = 'waitlist_player'
      AND up.user_id NOT IN (
        -- Exclude users who already have investments in this property
        SELECT DISTINCT user_id 
        FROM investments 
        WHERE property_id = p_property_id 
          AND investment_status = 'confirmed'
      );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically expire old share sell requests
CREATE OR REPLACE FUNCTION expire_old_sell_requests()
RETURNS VOID AS $$
BEGIN
  UPDATE share_sell_requests
  SET status = 'expired'
  WHERE status = 'active' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user tier based on investment portfolio
CREATE OR REPLACE FUNCTION calculate_user_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  total_investment DECIMAL := 0;
  user_tier TEXT := 'explorer';
BEGIN
  -- Calculate total investment amount
  SELECT COALESCE(SUM(total_investment), 0)
  INTO total_investment
  FROM investments
  WHERE user_id = p_user_id 
    AND investment_status = 'confirmed';
  
  -- Determine tier based on investment amount
  IF total_investment >= 10000000 THEN -- ₹1 Crore
    user_tier := 'large_investor';
  ELSIF total_investment >= 1000000 THEN -- ₹10 Lakhs
    user_tier := 'small_investor';
  ELSE
    user_tier := 'explorer';
  END IF;
  
  RETURN user_tier;
END;
$$ LANGUAGE plpgsql;

-- Function to update user tier after investment
CREATE OR REPLACE FUNCTION update_user_tier_after_investment()
RETURNS TRIGGER AS $$
DECLARE
  new_tier TEXT;
BEGIN
  -- Calculate new tier
  SELECT calculate_user_tier(NEW.user_id) INTO new_tier;
  
  -- Update user profile if not overridden by admin
  UPDATE user_profiles 
  SET tier = new_tier::user_tier,
      updated_at = NOW()
  WHERE user_id = NEW.user_id 
    AND (tier_override_by_admin IS NULL OR tier_override_by_admin = FALSE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic tier updates
DROP TRIGGER IF EXISTS investment_tier_update_trigger ON investments;
CREATE TRIGGER investment_tier_update_trigger
  AFTER INSERT OR UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tier_after_investment();

-- Function to create audit trail entry
CREATE OR REPLACE FUNCTION create_audit_entry(
  p_user_id UUID,
  p_action_type TEXT,
  p_description TEXT,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_audit_trail (
    user_id,
    action_type,
    description,
    related_entity_type,
    related_entity_id,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_action_type,
    p_description,
    p_related_entity_type,
    p_related_entity_id,
    p_metadata,
    inet_client_addr(), -- Current client IP
    current_setting('request.headers')::json->>'user-agent' -- User agent if available
  );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_property_alert TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_sell_requests TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_tier TO authenticated;
GRANT EXECUTE ON FUNCTION create_audit_entry TO authenticated;
