-- Fix security warnings by properly recreating functions with search_path

-- Drop trigger first, then function, then recreate both
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_tier_on_investment ON public.investments;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_tier() CASCADE;

-- Recreate handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email)
  VALUES (new.id, new.email);
  
  INSERT INTO public.escrow_balances (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;

-- Recreate update_user_tier function with proper search_path
CREATE OR REPLACE FUNCTION public.update_user_tier()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  total_invested DECIMAL(15,2);
  user_tier_new user_tier;
BEGIN
  -- Calculate total invested amount for the user
  SELECT COALESCE(SUM(total_investment), 0) INTO total_invested
  FROM public.investments
  WHERE user_id = NEW.user_id AND investment_status = 'confirmed';
  
  -- Determine tier based on investment amount
  IF total_invested = 0 THEN
    user_tier_new := 'explorer';
  ELSIF total_invested > 0 AND total_invested <= 10000 THEN
    user_tier_new := 'waitlist_player';
  ELSIF total_invested > 10000 AND total_invested <= 100000 THEN
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
$$;

-- Recreate triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_tier_on_investment
  AFTER INSERT OR UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.update_user_tier();