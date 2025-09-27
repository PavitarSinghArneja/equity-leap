-- =============================================
-- COMPREHENSIVE USER ACTIVITY TRACKING SYSTEM
-- =============================================
-- This system tracks user behavior for sales insights and psychology analysis

-- 1. USER SESSIONS TABLE
-- Tracks login sessions and basic device/location info
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50), -- mobile, desktop, tablet
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    referrer TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    session_duration INTEGER, -- seconds
    pages_visited INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USER EVENTS TABLE
-- Main table for tracking all user interactions
CREATE TABLE IF NOT EXISTS user_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- see event types below
    event_category VARCHAR(50) NOT NULL, -- navigation, property, investment, etc.
    event_action VARCHAR(100) NOT NULL, -- viewed, clicked, saved, etc.
    event_label VARCHAR(200), -- additional context
    page_url TEXT,
    page_title VARCHAR(200),
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    investment_amount DECIMAL(15,2), -- for investment-related events
    metadata JSONB, -- flexible data storage for event-specific info
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USER ANALYTICS AGGREGATED DATA
-- Pre-computed analytics for faster queries
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    -- Engagement Metrics
    total_sessions INTEGER DEFAULT 0,
    total_page_views INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0, -- seconds
    properties_viewed INTEGER DEFAULT 0,
    properties_saved INTEGER DEFAULT 0,
    properties_removed INTEGER DEFAULT 0,
    notes_added INTEGER DEFAULT 0,
    -- Investment Behavior
    investment_flows_started INTEGER DEFAULT 0,
    investment_flows_completed INTEGER DEFAULT 0,
    total_investment_amount DECIMAL(15,2) DEFAULT 0,
    avg_investment_amount DECIMAL(15,2) DEFAULT 0,
    -- Sales Funnel
    kyc_progress_updates INTEGER DEFAULT 0,
    support_interactions INTEGER DEFAULT 0,
    documents_uploaded INTEGER DEFAULT 0,
    -- Scoring
    engagement_score INTEGER DEFAULT 0, -- 0-100
    intent_score INTEGER DEFAULT 0, -- 0-100 (likelihood to invest)
    risk_score INTEGER DEFAULT 0, -- 0-100 (likelihood to churn)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PROPERTY ENGAGEMENT TRACKING
-- Detailed property interaction data
CREATE TABLE IF NOT EXISTS property_engagements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    first_viewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_viewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_views INTEGER DEFAULT 1,
    total_time_spent INTEGER DEFAULT 0, -- seconds
    sections_viewed TEXT[], -- array of sections user viewed
    documents_downloaded TEXT[], -- array of document names
    images_viewed INTEGER DEFAULT 0,
    watchlist_added_at TIMESTAMP WITH TIME ZONE,
    watchlist_removed_at TIMESTAMP WITH TIME ZONE,
    notes_count INTEGER DEFAULT 0,
    investment_started_at TIMESTAMP WITH TIME ZONE,
    investment_completed_at TIMESTAMP WITH TIME ZONE,
    investment_amount DECIMAL(15,2),
    sharing_events INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SALES INSIGHTS TABLE
-- Pre-computed insights for sales team
CREATE TABLE IF NOT EXISTS sales_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_score INTEGER DEFAULT 0, -- 0-100
    lead_temperature VARCHAR(20) DEFAULT 'cold', -- hot, warm, cold
    preferred_investment_range VARCHAR(50), -- 0-1L, 1L-5L, etc.
    favorite_property_types TEXT[], -- apartment, villa, etc.
    favorite_locations TEXT[], -- cities/areas of interest
    investment_timeline VARCHAR(50), -- immediate, 1-3months, 6months+
    risk_tolerance VARCHAR(20), -- low, medium, high
    engagement_frequency VARCHAR(20), -- daily, weekly, monthly
    last_activity TIMESTAMP WITH TIME ZONE,
    next_follow_up_date DATE,
    sales_notes TEXT,
    assigned_sales_rep UUID REFERENCES user_profiles(id),
    lead_source VARCHAR(100),
    -- Behavioral Flags
    is_research_heavy BOOLEAN DEFAULT FALSE,
    is_price_sensitive BOOLEAN DEFAULT FALSE,
    is_location_focused BOOLEAN DEFAULT FALSE,
    prefers_new_properties BOOLEAN DEFAULT FALSE,
    likely_to_invest_soon BOOLEAN DEFAULT FALSE,
    needs_nurturing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. USER JOURNEY MAPPING
