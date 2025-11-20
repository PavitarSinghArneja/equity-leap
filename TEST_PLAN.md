# Retreat Slice - Comprehensive Test Plan

## Test Environment
- **Platform**: Fractional Property Investment Platform
- **Target Users**: 1000+ investors
- **Critical Requirement**: Production-ready, seamless experience

---

## 1. USER REGISTRATION & ONBOARDING FLOW

### Test Case 1.1: New User Registration
**Priority**: Critical
**Steps**:
1. Navigate to landing page (/)
2. Click "Get Started" button
3. Complete registration form with valid email/password
4. Verify email verification process
5. Check profile creation

**Expected Results**:
- User can successfully register
- Receives welcome email/notification
- Profile is created with default tier
- Redirected to appropriate onboarding page

**Test Data**:
- Valid email: test1@retreatslice.com
- Valid password: Test123!@#
- Invalid email: test@
- Weak password: 123

---

### Test Case 1.2: User Login
**Priority**: Critical
**Steps**:
1. Navigate to /auth
2. Enter valid credentials
3. Submit login form
4. Verify redirection

**Expected Results**:
- Successful login with valid credentials
- Error message with invalid credentials
- Proper session management
- Redirected to /welcome or last visited page

---

### Test Case 1.3: Password Reset
**Priority**: High
**Steps**:
1. Click "Forgot Password"
2. Enter registered email
3. Check email for reset link
4. Reset password with new credentials
5. Login with new password

**Expected Results**:
- Reset link sent to email
- Password successfully updated
- Can login with new password
- Old password no longer works

---

## 2. NAVIGATION & UI/UX FLOW

### Test Case 2.1: Landing Page Experience
**Priority**: Critical
**Steps**:
1. Visit landing page as unauthenticated user
2. Verify all sections load properly
3. Test all navigation links
4. Check responsive design on mobile/tablet
5. Verify call-to-action buttons work

**Expected Results**:
- All sections visible and properly styled
- Dark theme applied consistently
- Text readable with proper contrast
- Images load without errors
- Navigation smooth and intuitive

---

### Test Case 2.2: Header Navigation (Logged In)
**Priority**: Critical
**Steps**:
1. Login as regular user
2. Verify TopNav displays correct items
3. Test each navigation link
4. Check notification bell
5. Test user menu/profile dropdown

**Expected Results**:
- Header shows: Home, Properties, Trading (if applicable), Dashboard
- Notifications display unread count
- All links navigate correctly
- User avatar/name displayed
- Sign out works properly

---

### Test Case 2.3: Mobile Responsiveness
**Priority**: High
**Steps**:
1. Test on mobile viewport (375px, 414px, 768px)
2. Verify hamburger menu works
3. Check all pages are mobile-friendly
4. Test touch interactions
5. Verify forms are usable on mobile

**Expected Results**:
- Mobile menu opens/closes correctly
- Content stacks properly
- Buttons are tappable (44px minimum)
- No horizontal scrolling
- Forms fit screen without zooming

---

## 3. PROPERTIES PAGE TESTING

### Test Case 3.1: Property Listing (Unauthenticated)
**Priority**: Critical
**Steps**:
1. Navigate to /properties without logging in
2. Verify properties display
3. Try to click "Invest Now"
4. Try to click "View Details"
5. Check search/filter functionality

**Expected Results**:
- Properties visible to all users
- "Invest Now" redirects to /auth
- "View Details" redirects to /auth
- Search/filters work correctly
- Pagination works if applicable

---

### Test Case 3.2: Property Listing (Authenticated)
**Priority**: Critical
**Steps**:
1. Login as regular user
2. Navigate to /properties
3. Click "Invest Now" on available property
4. Click "View Details" on any property
5. Test watchlist functionality

**Expected Results**:
- All properties displayed
- Can add/remove from watchlist
- KYC check before investing
- Property details page loads
- Investment flow initiates

---

### Test Case 3.3: Property Filters & Search
**Priority**: Medium
**Steps**:
1. Use search bar to find properties
2. Apply location filter
3. Apply property type filter
4. Apply price range filter
5. Combine multiple filters

