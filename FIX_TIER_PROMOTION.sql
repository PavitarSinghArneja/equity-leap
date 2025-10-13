-- Fix tier promotion logic
-- Anyone with ANY investment should be promoted to premium dashboard
-- Only users with NO investments but money in wallet should be waitlist_player

-- 1. Fix update_user_tier function
CREATE OR REPLACE FUNCTION public.update_user_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_invested DECIMAL(15,2);
  v_wallet_balance DECIMAL(15,2);
  user_tier_new user_tier;
BEGIN
  -- Calculate total invested amount for the user
  SELECT COALESCE(SUM(inv.total_investment), 0) INTO v_total_invested
  FROM public.investments inv
  WHERE inv.user_id = NEW.user_id AND inv.investment_status = 'confirmed';

  -- Check wallet balance
  SELECT COALESCE(available_balance, 0) INTO v_wallet_balance
  FROM public.escrow_balances
  WHERE user_id = NEW.user_id;

  -- Determine tier based on investment amount
  IF v_total_invested >= 10000000 THEN
    -- ₹1 Crore+ = large investor
    user_tier_new := 'large_investor';
  ELSIF v_total_invested > 0 THEN
    -- ANY investment = small investor (premium dashboard)
    user_tier_new := 'small_investor';
  ELSIF v_wallet_balance > 0 THEN
    -- No investments but has wallet balance = waitlist player
    user_tier_new := 'waitlist_player';
  ELSE
    -- No investments and no wallet balance = explorer
    user_tier_new := 'explorer';
  END IF;

  -- Update user tier
  UPDATE public.user_profiles
  SET tier = user_tier_new, updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$function$;

-- 2. Fix calculate_user_tier function
CREATE OR REPLACE FUNCTION public.calculate_user_tier(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_total_investment DECIMAL := 0;
  v_wallet_balance DECIMAL := 0;
  v_user_tier TEXT := 'explorer';
BEGIN
  -- Calculate total investment amount
  SELECT COALESCE(SUM(inv.total_investment), 0)
  INTO v_total_investment
  FROM investments inv
  WHERE inv.user_id = p_user_id
    AND inv.investment_status = 'confirmed';

  -- Check wallet balance
  SELECT COALESCE(available_balance, 0) INTO v_wallet_balance
  FROM escrow_balances
  WHERE user_id = p_user_id;

  -- Determine tier based on investment amount
  IF v_total_investment >= 10000000 THEN
    -- ₹1 Crore+ = large investor
    v_user_tier := 'large_investor';
  ELSIF v_total_investment > 0 THEN
    -- ANY investment = small investor (premium dashboard)
    v_user_tier := 'small_investor';
  ELSIF v_wallet_balance > 0 THEN
    -- No investments but has wallet balance = waitlist player
    v_user_tier := 'waitlist_player';
  ELSE
    -- No investments and no wallet balance = explorer
    v_user_tier := 'explorer';
  END IF;

  RETURN v_user_tier;
END;
$function$;
