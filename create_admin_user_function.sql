-- Create a function that allows admin users to see all user data
-- This bypasses RLS by using SECURITY DEFINER (runs with elevated privileges)

-- Create admin function to get all users
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    tier TEXT,
    subscription_active BOOLEAN,
    is_admin BOOLEAN,
    kyc_status TEXT,
    created_at TIMESTAMPTZ
) 
SECURITY DEFINER  -- This runs with the function owner's privileges, bypassing RLS
SET search_path = public
AS $$
BEGIN
    -- Check if the calling user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    -- Return all users if admin
    RETURN QUERY
    SELECT 
        up.user_id,
        up.email,
        up.full_name,
        up.tier,
        up.subscription_active,
        up.is_admin,
        up.kyc_status,
        up.created_at
    FROM user_profiles up
    ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;

-- Test the function
SELECT 'Testing admin function:' as test;
SELECT * FROM get_all_users_admin();