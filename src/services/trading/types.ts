export type UUID = string;

export type OrderStatus = 'active' | 'reserved' | 'awaiting_offline_settlement' | 'completed' | 'cancelled' | 'expired';
export type HoldStatus = 'active' | 'buyer_confirmed' | 'seller_confirmed' | 'both_confirmed' | 'released' | 'expired';
export type ReservationStatus = 'active' | 'completed' | 'cancelled' | 'expired';

export interface SellOrder {
  id: UUID;
  seller_id: UUID;
  property_id: UUID;
  total_shares: number;
  remaining_shares: number;
  ask_price: number;
  status: OrderStatus;
  created_at: string;
  expires_at?: string | null;
}

export interface BuyerHold {
  id: UUID;
  order_id: UUID;
  buyer_id: UUID;
  shares: number;
  hold_status: HoldStatus;
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  hold_expires_at: string;
  created_at: string;
}

export interface Reservation {
  id: UUID;
  order_id: UUID;
  buyer_id: UUID;
  seller_id: UUID;
  property_id: UUID;
  shares: number;
  price_per_share: number;
  status: ReservationStatus;
  created_at: string;
  expires_at: string;
}

export interface TradingServiceConfig {
  enableLogging?: boolean;
  buyerConfirmTtlSeconds?: number; // default 600
  sellerConfirmTtlSeconds?: number; // default 3600
  reservationTtlSeconds?: number; // default 172800 (48h)
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

export interface ServiceResult<T> {
  data: T | null;
  error: ServiceError | null;
  success: boolean;
}