-- Track user progression through sales funnel
CREATE TABLE IF NOT EXISTS user_journey_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL, -- visitor, registered, waitlist, kyc_pending, kyc_approved, invested
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exited_at TIMESTAMP WITH TIME ZONE,
    duration_in_stage INTEGER, -- seconds
    stage_actions TEXT[], -- actions taken in this stage
    conversion_trigger VARCHAR(200), -- what caused progression to next stage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- EVENT TYPES REFERENCE
-- =============================================

-- NAVIGATION EVENTS
-- - page_view: User viewed a page
-- - page_exit: User left a page
-- - scroll_depth: User scrolled percentage of page
-- - time_on_page: Time spent on specific page

-- PROPERTY EVENTS
-- - property_view: Viewed property details
-- - property_image_view: Clicked on property image
-- - property_document_download: Downloaded property document
-- - property_share: Shared property
-- - property_compare: Added to comparison
-- - watchlist_add: Added to watchlist
-- - watchlist_remove: Removed from watchlist
-- - watchlist_note_add: Added note to property
-- - watchlist_note_edit: Edited property note

-- INVESTMENT EVENTS
-- - investment_flow_start: Started investment process
-- - investment_amount_change: Changed investment amount
-- - investment_payment_method: Selected payment method
-- - investment_flow_abandon: Left investment flow
-- - investment_complete: Completed investment
-- - investment_share_purchase: Bought shares from marketplace

-- USER PROFILE EVENTS
-- - profile_update: Updated profile information
-- - kyc_document_upload: Uploaded KYC document
-- - kyc_flow_start: Started KYC process
-- - kyc_flow_complete: Completed KYC process
-- - tier_upgrade: User tier changed

-- ENGAGEMENT EVENTS
-- - search_query: Performed search
-- - filter_apply: Applied property filters
-- - support_chat_start: Started support conversation
-- - support_ticket_create: Created support ticket
-- - newsletter_signup: Signed up for newsletter
-- - notification_click: Clicked on notification

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User Events Indexes
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_timestamp ON user_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_property_id ON user_events(property_id);
CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON user_events(session_id);

-- User Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start ON user_sessions(session_start);

-- Property Engagements Indexes
CREATE INDEX IF NOT EXISTS idx_property_engagements_user_id ON property_engagements(user_id);
CREATE INDEX IF NOT EXISTS idx_property_engagements_property_id ON property_engagements(property_id);
CREATE INDEX IF NOT EXISTS idx_property_engagements_last_viewed ON property_engagements(last_viewed);

-- User Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_date ON user_analytics(date);
CREATE INDEX IF NOT EXISTS idx_user_analytics_engagement_score ON user_analytics(engagement_score);

-- Sales Insights Indexes
CREATE INDEX IF NOT EXISTS idx_sales_insights_user_id ON sales_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_insights_lead_score ON sales_insights(lead_score);
CREATE INDEX IF NOT EXISTS idx_sales_insights_last_activity ON sales_insights(last_activity);
CREATE INDEX IF NOT EXISTS idx_sales_insights_assigned_sales_rep ON sales_insights(assigned_sales_rep);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey_stages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own events" ON user_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own analytics" ON user_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own engagements" ON property_engagements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own journey" ON user_journey_stages FOR SELECT USING (auth.uid() = user_id);

-- Admin access to all data
CREATE POLICY "Admins can view all sessions" ON user_sessions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND is_admin = true
    )
);

CREATE POLICY "Admins can view all events" ON user_events FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND is_admin = true
    )
);

