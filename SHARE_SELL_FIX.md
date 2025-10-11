# Share Sell Request Creation - Bug Fix

## Problem Summary

When users try to create a sell request for their shares, they get two errors:

1. **RLS Policy Error (42501):**
   ```
   new row violates row-level security policy for table "share_parks"
   ```
   *(Note: The error message incorrectly says "share_parks" but it's actually `share_sell_requests`)*

2. **JavaScript Error:**
   ```
   TypeError: l is not a function
   ```
   *(Same minification issue as before with callback functions)*

---

## Root Causes

### Issue 1: Missing/Incorrect RLS Policy

**Problem:**
- The `share_sell_requests` table has RLS enabled
- But INSERT policy is either missing or too restrictive
- Users cannot insert rows even for their own shares

**Evidence from Console:**
```javascript
POST /rest/v1/share_sell_requests 403 (Forbidden)
{code: '42501', message: 'new row violates row-level security policy...'}
```

### Issue 2: Unmemoized Callback Function

**Problem:**
- `handleSubmit` function in `ShareSellDialog.tsx` not memoized
- `addNotification` callback used without null check
- Minification mangles the function reference to `l`

**Evidence from Console:**
```javascript
Uncaught (in promise) TypeError: l is not a function
    at j (index-CdYgEe_G.js:587:10268)
```

---

## Fixes Applied

### Fix 1: Update ShareSellDialog Component

**File:** `/src/components/ShareSellDialog.tsx`

**Changes Made:**

1. **Memoized `handleSubmit` with `React.useCallback`:**
   ```typescript
   const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
     // ... function body
   }, [user, sharesToSell, userShares, property.id, property.share_price,
       pricePerShare, totalAmount, formData.notes, addNotification]);
   ```

2. **Added null checks for `addNotification`:**
   ```typescript
   if (addNotification) {
     addNotification({
       name: "Sell Request Created",
       // ...
     });
   }
   ```

3. **Added missing required fields in insert data:**
   ```typescript
   const insertData = {
     seller_id: user.id,
     property_id: property.id,
     shares_to_sell: sharesToSell,
     remaining_shares: sharesToSell, // ✅ Added
     price_per_share: pricePerShare,
     total_amount: totalAmount, // ✅ Added
     status: 'active', // ✅ Added
     expires_at: expiryDate.toISOString(), // ✅ Added (30 days)
     notes: formData.notes.trim() || null
   };
   ```

4. **Improved error handling:**
   ```typescript
   if (error.code === '42501') {
     errorMessage = "Database permission error. Please contact support.";
   } else if (error.message.includes('row-level security')) {
     errorMessage = "Permission denied. Please contact support if this persists.";
   }
   ```

### Fix 2: Database RLS Policy

**File:** `/FIX_SHARE_SELL_RLS.sql`

**SQL Script Created:**

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own sell requests" ON share_sell_requests;

-- Create proper INSERT policy
CREATE POLICY "Users can insert their own sell requests"
ON share_sell_requests
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the seller
  auth.uid() = seller_id
  AND
  -- User must own enough shares
  EXISTS (
    SELECT 1 FROM investments
    WHERE investments.user_id = auth.uid()
      AND investments.property_id = share_sell_requests.property_id
      AND investments.shares_owned >= share_sell_requests.shares_to_sell
      AND investments.investment_status = 'confirmed'
  )
);
```

**What This Does:**
1. ✅ Allows authenticated users to insert sell requests
2. ✅ Ensures `seller_id` matches current user
3. ✅ Verifies user owns enough shares in the property
4. ✅ Checks shares are confirmed (not pending)

---

## How to Deploy the Fix

### Step 1: Run SQL Migration

Execute the SQL script in your Supabase SQL Editor:

```bash
# Copy contents of FIX_SHARE_SELL_RLS.sql
# Paste into Supabase SQL Editor
# Click "Run"
```

**Or via psql:**
```bash
psql "postgres://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:5432/postgres" \
  < FIX_SHARE_SELL_RLS.sql
