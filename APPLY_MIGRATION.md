# 🔧 Apply RLS Migration - 30 Second Fix

## What This Fixes
- ✅ Trading page dropdown now shows properties
- ✅ Share purchase "Failed to fetch user profile" error resolved
- ✅ Column name errors fixed

## Step 1: Apply SQL Migration

1. **Open Supabase SQL Editor:**
   https://supabase.com/dashboard/project/fcyjlxrrjpiqxhgljmxi/sql/new

2. **Paste and Run This:**
```sql
DROP POLICY IF EXISTS "properties_select_own" ON public.properties;
DROP POLICY IF EXISTS "properties_select_authenticated" ON public.properties;
DROP POLICY IF EXISTS "authenticated_users_view_active_properties" ON public.properties;
DROP POLICY IF EXISTS "admins_view_all_properties" ON public.properties;

CREATE POLICY "authenticated_users_view_open_properties"
ON public.properties FOR SELECT
USING (auth.uid() IS NOT NULL AND property_status IN ('open', 'funded'));

CREATE POLICY "admins_view_all_properties"
ON public.properties FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_admin = true));
```

3. **Click RUN** ✅ Should see "Success. No rows returned"

## Step 2: Test

### Test Trading Page:
- Go to: https://retreatslice.com/trading
- Should see properties in dropdown ✅

### Test Share Purchase:
- Go to any property → Buy Shares
- Should work without errors ✅

## Done! 🎉
