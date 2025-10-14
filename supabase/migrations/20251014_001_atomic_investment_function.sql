-- Migration: Atomic Investment Transaction Function
-- Purpose: Fix race conditions and ensure transaction safety in investment flow
-- Critical Issues Fixed:
--   1. Race condition in share purchase (Issue #1)
--   2. No transaction rollback (Issue #2)
--   3. Negative balance prevention (Issue #6)
--   4. Atomic operations with proper locking

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_investment_atomic CASCADE;

-- Create atomic investment function
CREATE OR REPLACE FUNCTION create_investment_atomic(
  p_user_id UUID,
  p_property_id UUID,
  p_shares INTEGER,
  p_price_per_share DECIMAL(15,2),
  p_transaction_id UUID DEFAULT NULL -- For idempotency
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_investment_id UUID;
  v_transaction_id UUID;
  v_amount DECIMAL(15,2);
  v_property_title TEXT;
  v_available_shares INTEGER;
  v_available_balance DECIMAL(15,2);
  v_kyc_status TEXT;
  v_new_available_shares INTEGER;
  v_funded_amount DECIMAL(15,2);
  v_property_status TEXT;
  v_result JSONB;
BEGIN
  -- Calculate total amount
  v_amount := p_shares * p_price_per_share;

  -- Generate transaction ID if not provided (for idempotency)
  v_transaction_id := COALESCE(p_transaction_id, gen_random_uuid());

  -- Check for duplicate transaction (idempotency check)
  IF EXISTS (
    SELECT 1 FROM transactions
    WHERE reference_id = v_transaction_id
    AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Duplicate transaction detected. Transaction already processed.';
  END IF;

  -- Validate input parameters
  IF p_shares <= 0 THEN
    RAISE EXCEPTION 'Invalid share count: % (must be positive)', p_shares;
  END IF;

  IF p_price_per_share <= 0 THEN
    RAISE EXCEPTION 'Invalid price per share: % (must be positive)', p_price_per_share;
  END IF;

  -- Check KYC status (server-side validation)
  SELECT kyc_status INTO v_kyc_status
  FROM user_profiles
  WHERE user_id = p_user_id;

  IF v_kyc_status IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_kyc_status != 'approved' THEN
    -- Check for tier override by admin
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = p_user_id
      AND tier_override_by_admin = true
      AND tier IN ('small_investor', 'large_investor')
    ) THEN
      RAISE EXCEPTION 'KYC approval required. Current status: %', v_kyc_status;
    END IF;
  END IF;

  -- Lock property row to prevent concurrent updates
  SELECT title, available_shares, property_status, funded_amount
  INTO v_property_title, v_available_shares, v_property_status, v_funded_amount
  FROM properties
  WHERE id = p_property_id
  FOR UPDATE;

  IF v_property_title IS NULL THEN
    RAISE EXCEPTION 'Property not found: %', p_property_id;
  END IF;

  -- Check property status
  IF v_property_status NOT IN ('open', 'upcoming') THEN
    RAISE EXCEPTION 'Property is not available for investment. Status: %', v_property_status;
  END IF;

  -- Check available shares atomically
  IF v_available_shares < p_shares THEN
    RAISE EXCEPTION 'Insufficient shares available. Requested: %, Available: %', p_shares, v_available_shares;
  END IF;

  -- Lock and check wallet balance atomically
  SELECT available_balance INTO v_available_balance
  FROM escrow_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_available_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;

  IF v_available_balance < v_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', v_amount, v_available_balance;
  END IF;

  -- All validations passed - begin atomic updates

  -- 1. Deduct from wallet with overdraft protection
  UPDATE escrow_balances
  SET
    available_balance = available_balance - v_amount,
    total_invested = total_invested + v_amount
  WHERE user_id = p_user_id
  AND available_balance >= v_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Concurrent transaction detected - insufficient balance';
  END IF;

  -- 2. Update property shares
  v_new_available_shares := v_available_shares - p_shares;
  v_funded_amount := COALESCE(v_funded_amount, 0) + v_amount;

  -- Auto-update to 'funded' if all shares sold
  IF v_new_available_shares <= 0 THEN
    v_property_status := 'funded';
  END IF;

  UPDATE properties
  SET
    available_shares = v_new_available_shares,
    funded_amount = v_funded_amount,
    property_status = v_property_status
  WHERE id = p_property_id;

  -- 3. Create or update investment record (UPSERT for same user+property)
  INSERT INTO investments (
    user_id,
    property_id,
    shares_owned,
    price_per_share,
    total_investment,
    investment_date,
    investment_status
  ) VALUES (
    p_user_id,
    p_property_id,
    p_shares,
    p_price_per_share,
    v_amount,
    NOW(),
    'confirmed'
  )
  ON CONFLICT (user_id, property_id)
  DO UPDATE SET
    shares_owned = investments.shares_owned + p_shares,
    total_investment = investments.total_investment + v_amount,
    price_per_share = (investments.total_investment + v_amount) / (investments.shares_owned + p_shares) -- Weighted average
  RETURNING id INTO v_investment_id;

  -- 4. Create transaction record
  INSERT INTO transactions (
    user_id,
    transaction_type,
    amount,
    status,
    reference_id,
    description,
    property_id,
    created_at
  ) VALUES (
    p_user_id,
    'investment',
    v_amount,
    'completed',
    v_transaction_id,
    format('Investment in %s - %s shares', v_property_title, p_shares),
    p_property_id,
    NOW()
  );

  -- 5. Create user alert/notification
  INSERT INTO user_alerts (
    user_id,
    alert_type,
    message,
    is_read,
    created_at
  ) VALUES (
    p_user_id,
    'investment',
    format('Successfully invested %s in %s', v_amount, v_property_title),
    false,
    NOW()
  );

  -- Build result JSON
  v_result := jsonb_build_object(
    'success', true,
    'investment_id', v_investment_id,
    'transaction_id', v_transaction_id,
    'property_id', p_property_id,
    'property_title', v_property_title,
    'shares_purchased', p_shares,
    'amount_paid', v_amount,
    'remaining_balance', v_available_balance - v_amount,
    'property_funded', v_property_status = 'funded'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- All operations rollback automatically on exception
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_investment_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_investment_atomic IS
'Atomic investment creation with full transaction safety, race condition prevention, and overdraft protection.
All operations succeed or fail together. Includes KYC validation, balance checks, and proper locking.';
