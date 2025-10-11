# 🧪 Complete Trading Flow Testing Guide

## Overview
This guide will help you test the complete end-to-end buying and selling flow on the trading platform.

---

## ✅ Prerequisites

Before testing, ensure:
1. ✅ You have at least 2 user accounts (Seller & Buyer)
2. ✅ Seller owns shares of a property
3. ✅ Buyer has wallet balance
4. ✅ Property is active and tradeable

---

## 🔁 Complete Test Flow

### **Test Case 1: SELLING SHARES**

#### Step 1: Login as Seller
```
User: seller@example.com
```

#### Step 2: Navigate to Trading Page
```
URL: /trading
```

#### Step 3: Select Property
- Select a property you own shares in
- Verify "Your Shares" shows correct count

#### Step 4: List Shares for Sale
1. Look at the right sidebar: "List Shares for Sale"
2. Enter quantity (e.g., 100 shares)
3. Enter price per share (e.g., ₹1,500)
4. Verify total amount shows correctly (100 × ₹1,500 = ₹1,50,000)
5. Click **"List for Sale"** button

#### Expected Result:
- ✅ Toast notification: "Shares Listed for Sale!"
- ✅ Your listing appears in "Available Shares for Sale" section
- ✅ Your listing shows "Your Listing" badge
- ✅ Form resets

---

### **Test Case 2: BUYING SHARES**

#### Step 1: Login as Buyer
```
User: buyer@example.com
```

#### Step 2: Navigate to Trading Page
```
URL: /trading
```

#### Step 3: Select Same Property
- Select the property where Seller listed shares
- Verify you can see the listing in "Available Shares for Sale"

#### Step 4: Initiate Purchase
1. Find the seller's listing (sorted by best price first)
2. Click **"Buy These Shares"** button

#### Expected Result:
- ✅ Modal opens: "Confirm Purchase"
- ✅ Shows property name
- ✅ Shows shares, price per share, total cost
- ✅ Shows your wallet balance
- ✅ Shows balance after purchase
- ✅ If insufficient funds, button is disabled

#### Step 5: Confirm Purchase
1. Review all details in modal
2. Click **"Confirm Purchase"** button

#### Expected Result:
- ✅ Toast: "Purchase Request Sent!"
- ✅ Modal closes
- ✅ Listing updates (if fully purchased, it disappears)

---

### **Test Case 3: SELLER APPROVES SALE**

#### Step 1: Switch Back to Seller Account
```
User: seller@example.com
```

#### Step 2: Check Pending Holds
1. Go to Trading page
2. Select the same property
3. Look for "Pending Sales (Awaiting Your Approval)" section

#### Expected Result:
- ✅ Section shows 1 pending request
- ✅ Shows buyer ID
- ✅ Shows shares requested (100)
- ✅ Shows total amount (₹1,50,000)
- ✅ Shows "Awaiting Approval" badge with animation
- ✅ Shows time ago (e.g., "2m ago")

#### Step 3: Review Sale Details
1. Verify buyer information
2. Verify shares amount
3. Verify total payment
4. Read the alert message

#### Step 4: Approve Sale
1. Click **"Approve Sale"** button

#### Expected Result:
- ✅ Button shows "Processing..."
- ✅ Toast: "Sale Approved!"
- ✅ Pending hold disappears from list
- ✅ Seller's share count decreases
- ✅ Seller's wallet balance increases

---

### **Test Case 4: BUYER RECEIVES SHARES**

#### Step 1: Switch to Buyer Account
```
User: buyer@example.com
```

#### Step 2: Verify Purchase Completed
1. Go to Trading page
2. Select the property
3. Check "Your Shares" in the sell form

#### Expected Result:
- ✅ Buyer's share count increased by 100
- ✅ Wallet balance decreased by ₹1,50,000
- ✅ Can now list these shares for sale

---

## 🔍 Edge Cases to Test

### Edge Case 1: Insufficient Wallet Balance
**Scenario:** Buyer tries to buy without enough funds

**Steps:**
1. As Buyer, try to buy shares worth more than wallet balance
2. Click "Buy These Shares"

**Expected:**
- ✅ Modal shows red "Insufficient wallet balance" alert
- ✅ "Confirm Purchase" button is disabled
- ✅ Balance after purchase shows in red

---

### Edge Case 2: Insufficient Shares to Sell
**Scenario:** Seller tries to list more shares than owned

**Steps:**
1. As Seller, try to enter quantity > owned shares
2. Click "List for Sale"

**Expected:**
- ✅ Toast error: "Insufficient shares to sell"
- ✅ No listing created

---