**Expected Results**:
- Search returns relevant results
- Filters work independently and together
- Results update in real-time
- Clear filters button works
- No properties message shows when no results

---

### Test Case 3.4: Refresh Functionality
**Priority**: Medium
**Steps**:
1. Navigate to properties page
2. Click refresh button
3. Verify loading state
4. Check data updates

**Expected Results**:
- Refresh button shows loading spinner
- Properties reload successfully
- No errors in console
- Button disabled during loading

---

## 4. INVESTMENT FLOW TESTING

### Test Case 4.1: KYC Verification Flow
**Priority**: Critical
**Steps**:
1. Login as user without KYC
2. Try to invest in property
3. Redirected to KYC page
4. Complete KYC form
5. Upload required documents
6. Submit for verification

**Expected Results**:
- Cannot invest without KYC
- KYC form validates all fields
- Documents upload successfully
- Submission confirmation received
- Status changes to "pending"

---

### Test Case 4.2: Investment Process (KYC Approved)
**Priority**: Critical
**Steps**:
1. Login as KYC-approved user
2. Click "Invest Now" on property
3. Enter investment amount
4. Review investment summary
5. Confirm investment
6. Process payment

**Expected Results**:
- Investment form validates amounts
- Can't invest below minimum
- Summary shows all details
- Payment gateway works
- Confirmation received
- Portfolio updated

---

### Test Case 4.3: Investment Amount Validation
**Priority**: High
**Steps**:
1. Try to invest below minimum (₹5 Lakhs)
2. Try to invest above available shares
3. Try invalid amount formats
4. Try investment with insufficient funds

**Expected Results**:
- Error for amount below minimum
- Error for exceeding availability
- Amount field validates format
- Clear error messages shown
- Cannot proceed with invalid amounts

---

## 5. DASHBOARD & PORTFOLIO TESTING

### Test Case 5.1: Dashboard Overview
**Priority**: Critical
**Steps**:
1. Login as investor with active investments
2. Navigate to dashboard
3. Verify all widgets load
4. Check portfolio summary
5. Verify transaction history

**Expected Results**:
- Dashboard loads without errors
- Shows current portfolio value
- Displays active investments
- Shows profit/loss
- Transaction history accurate

---

### Test Case 5.2: Portfolio Performance
**Priority**: High
**Steps**:
1. View portfolio performance charts
2. Check individual property performance
3. Verify ROI calculations
4. Check dividend/rental income display

**Expected Results**:
- Charts render correctly
- Data is accurate
- Performance metrics calculated correctly
- Historical data available

---

## 6. TRADING FUNCTIONALITY TESTING

### Test Case 6.1: Share Marketplace Access
**Priority**: High
**Steps**:
1. Login as investor tier user
2. Navigate to /trading
3. Verify available shares display
4. Check buy/sell options

**Expected Results**:
- Only investor tier users can access
- Available shares listed correctly
- Can view buy/sell prices
- Transaction fees displayed

---

### Test Case 6.2: Buy Shares Flow
**Priority**: High
**Steps**:
1. Select shares to buy
2. Enter quantity
3. Review transaction details
4. Confirm purchase
5. Verify portfolio update

**Expected Results**:
- Can select available shares
- Price calculated correctly
- Fees shown transparently
- Purchase confirms successfully
- Portfolio reflects new shares

---

### Test Case 6.3: Sell Shares Flow
**Priority**: High
**Steps**:
1. Navigate to owned shares
2. Click "Sell" on available shares
3. Enter sell quantity
4. Set sell price
5. Submit sell order

**Expected Results**:
- Only owned shares can be sold
- Can't sell more than owned
- Sell order created successfully
- Shows in pending orders
- Notifies when sold

---

## 7. NOTIFICATIONS SYSTEM TESTING

### Test Case 7.1: Notification Display
**Priority**: Medium
**Steps**:
1. Trigger various notification types
2. Check notification bell badge
3. Click to view notifications
4. Mark notifications as read
5. Clear all notifications

