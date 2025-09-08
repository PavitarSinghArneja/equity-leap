-- Create share_sell_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS share_sell_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    shares_to_sell INTEGER NOT NULL CHECK (shares_to_sell > 0),
    price_per_share DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (shares_to_sell * price_per_share) STORED,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'expired'
    buyer_id UUID REFERENCES user_profiles(user_id), -- Set when someone buys
    sold_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'), -- Auto expire in 30 days
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_sell_status CHECK (status IN ('active', 'completed', 'cancelled', 'expired'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_share_sell_requests_seller ON share_sell_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_share_sell_requests_property ON share_sell_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_share_sell_requests_status ON share_sell_requests(status);

-- Enable RLS
ALTER TABLE share_sell_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view active sell requests and their own requests" ON share_sell_requests;
DROP POLICY IF EXISTS "Users can create their own sell requests" ON share_sell_requests;
DROP POLICY IF EXISTS "Users can update their own sell requests" ON share_sell_requests;

CREATE POLICY "Users can view active sell requests and their own requests"
ON share_sell_requests
FOR SELECT
USING (
    auth.uid()::text = seller_id::text OR 
    (status = 'active' AND auth.role() = 'authenticated')
);

CREATE POLICY "Users can create their own sell requests"
ON share_sell_requests
FOR INSERT
WITH CHECK (auth.uid()::text = seller_id::text);

CREATE POLICY "Users can update their own sell requests"
ON share_sell_requests
FOR UPDATE
USING (auth.uid()::text = seller_id::text OR auth.uid()::text = buyer_id::text);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON share_sell_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON share_sell_requests TO service_role;

-- Fix user_alerts RLS to allow system/trigger insertions
DROP POLICY IF EXISTS "System can insert alerts for triggers" ON user_alerts;
CREATE POLICY "System can insert alerts for triggers"
ON user_alerts
FOR INSERT
WITH CHECK (true); -- Allow system to insert any alerts

-- Also ensure service_role can insert alerts
GRANT INSERT ON user_alerts TO service_role;