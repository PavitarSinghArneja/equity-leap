# Supabase Storage Bucket Setup

## Issue: Image Upload Failing

The image upload is failing because the storage bucket doesn't exist in your Supabase project.

## Quick Fix: Create Storage Bucket

### Step 1: Create Bucket
1. Go to your **Supabase Dashboard**
2. Click **"Storage"** in the left sidebar
3. Click **"New Bucket"**
4. **Bucket name**: `property-images`
5. **Public bucket**: ✅ **Check this box** (so images can be viewed publicly)
6. Click **"Create Bucket"**

### Step 2: Set Bucket Policies (Important!)
After creating the bucket, you need to set policies:

1. **Click on the `property-images` bucket**
2. **Go to "Policies" tab**
3. **Add these policies**:

#### Policy 1: Allow Authenticated Users to Upload
```sql
-- Policy Name: "Allow authenticated users to upload"
-- Operation: INSERT
-- Target roles: authenticated

-- Policy Definition:
auth.role() = 'authenticated'
```

#### Policy 2: Allow Public Access to View Images
```sql
-- Policy Name: "Allow public access to images"  
-- Operation: SELECT
-- Target roles: anon, authenticated

-- Policy Definition:
true
```

### Step 3: Alternative - SQL Method
Or run this SQL in **SQL Editor**:

```sql
-- Create the storage bucket policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-images');

-- Allow public access to view images
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'property-images');
```

## After Setup:
1. **Refresh your application**
2. **Try uploading an image** 
3. **The error notification should be gone**
4. **Images will upload and display properly**

## Troubleshooting:
- If you still get errors, check the **Storage > Settings** page
- Make sure **RLS is enabled** on storage.objects
- Verify the bucket is **public** (checkbox should be checked)