**Expected Results**:
- Notifications appear at top-20 (below header)
- Badge shows unread count
- Can view notification details
- Mark as read works
- Clear all removes notifications
- Z-index is 100 (above header)

---

### Test Case 7.2: Notification Types
**Priority**: Medium
**Steps**:
1. Test success notifications
2. Test error notifications
3. Test warning notifications
4. Test info notifications
5. Verify auto-dismiss timing

**Expected Results**:
- Each type has correct styling
- Icons display correctly
- Colors match type
- Auto-dismiss after set time
- Manual dismiss works

---

## 8. ADMIN FUNCTIONALITY TESTING

### Test Case 8.1: Admin Access Control
**Priority**: Critical
**Steps**:
1. Login as non-admin user
2. Try to access /admin
3. Login as admin user
4. Access admin panel
5. Verify admin menu items

**Expected Results**:
- Non-admins redirected from /admin
- Admins can access all admin pages
- Admin nav items show only for admins
- Proper authorization checks

---

### Test Case 8.2: User Management
**Priority**: High
**Steps**:
1. Access admin user list
2. Search for specific user
3. Update user tier
4. Approve/reject KYC
5. View user portfolio

**Expected Results**:
- Can view all users
- Search works correctly
- Tier updates save
- KYC approval updates status
- Can view any user's portfolio

---

### Test Case 8.3: Property Management
**Priority**: High
**Steps**:
1. Access admin properties
2. Create new property
3. Edit existing property
4. Update property status
5. Upload property documents

**Expected Results**:
- Can create properties
- All fields save correctly
- Status updates work
- Documents upload successfully
- Changes reflect immediately

---

## 9. SECURITY TESTING

### Test Case 9.1: Authentication Security
**Priority**: Critical
**Steps**:
1. Test session timeout
2. Try accessing protected routes without login
3. Test concurrent sessions
4. Verify logout clears session
5. Check password hashing

**Expected Results**:
- Session expires after inactivity
- Protected routes redirect to login
- Can handle multiple sessions
- Logout clears all session data
- Passwords never visible in plain text

---

### Test Case 9.2: Authorization Testing
**Priority**: Critical
**Steps**:
1. Try to access other users' data
2. Attempt admin actions as regular user
3. Test tier-based access control
4. Verify RLS policies on Supabase

**Expected Results**:
- Users can only see own data
- Admin actions blocked for non-admins
- Tier restrictions enforced
- Database policies prevent unauthorized access

---

### Test Case 9.3: Input Validation & XSS Prevention
**Priority**: High
**Steps**:
1. Enter script tags in forms
2. Try SQL injection patterns
3. Test with special characters
4. Verify file upload restrictions

**Expected Results**:
- Scripts sanitized/blocked
- SQL injection prevented
- Special chars handled safely
- Only allowed file types accepted

---

## 10. PERFORMANCE TESTING

### Test Case 10.1: Page Load Performance
**Priority**: High
**Steps**:
1. Measure landing page load time
2. Test dashboard load time
3. Check properties page with many listings
4. Verify image optimization

**Expected Results**:
- Landing page < 3 seconds
- Dashboard < 2 seconds
- Properties page < 3 seconds
- Images lazy-loaded

---

### Test Case 10.2: API Response Times
**Priority**: Medium
**Steps**:
1. Test property fetch time
2. Test user data fetch time
3. Test investment submission time
4. Monitor Supabase query performance

**Expected Results**:
- API responses < 1 second
- No timeout errors
- Queries optimized
- Proper caching implemented

---

## 11. DATA INTEGRITY TESTING

### Test Case 11.1: Investment Calculations
**Priority**: Critical
**Steps**:
1. Make test investment
2. Verify share allocation
3. Check portfolio value calculation
4. Verify transaction records
5. Test dividend calculations

**Expected Results**:
- Shares allocated correctly
- Portfolio value accurate
- All transactions logged
- Dividends calculated properly
- No rounding errors

---

