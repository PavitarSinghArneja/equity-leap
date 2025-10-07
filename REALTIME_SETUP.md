# Trading Platform Realtime Setup

## Issue
The trading page components are listening for realtime updates but Supabase Realtime is not enabled on the required tables.

## Required Tables for Realtime
1. **`share_sell_requests`** - For live order book updates (buy/sell orders)
2. **`investments`** - For live portfolio updates
3. **`escrow_balances`** - For live wallet balance updates

## How to Enable Realtime (Via Supabase Dashboard)

### Method 1: Via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/fcyjlxrrjpiqxhgljmxi/database/publications
2. Click on the **"supabase_realtime"** publication
3. Add the following tables:
   - ✅ `share_sell_requests`
   - ✅ `investments`
   - ✅ `escrow_balances`
4. Save changes

### Method 2: Via SQL Editor
1. Go to: https://supabase.com/dashboard/project/fcyjlxrrjpiqxhgljmxi/sql/new
2. Run the migration file: `supabase/migrations/20251007180000_enable_realtime_trading.sql`
3. Or run this SQL directly:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE share_sell_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE investments;
ALTER PUBLICATION supabase_realtime ADD TABLE escrow_balances;
```

## What This Enables

### OrderBook Component ([src/components/trading/OrderBook.tsx:44-58](src/components/trading/OrderBook.tsx#L44-L58))
```typescript
const channel: RealtimeChannel = supabase
  .channel(`orderbook_${propertyId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'share_sell_requests',  // ← NEEDS REALTIME
      filter: `property_id=eq.${propertyId}`
    },
    () => {
      fetchOrderBook();
    }
  )
  .subscribe();
```

### MyOrders Component ([src/components/trading/MyOrders.tsx:57-71](src/components/trading/MyOrders.tsx#L57-L71))
```typescript
const channel: RealtimeChannel = supabase
  .channel(`my_orders_${user.id}_${propertyId || 'all'}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'share_sell_requests',  // ← NEEDS REALTIME
      filter: `seller_id=eq.${user.id}`
    },
    () => {
      fetchOrders();
    }
  )
  .subscribe();
```

## Testing Realtime Works

After enabling realtime:

1. Open trading page: http://localhost:8080/trading
2. Open browser console (F12)
3. You should see subscription confirmation logs
4. Open trading page in 2 browser windows side-by-side
5. Create a sell order in one window
6. The order should appear instantly in the other window's order book

## Verification

Run this in the browser console after enabling realtime:
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://fcyjlxrrjpiqxhgljmxi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);

const channel = supabase
  .channel('test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'share_sell_requests' },
    payload => console.log('✅ Realtime working!', payload)
  )
  .subscribe((status) => console.log('Status:', status));
```

## Migration File
The SQL migration is saved in:
- [supabase/migrations/20251007180000_enable_realtime_trading.sql](supabase/migrations/20251007180000_enable_realtime_trading.sql)

## Current Status
❌ **Realtime NOT enabled** - Trading page will load but won't show live updates
✅ After following steps above - Trading page will show **LIVE** order book updates
