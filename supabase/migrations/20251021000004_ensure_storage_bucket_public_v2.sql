-- Ensure property-documents storage bucket exists and is public
-- This allows users to download documents

-- Note: The bucket should be created via Supabase Dashboard or CLI
-- Storage policies are managed through Supabase Dashboard under Storage → Policies

-- This migration just ensures the bucket configuration
DO $$
BEGIN
  -- Insert bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('property-documents', 'property-documents', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

  RAISE NOTICE 'Property documents bucket configured as public';
  RAISE NOTICE 'Please ensure the following storage policies are set in Supabase Dashboard:';
  RAISE NOTICE '1. Public Access (SELECT): Allow anyone to download files';
  RAISE NOTICE '2. Admin Upload (INSERT): Only admins can upload';
  RAISE NOTICE '3. Admin Delete (DELETE): Only admins can delete';
  RAISE NOTICE '4. Admin Update (UPDATE): Only admins can update';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update bucket configuration - may already exist';
    RAISE NOTICE 'Please verify bucket "property-documents" is set to public in Supabase Dashboard';
END $$;
