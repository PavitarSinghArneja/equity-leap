-- =============================================
-- ANALYTICS HELPER FUNCTIONS AND TRIGGERS
-- =============================================
-- Supporting functions for behavioral analytics and lead scoring

-- =============================================
-- 1. BEHAVIORAL SCORING FUNCTIONS
-- =============================================

-- Function to calculate comprehensive engagement score
CREATE OR REPLACE FUNCTION calculate_user_engagement_score(user_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;

    -- Activity metrics
    days_active INTEGER;
    avg_session_duration INTEGER;
    total_page_views INTEGER;

    -- Property engagement
    properties_viewed INTEGER;
    properties_saved INTEGER;
    properties_with_notes INTEGER;
    avg_time_per_property INTEGER;

    -- Investment behavior
    investment_flows_started INTEGER;
    investment_flows_completed INTEGER;

    -- Depth indicators
    search_queries INTEGER;
    filter_applications INTEGER;
    document_downloads INTEGER;

BEGIN
    -- Get basic activity metrics
    SELECT
        COUNT(DISTINCT DATE(timestamp)),
        COUNT(CASE WHEN event_type = 'page_view' THEN 1 END),
        COUNT(CASE WHEN event_type = 'search_query' THEN 1 END),
        COUNT(CASE WHEN event_type = 'filter_apply' THEN 1 END),
        COUNT(CASE WHEN event_type = 'property_document_download' THEN 1 END)
    INTO days_active, total_page_views, search_queries, filter_applications, document_downloads
    FROM user_events
    WHERE user_id = user_uuid
    AND timestamp > NOW() - (days_back || ' days')::INTERVAL;

    -- Get session data
    SELECT
        COALESCE(AVG(session_duration), 0)
    INTO avg_session_duration
    FROM user_sessions
    WHERE user_id = user_uuid
    AND session_start > NOW() - (days_back || ' days')::INTERVAL;

    -- Get property engagement
    SELECT
        COUNT(DISTINCT property_id),
        COALESCE(AVG(total_time_spent), 0)
    INTO properties_viewed, avg_time_per_property
    FROM property_engagements
    WHERE user_id = user_uuid
    AND first_viewed > NOW() - (days_back || ' days')::INTERVAL;

    -- Get watchlist activity
    SELECT
        COUNT(CASE WHEN event_type = 'watchlist_add' THEN 1 END),
        COUNT(CASE WHEN event_type = 'watchlist_note_add' THEN 1 END),
        COUNT(CASE WHEN event_type = 'investment_flow_start' THEN 1 END),
        COUNT(CASE WHEN event_type = 'investment_complete' THEN 1 END)
    INTO properties_saved, properties_with_notes, investment_flows_started, investment_flows_completed
    FROM user_events
    WHERE user_id = user_uuid
    AND timestamp > NOW() - (days_back || ' days')::INTERVAL;

    -- Calculate weighted score components
    score := score + LEAST(days_active * 3, 25);                    -- Max 25: Frequency
    score := score + LEAST(avg_session_duration / 120, 15);         -- Max 15: Session quality
    score := score + LEAST(total_page_views / 10, 10);              -- Max 10: Browsing volume
    score := score + LEAST(properties_viewed * 2, 15);              -- Max 15: Property exploration
    score := score + LEAST(properties_saved * 3, 12);               -- Max 12: Interest commitment
    score := score + LEAST(properties_with_notes * 2, 8);           -- Max 8: Engagement depth
    score := score + LEAST(avg_time_per_property / 300, 5);         -- Max 5: Quality attention
    score := score + LEAST(search_queries, 3);                     -- Max 3: Active searching
    score := score + LEAST(filter_applications, 3);                -- Max 3: Targeted searching
    score := score + LEAST(document_downloads, 4);                 -- Max 4: Research depth

    -- Bonus points for investment behavior
    IF investment_flows_started > 0 THEN
        score := score + 5;
    END IF;

    IF investment_flows_completed > 0 THEN
        score := score + 10;
    END IF;

    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate investment intent score
CREATE OR REPLACE FUNCTION calculate_intent_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;

    -- Investment indicators
    investment_flows_started INTEGER;
    investment_flows_completed INTEGER;
    avg_investment_amount DECIMAL;

    -- Engagement depth
    properties_with_long_views INTEGER;
    properties_with_notes INTEGER;
    document_downloads INTEGER;

    -- Research behavior
    recent_activity_frequency INTEGER;
    kyc_progress INTEGER;

    -- Time factors
    days_since_signup INTEGER;
    recent_session_frequency INTEGER;

BEGIN
    -- Get user signup date
    SELECT EXTRACT(days FROM NOW() - created_at)
    INTO days_since_signup
    FROM user_profiles
    WHERE user_id = user_uuid;

    -- Investment behavior (last 60 days)
    SELECT
        COUNT(CASE WHEN event_type = 'investment_flow_start' THEN 1 END),
        COUNT(CASE WHEN event_type = 'investment_complete' THEN 1 END),
        COALESCE(AVG(investment_amount), 0)
    INTO investment_flows_started, investment_flows_completed, avg_investment_amount
    FROM user_events
    WHERE user_id = user_uuid
    AND timestamp > NOW() - INTERVAL '60 days';

    -- Deep engagement indicators
    SELECT
        COUNT(CASE WHEN total_time_spent > 600 THEN 1 END), -- More than 10 minutes
        COUNT(CASE WHEN notes_count > 0 THEN 1 END)
    INTO properties_with_long_views, properties_with_notes
    FROM property_engagements
    WHERE user_id = user_uuid;

    -- Research depth
    SELECT
        COUNT(CASE WHEN event_type = 'property_document_download' THEN 1 END)
    INTO document_downloads
    FROM user_events
    WHERE user_id = user_uuid
    AND timestamp > NOW() - INTERVAL '30 days';

    -- Recent activity frequency (last 7 days)
    SELECT COUNT(DISTINCT DATE(timestamp))
    INTO recent_activity_frequency
    FROM user_events
    WHERE user_id = user_uuid
    AND timestamp > NOW() - INTERVAL '7 days';

    -- KYC progress
    SELECT
        CASE
            WHEN kyc_status = 'approved' THEN 3
            WHEN kyc_status = 'under_review' THEN 2
            WHEN kyc_status = 'pending' THEN 1
            ELSE 0
        END
    INTO kyc_progress
    FROM user_profiles
    WHERE user_id = user_uuid;

    -- Calculate intent score
    score := score + LEAST(investment_flows_started * 15, 30);      -- Max 30: Investment attempts
    score := score + LEAST(investment_flows_completed * 25, 25);    -- Max 25: Completed investments
    score := score + LEAST(properties_with_long_views * 5, 15);     -- Max 15: Deep property study
    score := score + LEAST(properties_with_notes * 3, 12);          -- Max 12: Note-taking behavior
    score := score + LEAST(document_downloads * 2, 8);              -- Max 8: Research documentation
    score := score + LEAST(recent_activity_frequency * 2, 10);      -- Max 10: Recent engagement
    score := score + kyc_progress * 3;                              -- Max 9: KYC completion

    -- Time-based adjustments
    IF days_since_signup <= 7 THEN
        score := score + 5; -- New user bonus
    ELSIF days_since_signup > 90 THEN
        score := score - 5; -- Long-term user without action
    END IF;

    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate churn risk score
CREATE OR REPLACE FUNCTION calculate_risk_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;

    -- Negative indicators
    days_since_last_activity INTEGER;
    session_decline_rate DECIMAL;
    investment_abandonment_rate DECIMAL;

    -- Engagement patterns
    avg_session_duration_recent DECIMAL;
    avg_session_duration_historical DECIMAL;

BEGIN
    -- Days since last activity
    SELECT EXTRACT(days FROM NOW() - MAX(timestamp))
    INTO days_since_last_activity
    FROM user_events
    WHERE user_id = user_uuid;

    -- Session duration trend (last 7 days vs previous 14 days)
    SELECT
        COALESCE(AVG(CASE WHEN session_start > NOW() - INTERVAL '7 days' THEN session_duration END), 0),
        COALESCE(AVG(CASE WHEN session_start BETWEEN NOW() - INTERVAL '21 days' AND NOW() - INTERVAL '7 days' THEN session_duration END), 0)
    INTO avg_session_duration_recent, avg_session_duration_historical
    FROM user_sessions
    WHERE user_id = user_uuid;

    -- Investment abandonment rate
    WITH investment_data AS (
        SELECT
            COUNT(CASE WHEN event_type = 'investment_flow_start' THEN 1 END) as starts,
            COUNT(CASE WHEN event_type = 'investment_complete' THEN 1 END) as completions
        FROM user_events
        WHERE user_id = user_uuid
        AND timestamp > NOW() - INTERVAL '90 days'
    )
    SELECT
        CASE
            WHEN starts > 0 THEN (starts - completions)::DECIMAL / starts
            ELSE 0
        END
    INTO investment_abandonment_rate
    FROM investment_data;

    -- Calculate risk factors
    IF days_since_last_activity > 14 THEN
        score := score + LEAST(days_since_last_activity, 50);
    END IF;

    IF avg_session_duration_historical > 0 AND avg_session_duration_recent < avg_session_duration_historical * 0.5 THEN
        score := score + 20; -- Session quality declining
    END IF;

    IF investment_abandonment_rate > 0.7 THEN
        score := score + 15; -- High abandonment rate
    END IF;

    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. LEAD SCORING AND CLASSIFICATION
-- =============================================

-- Function to calculate comprehensive lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    engagement_score INTEGER;
    intent_score INTEGER;
    risk_score INTEGER;
    lead_score INTEGER;
    tier_multiplier DECIMAL := 1.0;
    kyc_bonus INTEGER := 0;
BEGIN
    -- Get component scores
    engagement_score := calculate_user_engagement_score(user_uuid);
    intent_score := calculate_intent_score(user_uuid);
    risk_score := calculate_risk_score(user_uuid);

    -- Get tier multiplier
    SELECT
        CASE tier
            WHEN 'large_investor' THEN 1.3
            WHEN 'small_investor' THEN 1.2
            WHEN 'waitlist_player' THEN 1.1
            ELSE 1.0
        END
    INTO tier_multiplier
    FROM user_profiles
    WHERE user_id = user_uuid;

    -- KYC bonus
    SELECT
        CASE kyc_status
            WHEN 'approved' THEN 15
            WHEN 'under_review' THEN 10
            WHEN 'pending' THEN 5
            ELSE 0
        END
    INTO kyc_bonus
    FROM user_profiles
    WHERE user_id = user_uuid;

    -- Weighted calculation
    lead_score := ROUND(
        (engagement_score * 0.4 + intent_score * 0.5 + (100 - risk_score) * 0.1 + kyc_bonus) * tier_multiplier
    );

    RETURN LEAST(lead_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to determine lead temperature
CREATE OR REPLACE FUNCTION get_lead_temperature(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    lead_score INTEGER;
    intent_score INTEGER;
    recent_investment_activity INTEGER;
    recent_engagement INTEGER;
BEGIN
    lead_score := calculate_lead_score(user_uuid);
    intent_score := calculate_intent_score(user_uuid);

    -- Check recent investment activity (last 7 days)
    SELECT COUNT(*)
    INTO recent_investment_activity
    FROM user_events
    WHERE user_id = user_uuid
    AND event_type IN ('investment_flow_start', 'investment_complete')
    AND timestamp > NOW() - INTERVAL '7 days';

    -- Check recent engagement (last 3 days)
    SELECT COUNT(DISTINCT DATE(timestamp))
    INTO recent_engagement
    FROM user_events
    WHERE user_id = user_uuid
    AND timestamp > NOW() - INTERVAL '3 days';

    -- Determine temperature
    IF (lead_score >= 80 AND intent_score >= 70) OR recent_investment_activity > 0 THEN
        RETURN 'hot';
    ELSIF (lead_score >= 60 AND intent_score >= 50) OR recent_engagement >= 2 THEN
        RETURN 'warm';
    ELSE
        RETURN 'cold';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. BEHAVIORAL ANALYSIS FUNCTIONS
-- =============================================

-- Function to analyze user investment preferences
CREATE OR REPLACE FUNCTION analyze_investment_preferences(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    property_interests JSON;
    price_sensitivity JSON;
    location_preferences JSON;
    investment_timeline TEXT;
    result JSON;
BEGIN
    -- Analyze property type preferences
    SELECT json_agg(json_build_object(
        'property_type', p.property_type,
        'views', pe.total_views,
        'time_spent', pe.total_time_spent,
        'avg_price', p.share_price
    ) ORDER BY pe.total_views DESC)
    INTO property_interests
    FROM property_engagements pe
    JOIN properties p ON pe.property_id = p.id
    WHERE pe.user_id = user_uuid
    LIMIT 5;

    -- Analyze price sensitivity
    WITH price_analysis AS (
        SELECT
            AVG(p.share_price) as avg_viewed_price,
            MIN(p.share_price) as min_price,
            MAX(p.share_price) as max_price,
            STDDEV(p.share_price) as price_spread
        FROM property_engagements pe
        JOIN properties p ON pe.property_id = p.id
        WHERE pe.user_id = user_uuid
    )
    SELECT json_build_object(
        'avg_price_viewed', avg_viewed_price,
        'price_range_min', min_price,
        'price_range_max', max_price,
        'price_variance', price_spread,
        'is_price_sensitive', CASE WHEN price_spread < avg_viewed_price * 0.3 THEN true ELSE false END
    )
    INTO price_sensitivity
    FROM price_analysis;

    -- Analyze location preferences
    SELECT json_agg(json_build_object(
        'city', p.city,
        'country', p.country,
        'properties_viewed', COUNT(*),
        'total_time_spent', SUM(pe.total_time_spent)
    ) ORDER BY COUNT(*) DESC)
    INTO location_preferences
    FROM property_engagements pe
    JOIN properties p ON pe.property_id = p.id
    WHERE pe.user_id = user_uuid
    GROUP BY p.city, p.country
    LIMIT 3;

    -- Determine investment timeline based on behavior
    SELECT
        CASE
            WHEN COUNT(CASE WHEN event_type = 'investment_flow_start' AND timestamp > NOW() - INTERVAL '7 days' THEN 1 END) > 0
                THEN 'immediate'
            WHEN COUNT(CASE WHEN event_type = 'watchlist_add' AND timestamp > NOW() - INTERVAL '14 days' THEN 1 END) > 2
                THEN '1-3 months'
            WHEN COUNT(CASE WHEN event_type = 'property_view' AND timestamp > NOW() - INTERVAL '30 days' THEN 1 END) > 5
                THEN '3-6 months'
            ELSE '6+ months'
        END
    INTO investment_timeline
    FROM user_events
    WHERE user_id = user_uuid;

    -- Build final result
    result := json_build_object(
        'property_interests', property_interests,
        'price_sensitivity', price_sensitivity,
        'location_preferences', location_preferences,
        'investment_timeline', investment_timeline,
        'updated_at', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. AUTOMATED TRIGGERS AND UPDATES
-- =============================================

-- Function to update user analytics automatically
CREATE OR REPLACE FUNCTION update_user_analytics_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user analytics for the current date
    INSERT INTO user_analytics (
        user_id,
        date,
        engagement_score,
        intent_score,
        risk_score,
        updated_at
    )
    VALUES (
        NEW.user_id,
        CURRENT_DATE,
        calculate_user_engagement_score(NEW.user_id),
        calculate_intent_score(NEW.user_id),
        calculate_risk_score(NEW.user_id),
        NOW()
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        engagement_score = calculate_user_engagement_score(NEW.user_id),
        intent_score = calculate_intent_score(NEW.user_id),
        risk_score = calculate_risk_score(NEW.user_id),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update sales insights automatically
CREATE OR REPLACE FUNCTION update_sales_insights_trigger()
RETURNS TRIGGER AS $$
DECLARE
    preferences JSON;
    recent_event_count INTEGER;
    user_engagement_frequency TEXT;
    lead_temp TEXT;
    next_followup_date DATE;
BEGIN
    -- Get user preferences
    preferences := analyze_investment_preferences(NEW.user_id);

    -- Get recent event count for engagement frequency
    SELECT COUNT(*)
    INTO recent_event_count
    FROM user_events
    WHERE user_id = NEW.user_id
    AND timestamp > NOW() - INTERVAL '7 days';

    -- Determine engagement frequency
    user_engagement_frequency := CASE
        WHEN recent_event_count >= 5 THEN 'daily'
        WHEN recent_event_count >= 2 THEN 'weekly'
        ELSE 'monthly'
    END;

    -- Get lead temperature and set follow-up date
    lead_temp := get_lead_temperature(NEW.user_id);
    next_followup_date := CASE lead_temp
        WHEN 'hot' THEN CURRENT_DATE + INTERVAL '1 day'
        WHEN 'warm' THEN CURRENT_DATE + INTERVAL '3 days'
        ELSE CURRENT_DATE + INTERVAL '7 days'
    END;

    -- Update or insert sales insights
    INSERT INTO sales_insights (
        user_id,
        lead_score,
        lead_temperature,
        engagement_frequency,
        last_activity,
        next_follow_up_date,
        preferred_investment_range,
        investment_timeline,
        updated_at
    )
    VALUES (
        NEW.user_id,
        calculate_lead_score(NEW.user_id),
        lead_temp,
        user_engagement_frequency,
        NOW(),
        next_followup_date,
        COALESCE((preferences->>'price_sensitivity'->>'avg_price_viewed')::text, 'unknown'),
        COALESCE(preferences->>'investment_timeline', 'unknown'),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        lead_score = calculate_lead_score(NEW.user_id),
        lead_temperature = get_lead_temperature(NEW.user_id),
        engagement_frequency = user_engagement_frequency,
        last_activity = NOW(),
        next_follow_up_date = next_followup_date,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_analytics_on_event ON user_events;
CREATE TRIGGER update_analytics_on_event
    AFTER INSERT ON user_events
    FOR EACH ROW
    EXECUTE FUNCTION update_user_analytics_trigger();

DROP TRIGGER IF EXISTS update_insights_on_event ON user_events;
CREATE TRIGGER update_insights_on_event
    AFTER INSERT ON user_events
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_insights_trigger();

-- =============================================
-- 5. REPORTING AND AGGREGATION FUNCTIONS
-- =============================================

-- Function for daily analytics aggregation (run via cron)
CREATE OR REPLACE FUNCTION aggregate_daily_analytics()
RETURNS void AS $$
BEGIN
    -- Update analytics for all active users from yesterday
    INSERT INTO user_analytics (
        user_id, date, total_sessions, total_page_views,
        properties_viewed, properties_saved, notes_added,
        investment_flows_started, investment_flows_completed,
        engagement_score, intent_score, risk_score
    )
    SELECT
        ue.user_id,
        CURRENT_DATE - INTERVAL '1 day',
        COUNT(DISTINCT ue.session_id) as total_sessions,
        COUNT(CASE WHEN ue.event_type = 'page_view' THEN 1 END) as total_page_views,
        COUNT(CASE WHEN ue.event_type = 'property_view' THEN 1 END) as properties_viewed,
        COUNT(CASE WHEN ue.event_type = 'watchlist_add' THEN 1 END) as properties_saved,
        COUNT(CASE WHEN ue.event_type = 'watchlist_note_add' THEN 1 END) as notes_added,
        COUNT(CASE WHEN ue.event_type = 'investment_flow_start' THEN 1 END) as investment_flows_started,
        COUNT(CASE WHEN ue.event_type = 'investment_complete' THEN 1 END) as investment_flows_completed,
        calculate_user_engagement_score(ue.user_id),
        calculate_intent_score(ue.user_id),
        calculate_risk_score(ue.user_id)
    FROM user_events ue
    WHERE DATE(ue.timestamp) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY ue.user_id
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_sessions = EXCLUDED.total_sessions,
        total_page_views = EXCLUDED.total_page_views,
        properties_viewed = EXCLUDED.properties_viewed,
        properties_saved = EXCLUDED.properties_saved,
        notes_added = EXCLUDED.notes_added,
        investment_flows_started = EXCLUDED.investment_flows_started,
        investment_flows_completed = EXCLUDED.investment_flows_completed,
        engagement_score = EXCLUDED.engagement_score,
        intent_score = EXCLUDED.intent_score,
        risk_score = EXCLUDED.risk_score,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. UTILITY FUNCTIONS
-- =============================================

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(user_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    summary JSON;
BEGIN
    SELECT json_build_object(
        'user_id', user_uuid,
        'period_days', days_back,
        'total_events', COUNT(*),
        'unique_sessions', COUNT(DISTINCT session_id),
        'unique_properties_viewed', COUNT(DISTINCT property_id) FILTER (WHERE event_type = 'property_view'),
        'properties_saved', COUNT(*) FILTER (WHERE event_type = 'watchlist_add'),
        'investment_flows', COUNT(*) FILTER (WHERE event_type = 'investment_flow_start'),
        'investments_completed', COUNT(*) FILTER (WHERE event_type = 'investment_complete'),
        'search_queries', COUNT(*) FILTER (WHERE event_type = 'search_query'),
        'document_downloads', COUNT(*) FILTER (WHERE event_type = 'property_document_download'),
        'engagement_score', calculate_user_engagement_score(user_uuid, days_back),
        'intent_score', calculate_intent_score(user_uuid),
        'risk_score', calculate_risk_score(user_uuid),
        'lead_score', calculate_lead_score(user_uuid),
        'lead_temperature', get_lead_temperature(user_uuid),
        'generated_at', NOW()
    )
    INTO summary
    FROM user_events
    WHERE user_id = user_uuid
    AND timestamp > NOW() - (days_back || ' days')::INTERVAL;

    RETURN summary;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_user_engagement_score IS 'Calculate comprehensive user engagement score (0-100)';
COMMENT ON FUNCTION calculate_intent_score IS 'Calculate investment intent score based on behavior patterns';
COMMENT ON FUNCTION calculate_risk_score IS 'Calculate churn risk score (higher = more likely to churn)';
COMMENT ON FUNCTION calculate_lead_score IS 'Calculate overall lead quality score for sales team';
COMMENT ON FUNCTION get_lead_temperature IS 'Determine lead temperature (hot/warm/cold) for sales prioritization';
COMMENT ON FUNCTION analyze_investment_preferences IS 'Analyze user preferences and behavior patterns';
COMMENT ON FUNCTION get_user_activity_summary IS 'Get comprehensive activity summary for a user';