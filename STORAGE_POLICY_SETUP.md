# Supabase Storage Policy Setup Guide

## Property Documents Storage Configuration

### Step 1: Ensure Bucket Exists and is Public
1. Go to Supabase Dashboard → Storage
2. Find or create bucket: `property-documents`
3. Make sure "Public bucket" toggle is **ON**

### Step 2: Add Storage Policies

Go to Storage → property-documents → Policies

#### Policy 1: Public Access (Allow Downloads)
- **Name**: Public Access
- **Policy Type**: SELECT
- **Target roles**: authenticated, anon
- **Policy definition**:
```sql
bucket_id = 'property-documents'
```

#### Policy 2: Admin Upload Only
- **Name**: Admin Upload
- **Policy Type**: INSERT
- **Target roles**: authenticated
- **Policy definition**:
```sql
bucket_id = 'property-documents'
AND EXISTS (
  SELECT 1 FROM public.user_profiles
  WHERE user_id = auth.uid()
  AND is_admin = true
)
```

#### Policy 3: Admin Delete Only
- **Name**: Admin Delete
- **Policy Type**: DELETE
- **Target roles**: authenticated
- **Policy definition**:
```sql
bucket_id = 'property-documents'
AND EXISTS (
  SELECT 1 FROM public.user_profiles
  WHERE user_id = auth.uid()
  AND is_admin = true
)
```

#### Policy 4: Admin Update Only
- **Name**: Admin Update
- **Policy Type**: UPDATE
- **Target roles**: authenticated
- **Policy definition**:
```sql
bucket_id = 'property-documents'
AND EXISTS (
  SELECT 1 FROM public.user_profiles
  WHERE user_id = auth.uid()
  AND is_admin = true
)
```

### Alternative: Use Supabase CLI

If you have Supabase CLI installed, you can also create these policies via SQL:

```sql
-- Run these in Supabase SQL Editor or via CLI with proper permissions

-- Note: These use storage-specific policy syntax
-- You may need to adjust based on your Supabase version
```

### Verification

After setting up:
1. **As regular user**: Should be able to download documents
2. **As admin**: Should be able to upload, download, and delete documents
3. **As anonymous**: Should be able to download if bucket is public

### Troubleshooting

If downloads don't work:
- Check bucket is marked as "Public"
- Verify SELECT policy exists and allows public access
- Check browser console for CORS errors
- Ensure file URLs use the correct format: `https://[project].supabase.co/storage/v1/object/public/property-documents/[file-path]`