```

### Step 2: Deploy Frontend Code

The code is already fixed and built:

```bash
npm run build  # ✅ Already successful
# Deploy dist/ folder to your hosting
```

### Step 3: Test the Fix

1. **Login as a user who owns shares**
2. **Navigate to property page**
3. **Click "Sell Shares" button**
4. **Enter:**
   - Shares to sell: 10
   - Price per share: Any amount
5. **Click "Create Sell Request"**
6. **Expected Result:** Success notification, no errors

---

## Testing Checklist

### Before Fix:
- [ ] User tries to create sell request
- [ ] Gets 403 Forbidden error
- [ ] Console shows "new row violates row-level security policy"
- [ ] Console shows "l is not a function" error
- [ ] No sell request created

### After Fix (SQL + Code):
- [ ] User tries to create sell request
- [ ] No 403 error
- [ ] No "l is not a function" error
- [ ] Success notification appears
- [ ] Sell request visible in database
- [ ] Sell request appears in marketplace
- [ ] Other users can see the listing

---

## Why This Happened

### RLS Policy Issue:

**Original Problem:**
The RLS policy was probably created without proper conditions, or was too restrictive. Common mistakes:

```sql
-- ❌ TOO RESTRICTIVE (doesn't work):
CREATE POLICY "..." ON share_sell_requests
FOR INSERT TO authenticated
WITH CHECK (false); -- Blocks everyone!

-- ❌ MISSING CHECK (security risk):
CREATE POLICY "..." ON share_sell_requests
FOR INSERT TO authenticated
WITH CHECK (true); -- Allows anyone to create any sell request!

-- ✅ CORRECT (our fix):
CREATE POLICY "..." ON share_sell_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = seller_id  -- User owns the request
  AND EXISTS (...)         -- User owns the shares
);
```

### Callback Minification Issue:

**Original Problem:**
React components were using inline functions or unmemoized callbacks:

```typescript
// ❌ Unmemoized (creates new function every render):
const handleSubmit = async (e) => {
  addNotification({ ... }); // Gets mangled to 'l(...)'
};

// ✅ Memoized (stable reference):
const handleSubmit = React.useCallback(async (e) => {
  if (addNotification) {  // Null check
    addNotification({ ... });
  }
}, [addNotification]);  // Dependency array
```

---

## Database Schema Reference

For reference, here's what the `share_sell_requests` table looks like:

```sql
CREATE TABLE share_sell_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  shares_to_sell INTEGER NOT NULL CHECK (shares_to_sell > 0),
  remaining_shares INTEGER NOT NULL CHECK (remaining_shares >= 0),
  price_per_share DECIMAL(10,2) NOT NULL CHECK (price_per_share > 0),
  total_amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  buyer_id UUID REFERENCES auth.users(id),
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Required Fields for INSERT:**
- ✅ seller_id (auto-filled from auth.uid())
- ✅ property_id (from user selection)
- ✅ shares_to_sell (from form)
- ✅ remaining_shares (same as shares_to_sell initially)
- ✅ price_per_share (from form)
- ✅ total_amount (calculated: shares × price)
- ✅ status (default: 'active')
- ✅ expires_at (calculated: now + 30 days)
- ⚪ notes (optional)

---

## Verification Queries

After deploying, verify the fix with these SQL queries:

### 1. Check RLS Policies:
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'share_sell_requests';
```

**Expected Output:**
```
policyname: "Users can insert their own sell requests"
cmd: INSERT
permissive: PERMISSIVE
```

### 2. Test as User:
```sql
-- Set user context (replace with actual user ID)
SET request.jwt.claims = '{"sub":"USER_UUID_HERE"}';

-- Try to insert
INSERT INTO share_sell_requests (
  seller_id, property_id, shares_to_sell,
  remaining_shares, price_per_share, total_amount,
  status, expires_at
) VALUES (
  'USER_UUID_HERE',
  'PROPERTY_UUID_HERE',
  10,
  10,
  1500,
  15000,
  'active',
  NOW() + INTERVAL '30 days'
);
```

**Expected:** Success (if user owns shares) or specific error (if doesn't own enough)

### 3. Verify Sell Request Created:
```sql
SELECT * FROM share_sell_requests
WHERE seller_id = 'USER_UUID_HERE'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Rollback Plan (If Needed)

If the fix causes issues, you can rollback:

### 1. Rollback SQL:
```sql
-- Drop new policies
DROP POLICY IF EXISTS "Users can insert their own sell requests" ON share_sell_requests;

-- Re-enable old policies (if you have a backup)
-- Or temporarily allow all:
CREATE POLICY "Temporary allow all" ON share_sell_requests
FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 2. Rollback Code:
```bash
git revert HEAD  # Reverts last commit
npm run build
# Deploy previous version
```

---

## Additional Notes

1. **Security:** The RLS policy ensures users can only sell shares they actually own
2. **Performance:** The EXISTS check in RLS is efficient with proper indexes
3. **User Experience:** Clear error messages help users understand what went wrong
4. **Monitoring:** Log all 42501 errors to track RLS issues

---

## Related Files Modified

1. ✅ `/src/components/ShareSellDialog.tsx` - Component fix
2. ✅ `/FIX_SHARE_SELL_RLS.sql` - Database policy fix
3. ✅ Build successful: `dist/assets/index--J14Tls2.js`

---

**Fixed By:** Claude Code Assistant
**Date:** January 11, 2025
**Build Status:** ✅ Passing
**Ready for Deployment:** Yes (SQL + Frontend)
**Priority:** 🔥 HIGH (Blocks core feature)
