import { supabase } from '@/integrations/supabase/client';

type Props = Record<string, any> | undefined;

class AnalyticsServiceClass {
  private enabled = import.meta?.env?.VITE_FLAG_ANALYTICS?.toString().toLowerCase() === 'true';

  constructor() {
    console.log('[Analytics] Service initialized. Enabled:', this.enabled);
    console.log('[Analytics] Flag value:', import.meta?.env?.VITE_FLAG_ANALYTICS);
  }

  private async log(name: string, props?: Props, propertyId?: string) {
    try {
      if (!this.enabled) {
        console.log('[Analytics] Skipped (disabled):', name);
        return;
      }

      console.log('[Analytics] Logging event:', name, { propertyId, props });

      // Prefer server-side RPC to ensure user_id and last_activity update
      const { error } = await supabase.rpc('log_user_event', {
        p_event_name: name,
        p_property_id: propertyId || null,
        p_props: props || null,
      });

      if (error) throw error;
      console.log('[Analytics] ✅ Event logged successfully:', name);
    } catch (e) {
      // Best effort only
      console.error('[Analytics] ❌ Log failed:', name, e);
    }
  }

  track(eventName: string, props?: Props) {
    return this.log(eventName, props);
  }

  trackProperty(eventName: string, propertyId: string, props?: Props) {
    return this.log(eventName, props, propertyId);
  }

  // Convenience helpers
  login() { return this.track('login'); }
  propertiesViewed() { return this.track('properties_view'); }
  watchlistToggled(propertyId: string, inWatchlist: boolean) {
    return this.trackProperty('watchlist_toggle', propertyId, { inWatchlist });
  }
  noteUpdated(propertyId: string) {
    return this.trackProperty('note_updated', propertyId);
  }
  tradingHoldCreated(orderId: string, shares: number) {
    return this.track('trading_hold_created', { orderId, shares });
  }
  tradingBuyerConfirmed(holdId: string) {
    return this.track('trading_buyer_confirmed', { holdId });
  }
  tradingSellerConfirmed(holdId: string) {
    return this.track('trading_seller_confirmed', { holdId });
  }
  tradingReservationSettled(reservationId: string, success: boolean) {
    return this.track('trading_reservation_settled', { reservationId, success });
  }
}

export const AnalyticsService = new AnalyticsServiceClass();

