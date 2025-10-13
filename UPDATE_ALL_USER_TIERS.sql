-- Update tiers for ALL existing users based on new logic
-- This will immediately promote anyone with investments to small_investor

DO $$
DECLARE
  user_record RECORD;
  v_total_invested DECIMAL(15,2);
  v_wallet_balance DECIMAL(15,2);
  v_new_tier user_tier;
BEGIN
  -- Loop through all users
  FOR user_record IN
    SELECT DISTINCT user_id FROM user_profiles
  LOOP
    -- Calculate total investment for this user
    SELECT COALESCE(SUM(inv.total_investment), 0) INTO v_total_invested
    FROM investments inv
    WHERE inv.user_id = user_record.user_id
      AND inv.investment_status = 'confirmed';

    -- Check wallet balance
    SELECT COALESCE(available_balance, 0) INTO v_wallet_balance
    FROM escrow_balances
    WHERE user_id = user_record.user_id;

    -- Determine new tier
    IF v_total_invested >= 10000000 THEN
      v_new_tier := 'large_investor';
    ELSIF v_total_invested > 0 THEN
      v_new_tier := 'small_investor';
    ELSIF v_wallet_balance > 0 THEN
      v_new_tier := 'waitlist_player';
    ELSE
      v_new_tier := 'explorer';
    END IF;

    -- Update the user's tier
    UPDATE user_profiles
    SET tier = v_new_tier, updated_at = now()
    WHERE user_id = user_record.user_id;

    RAISE NOTICE 'Updated user % to tier %', user_record.user_id, v_new_tier;
  END LOOP;
END $$;

-- Show results
SELECT
  up.user_id,
  up.full_name,
  up.tier,
  COALESCE(SUM(inv.total_investment), 0) as total_invested,
  COALESCE(eb.available_balance, 0) as wallet_balance
FROM user_profiles up
LEFT JOIN investments inv ON inv.user_id = up.user_id AND inv.investment_status = 'confirmed'
LEFT JOIN escrow_balances eb ON eb.user_id = up.user_id
GROUP BY up.user_id, up.full_name, up.tier, eb.available_balance
ORDER BY total_invested DESC;
