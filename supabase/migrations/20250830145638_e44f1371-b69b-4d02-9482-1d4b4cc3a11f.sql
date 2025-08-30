-- Create enum types for the platform
CREATE TYPE user_tier AS ENUM ('explorer', 'waitlist_player', 'small_investor', 'large_investor');
CREATE TYPE kyc_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');
CREATE TYPE property_status AS ENUM ('upcoming', 'open', 'funded', 'closed');
CREATE TYPE investment_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'investment', 'dividend', 'fee');
CREATE TYPE document_type AS ENUM ('passport', 'drivers_license', 'id_card', 'proof_of_address', 'bank_statement', 'other');

-- User profiles table with KYC and tier information
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  address TEXT,
  country TEXT,
  tier user_tier DEFAULT 'explorer',
  kyc_status kyc_status DEFAULT 'pending',
  kyc_submitted_at TIMESTAMPTZ,
  kyc_approved_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ DEFAULT now(),
  trial_expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  subscription_active BOOLEAN DEFAULT false,
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- KYC documents table
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  verification_status kyc_status DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  property_type TEXT, -- residential, commercial, etc
  total_value DECIMAL(15,2) NOT NULL,
  available_shares INTEGER NOT NULL,
  share_price DECIMAL(10,2) NOT NULL,
  minimum_investment INTEGER DEFAULT 1,
  maximum_investment INTEGER,
  funded_amount DECIMAL(15,2) DEFAULT 0,
  funding_goal DECIMAL(15,2) NOT NULL,
  expected_annual_return DECIMAL(5,2),
  property_status property_status DEFAULT 'upcoming',
  images TEXT[], -- Array of image URLs
  documents TEXT[], -- Array of document URLs
  investment_start_date TIMESTAMPTZ,
  investment_end_date TIMESTAMPTZ,
  featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User investments in properties
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  shares_owned INTEGER NOT NULL,
  price_per_share DECIMAL(10,2) NOT NULL,
  total_investment DECIMAL(15,2) NOT NULL,
  investment_date TIMESTAMPTZ DEFAULT now(),
  investment_status investment_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User escrow balances
CREATE TABLE public.escrow_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  available_balance DECIMAL(15,2) DEFAULT 0,
  pending_balance DECIMAL(15,2) DEFAULT 0,
  total_invested DECIMAL(15,2) DEFAULT 0,
  total_returns DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transaction history
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_id TEXT, -- External payment reference
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for kyc_documents
CREATE POLICY "Users can view their own KYC documents" ON public.kyc_documents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own KYC documents" ON public.kyc_documents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own KYC documents" ON public.kyc_documents
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for properties (publicly viewable)
CREATE POLICY "Properties are publicly viewable" ON public.properties
  FOR SELECT USING (true);

-- RLS Policies for investments
CREATE POLICY "Users can view their own investments" ON public.investments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own investments" ON public.investments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for escrow_balances
CREATE POLICY "Users can view their own escrow balance" ON public.escrow_balances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own escrow balance" ON public.escrow_balances
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own escrow balance" ON public.escrow_balances
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_tier ON public.user_profiles(tier);
CREATE INDEX idx_kyc_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX idx_properties_status ON public.properties(property_status);
CREATE INDEX idx_properties_featured ON public.properties(featured);
CREATE INDEX idx_investments_user_id ON public.investments(user_id);
CREATE INDEX idx_investments_property_id ON public.investments(property_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email)
  VALUES (new.id, new.email);
  
  INSERT INTO public.escrow_balances (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile and escrow balance on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user tier based on investment amount
CREATE OR REPLACE FUNCTION public.update_user_tier()
RETURNS trigger AS $$
DECLARE
  total_invested DECIMAL(15,2);
  user_tier_new user_tier;
BEGIN
  -- Calculate total invested amount for the user
  SELECT COALESCE(SUM(total_investment), 0) INTO total_invested
  FROM public.investments
  WHERE user_id = NEW.user_id AND investment_status = 'confirmed';
  
  -- Determine tier based on investment amount
  IF total_invested = 0 THEN
    user_tier_new := 'explorer';
  ELSIF total_invested > 0 AND total_invested <= 10000 THEN
    user_tier_new := 'waitlist_player';
  ELSIF total_invested > 10000 AND total_invested <= 100000 THEN
    user_tier_new := 'small_investor';
  ELSE
    user_tier_new := 'large_investor';
  END IF;
  
  -- Update user tier
  UPDATE public.user_profiles
  SET tier = user_tier_new, updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update user tier when investments change
CREATE TRIGGER update_tier_on_investment
  AFTER INSERT OR UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.update_user_tier();