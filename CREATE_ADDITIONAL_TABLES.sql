-- Create additional tables for EquityLeap platform
-- Run this after the watchlist table creation

-- 1. Property Documents Table
CREATE TABLE IF NOT EXISTS property_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'legal_certificate', 'rera_approval', 'property_deed', 'tax_document', 'insurance', 'other'
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES user_profiles(user_id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT TRUE, -- Whether document is visible to all users
    description TEXT,
    
    CONSTRAINT valid_document_type CHECK (document_type IN ('legal_certificate', 'rera_approval', 'property_deed', 'tax_document', 'insurance', 'management_agreement', 'other'))
);

-- 2. Property Management Companies Table
CREATE TABLE IF NOT EXISTS property_management_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    license_number VARCHAR(100),
    years_experience INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Property Management Assignment Table
CREATE TABLE IF NOT EXISTS property_management_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    management_company_id UUID REFERENCES property_management_companies(id),
    start_date DATE NOT NULL,
    end_date DATE,
    management_fee_percentage DECIMAL(5,2), -- e.g., 5.50 for 5.5%
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tenant Information Table
CREATE TABLE IF NOT EXISTS property_tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    tenant_name VARCHAR(255),
    tenant_type VARCHAR(50), -- 'individual', 'corporate', 'government'
    lease_start_date DATE NOT NULL,
    lease_end_date DATE NOT NULL,
    monthly_rent DECIMAL(15,2) NOT NULL,
    security_deposit DECIMAL(15,2),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    lease_status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'terminated', 'renewed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_tenant_type CHECK (tenant_type IN ('individual', 'corporate', 'government')),
    CONSTRAINT valid_lease_status CHECK (lease_status IN ('active', 'expired', 'terminated', 'renewed'))
);

-- 5. Property Performance History Table
CREATE TABLE IF NOT EXISTS property_performance_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    occupancy_rate DECIMAL(5,2), -- e.g., 95.50 for 95.5%
    monthly_rental_income DECIMAL(15,2),
    maintenance_expenses DECIMAL(15,2),
    property_value DECIMAL(15,2), -- Current market value estimate
    roi_percentage DECIMAL(5,2), -- Return on Investment percentage
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per property per date
    UNIQUE(property_id, recorded_date)
);

-- 6. User Alerts System
CREATE TABLE IF NOT EXISTS user_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'price_change', 'property_announcement', 'platform_announcement', 'share_sell_request', 'property_sold_out'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE, -- NULL for platform-wide alerts
    related_user_id UUID REFERENCES user_profiles(user_id), -- For share sell requests
    is_read BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    webhook_payload JSONB, -- For n8n webhook data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration for temporary alerts
    
    CONSTRAINT valid_alert_type CHECK (alert_type IN ('price_change', 'property_announcement', 'platform_announcement', 'share_sell_request', 'property_sold_out', 'shares_sellable'))
);

-- 7. Share Sell Requests Table
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

-- 8. Audit Trail Table
CREATE TABLE IF NOT EXISTS user_audit_trail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL, -- 'login', 'investment', 'kyc_submission', 'share_sell_request', 'profile_update', etc.
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    related_entity_type VARCHAR(50), -- 'property', 'transaction', 'investment', etc.
    related_entity_id UUID,
    metadata JSONB, -- Additional structured data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_documents_property_id ON property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_type ON property_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_property_management_property_id ON property_management_assignments(property_id);
CREATE INDEX IF NOT EXISTS idx_property_tenants_property_id ON property_tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_property_tenants_status ON property_tenants(lease_status);
CREATE INDEX IF NOT EXISTS idx_property_performance_property_id ON property_performance_history(property_id);
CREATE INDEX IF NOT EXISTS idx_property_performance_date ON property_performance_history(recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_read_status ON user_alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_alerts_type ON user_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_share_sell_requests_seller ON share_sell_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_share_sell_requests_property ON share_sell_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_share_sell_requests_status ON share_sell_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON user_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action_type ON user_audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON user_audit_trail(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_sell_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_documents
CREATE POLICY "Public documents are viewable by all authenticated users"
ON property_documents
FOR SELECT
USING (auth.role() = 'authenticated' AND is_public = true);

CREATE POLICY "Admins can manage all property documents"
ON property_documents
FOR ALL
USING ((SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true);

-- RLS Policies for user_alerts
CREATE POLICY "Users can view their own alerts"
ON user_alerts
FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own alerts"
ON user_alerts
FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- RLS Policies for share_sell_requests
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

-- RLS Policies for audit_trail
CREATE POLICY "Users can view their own audit trail"
ON user_audit_trail
FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can insert audit records"
ON user_audit_trail
FOR INSERT
WITH CHECK (true); -- System/triggers can insert

-- Add new property columns
ALTER TABLE properties ADD COLUMN IF NOT EXISTS shares_sellable BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS actual_roi_percentage DECIMAL(5,2); -- Only shown when sold out

-- Add comments
COMMENT ON TABLE property_documents IS 'Stores legal documents, certificates and other property-related files';
COMMENT ON TABLE property_management_companies IS 'Property management companies that handle property operations';
COMMENT ON TABLE property_tenants IS 'Current and historical tenant information for properties';
COMMENT ON TABLE property_performance_history IS 'Historical performance data for properties (shown only when sold out)';
COMMENT ON TABLE user_alerts IS 'User notification system for property and platform announcements';
COMMENT ON TABLE share_sell_requests IS 'Requests from investors to sell their property shares';
COMMENT ON TABLE user_audit_trail IS 'Complete audit log of user actions for compliance and security';

-- Verify table creation
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'property_documents', 
    'property_management_companies', 
    'property_management_assignments',
    'property_tenants', 
    'property_performance_history', 
    'user_alerts', 
    'share_sell_requests', 
    'user_audit_trail'
)
ORDER BY table_name;