/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures and provides fallback mechanisms
 * Enterprise-grade reliability pattern for production systems
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast, not executing requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;  // Number of failures before opening circuit
  resetTimeout: number;      // Time to wait before attempting reset (ms)
  monitoringPeriod: number;  // Time window for failure counting (ms)
  healthCheckInterval?: number; // Optional health check interval
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  state: CircuitBreakerState;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private totalRequests = 0;
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // If circuit is OPEN, fail fast
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
      } else {
        if (fallback) {
          console.warn('Circuit breaker OPEN, executing fallback');
          return fallback();
        }
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      if (fallback && this.state === CircuitBreakerState.OPEN) {
        console.warn('Operation failed, circuit opened, executing fallback');
        return fallback();
      }

      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.lastSuccessTime = Date.now();
    this.successCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      console.info('Circuit breaker reset to CLOSED state');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      console.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  private shouldAttemptReset(): boolean {
    const now = Date.now();
    return !this.lastFailureTime ||
           (now - this.lastFailureTime) >= this.config.resetTimeout;
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      totalRequests: this.totalRequests,
      successCount: this.successCount,
      failureCount: this.failureCount,
      state: this.state,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime
    };
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    console.info('Circuit breaker manually reset');
  }

  // Health check method for monitoring
  isHealthy(): boolean {
    const metrics = this.getMetrics();
    const recentFailureRate = this.calculateRecentFailureRate();

    return this.state === CircuitBreakerState.CLOSED &&
           recentFailureRate < 0.5; // Less than 50% failure rate
  }

  private calculateRecentFailureRate(): number {
    if (this.totalRequests === 0) return 0;

    const now = Date.now();
    const monitoringWindow = this.config.monitoringPeriod;

    // Simple calculation - in production, you'd want more sophisticated windowing
    if (!this.lastFailureTime || (now - this.lastFailureTime) > monitoringWindow) {
      return 0;
    }

    return this.failureCount / this.totalRequests;
  }
}