import { supabase } from '@/integrations/supabase/client';
import { featureFlags } from '@/config/featureFlags';

type Props = Record<string, any> | undefined;

/**
 * Production-Grade Analytics Service
 *
 * Tracks user events and property interactions using Supabase RPC.
 * Feature flag controlled via centralized featureFlags system.
 *
 * Debug logging is extensive to help troubleshoot any issues.
 */
class AnalyticsServiceClass {
  private readonly enabled: boolean;
  private eventCount = 0;
  private successCount = 0;
  private errorCount = 0;

  constructor() {
    // Use the centralized feature flag system (no env vars!)
    this.enabled = featureFlags.analytics_enabled;

    console.group('[Analytics] Service Initialization');
    console.log('📊 Analytics Service starting...');
    console.log('Feature Flag Source: featureFlags.analytics_enabled');
    console.log('Analytics Enabled:', this.enabled);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();

    if (!this.enabled) {
      console.warn('[Analytics] ⚠️  Analytics is DISABLED by feature flag');
    } else {
      console.log('[Analytics] ✅ Analytics is ENABLED and ready to track events');
    }
  }

  /**
   * Get current analytics statistics
   */
  public getStats() {
    return {
      enabled: this.enabled,
      totalEvents: this.eventCount,
      successfulEvents: this.successCount,
      failedEvents: this.errorCount,
      successRate: this.eventCount > 0 ? (this.successCount / this.eventCount * 100).toFixed(2) + '%' : '0%',
    };
  }

  /**
   * Log analytics statistics (for debugging)
   */
  public logStats() {
    console.group('[Analytics] Statistics');
    console.table(this.getStats());
    console.groupEnd();
  }

  private async log(name: string, props?: Props, propertyId?: string) {
    this.eventCount++;

    try {
      if (!this.enabled) {
        console.log(`[Analytics] Event #${this.eventCount} SKIPPED (disabled):`, name);
        return;
      }

      console.group(`[Analytics] Event #${this.eventCount}: ${name}`);
      console.log('Event Name:', name);
      console.log('Property ID:', propertyId || 'N/A');
      console.log('Properties:', props || 'None');
      console.log('Timestamp:', new Date().toISOString());

      // Prefer server-side RPC to ensure user_id and last_activity update
      const rpcParams = {
        p_event_name: name,
        p_property_id: propertyId || null,
        p_props: props || null,
      };

      console.log('RPC Parameters:', rpcParams);
      console.log('Calling supabase.rpc("log_user_event")...');

      const { data, error } = await supabase.rpc('log_user_event', rpcParams);

      if (error) {
        console.error('RPC Error Object:', error);
        throw error;
      }

      this.successCount++;
      console.log('RPC Response Data:', data);
      console.log(`✅ SUCCESS - Event logged (${this.successCount}/${this.eventCount} successful)`);
      console.groupEnd();
    } catch (e) {
      this.errorCount++;
      console.error(`❌ FAILED - Event logging error (${this.errorCount}/${this.eventCount} failed)`);
      console.error('Error Details:', e);
      console.error('Error Type:', e instanceof Error ? e.constructor.name : typeof e);
      if (e instanceof Error) {
        console.error('Error Message:', e.message);
        console.error('Error Stack:', e.stack);
      }
      console.groupEnd();
    }
  }

  // Public API methods
  track(eventName: string, props?: Props) {
    return this.log(eventName, props);
  }

  trackProperty(eventName: string, propertyId: string, props?: Props) {
    return this.log(eventName, props, propertyId);
  }

  // Convenience helpers with descriptive logging
  login() {
    console.log('[Analytics] 🔑 Tracking login event');
    return this.track('login');
  }

  propertiesViewed() {
    console.log('[Analytics] 👁️  Tracking properties view');
    return this.track('properties_view');
  }

  watchlistToggled(propertyId: string, inWatchlist: boolean) {
    console.log('[Analytics] ⭐ Tracking watchlist toggle:', { propertyId, inWatchlist });
    return this.trackProperty('watchlist_toggle', propertyId, { inWatchlist });
  }

  noteUpdated(propertyId: string) {
    console.log('[Analytics] 📝 Tracking note update:', { propertyId });
    return this.trackProperty('note_updated', propertyId);
  }

  tradingHoldCreated(orderId: string, shares: number) {
    console.log('[Analytics] 🤝 Tracking hold creation:', { orderId, shares });
    return this.track('trading_hold_created', { orderId, shares });
  }

  tradingBuyerConfirmed(holdId: string) {
    console.log('[Analytics] ✅ Tracking buyer confirmation:', { holdId });
    return this.track('trading_buyer_confirmed', { holdId });
  }

  tradingSellerConfirmed(holdId: string) {
    console.log('[Analytics] ✅ Tracking seller confirmation:', { holdId });
    return this.track('trading_seller_confirmed', { holdId });
  }

  tradingReservationSettled(reservationId: string, success: boolean) {
    console.log('[Analytics] 💰 Tracking reservation settlement:', { reservationId, success });
    return this.track('trading_reservation_settled', { reservationId, success });
  }
}

export const AnalyticsService = new AnalyticsServiceClass();

// Export stats getter for debugging/admin panels
export const getAnalyticsStats = () => AnalyticsService.getStats();
export const logAnalyticsStats = () => AnalyticsService.logStats();

