-- Create the watchlist table that the code expects
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique combination of user and property
  UNIQUE(user_id, property_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_property_id ON public.watchlist(property_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON public.watchlist(added_at);

-- Enable RLS
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own watchlist items
CREATE POLICY "Users can view own watchlist" ON public.watchlist
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own watchlist items
CREATE POLICY "Users can insert own watchlist" ON public.watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlist items
CREATE POLICY "Users can update own watchlist" ON public.watchlist
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own watchlist items
CREATE POLICY "Users can delete own watchlist" ON public.watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all watchlist items
CREATE POLICY "Admins can view all watchlist" ON public.watchlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER watchlist_updated_at
  BEFORE UPDATE ON public.watchlist
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
