# Supabase RLS Policy Setup

## Issue: Property Creation Forbidden (403 Error)

The error `new row violates row-level security policy for table "properties"` means the RLS policy is blocking admin property creation.

## Fix: Update RLS Policies in Supabase

### 1. Go to Supabase Dashboard

1. Open your Supabase project dashboard
2. Navigate to **Authentication** > **Policies**
3. Find the `properties` table

### 2. Create/Update Properties Table Policies

Add these RLS policies for the `properties` table:

#### Policy 1: Allow Admins to Insert Properties
```sql
-- Policy Name: "Admin can insert properties"
-- Operation: INSERT
-- Target roles: authenticated

-- Policy Definition:
EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE user_profiles.user_id = auth.uid() 
  AND user_profiles.is_admin = true
)
```

#### Policy 2: Allow Public Read Access for Properties
```sql
-- Policy Name: "Public can view properties"
-- Operation: SELECT
-- Target roles: anon, authenticated

-- Policy Definition:
true
```

#### Policy 3: Allow Admins to Update Properties
```sql
-- Policy Name: "Admin can update properties"
-- Operation: UPDATE
-- Target roles: authenticated

-- Policy Definition:
EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE user_profiles.user_id = auth.uid() 
  AND user_profiles.is_admin = true
)
```

#### Policy 4: Allow Admins to Delete Properties
```sql
-- Policy Name: "Admin can delete properties"
-- Operation: DELETE
-- Target roles: authenticated

-- Policy Definition:
EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE user_profiles.user_id = auth.uid() 
  AND user_profiles.is_admin = true
)
```

### 3. Storage Bucket Policies (for Property Images)

For the `property-images` storage bucket:

#### Policy 1: Allow Admins to Upload Images
```sql
-- Policy Name: "Admin can upload property images"
-- Operation: INSERT
-- Target roles: authenticated

-- Policy Definition:
EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE user_profiles.user_id = auth.uid() 
  AND user_profiles.is_admin = true
)
```

#### Policy 2: Allow Public Read Access for Images
```sql
-- Policy Name: "Public can view property images"  
-- Operation: SELECT
-- Target roles: anon, authenticated

-- Policy Definition:
true
```

### 4. Verify User Profiles Table

Make sure your `user_profiles` table has:

1. **RLS enabled**
2. **Policies that allow reading admin status**:

```sql
-- Policy Name: "Users can view their own profile"
-- Operation: SELECT
-- Target roles: authenticated

-- Policy Definition:
auth.uid() = user_id
```

```sql
-- Policy Name: "Users can update their own profile"
-- Operation: UPDATE
-- Target roles: authenticated

-- Policy Definition:
auth.uid() = user_id
```

### 5. Quick SQL Commands (Alternative Method)

If you prefer SQL, run these commands in the Supabase SQL Editor:

```sql
-- Enable RLS on properties table
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create admin insert policy
CREATE POLICY "Admin can insert properties" ON properties
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);

-- Create public select policy
CREATE POLICY "Public can view properties" ON properties
FOR SELECT TO anon, authenticated
USING (true);

-- Create admin update policy
CREATE POLICY "Admin can update properties" ON properties
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);

-- Create admin delete policy
CREATE POLICY "Admin can delete properties" ON properties
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);
```

## Troubleshooting

### Still Getting 403 Error?

1. **Check if user is marked as admin**:
   - Go to Supabase > Table Editor > user_profiles
   - Find your user and ensure `is_admin` is set to `true`

2. **Verify RLS is properly configured**:
   - All policies should reference `user_profiles.is_admin = true`
   - Policies should use `auth.uid()` to get current user

3. **Check table structure**:
   - Ensure `properties` table has `created_by` column
   - Ensure `user_profiles` table has `is_admin` boolean column

4. **Test with SQL Editor**:
   ```sql
   -- Test if current user is admin
   SELECT * FROM user_profiles WHERE user_id = auth.uid() AND is_admin = true;
   
   -- Test property insertion (replace values)
   INSERT INTO properties (title, description, city, country, created_by) 
   VALUES ('Test Property', 'Test Description', 'Test City', 'India', auth.uid());
   ```

## After Setting Up Policies

1. **Refresh your application**
2. **Try creating a property again**
3. **Check the browser console** - the 403 error should be gone
4. **Verify property appears** in the properties list

The key is ensuring your user account has `is_admin = true` in the `user_profiles` table and the RLS policies properly check this condition.