### Edge Case 3: Seller Rejects Purchase
**Scenario:** Seller rejects buyer's request

**Steps:**
1. Buyer creates purchase request
2. Seller sees pending hold
3. Seller clicks **"Reject"** button

**Expected:**
- ✅ Hold is cancelled
- ✅ Buyer's wallet balance is released
- ✅ Shares return to available listings
- ✅ Toast: "Sale Rejected"

---

### Edge Case 4: Multiple Buyers
**Scenario:** Multiple buyers want same listing

**Steps:**
1. Seller lists 100 shares
2. Buyer A requests 50 shares
3. Buyer B requests 50 shares
4. Seller approves both in order

**Expected:**
- ✅ Both holds appear in pending list
- ✅ Seller can approve both separately
- ✅ After first approval, remaining_shares = 50
- ✅ After second approval, listing disappears (sold out)

---

## 📊 Database Verification

After each test, verify in database:

### After Seller Lists Shares
```sql
SELECT * FROM share_sell_requests
WHERE property_id = '<property_id>'
AND status = 'active'
ORDER BY created_at DESC;
```
**Expected:** New row with correct shares_to_sell, price_per_share

### After Buyer Confirms Purchase
```sql
SELECT * FROM share_holds
WHERE sell_request_id = '<sell_request_id>'
ORDER BY created_at DESC;
```
**Expected:** New hold with buyer_confirmed = true, seller_confirmed = false

### After Seller Approves
```sql
SELECT * FROM share_holds
WHERE id = '<hold_id>';
```
**Expected:** status = 'completed', seller_confirmed = true

```sql
SELECT * FROM investments
WHERE user_id IN ('<buyer_id>', '<seller_id>')
AND property_id = '<property_id>';
```
**Expected:**
- Buyer's shares_owned increased
- Seller's shares_owned decreased

```sql
SELECT * FROM escrow_balances
WHERE user_id IN ('<buyer_id>', '<seller_id>');
```
**Expected:**
- Buyer's available_balance decreased
- Seller's available_balance increased

---

## 🎯 Success Criteria

Your implementation is successful if:

1. ✅ **Sell Flow Complete**
   - Seller can list shares
   - Listing appears in marketplace
   - Price and quantity are accurate

2. ✅ **Buy Flow Complete**
   - Buyer can see listings
   - Modal confirms purchase details
   - Hold is created successfully

3. ✅ **Approval Flow Complete**
   - Seller sees pending requests
   - Seller can approve/reject
   - Shares and money transfer on approval

4. ✅ **Real-time Updates**
   - Listings update when purchased
   - Pending holds appear instantly
   - Share counts update in real-time

5. ✅ **Error Handling**
   - Insufficient funds blocked
   - Insufficient shares blocked
   - Clear error messages shown

6. ✅ **User Experience**
   - Non-trader can understand the flow
   - Clear labels and instructions
   - No confusing jargon

---

## 🐛 Common Issues & Solutions

### Issue 1: Listings Not Appearing
**Solution:** Check `expires_at` date hasn't passed, status = 'active', remaining_shares > 0

### Issue 2: Pending Holds Not Showing
**Solution:** Verify buyer_confirmed = true, seller_confirmed = false, status = 'pending'

### Issue 3: Approval Fails
**Solution:** Check RLS policies on share_holds, ensure seller_confirm_hold function exists

### Issue 4: Shares Not Transferring
**Solution:** Verify seller_confirm_hold function correctly updates investments table

---

## 📝 Test Checklist

Print this and check off as you test:

- [ ] Seller can list shares
- [ ] Listing shows in marketplace
- [ ] Buyer can see listing
- [ ] Buyer can click "Buy These Shares"
- [ ] Modal shows correct details
- [ ] Modal shows wallet balance
- [ ] Buyer can confirm purchase
- [ ] Hold is created
- [ ] Seller sees pending hold
- [ ] Seller can see hold details
- [ ] Seller can approve hold
- [ ] Shares transfer to buyer
- [ ] Money transfers to seller
- [ ] Listing updates/disappears
- [ ] Real-time updates work
- [ ] Error handling works
- [ ] UI is intuitive

---

## 🎉 What's New?

Compared to old system:

| Old | New |
|-----|-----|
| ❌ OrderBook with fake bids | ✅ Real sell listings |
| ❌ No "Buy" button | ✅ Clear "Buy These Shares" |
| ❌ Seller can't confirm | ✅ Seller approval flow |
| ❌ Complex trading UI | ✅ Simple marketplace UI |
| ❌ Confusing terminology | ✅ Plain English |

---

**🚀 Ready to test? Start with Test Case 1!**
