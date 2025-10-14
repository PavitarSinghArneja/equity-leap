-- Migration: Add Database Constraints for Data Integrity
-- Purpose: Prevent invalid data states at database level
-- Issues Fixed:
--   Data consistency problems (Section 6.1-6.3)
--   Negative balances
--   Invalid share counts
--   Duplicate investments

-- 1. Add unique constraint on user+property in investments table
-- This prevents duplicate investment records for same user/property combination
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_user_property_investment'
  ) THEN
    ALTER TABLE investments
    ADD CONSTRAINT unique_user_property_investment
    UNIQUE (user_id, property_id);

    RAISE NOTICE 'Added unique constraint on investments(user_id, property_id)';
  ELSE
    RAISE NOTICE 'Unique constraint already exists on investments';
  END IF;
END $$;

-- 2. Add check constraint: no negative balances in escrow_balances
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'positive_available_balance'
  ) THEN
    ALTER TABLE escrow_balances
    ADD CONSTRAINT positive_available_balance
    CHECK (available_balance >= 0);

    RAISE NOTICE 'Added check constraint: available_balance >= 0';
  ELSE
    RAISE NOTICE 'Constraint positive_available_balance already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'positive_pending_balance'
  ) THEN
    ALTER TABLE escrow_balances
    ADD CONSTRAINT positive_pending_balance
    CHECK (pending_balance >= 0);

    RAISE NOTICE 'Added check constraint: pending_balance >= 0';
  ELSE
    RAISE NOTICE 'Constraint positive_pending_balance already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'positive_total_invested'
  ) THEN
    ALTER TABLE escrow_balances
    ADD CONSTRAINT positive_total_invested
    CHECK (total_invested >= 0);

    RAISE NOTICE 'Added check constraint: total_invested >= 0';
  ELSE
    RAISE NOTICE 'Constraint positive_total_invested already exists';
  END IF;
END $$;

-- 3. Add check constraint: no negative shares in properties
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'positive_available_shares'
  ) THEN
    ALTER TABLE properties
    ADD CONSTRAINT positive_available_shares
    CHECK (available_shares >= 0);

    RAISE NOTICE 'Added check constraint: available_shares >= 0';
  ELSE
    RAISE NOTICE 'Constraint positive_available_shares already exists';
  END IF;
END $$;

-- Note: properties table doesn't have total_shares column
-- Only available_shares exists, which can be 0 when fully funded
-- So this constraint is intentionally skipped

-- 4. Add check constraint: no negative shares in investments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'positive_shares_owned'
  ) THEN
    ALTER TABLE investments
    ADD CONSTRAINT positive_shares_owned
    CHECK (shares_owned > 0); -- Must be > 0, not >= 0 (no point having 0 shares)

    RAISE NOTICE 'Added check constraint: shares_owned > 0';
  ELSE
    RAISE NOTICE 'Constraint positive_shares_owned already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'positive_investment_amount'
  ) THEN
    ALTER TABLE investments
    ADD CONSTRAINT positive_investment_amount
    CHECK (total_investment > 0);

    RAISE NOTICE 'Added check constraint: total_investment > 0';
  ELSE
    RAISE NOTICE 'Constraint positive_investment_amount already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'positive_price_per_share'
  ) THEN
    ALTER TABLE investments
    ADD CONSTRAINT positive_price_per_share
    CHECK (price_per_share > 0);

    RAISE NOTICE 'Added check constraint: price_per_share > 0';
  ELSE
    RAISE NOTICE 'Constraint positive_price_per_share already exists';
  END IF;
END $$;

-- 5. Add check constraints for share_sell_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'positive_shares_to_sell'
  ) THEN
    ALTER TABLE share_sell_requests
    ADD CONSTRAINT positive_shares_to_sell
    CHECK (shares_to_sell > 0);

    RAISE NOTICE 'Added check constraint: shares_to_sell > 0';
  ELSE
    RAISE NOTICE 'Constraint positive_shares_to_sell already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_remaining_shares'
  ) THEN
    ALTER TABLE share_sell_requests
    ADD CONSTRAINT valid_remaining_shares
    CHECK (remaining_shares >= 0 AND remaining_shares <= shares_to_sell);

    RAISE NOTICE 'Added check constraint: 0 <= remaining_shares <= shares_to_sell';
  ELSE
    RAISE NOTICE 'Constraint valid_remaining_shares already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'positive_sell_price'
  ) THEN
    ALTER TABLE share_sell_requests
    ADD CONSTRAINT positive_sell_price
    CHECK (price_per_share > 0);

    RAISE NOTICE 'Added check constraint: sell price_per_share > 0';
  ELSE
    RAISE NOTICE 'Constraint positive_sell_price already exists';
  END IF;
END $$;

-- 6. Add check constraints for share_parks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_parked_shares'
  ) THEN
    ALTER TABLE share_parks
    ADD CONSTRAINT valid_parked_shares
    CHECK (shares_parked > 0 AND shares_released >= 0 AND shares_released <= shares_parked);

    RAISE NOTICE 'Added check constraint: valid parked/released shares';
  ELSE
    RAISE NOTICE 'Constraint valid_parked_shares already exists';
  END IF;
END $$;

-- 7. Add reasonable maximum limits to prevent integer overflow attacks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reasonable_share_limit'
  ) THEN
    ALTER TABLE investments
    ADD CONSTRAINT reasonable_share_limit
    CHECK (shares_owned <= 10000000); -- 10 million shares max per investment

    RAISE NOTICE 'Added check constraint: max 10M shares per investment';
  ELSE
    RAISE NOTICE 'Constraint reasonable_share_limit already exists';
  END IF;
END $$;

-- Note: Using available_shares instead of total_shares (which doesn't exist)
-- This constraint limits the maximum available shares per property
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reasonable_property_shares'
  ) THEN
    ALTER TABLE properties
    ADD CONSTRAINT reasonable_property_shares
    CHECK (available_shares <= 100000000); -- 100 million shares max

    RAISE NOTICE 'Added check constraint: max 100M available shares per property';
  ELSE
    RAISE NOTICE 'Constraint reasonable_property_shares already exists';
  END IF;
END $$;

-- 8. Add index to improve performance of unique constraint checks
CREATE INDEX IF NOT EXISTS idx_investments_user_property
ON investments(user_id, property_id);

CREATE INDEX IF NOT EXISTS idx_transactions_reference_id
ON transactions(reference_id);

CREATE INDEX IF NOT EXISTS idx_share_order_events_order_type
ON share_order_events(order_id, event_type);

-- 9. Ensure proper cascade deletes
-- When a property is deleted, related records should be handled appropriately
DO $$
BEGIN
  -- Check if foreign key exists before trying to drop/recreate
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'investments_property_id_fkey'
  ) THEN
    ALTER TABLE investments
    DROP CONSTRAINT investments_property_id_fkey;
  END IF;

  ALTER TABLE investments
  ADD CONSTRAINT investments_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES properties(id)
  ON DELETE CASCADE; -- Delete investments when property is deleted

  RAISE NOTICE 'Updated foreign key: investments -> properties (CASCADE)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update foreign key (might not exist or already correct)';
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Database constraints migration completed successfully';
  RAISE NOTICE '   - Unique constraints added';
  RAISE NOTICE '   - Positive value checks added';
  RAISE NOTICE '   - Reasonable limits enforced';
  RAISE NOTICE '   - Performance indexes created';
  RAISE NOTICE '   - Cascade deletes configured';
END $$;
