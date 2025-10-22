-- Ensure property-documents storage bucket exists and is public
-- This allows users to download documents

-- Create the bucket if it doesn't exist (will fail silently if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-documents', 'property-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Set up storage policies for property-documents bucket
-- Policy 1: Anyone can download/view files (public read)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-documents');

-- Policy 2: Only admins can upload files
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
CREATE POLICY "Admin Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- Policy 3: Only admins can delete files
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- Policy 4: Only admins can update files
DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
CREATE POLICY "Admin Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

COMMENT ON POLICY "Public Access" ON storage.objects IS
'Allow anyone to download files from property-documents bucket';

COMMENT ON POLICY "Admin Upload" ON storage.objects IS
'Only admins can upload files to property-documents bucket';

COMMENT ON POLICY "Admin Delete" ON storage.objects IS
'Only admins can delete files from property-documents bucket';

COMMENT ON POLICY "Admin Update" ON storage.objects IS
'Only admins can update files in property-documents bucket';
