// Investment Service Type Definitions
// Production-ready types for enterprise-grade investment management

export interface Investment {
  id: string;
  user_id: string;
  property_id: string;
  amount: number;
  shares: number;
  status: InvestmentStatus;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
  valuation?: number;
  roi?: number;
}

export enum InvestmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export interface InvestmentQuery {
  userId?: string;
  propertyId?: string;
  status?: InvestmentStatus[];
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'amount' | 'updated_at';
  orderDirection?: 'asc' | 'desc';
}

export interface InvestmentCreate {
  property_id: string;
  amount: number;
  shares: number;
  transaction_id?: string;
}

export interface InvestmentUpdate {
  status?: InvestmentStatus;
  amount?: number;
  shares?: number;
  valuation?: number;
  roi?: number;
}

export interface InvestmentSummary {
  total_invested: number;
  total_shares: number;
  total_properties: number;
  current_value: number;
  total_roi: number;
  pending_investments: number;
}

export interface InvestmentPerformance {
  investment_id: string;
  property_name: string;
  initial_amount: number;
  current_value: number;
  roi_percentage: number;
  shares_owned: number;
  investment_date: string;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ServiceResult<T> {
  data: T | null;
  error: ServiceError | null;
  success: boolean;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  key: string;
  refreshOnStale?: boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export enum ClientType {
  AUTHENTICATED = 'authenticated',
  ANONYMOUS = 'anonymous'
}

export interface InvestmentServiceConfig {
  cache: CacheConfig;
  circuitBreaker: CircuitBreakerConfig;
  retry: RetryConfig;
  enableMetrics: boolean;
  enableLogging: boolean;
}