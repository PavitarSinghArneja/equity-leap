-- COMPLETE SQL COMMANDS FOR SUPABASE
-- Copy and paste these commands into Supabase SQL Editor

-- 1. Enable RLS on properties table (if not already enabled)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admin can insert properties" ON properties;
DROP POLICY IF EXISTS "Public can view properties" ON properties;
DROP POLICY IF EXISTS "Admin can update properties" ON properties;
DROP POLICY IF EXISTS "Admin can delete properties" ON properties;

-- 3. Create policy for ADMINS to INSERT properties
CREATE POLICY "Admin can insert properties" 
ON properties 
AS PERMISSIVE 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);

-- 4. Create policy for EVERYONE to SELECT (view) properties
CREATE POLICY "Public can view properties" 
ON properties 
AS PERMISSIVE 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- 5. Create policy for ADMINS to UPDATE properties
CREATE POLICY "Admin can update properties" 
ON properties 
AS PERMISSIVE 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);

-- 6. Create policy for ADMINS to DELETE properties
CREATE POLICY "Admin can delete properties" 
ON properties 
AS PERMISSIVE 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);

-- 7. VERIFY: Check if your user is marked as admin (replace YOUR_EMAIL with your actual email)
SELECT user_id, email, is_admin FROM user_profiles WHERE email = 'YOUR_EMAIL@example.com';

-- 8. If you're not marked as admin, run this (replace YOUR_EMAIL with your actual email)
UPDATE user_profiles 
SET is_admin = true 
WHERE email = 'YOUR_EMAIL@example.com';