### Test Case 11.2: Share Trading Accuracy
**Priority**: Critical
**Steps**:
1. Buy shares on marketplace
2. Verify share count updates
3. Sell shares
4. Check balance updates
5. Verify transaction fees

**Expected Results**:
- Share counts accurate
- Balances update correctly
- Fees calculated properly
- Transaction history complete
- No double-counting

---

## 12. ERROR HANDLING TESTING

### Test Case 12.1: Network Errors
**Priority**: High
**Steps**:
1. Simulate network disconnect
2. Try to submit forms
3. Check error messages
4. Verify retry mechanisms

**Expected Results**:
- Offline status detected
- User-friendly error messages
- Forms don't lose data
- Auto-retry on reconnect

---

### Test Case 12.2: Form Validation Errors
**Priority**: Medium
**Steps**:
1. Submit empty forms
2. Enter invalid email formats
3. Test password requirements
4. Check required field validation

**Expected Results**:
- Clear error messages
- Errors shown inline
- Form submission blocked
- Fields highlighted in red

---

## 13. BROWSER COMPATIBILITY TESTING

### Test Case 13.1: Cross-Browser Testing
**Priority**: High
**Steps**:
1. Test on Chrome (latest)
2. Test on Firefox (latest)
3. Test on Safari (latest)
4. Test on Edge (latest)
5. Check mobile browsers

**Expected Results**:
- Consistent appearance across browsers
- All features work on all browsers
- No console errors
- CSS renders correctly

---

## 14. ACCESSIBILITY TESTING

### Test Case 14.1: Keyboard Navigation
**Priority**: Medium
**Steps**:
1. Navigate site using only keyboard
2. Test tab order
3. Verify focus indicators
4. Check form accessibility

**Expected Results**:
- All interactive elements accessible
- Logical tab order
- Clear focus indicators
- Forms submittable via keyboard

---

### Test Case 14.2: Screen Reader Compatibility
**Priority**: Medium
**Steps**:
1. Test with screen reader
2. Verify alt text on images
3. Check ARIA labels
4. Test form labels

**Expected Results**:
- Content readable by screen reader
- Images have descriptive alt text
- Proper ARIA attributes
- Form fields properly labeled

---

## 15. EDGE CASES & STRESS TESTING

### Test Case 15.1: Concurrent Users
**Priority**: High
**Steps**:
1. Simulate 100+ concurrent users
2. Test database connection pooling
3. Check for race conditions
4. Verify data consistency

**Expected Results**:
- System handles concurrent users
- No database deadlocks
- No race conditions
- Data remains consistent

---

### Test Case 15.2: Large Data Sets
**Priority**: Medium
**Steps**:
1. Test with 1000+ properties
2. Test with 10,000+ users
3. Check pagination performance
4. Verify query optimization

**Expected Results**:
- Pagination works smoothly
- No performance degradation
- Queries remain fast
- UI remains responsive

---

## TEST EXECUTION PRIORITY

### Phase 1: Critical (Must Pass Before Launch)
1. User Registration & Login
2. Authentication & Authorization
3. Property Display
4. Investment Flow
5. Security Testing
6. Data Integrity

### Phase 2: High Priority
1. Navigation & UI/UX
2. KYC Process
3. Dashboard Functionality
4. Trading Features
5. Admin Functions
6. Performance

### Phase 3: Medium Priority
1. Notifications
2. Browser Compatibility
3. Accessibility
4. Error Handling
5. Edge Cases

---

## ACCEPTANCE CRITERIA FOR PRODUCTION

- ✅ Zero critical bugs
- ✅ < 2 high-priority bugs
- ✅ All security tests pass
- ✅ Performance benchmarks met
- ✅ Mobile responsive
- ✅ Cross-browser compatible
- ✅ Data integrity verified
- ✅ Admin functions working
- ✅ Payment gateway tested
- ✅ Backup & recovery tested

---

## NEXT STEPS AFTER TESTING
1. Fix all identified bugs
2. UI/UX improvements for dashboard and other pages
3. Final security audit
4. Load testing with 1000+ simulated users
5. Staging environment deployment
6. Production deployment planning
