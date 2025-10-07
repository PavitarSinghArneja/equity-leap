# 🚀 Production Deployment Guide - Equity Leap

## ✅ What's Production Ready

All features are now **enabled by default** and work without environment variables:

- ✅ **Analytics** - User activity tracking
- ✅ **Secondary Market** - Share trading with holds/reservations
- ✅ **Trading UI** - Professional trading interface
- ✅ **Notifications** - Alerts and notifications
- ✅ **Google OAuth** - Name capture from Google
- ✅ **Admin Features** - User management, share trading admin

## 📋 Pre-Deployment Checklist

### 1. Run Database Migrations in Supabase

Go to your Supabase project → SQL Editor and run these migrations **in order**:

```sql
-- Migration 1: Secondary Market Core (already run if working locally)
-- File: supabase/migrations/20251005120000_secondary_market_core.sql

-- Migration 2: Trading Parking and Expiry (already run if working locally)
-- File: supabase/migrations/20251005123000_trading_parking_and_expiry.sql

-- Migration 3: User Events and Alerts v2 (already run if working locally)
-- File: supabase/migrations/20251005130000_user_events_and_alert_triggers_v2.sql

-- Migration 4: Google Name Capture (already run if working locally)
-- File: supabase/migrations/20251006000000_fix_google_name_capture.sql

-- Migration 5: Admin Events Access (IMPORTANT - Run this one!)
DROP POLICY IF EXISTS "admins_view_all_events" ON public.user_events;
CREATE POLICY "admins_view_all_events" ON public.user_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );
```

**Why Migration 5 is critical:** Without it, admins cannot see user analytics in the Admin Panel.

### 2. Environment Variables (Hostinger)

Set these in Hostinger's environment variables panel:

```bash
VITE_SUPABASE_URL=https://fcyjlxrrjpiqxhgljmxi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjeWpseHJyanBpcXhoZ2xqbXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ5MDIsImV4cCI6MjA3MjE0MDkwMn0.YHIDoW10Zs_a9xGbmq0hSsy024T2F9df8T9yejQlga4
VITE_GEMINI_API_KEY=AIzaSyCs5ahNpAujPlBicJAMS0NDUdL7UsTTxS4
NODE_ENV=production
```

**Note:** Feature flags are now hardcoded, so you don't need `VITE_FLAG_*` variables anymore!

### 3. Build for Production

```bash
cd equity-leap
npm run build
```

This creates an optimized build in the `dist/` folder.

### 4. Deploy to Hostinger

Upload the contents of the `dist/` folder to your Hostinger hosting.

**Important:** Ensure your `.htaccess` or hosting config supports React Router (client-side routing):

```apache
# .htaccess for Apache (if Hostinger uses Apache)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## 🧪 Post-Deployment Testing

### 1. Test Analytics (5 minutes)

1. Log in as admin at `https://retreatslice.com`
2. Browse around (view properties, add to watchlist)
3. Go to Admin Panel → Activity tab
4. **Expected:** Should show recent user events

If empty:
- Check that Migration 5 was run in Supabase
- Check browser console for errors

### 2. Test Trading Flow (10 minutes)

1. Create two test accounts:
   - Account A: Upgrade to "waitlist_player" tier in Supabase
   - Account B: Upgrade to "waitlist_player" tier in Supabase

2. As Account A (Seller):
   - Go to a property detail page
   - Create a sell order (list shares for sale)

3. As Account B (Buyer):
   - Go to `/trading` page
   - Should see the trading interface
   - Try to buy shares from Account A
   - **Expected:**
     - Wallet balance validated
     - Tier validated (only waitlist_player+ can trade)
     - Shares appear in dashboard after purchase
     - Seller gets credited

### 3. Test Gemini AI Analysis (Optional)

1. Go to Admin Panel → Property Notes tab
2. Select a property with user notes
3. Click "Analyze with AI"
4. **Expected:** AI-generated sentiment analysis and insights

If it fails:
- Check that `VITE_GEMINI_API_KEY` is set correctly
- Model is now `gemini-2.0-flash-exp` (updated from 1.5-flash)

## 🐛 Troubleshooting

### Analytics Not Working

**Symptom:** Admin Panel → Activity shows "No recent activity"

**Fix:**
```sql
-- Run this in Supabase SQL Editor
DROP POLICY IF EXISTS "admins_view_all_events" ON public.user_events;
CREATE POLICY "admins_view_all_events" ON public.user_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );
```

### Trading Page 404

**Symptom:** `/trading` shows "Page not found"

**Fix:**
- Ensure you deployed the latest build (run `npm run build` again)
- Check that routing is configured correctly in hosting

### Users Can Buy Shares Without Funds

**Symptom:** Purchase succeeds even with insufficient wallet balance

**This is fixed in production!** The ShareMarketplace component now validates:
- Wallet balance before purchase
- User tier (only waitlist_player+ can buy)
- Atomically deducts funds
- Rolls back on error

### Environment Variables Not Loading

**This is no longer an issue!** Feature flags are hardcoded and enabled by default.

## 📊 Feature Flags Reference

All feature flags are **enabled by default** in [src/config/featureFlags.ts](src/config/featureFlags.ts):

```typescript
export const featureFlags = {
  secondary_market_enabled: true,   // Share trading with holds/reservations
  trading_ui_enabled: true,         // Trading page and components
  trial_enforcement_enabled: false, // 14-day trial (disabled for now)
  notifications_enabled: true,      // Alerts and notifications
  analytics_enabled: true,          // User activity tracking
};
```

To disable a feature in production, set the environment variable:
```bash
VITE_FLAG_ANALYTICS=false  # Disables analytics
```

## 🎯 What's Next

After successful deployment:

1. **Set up cron jobs** (optional) - For automatic cleanup of expired holds:
   ```sql
   -- Run this via Supabase Dashboard → Database → Cron Jobs (if available)
   -- Or manually via Admin Panel → Share Trading → "Cleanup Expired"
   SELECT expire_holds_and_reservations();
   ```

2. **Monitor analytics** - Check Admin Panel daily for user engagement metrics

3. **Test with real users** - Invite beta testers to try the trading flow

4. **Set up monitoring** - Consider adding error tracking (Sentry, etc.)

## 📝 Migration Summary

| Migration | Purpose | Status |
|-----------|---------|--------|
| 20251005120000 | Secondary market tables & functions | ✅ Required |
| 20251005123000 | Share parking & expiry logic | ✅ Required |
| 20251005130000 | User events & alerts (v2) | ✅ Required |
| 20251006000000 | Google OAuth name capture | ✅ Required |
| 20251007000000 | Admin RLS for user_events | ⚠️ **CRITICAL** |

## 🔒 Security Notes

- ✅ RLS policies protect all sensitive data
- ✅ Wallet operations use optimistic locking
- ✅ Tier validation prevents unauthorized trading
- ✅ Admin-only functions use `SECURITY DEFINER`
- ✅ All financial transactions have rollback mechanisms

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify all migrations ran successfully
4. Ensure environment variables are set correctly

---

**Last Updated:** October 7, 2025
**Version:** 1.0.0 - Production Ready
