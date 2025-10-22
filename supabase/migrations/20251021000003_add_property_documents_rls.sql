-- Add RLS policies for property_documents table
-- Ensures only admins can upload and delete documents

-- Enable RLS if not already enabled
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "public_read_public_documents" ON public.property_documents;
DROP POLICY IF EXISTS "admin_read_all_documents" ON public.property_documents;
DROP POLICY IF EXISTS "admin_insert_documents" ON public.property_documents;
DROP POLICY IF EXISTS "admin_delete_documents" ON public.property_documents;

-- Policy 1: Anyone can read public documents
CREATE POLICY "public_read_public_documents" ON public.property_documents
  FOR SELECT
  USING (is_public = true);

-- Policy 2: Admins can read all documents (public and private)
CREATE POLICY "admin_read_all_documents" ON public.property_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Policy 3: Only admins can insert documents
CREATE POLICY "admin_insert_documents" ON public.property_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Policy 4: Only admins can delete documents
CREATE POLICY "admin_delete_documents" ON public.property_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Policy 5: Only admins can update documents
CREATE POLICY "admin_update_documents" ON public.property_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Grant permissions
GRANT SELECT ON public.property_documents TO authenticated;
GRANT SELECT ON public.property_documents TO anon;

COMMENT ON POLICY "public_read_public_documents" ON public.property_documents IS
'Allow anyone to read documents marked as public';

COMMENT ON POLICY "admin_read_all_documents" ON public.property_documents IS
'Allow admins to read all documents including private ones';

COMMENT ON POLICY "admin_insert_documents" ON public.property_documents IS
'Only admins can upload new documents';

COMMENT ON POLICY "admin_delete_documents" ON public.property_documents IS
'Only admins can delete documents';

COMMENT ON POLICY "admin_update_documents" ON public.property_documents IS
'Only admins can update document metadata';
