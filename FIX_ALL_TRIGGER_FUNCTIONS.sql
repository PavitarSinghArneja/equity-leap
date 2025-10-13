-- Fix ALL trigger functions to avoid ambiguous column references

-- 1. Fix update_user_tier function
CREATE OR REPLACE FUNCTION public.update_user_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_invested DECIMAL(15,2);
  user_tier_new user_tier;
BEGIN
  -- Calculate total invested amount for the user using explicit variable
  SELECT COALESCE(SUM(inv.total_investment), 0) INTO v_total_invested
  FROM public.investments inv
  WHERE inv.user_id = NEW.user_id AND inv.investment_status = 'confirmed';

  -- Determine tier based on investment amount
  IF v_total_invested = 0 THEN
    user_tier_new := 'explorer';
  ELSIF v_total_invested > 0 AND v_total_invested <= 10000 THEN
    user_tier_new := 'waitlist_player';
  ELSIF v_total_invested > 10000 AND v_total_invested <= 100000 THEN
    user_tier_new := 'small_investor';
  ELSE
    user_tier_new := 'large_investor';
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
  v_user_tier TEXT := 'explorer';
BEGIN
  -- Calculate total investment amount using explicit variable
  SELECT COALESCE(SUM(inv.total_investment), 0)
  INTO v_total_investment
  FROM investments inv
  WHERE inv.user_id = p_user_id
    AND inv.investment_status = 'confirmed';

  -- Determine tier based on investment amount
  IF v_total_investment >= 10000000 THEN -- ₹1 Crore
    v_user_tier := 'large_investor';
  ELSIF v_total_investment >= 1000000 THEN -- ₹10 Lakhs
    v_user_tier := 'small_investor';
  ELSE
    v_user_tier := 'explorer';
  END IF;

  RETURN v_user_tier;
END;
$function$;
