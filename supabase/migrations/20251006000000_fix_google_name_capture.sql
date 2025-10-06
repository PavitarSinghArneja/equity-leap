-- Fix: Capture full_name from Google OAuth metadata when creating user profiles
-- This ensures users see their actual name instead of "No Name"

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_full_name TEXT;
BEGIN
  -- Extract full name from Google OAuth metadata if available
  -- Google provides: raw_user_meta_data->>'full_name' or raw_user_meta_data->>'name'
  user_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    NULL
  );

  -- Create user profile with name from OAuth
  INSERT INTO public.user_profiles (user_id, email, full_name)
  VALUES (new.id, new.email, user_full_name);

  -- Create escrow balance entry
  INSERT INTO public.escrow_balances (user_id)
  VALUES (new.id);

  RETURN new;
END;
$$;

-- Recreate the trigger (in case it was dropped)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing users with null names from their auth.users metadata
UPDATE public.user_profiles up
SET full_name = COALESCE(
  au.raw_user_meta_data->>'full_name',
  au.raw_user_meta_data->>'name'
),
updated_at = now()
FROM auth.users au
WHERE up.user_id = au.id
  AND up.full_name IS NULL
  AND (
    au.raw_user_meta_data->>'full_name' IS NOT NULL
    OR au.raw_user_meta_data->>'name' IS NOT NULL
  );
