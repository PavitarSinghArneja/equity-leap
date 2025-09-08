-- Create property watchlist table for EquityLeap
-- This allows users to save properties they're interested in

-- Create the watchlist table
CREATE TABLE IF NOT EXISTS property_watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT, -- Optional user notes about why they're interested
    
    -- Ensure a user can't add the same property twice
    UNIQUE(user_id, property_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON property_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_property_id ON property_watchlist(property_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_created_at ON property_watchlist(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE property_watchlist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own watchlist items
CREATE POLICY "Users can view their own watchlist"
ON property_watchlist
FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Users can add items to their own watchlist
CREATE POLICY "Users can add to their own watchlist"
ON property_watchlist
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

-- Users can delete from their own watchlist
CREATE POLICY "Users can remove from their own watchlist"
ON property_watchlist
FOR DELETE
USING (auth.uid()::text = user_id::text);

-- Users can update their own watchlist items (notes)
CREATE POLICY "Users can update their own watchlist"
ON property_watchlist
FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Add comments
COMMENT ON TABLE property_watchlist IS 'Stores user watchlists for properties they are interested in investing';
COMMENT ON COLUMN property_watchlist.user_id IS 'Reference to the user who added the property to their watchlist';
COMMENT ON COLUMN property_watchlist.property_id IS 'Reference to the property being watched';
COMMENT ON COLUMN property_watchlist.notes IS 'Optional user notes about their interest in this property';

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'property_watchlist' 
ORDER BY ordinal_position;