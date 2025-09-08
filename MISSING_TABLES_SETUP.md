# Missing Database Tables Setup

## Issue: Admin Panel Console Errors

The admin panel is trying to fetch data from tables that don't exist yet, causing 400 Bad Request errors in the console.

## Required Tables

### 1. **transactions** table
```sql
-- Create transactions table
CREATE TABLE transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  amount decimal(15,2) NOT NULL,
  transaction_type text NOT NULL, -- 'deposit', 'withdrawal', 'investment', 'dividend', 'subscription', 'fee'
  status text DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  description text,
  property_id uuid REFERENCES properties(id), -- optional, for investment transactions
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to view all transactions
CREATE POLICY "Admins can view all transactions" ON transactions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);
```

### 2. **support_tickets** table
```sql
-- Create support_tickets table
CREATE TABLE support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  ticket_type text NOT NULL, -- 'add_funds', 'withdraw_funds', 'general_support', 'technical'
  subject text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority text DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  amount decimal(15,2), -- for fund requests
  user_contact_info jsonb, -- store contact details and request info
  admin_notes text,
  assigned_to uuid REFERENCES auth.users(id), -- admin user
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow users to create their own tickets
CREATE POLICY "Users can create tickets" ON support_tickets
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all tickets
CREATE POLICY "Admins can view all tickets" ON support_tickets
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);

-- Allow admins to update tickets
CREATE POLICY "Admins can update tickets" ON support_tickets
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);
```

### 3. **investments** table
```sql
-- Create investments table
CREATE TABLE investments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  property_id uuid REFERENCES properties(id) NOT NULL,
  shares_owned integer NOT NULL,
  price_per_share decimal(15,2) NOT NULL,
  total_investment decimal(15,2) NOT NULL,
  investment_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  investment_status text DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
  transaction_id uuid REFERENCES transactions(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own investments
CREATE POLICY "Users can view own investments" ON investments
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow users to create investments
CREATE POLICY "Users can create investments" ON investments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all investments
CREATE POLICY "Admins can view all investments" ON investments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);
```

### 4. **escrow_balances** table (if missing)
```sql
-- Create escrow_balances table
CREATE TABLE escrow_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  available_balance decimal(15,2) DEFAULT 0.00 NOT NULL,
  pending_balance decimal(15,2) DEFAULT 0.00 NOT NULL,
  total_invested decimal(15,2) DEFAULT 0.00 NOT NULL,
  total_returns decimal(15,2) DEFAULT 0.00 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE escrow_balances ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own balance
CREATE POLICY "Users can view own balance" ON escrow_balances
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to view all balances
CREATE POLICY "Admins can view all balances" ON escrow_balances
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.is_admin = true
  )
);
```

## Quick Setup: Run All Tables at Once

Copy this complete SQL into your Supabase SQL Editor:

```sql
-- Create all missing tables with proper RLS policies

-- 1. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  amount decimal(15,2) NOT NULL,
  transaction_type text NOT NULL,
  status text DEFAULT 'pending',
  description text,
  property_id uuid REFERENCES properties(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = true));

-- 2. SUPPORT_TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  ticket_type text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open',
  priority text DEFAULT 'medium',
  amount decimal(15,2),
  user_contact_info jsonb,
  admin_notes text,
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all tickets" ON support_tickets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = true));
CREATE POLICY "Admins can update tickets" ON support_tickets FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = true));

-- 3. INVESTMENTS TABLE
CREATE TABLE IF NOT EXISTS investments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  property_id uuid REFERENCES properties(id) NOT NULL,
  shares_owned integer NOT NULL,
  price_per_share decimal(15,2) NOT NULL,
  total_investment decimal(15,2) NOT NULL,
  investment_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  investment_status text DEFAULT 'pending',
  transaction_id uuid REFERENCES transactions(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investments" ON investments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create investments" ON investments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all investments" ON investments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = true));

-- 4. ESCROW_BALANCES TABLE
CREATE TABLE IF NOT EXISTS escrow_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  available_balance decimal(15,2) DEFAULT 0.00 NOT NULL,
  pending_balance decimal(15,2) DEFAULT 0.00 NOT NULL,
  total_invested decimal(15,2) DEFAULT 0.00 NOT NULL,
  total_returns decimal(15,2) DEFAULT 0.00 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE escrow_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balance" ON escrow_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all balances" ON escrow_balances FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = true));
```

## After Running the SQL:

1. **Refresh your admin panel** - the console errors should be gone
2. **All admin dashboard stats** will now work properly
3. **Wallet operations** will be able to create support tickets
4. **Investment tracking** will be fully functional

The admin panel will now load without any console errors and show proper data!