CREATE POLICY "Admins can view all analytics" ON user_analytics FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND is_admin = true
    )
);

CREATE POLICY "Admins can view all engagements" ON property_engagements FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND is_admin = true
    )
);

CREATE POLICY "Admins can view all insights" ON sales_insights FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND is_admin = true
    )
);

CREATE POLICY "Admins can view all journeys" ON user_journey_stages FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND is_admin = true
    )
);

-- Sales team access to insights
CREATE POLICY "Sales team can view assigned insights" ON sales_insights FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND (is_admin = true OR tier IN ('small_investor', 'large_investor'))
    )
);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    days_active INTEGER;
    avg_session_duration INTEGER;
    properties_viewed INTEGER;
    properties_saved INTEGER;
    notes_count INTEGER;
BEGIN
    -- Get user activity metrics from last 30 days
    SELECT
        COUNT(DISTINCT DATE(timestamp)),
        AVG(COALESCE(session_duration, 0)),
        COUNT(CASE WHEN event_type = 'property_view' THEN 1 END),
        COUNT(CASE WHEN event_type = 'watchlist_add' THEN 1 END),
        COUNT(CASE WHEN event_type = 'watchlist_note_add' THEN 1 END)
    INTO days_active, avg_session_duration, properties_viewed, properties_saved, notes_count
    FROM user_events
    WHERE user_id = user_uuid
    AND timestamp > NOW() - INTERVAL '30 days';

    -- Calculate score components
    score := score + LEAST(days_active * 3, 30); -- Max 30 points for activity frequency
    score := score + LEAST(avg_session_duration / 60, 20); -- Max 20 points for session duration
    score := score + LEAST(properties_viewed * 2, 25); -- Max 25 points for browsing
    score := score + LEAST(properties_saved * 5, 15); -- Max 15 points for saving
    score := score + LEAST(notes_count * 2, 10); -- Max 10 points for engagement depth

    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to update user analytics daily
CREATE OR REPLACE FUNCTION update_user_analytics()
RETURNS void AS $$
BEGIN
    INSERT INTO user_analytics (
        user_id, date, total_sessions, total_page_views,
        properties_viewed, properties_saved, notes_added,
        engagement_score
    )
    SELECT
        ue.user_id,
        CURRENT_DATE,
        COUNT(DISTINCT ue.session_id) as total_sessions,
        COUNT(CASE WHEN ue.event_type = 'page_view' THEN 1 END) as total_page_views,
        COUNT(CASE WHEN ue.event_type = 'property_view' THEN 1 END) as properties_viewed,
        COUNT(CASE WHEN ue.event_type = 'watchlist_add' THEN 1 END) as properties_saved,
        COUNT(CASE WHEN ue.event_type = 'watchlist_note_add' THEN 1 END) as notes_added,
        calculate_engagement_score(ue.user_id) as engagement_score
    FROM user_events ue
    WHERE DATE(ue.timestamp) = CURRENT_DATE
    GROUP BY ue.user_id
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_sessions = EXCLUDED.total_sessions,
        total_page_views = EXCLUDED.total_page_views,
        properties_viewed = EXCLUDED.properties_viewed,
        properties_saved = EXCLUDED.properties_saved,
        notes_added = EXCLUDED.notes_added,
        engagement_score = EXCLUDED.engagement_score,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA INSERTION
-- =============================================

-- This will be handled by the frontend tracking service
-- The SQL above creates the infrastructure for comprehensive user tracking

COMMENT ON TABLE user_sessions IS 'Tracks user login sessions with device and location info';
COMMENT ON TABLE user_events IS 'Main event tracking table for all user interactions';
COMMENT ON TABLE user_analytics IS 'Pre-computed daily analytics for performance';
COMMENT ON TABLE property_engagements IS 'Detailed property interaction tracking';
COMMENT ON TABLE sales_insights IS 'Sales team insights and lead scoring';
COMMENT ON TABLE user_journey_stages IS 'User progression through sales funnel';