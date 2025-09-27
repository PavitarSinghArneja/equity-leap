import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

// Event Types for better organization
export const EVENT_TYPES = {
  // Navigation
  PAGE_VIEW: 'page_view',
  PAGE_EXIT: 'page_exit',
  SCROLL_DEPTH: 'scroll_depth',
  TIME_ON_PAGE: 'time_on_page',

  // Property Interactions
  PROPERTY_VIEW: 'property_view',
  PROPERTY_IMAGE_VIEW: 'property_image_view',
  PROPERTY_DOCUMENT_DOWNLOAD: 'property_document_download',
  PROPERTY_SHARE: 'property_share',
  PROPERTY_COMPARE: 'property_compare',

  // Watchlist Events
  WATCHLIST_ADD: 'watchlist_add',
  WATCHLIST_REMOVE: 'watchlist_remove',
  WATCHLIST_NOTE_ADD: 'watchlist_note_add',
  WATCHLIST_NOTE_EDIT: 'watchlist_note_edit',

  // Investment Events
  INVESTMENT_FLOW_START: 'investment_flow_start',
  INVESTMENT_AMOUNT_CHANGE: 'investment_amount_change',
  INVESTMENT_PAYMENT_METHOD: 'investment_payment_method',
  INVESTMENT_FLOW_ABANDON: 'investment_flow_abandon',
  INVESTMENT_COMPLETE: 'investment_complete',
  INVESTMENT_SHARE_PURCHASE: 'investment_share_purchase',

  // User Profile Events
  PROFILE_UPDATE: 'profile_update',
  KYC_DOCUMENT_UPLOAD: 'kyc_document_upload',
  KYC_FLOW_START: 'kyc_flow_start',
  KYC_FLOW_COMPLETE: 'kyc_flow_complete',
  TIER_UPGRADE: 'tier_upgrade',

  // Engagement Events
  SEARCH_QUERY: 'search_query',
  FILTER_APPLY: 'filter_apply',
  SUPPORT_CHAT_START: 'support_chat_start',
  SUPPORT_TICKET_CREATE: 'support_ticket_create',
  NEWSLETTER_SIGNUP: 'newsletter_signup',
  NOTIFICATION_CLICK: 'notification_click'
} as const;

export const EVENT_CATEGORIES = {
  NAVIGATION: 'navigation',
  PROPERTY: 'property',
  INVESTMENT: 'investment',
  USER_PROFILE: 'user_profile',
  ENGAGEMENT: 'engagement',
  WATCHLIST: 'watchlist',
  SALES: 'sales'
} as const;

export interface TrackingEvent {
  eventType: string;
  eventCategory: string;
  eventAction: string;
  eventLabel?: string;
  propertyId?: string;
  investmentAmount?: number;
  metadata?: Record<string, any>;
}

