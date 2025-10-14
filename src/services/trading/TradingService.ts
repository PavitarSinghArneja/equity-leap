import { supabase } from '@/integrations/supabase/client';
import type {
  TradingServiceConfig,
  ServiceResult,
  ServiceError,
  SellOrder,
  BuyerHold,
  Reservation,
  UUID,
} from './types';

// Skeleton service for the secondary market. Non-breaking: not wired by default.
export class TradingService {
  constructor(private config: TradingServiceConfig = {}) {}

  // Orders
  async listActiveOrders(propertyId?: UUID): Promise<ServiceResult<SellOrder[]>> {
    try {
      let query = supabase
        .from('share_sell_requests')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (propertyId) query = query.eq('property_id', propertyId);

      const { data, error } = await query;
      if (error) throw error;
      return { data: (data || []) as SellOrder[], error: null, success: true };
    } catch (err: any) {
      return this.err('LIST_ORDERS_FAILED', err?.message || 'Failed to list orders', err);
    }
  }

  // Instant Purchase (no holds, immediate settlement)
  // Now uses atomic transaction with idempotency support
  async instantBuyShares(orderId: UUID, shares: number, transactionId?: UUID): Promise<ServiceResult<any>> {
    try {
      // Generate unique transaction ID for idempotency if not provided
      const txId = transactionId || crypto.randomUUID();

      const { data, error } = await supabase.rpc('instant_buy_shares', {
        p_order_id: orderId,
        p_shares: shares,
        p_transaction_id: txId,
      });

      if (error) {
        // Parse error for user-friendly messages
        let errorMessage = err?.message || 'Failed to purchase shares';

        if (error.message.includes('Insufficient wallet balance')) {
          errorMessage = 'Insufficient wallet balance. Please add funds to your wallet.';
        } else if (error.message.includes('Not enough shares remaining')) {
          errorMessage = 'Not enough shares available. Please reduce your quantity.';
        } else if (error.message.includes('Cannot buy from your own order')) {
          errorMessage = 'You cannot buy from your own sell order.';
        } else if (error.message.includes('Order not active')) {
          errorMessage = 'This sell order is no longer active.';
        } else if (error.message.includes('Trading not enabled')) {
          errorMessage = 'Trading is not enabled for this property yet.';
        } else if (error.message.includes('Duplicate transaction')) {
          errorMessage = 'This purchase is already being processed.';
        } else if (error.message.includes('Concurrent transaction')) {
          errorMessage = 'Multiple purchases detected. Please try again.';
        }

        throw new Error(errorMessage);
      }

      return { data, error: null, success: true };
    } catch (err: any) {
      return this.err('INSTANT_BUY_FAILED', err?.message || 'Failed to purchase shares', err);
    }
  }

  // Legacy: Holds (keeping for backward compatibility, but not used)
  async createBuyerHold(orderId: UUID, shares: number): Promise<ServiceResult<BuyerHold>> {
    try {
      const { data, error } = await supabase.rpc('create_buyer_hold', {
        p_order_id: orderId,
        p_shares: shares,
      });
      if (error) throw error;
      return { data: data as BuyerHold, error: null, success: true };
    } catch (err: any) {
      return this.err('CREATE_HOLD_FAILED', err?.message || 'Failed to create hold', err);
    }
  }

  async buyerConfirmHold(holdId: UUID): Promise<ServiceResult<BuyerHold>> {
    try {
      const { data, error } = await supabase.rpc('buyer_confirm_hold', { p_hold_id: holdId });
      if (error) throw error;
      return { data: data as BuyerHold, error: null, success: true };
    } catch (err: any) {
      return this.err('BUYER_CONFIRM_FAILED', err?.message || 'Failed to confirm hold', err);
    }
  }

  async sellerConfirmHold(holdId: UUID): Promise<ServiceResult<Reservation>> {
    try {
      const { data, error } = await supabase.rpc('seller_confirm_hold', { p_hold_id: holdId });
      if (error) throw error;
      return { data: data as Reservation, error: null, success: true };
    } catch (err: any) {
      return this.err('SELLER_CONFIRM_FAILED', err?.message || 'Failed to confirm hold', err);
    }
  }

  async cancelHold(holdId: UUID): Promise<ServiceResult<null>> {
    try {
      const { error } = await supabase.rpc('cancel_hold', { p_hold_id: holdId });
      if (error) throw error;
      return { data: null, error: null, success: true };
    } catch (err: any) {
      return this.err('CANCEL_HOLD_FAILED', err?.message || 'Failed to cancel hold', err);
    }
  }

  // Reservations
  async adminSettleReservation(reservationId: UUID, success: boolean, notes?: string): Promise<ServiceResult<Reservation>> {
    try {
      const { data, error } = await supabase.rpc('admin_settle_reservation', {
        p_reservation_id: reservationId,
        p_success: success,
        p_notes: notes || null,
      });
      if (error) throw error;
      return { data: data as Reservation, error: null, success: true };
    } catch (err: any) {
      return this.err('SETTLE_FAILED', err?.message || 'Failed to settle reservation', err);
    }
  }

  private err<T = any>(code: string, message: string, details?: any): ServiceResult<T> {
    const error: ServiceError = { code, message, details };
    if (this.config.enableLogging) console.error('[TradingService]', error);
    return { data: null, error, success: false };
  }
}

