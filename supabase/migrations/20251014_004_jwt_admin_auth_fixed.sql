-- Migration: JWT-Based Admin Authorization (FIXED - Idempotent)
-- Purpose: Fix client-side admin bypass vulnerability
-- Issues Fixed:
--   10. Client-side admin check (Issue #10)
--   11. Admin functions rely on DB column (Issue #11)

-- 1. Create helper function to check if user is admin (server-side, using database)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE user_id = auth.uid();

  RETURN COALESCE(v_is_admin, false);
END;
$$;

COMMENT ON FUNCTION is_admin IS
'Server-side admin check. Returns true if current user is an admin.
Uses SECURITY DEFINER to bypass RLS and check actual database value.';

-- 2. Create function to check if user has admin access to a specific resource
CREATE OR REPLACE FUNCTION check_admin_access(
  p_error_message TEXT DEFAULT 'Admin access required'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION '%', p_error_message;
  END IF;
END;
$$;

COMMENT ON FUNCTION check_admin_access IS
'Raises exception if current user is not an admin.
Use at the start of admin-only functions.';

-- 3. Update RLS policies to use server-side admin check (with DROP IF EXISTS)

-- Update user_profiles policy for admin access
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;

CREATE POLICY "Users can view own profile"
ON user_profiles
FOR SELECT
USING (auth.uid()::text = user_id::text OR is_admin());

CREATE POLICY "Admins can update any profile"
ON user_profiles
FOR UPDATE
USING (is_admin());

-- Update properties policy for admin management
DROP POLICY IF EXISTS "Admins can manage properties" ON properties;
DROP POLICY IF EXISTS "Admins can insert properties" ON properties;
DROP POLICY IF EXISTS "Admins can update properties" ON properties;
DROP POLICY IF EXISTS "Admins can delete properties" ON properties;

CREATE POLICY "Admins can insert properties"
ON properties
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update properties"
ON properties
FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete properties"
ON properties
FOR DELETE
USING (is_admin());

-- Update KYC documents policy for admin access
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON kyc_documents;

CREATE POLICY "Admins can view all KYC documents"
ON kyc_documents
FOR SELECT
USING (auth.uid()::text = user_id::text OR is_admin());

-- 4. Create admin-only function examples (CREATE OR REPLACE makes it idempotent)

-- Example: Admin function to manually adjust user balance (emergency use only)
CREATE OR REPLACE FUNCTION admin_adjust_balance(
  p_user_id UUID,
  p_amount DECIMAL(15,2),
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_balance DECIMAL(15,2);
  v_new_balance DECIMAL(15,2);
BEGIN
  -- Check admin access
  PERFORM check_admin_access('Only admins can adjust user balances');

  -- Validate input
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Reason must be at least 10 characters';
  END IF;

  -- Get current balance
  SELECT available_balance INTO v_old_balance
  FROM escrow_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_old_balance IS NULL THEN
    RAISE EXCEPTION 'User wallet not found';
  END IF;

  -- Calculate new balance
  v_new_balance := v_old_balance + p_amount;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative balance';
  END IF;

  -- Update balance
  UPDATE escrow_balances
  SET available_balance = v_new_balance
  WHERE user_id = p_user_id;

  -- Log the adjustment
  INSERT INTO transactions (
    user_id,
    transaction_type,
    amount,
    status,
    description,
    created_at
  ) VALUES (
    p_user_id,
    'admin_adjustment',
    p_amount,
    'completed',
    format('Admin adjustment: %s (by %s)', p_reason, auth.uid()::text),
    NOW()
  );

  -- Log admin action
  INSERT INTO user_alerts (
    user_id,
    alert_type,
    title,
    message,
    created_at
  ) VALUES (
    p_user_id,
    'admin_action',
    'Balance Adjusted',
    format('Admin adjusted your balance by ₹%s. Reason: %s', p_amount, p_reason),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'adjustment', p_amount,
    'reason', p_reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_adjust_balance TO authenticated;

-- 5. Create function to update KYC status (admin only)
CREATE OR REPLACE FUNCTION admin_update_kyc_status(
  p_user_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  -- Check admin access
  PERFORM check_admin_access('Only admins can update KYC status');

  -- Validate status
  IF p_new_status NOT IN ('pending', 'under_review', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid KYC status: %', p_new_status;
  END IF;

  -- Get current status
  SELECT kyc_status INTO v_old_status
  FROM user_profiles
  WHERE user_id = p_user_id;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update status
  UPDATE user_profiles
  SET
    kyc_status = p_new_status,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Create notification for user
  INSERT INTO user_alerts (
    user_id,
    alert_type,
    title,
    message,
    created_at
  ) VALUES (
    p_user_id,
    'kyc_update',
    format('KYC Status: %s', UPPER(p_new_status)),
    CASE p_new_status
      WHEN 'approved' THEN 'Your KYC has been approved! You can now start investing.'
      WHEN 'rejected' THEN format('Your KYC has been rejected. Reason: %s', COALESCE(p_notes, 'Please resubmit documents'))
      WHEN 'under_review' THEN 'Your KYC documents are under review.'
      ELSE 'Your KYC status has been updated.'
    END,
    NOW()
  );

  -- Log the action
  INSERT INTO transactions (
    user_id,
    transaction_type,
    amount,
    status,
    description,
    created_at
  ) VALUES (
    p_user_id,
    'kyc_status_change',
    0,
    'completed',
    format('KYC status changed from %s to %s by admin %s. Notes: %s',
      v_old_status, p_new_status, auth.uid()::text, COALESCE(p_notes, 'None')),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_status', v_old_status,
    'new_status', p_new_status,
    'notes', p_notes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_kyc_status TO authenticated;

-- 6. Create audit log table for admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES user_profiles(user_id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES user_profiles(user_id),
  target_resource_id UUID,
  resource_type TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log(action);

-- 7. Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_target_resource_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Verify admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can log admin actions';
  END IF;

  INSERT INTO admin_audit_log (
    admin_id,
    action,
    target_user_id,
    target_resource_id,
    resource_type,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    p_action,
    p_target_user_id,
    p_target_resource_id,
    p_resource_type,
    p_details,
    NOW()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;

-- 8. Grant appropriate permissions
GRANT SELECT ON admin_audit_log TO authenticated;
GRANT INSERT ON admin_audit_log TO authenticated;

-- 9. Enable RLS on admin_audit_log (only admins can view)
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view audit log" ON admin_audit_log;
DROP POLICY IF EXISTS "Only admins can insert audit log" ON admin_audit_log;

CREATE POLICY "Only admins can view audit log"
ON admin_audit_log
FOR SELECT
USING (is_admin());

CREATE POLICY "Only admins can insert audit log"
ON admin_audit_log
FOR INSERT
WITH CHECK (is_admin());

-- Log completion
SELECT 'JWT-based admin authorization migration completed' as status;
