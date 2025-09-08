-- Create Test Investment Data
-- Run these queries to make yourself an investor in properties for testing

-- STEP 1: First, let's see your user profile and get your user ID
SELECT 'Your user profile:' as step;
SELECT user_id, email, full_name, tier FROM user_profiles WHERE user_id = auth.uid();

-- STEP 2: Check available properties to invest in
SELECT 'Available properties:' as step;
SELECT 
  id, 
  title, 
  city, 
  share_price, 
  available_shares, 
  property_status,
  shares_sellable
FROM properties 
WHERE property_status IN ('open', 'funded')
ORDER BY created_at DESC 
LIMIT 5;

-- STEP 3: Create/Update your escrow balance (so you have money to invest)
-- This will give you ₹10,00,000 to test with
INSERT INTO escrow_balances (
  user_id, 
  available_balance, 
  pending_balance, 
  total_invested, 
  total_returns
) VALUES (
  auth.uid(),
  1000000, -- ₹10 Lakh available balance
  0,
  0,
  0
) 
ON CONFLICT (user_id) 
DO UPDATE SET 
  available_balance = 1000000,
  updated_at = NOW();

-- STEP 4: Create a test investment 
-- Replace 'PROPERTY_ID_HERE' with an actual property ID from STEP 2
-- This example invests ₹2,50,000 in a property with ₹10,000 share price (25 shares)

/*
INSERT INTO investments (
  user_id,
  property_id,
  shares_owned,
  price_per_share,
  total_investment,
  investment_status,
  investment_date
) VALUES (
  auth.uid(),
  'PROPERTY_ID_HERE', -- Replace with actual property ID
  25, -- Number of shares
  10000, -- Price per share (₹10,000)
  250000, -- Total investment (₹2,50,000)
  'confirmed',
  NOW()
);
*/

-- STEP 5: Update your escrow balance after investment
/*
UPDATE escrow_balances 
SET 
  available_balance = available_balance - 250000,
  total_invested = total_invested + 250000,
  updated_at = NOW()
WHERE user_id = auth.uid();
*/

-- STEP 6: Create a transaction record for the investment
/*
INSERT INTO transactions (
  user_id,
  property_id,
  transaction_type,
  amount,
  status,
  description,
  reference_id
) VALUES (
  auth.uid(),
  'PROPERTY_ID_HERE', -- Same property ID as above
  'investment',
  250000,
  'completed',
  'Test investment for share selling',
  (SELECT id FROM investments WHERE user_id = auth.uid() AND property_id = 'PROPERTY_ID_HERE' ORDER BY created_at DESC LIMIT 1)
);
*/

-- STEP 7: Enable share selling for the property (admin action)
/*
UPDATE properties 
SET shares_sellable = true 
WHERE id = 'PROPERTY_ID_HERE';
*/

-- STEP 8: Verify everything worked
SELECT 'Your investments after setup:' as step;
SELECT 
  i.id,
  i.shares_owned,
  i.total_investment,
  p.title,
  p.shares_sellable
FROM investments i
JOIN properties p ON p.id = i.property_id
WHERE i.user_id = auth.uid();

SELECT 'Your escrow balance:' as step;
SELECT * FROM escrow_balances WHERE user_id = auth.uid();

-- STEP 9: Instructions for testing
SELECT 'Testing Instructions:' as step;
SELECT '
1. Run queries 1-3 to check your setup
2. Copy a property ID from step 2
3. Uncomment and run the INSERT queries (4-7), replacing PROPERTY_ID_HERE
4. Go to the property investment page - you should see "Sell Shares" button
5. Create a sell request to test the marketplace
' as instructions;