export interface UserSession {
  sessionId: string;
  startTime: Date;
  userAgent: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  os: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

class AnalyticsService {
  private currentSession: UserSession | null = null;
  private eventQueue: TrackingEvent[] = [];
  private currentUser: User | null = null;
  private pageStartTime: Date = new Date();
  private lastScrollDepth = 0;
  private isOnline = navigator.onLine;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushEvents();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.trackPageExit();
      this.endSession();
    });

    // Track scroll depth
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.trackScrollDepth();
          ticking = false;
        });
        ticking = true;
      }
    });

    // Flush events every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000);

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackPageExit();
      } else {
        this.trackPageView();
      }
    });
  }

  /**
   * Initialize tracking for a user
   */
  async initialize(user: User) {
    this.currentUser = user;
    await this.startSession();
    this.trackPageView();
  }

  /**
   * Start a new user session
   */
  private async startSession() {
    if (!this.currentUser) return;

    const deviceInfo = this.getDeviceInfo();
    const urlParams = new URLSearchParams(window.location.search);

    this.currentSession = {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      userAgent: navigator.userAgent,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      referrer: document.referrer || undefined,
      utmSource: urlParams.get('utm_source') || undefined,
      utmMedium: urlParams.get('utm_medium') || undefined,
      utmCampaign: urlParams.get('utm_campaign') || undefined
    };

    try {
      await supabase.from('user_sessions').insert({
        id: this.currentSession.sessionId,
        user_id: this.currentUser.id,
        session_start: this.currentSession.startTime.toISOString(),
        ip_address: await this.getClientIP(),
        user_agent: this.currentSession.userAgent,
        device_type: this.currentSession.deviceType,
        browser: this.currentSession.browser,
        os: this.currentSession.os,
        referrer: this.currentSession.referrer,
        utm_source: this.currentSession.utmSource,
        utm_medium: this.currentSession.utmMedium,
        utm_campaign: this.currentSession.utmCampaign,
        pages_visited: 0
      });
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }

  /**
   * End current session
   */
  private async endSession() {
    if (!this.currentSession || !this.currentUser) return;

    const sessionDuration = Math.floor(
      (new Date().getTime() - this.currentSession.startTime.getTime()) / 1000
    );

    try {
      await supabase
        .from('user_sessions')
        .update({
          session_end: new Date().toISOString(),
          session_duration: sessionDuration
        })
        .eq('id', this.currentSession.sessionId);
    } catch (error) {
      console.error('Failed to end session:', error);
    }

    this.currentSession = null;
  }

  /**
   * Track a generic event
   */
  track(event: TrackingEvent) {
    if (!this.currentUser || !this.currentSession) return;

    const trackingEvent = {
      ...event,
      page_url: window.location.href,
      page_title: document.title,
      timestamp: new Date().toISOString(),
      session_id: this.currentSession.sessionId,
      user_id: this.currentUser.id
    };

    this.eventQueue.push(trackingEvent);

    // Flush immediately for critical events
    const criticalEvents = [
      EVENT_TYPES.INVESTMENT_COMPLETE,
      EVENT_TYPES.KYC_FLOW_COMPLETE,
      EVENT_TYPES.WATCHLIST_ADD
    ];

    if (criticalEvents.includes(event.eventType)) {
      this.flushEvents();
    }
  }

  /**
   * Track page view
   */
  trackPageView() {
    this.pageStartTime = new Date();
    this.lastScrollDepth = 0;

    this.track({
      eventType: EVENT_TYPES.PAGE_VIEW,
      eventCategory: EVENT_CATEGORIES.NAVIGATION,
      eventAction: 'viewed',
      eventLabel: window.location.pathname,
      metadata: {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer
      }
    });

    // Update session page count
    this.updateSessionPageCount();
  }

  /**
   * Track page exit
   */
  private trackPageExit() {
    const timeOnPage = Math.floor(
      (new Date().getTime() - this.pageStartTime.getTime()) / 1000
    );

    this.track({
      eventType: EVENT_TYPES.PAGE_EXIT,
      eventCategory: EVENT_CATEGORIES.NAVIGATION,
      eventAction: 'exited',
      eventLabel: window.location.pathname,
      metadata: {
        timeOnPage,
        finalScrollDepth: this.lastScrollDepth
      }
    });
  }

  /**
   * Track scroll depth
   */
  private trackScrollDepth() {
    const scrollPercentage = Math.floor(
      ((window.pageYOffset + window.innerHeight) / document.body.scrollHeight) * 100
    );

    // Only track significant scroll milestones
    const milestones = [25, 50, 75, 90, 100];
    const newMilestone = milestones.find(
      milestone => scrollPercentage >= milestone && this.lastScrollDepth < milestone
    );

    if (newMilestone) {
      this.lastScrollDepth = newMilestone;
      this.track({
        eventType: EVENT_TYPES.SCROLL_DEPTH,
        eventCategory: EVENT_CATEGORIES.NAVIGATION,
        eventAction: 'scrolled',
        eventLabel: `${newMilestone}%`,
        metadata: { scrollPercentage: newMilestone }
      });
    }
  }

  /**
   * Track property view
   */
  trackPropertyView(propertyId: string, propertyTitle: string, timeSpent?: number) {
    this.track({
      eventType: EVENT_TYPES.PROPERTY_VIEW,
      eventCategory: EVENT_CATEGORIES.PROPERTY,
      eventAction: 'viewed',
      eventLabel: propertyTitle,
      propertyId,
      metadata: {
        propertyTitle,
        timeSpent: timeSpent || 0
      }
    });

    // Update property engagement
    this.updatePropertyEngagement(propertyId, 'view');
  }

  /**
   * Track watchlist addition
   */
  trackWatchlistAdd(propertyId: string, propertyTitle: string, hasNotes: boolean) {
    this.track({
      eventType: EVENT_TYPES.WATCHLIST_ADD,
      eventCategory: EVENT_CATEGORIES.WATCHLIST,
      eventAction: 'added',
      eventLabel: propertyTitle,
      propertyId,
      metadata: {
        propertyTitle,
        hasNotes,
        timestamp: new Date().toISOString()
      }
    });

    this.updatePropertyEngagement(propertyId, 'watchlist_add');
  }

  /**
   * Track watchlist removal
   */
  trackWatchlistRemove(propertyId: string, propertyTitle: string) {
    this.track({
      eventType: EVENT_TYPES.WATCHLIST_REMOVE,
      eventCategory: EVENT_CATEGORIES.WATCHLIST,
      eventAction: 'removed',
      eventLabel: propertyTitle,
      propertyId,
      metadata: {
        propertyTitle,
        timestamp: new Date().toISOString()
      }
    });

    this.updatePropertyEngagement(propertyId, 'watchlist_remove');
  }

  /**
   * Track investment flow start
   */
  trackInvestmentStart(propertyId: string, propertyTitle: string, initialAmount: number) {
    this.track({
      eventType: EVENT_TYPES.INVESTMENT_FLOW_START,
      eventCategory: EVENT_CATEGORIES.INVESTMENT,
      eventAction: 'started',
      eventLabel: propertyTitle,
      propertyId,
      investmentAmount: initialAmount,
      metadata: {
        propertyTitle,
        initialAmount,
        flowStep: 'start'
      }
    });

    this.updatePropertyEngagement(propertyId, 'investment_start', initialAmount);
  }

  /**
   * Track investment completion
   */
  trackInvestmentComplete(
    propertyId: string,
    propertyTitle: string,
    amount: number,
    paymentMethod: string
  ) {
    this.track({
      eventType: EVENT_TYPES.INVESTMENT_COMPLETE,
      eventCategory: EVENT_CATEGORIES.INVESTMENT,
      eventAction: 'completed',
      eventLabel: propertyTitle,
      propertyId,
      investmentAmount: amount,
      metadata: {
        propertyTitle,
        amount,
        paymentMethod,
        completionTime: new Date().toISOString()
      }
    });

    this.updatePropertyEngagement(propertyId, 'investment_complete', amount);
  }

  /**
   * Track search behavior
   */
  trackSearch(query: string, resultsCount: number, filters?: Record<string, any>) {
    this.track({
      eventType: EVENT_TYPES.SEARCH_QUERY,
      eventCategory: EVENT_CATEGORIES.ENGAGEMENT,
      eventAction: 'searched',
      eventLabel: query,
      metadata: {
        query,
        resultsCount,
        filters,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track filter usage
   */
  trackFilterApply(filters: Record<string, any>, resultsCount: number) {
    this.track({
      eventType: EVENT_TYPES.FILTER_APPLY,
      eventCategory: EVENT_CATEGORIES.ENGAGEMENT,
      eventAction: 'filtered',
      eventLabel: Object.keys(filters).join(', '),
      metadata: {
        filters,
        resultsCount,
        filterCount: Object.keys(filters).length
      }
    });
  }

  /**
   * Track KYC progress
   */
  trackKYCProgress(stage: string, documentType?: string) {
    const eventType = stage === 'start' ? EVENT_TYPES.KYC_FLOW_START : EVENT_TYPES.KYC_DOCUMENT_UPLOAD;

    this.track({
      eventType,
      eventCategory: EVENT_CATEGORIES.USER_PROFILE,
      eventAction: stage,
      eventLabel: documentType,
      metadata: {
        stage,
        documentType,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Flush queued events to database
   */
  private async flushEvents() {
    if (!this.isOnline || this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const { error } = await supabase.from('user_events').insert(eventsToFlush);
      if (error) throw error;
    } catch (error) {
      console.error('Failed to flush events:', error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  /**
   * Update property engagement data
   */
  private async updatePropertyEngagement(
    propertyId: string,
    action: string,
    amount?: number
  ) {
    if (!this.currentUser || !this.currentSession) return;

    const updates: any = {
      last_viewed: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'view':
        updates.total_views = 1; // Will be handled by SQL increment
        break;
      case 'watchlist_add':
        updates.watchlist_added_at = new Date().toISOString();
        break;
      case 'watchlist_remove':
        updates.watchlist_removed_at = new Date().toISOString();
        break;
      case 'investment_start':
        updates.investment_started_at = new Date().toISOString();
        if (amount) updates.investment_amount = amount;
        break;
      case 'investment_complete':
        updates.investment_completed_at = new Date().toISOString();
        if (amount) updates.investment_amount = amount;
        break;
    }

    try {
      await supabase
        .from('property_engagements')
        .upsert({
          user_id: this.currentUser.id,
          property_id: propertyId,
          session_id: this.currentSession.sessionId,
          first_viewed: new Date().toISOString(),
          ...updates
        }, {
          onConflict: 'user_id,property_id'
        });
    } catch (error) {
      console.error('Failed to update property engagement:', error);
    }
  }

  /**
   * Update session page count
   */
  private async updateSessionPageCount() {
    if (!this.currentSession) return;

    try {
      await supabase
        .rpc('increment_session_pages', {
          session_uuid: this.currentSession.sessionId
        });
    } catch (error) {
      // Fallback to direct update
      await supabase
        .from('user_sessions')
        .update({
          pages_visited: supabase.raw('pages_visited + 1')
        })
        .eq('id', this.currentSession.sessionId);
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect device type
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      deviceType = 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      deviceType = 'mobile';
    }

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { deviceType, browser, os };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client IP (approximation)
   */
  private async getClientIP(): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return undefined;
    }
  }

  /**
   * Clean up service
   */
  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushEvents();
    this.endSession();
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();

// Event tracking utilities for easy use in components
export const trackEvent = (event: TrackingEvent) => analyticsService.track(event);
export const trackPageView = () => analyticsService.trackPageView();
export const trackPropertyView = (propertyId: string, title: string, timeSpent?: number) =>
  analyticsService.trackPropertyView(propertyId, title, timeSpent);
export const trackWatchlistAdd = (propertyId: string, title: string, hasNotes: boolean) =>
  analyticsService.trackWatchlistAdd(propertyId, title, hasNotes);
export const trackWatchlistRemove = (propertyId: string, title: string) =>
  analyticsService.trackWatchlistRemove(propertyId, title);
export const trackInvestmentStart = (propertyId: string, title: string, amount: number) =>
  analyticsService.trackInvestmentStart(propertyId, title, amount);
export const trackInvestmentComplete = (
  propertyId: string,
  title: string,
  amount: number,
  paymentMethod: string
) => analyticsService.trackInvestmentComplete(propertyId, title, amount, paymentMethod);
export const trackSearch = (query: string, results: number, filters?: Record<string, any>) =>
  analyticsService.trackSearch(query, results, filters);
export const trackFilterApply = (filters: Record<string, any>, results: number) =>
  analyticsService.trackFilterApply(filters, results);
export const trackKYCProgress = (stage: string, documentType?: string) =>
  analyticsService.trackKYCProgress(stage, documentType);

export default analyticsService;