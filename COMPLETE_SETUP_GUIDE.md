# 🚀 Complete EquityLeap Setup Guide

After implementing all the new features, here's what you need to run to get everything working:

## 📋 SQL Queries to Run (In Order)

### 1. **First, run the additional tables** (if not done already):
```sql
-- Run this in Supabase SQL Editor
-- File: CREATE_ADDITIONAL_TABLES.sql
```

### 2. **Set up the database functions**:
```sql
-- Run this in Supabase SQL Editor  
-- File: /src/utils/database-functions.sql
```

### 3. **Set up the watchlist alerts**:
```sql
-- Run this in Supabase SQL Editor
-- File: WATCHLIST_ALERTS_SETUP.sql
```

### 4. **Create Storage Bucket for Property Documents**:
```sql
-- Run this in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) VALUES ('property-documents', 'property-documents', true);

-- Set up storage policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'property-documents');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'property-documents');
CREATE POLICY "Users can update own uploads" ON storage.objects FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'property-documents');
```

## 🎯 New Features Now Available

### ✅ **Watchlist System**
- **Access**: Your watchlist now appears on the Dashboard (bottom section)
- **Smart Alerts**: When sold-out watchlist properties have shares available, you'll see: 
  - **"Watchlist Alert!"** banner at the top of the watchlist
  - **"Available Now!"** badges on specific properties  
  - **"Buy Shares Now!"** button (orange-colored for urgency)

### ✅ **Share Selling System**
- **User Side**: "Sell Shares" button appears on Investment pages when admin enables it
- **Admin Side**: New admin panel to control which properties allow share selling
- **Marketplace**: Available shares show up in ShareMarketplace component

### ✅ **Property Documentation**
- **Admin Upload**: Property documents (RERA, legal certificates, etc.)
- **Public Viewing**: All users can view uploaded documents
- **File Storage**: Uses Supabase Storage bucket 'property-documents'

### ✅ **Enhanced ROI Display**
- **Sold-out Properties**: Admins can set actual ROI percentage
- **Display**: Only shows for properties with status 'funded'

## 🔧 How to Use the New Features

### **For Regular Users:**

1. **Watchlist Management**:
   - Save properties using the heart button on property pages
   - View saved properties on Dashboard
   - Get instant alerts when saved sold-out properties have shares available

2. **Share Selling**:
   - Go to any property you own shares in
   - If admin enabled share selling, you'll see "Sell Shares" button
   - Fill out the sell form and wait for buyers

3. **Share Buying**:
   - Check "Available Shares" section on property pages
   - Buy shares from other investors at their listed prices

### **For Admins:**

1. **Enable Share Selling**:
   - Go to Admin Panel → Share Controls
   - Toggle "Allow Share Selling" for specific properties
   - Set actual ROI for sold-out properties

2. **Upload Property Documents**:
   - Go to any property page
   - Use "Upload Document" button (admin only)
   - Upload legal certificates, RERA approvals, etc.

## 🚨 Alert System Behavior

When an investor creates a sell request for a sold-out property:

1. **Automatic Alerts**: System creates alerts for all users who have that property in their watchlist
2. **Dashboard Display**: Watchlist component shows:
   - Orange alert banner: "Watchlist Alert! Some of your watchlist properties now have shares available"
   - Orange badges showing which properties have shares
   - Orange "Buy Shares Now!" buttons for urgent action
3. **Smart Cleanup**: Alerts auto-mark as read when shares are sold/cancelled

## 🗄️ Database Structure Added

### New Tables:
- `property_documents` - Legal documents and certificates
- `property_management_companies` - Property managers
- `property_management_assignments` - Manager assignments
- `property_tenants` - Tenant information
- `property_performance_history` - Historical performance data
- `user_alerts` - Notification system
- `share_sell_requests` - Share selling marketplace
- `user_audit_trail` - Complete audit logging

### New Columns in Existing Tables:
- `properties.shares_sellable` - Boolean to control share selling
- `properties.actual_roi_percentage` - Actual ROI for sold properties

## 🎨 UI Components Added

### Dashboard Components:
- `MyWatchlist` - Shows saved properties with smart alerts
- `MyShareSellRequests` - Manage your share selling requests

### Property Page Components:
- `PropertyDocuments` - View/upload property documents
- `ShareSellDialog` - Create share sell requests
- `ShareMarketplace` - Buy shares from other investors

### Admin Components:
- `AdminShareControls` - Control share selling per property

## 🔐 Security & Permissions

- **Row Level Security (RLS)** enabled on all new tables
- **Storage Policies** set up for document uploads
- **Audit Trail** logs all important user actions
- **Admin Controls** restrict sensitive operations

## ✅ Testing the Setup

1. **Test Watchlist**:
   - Save a property to watchlist
   - Check if it appears on Dashboard

2. **Test Share Selling**:
   - Admin: Enable share selling for a property you own shares in
   - User: Try to create a sell request
   - Check if it appears in marketplace

3. **Test Alerts**:
   - Save a sold-out property to watchlist
   - Admin: Enable share selling for that property
   - Have someone create a sell request
   - Check if alert appears on your watchlist

## 🚀 You're All Set!

Your platform now has:
- ✅ Smart watchlist with availability alerts
- ✅ Complete share trading system
- ✅ Property document management
- ✅ Enhanced admin controls
- ✅ Comprehensive audit trail
- ✅ Mobile-responsive design

The watchlist alerts will now prominently show "Your watchlist property is now up for grabs. Act fast." exactly as requested! 🎉

## ⏱️ Secondary Market Scheduler

To ensure expired holds and reservations are cleaned up automatically (and funds/shares are released), add a scheduled job in Supabase:

1. Open Supabase SQL Editor and run:

```
-- Runs every minute
select cron.schedule(
  'expire_trading_artifacts',
  '*/1 * * * *',
  $$select public.expire_holds_and_reservations();$$
);
```

If `pg_cron` is not enabled in your project, you can use Supabase Scheduled Jobs UI to call:

```
SELECT public.expire_holds_and_reservations();
```

every minute.

This complements the new trading flow (holds/reservations) and prevents stale locks.
