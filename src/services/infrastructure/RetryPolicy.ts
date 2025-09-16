/**
 * Retry Policy Implementation
 * Handles transient failures with exponential backoff
 * Production-ready retry mechanism with jitter
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;        // Base delay in milliseconds
  maxDelay: number;         // Maximum delay cap
  backoffMultiplier: number; // Exponential backoff multiplier
  jitter?: boolean;         // Add randomization to prevent thundering herd
}

export interface RetryMetrics {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageDelay: number;
}

export enum RetryableErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT = 'RATE_LIMIT',
  TEMPORARY_FAILURE = 'TEMPORARY_FAILURE'
}

export class RetryPolicy {
  private metrics: RetryMetrics = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageDelay: 0
  };

  constructor(private config: RetryConfig) {
    this.validateConfig();
  }

  async execute<T>(
    operation: () => Promise<T>,
    isRetryableError?: (error: any) => boolean
  ): Promise<T> {
    let lastError: any;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      this.metrics.totalAttempts++;

      try {
        const result = await operation();

        if (attempt > 1) {
          this.metrics.successfulRetries++;
          console.info(`Operation succeeded on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error;

        // Check if this is the last attempt
        if (attempt === this.config.maxAttempts) {
          this.metrics.failedRetries++;
          console.error(`All retry attempts exhausted. Final error:`, error);
          throw error;
        }

        // Check if error is retryable
        if (isRetryableError && !isRetryableError(error)) {
          console.warn('Non-retryable error encountered:', error);
          throw error;
        }

        // Default retryable error check
        if (!this.isRetryableByDefault(error)) {
          console.warn('Error not retryable by default policy:', error);
          throw error;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);
        totalDelay += delay;

        console.warn(
          `Attempt ${attempt} failed, retrying in ${delay}ms. Error:`,
          error?.message || error
        );

        await this.sleep(delay);
      }
    }

    // Update average delay metric
    this.metrics.averageDelay = totalDelay / (this.config.maxAttempts - 1);
    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Cap at maxDelay
    delay = Math.min(delay, this.config.maxDelay);

    // Add jitter to prevent thundering herd problem
    if (this.config.jitter !== false) {
      // Add up to 20% jitter
      const jitterAmount = delay * 0.2;
      const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
      delay = Math.max(0, delay + jitter);
    }

    return Math.floor(delay);
  }

  private isRetryableByDefault(error: any): boolean {
    // Network-related errors
    if (error?.code === 'NETWORK_ERROR' || error?.name === 'NetworkError') {
      return true;
    }

    // Timeout errors
    if (error?.code === 'TIMEOUT' || error?.name === 'TimeoutError') {
      return true;
    }

    // HTTP status codes that are typically retryable
    if (error?.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status);
    }

    // Supabase specific errors
    if (error?.message?.includes('fetch')) {
      return true;
    }

    // JWT 406 errors (your specific case)
    if (error?.status === 406) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private validateConfig(): void {
    if (this.config.maxAttempts < 1) {
      throw new Error('maxAttempts must be at least 1');
    }

    if (this.config.baseDelay < 0) {
      throw new Error('baseDelay must be non-negative');
    }

    if (this.config.maxDelay < this.config.baseDelay) {
      throw new Error('maxDelay must be greater than or equal to baseDelay');
    }

    if (this.config.backoffMultiplier < 1) {
      throw new Error('backoffMultiplier must be at least 1');
    }
  }

  getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageDelay: 0
    };
  }

  // Factory method for common retry configurations
  static createExponentialBackoff(maxAttempts: number = 3): RetryPolicy {
    return new RetryPolicy({
      maxAttempts,
      baseDelay: 1000,      // Start with 1 second
      maxDelay: 30000,      // Cap at 30 seconds
      backoffMultiplier: 2, // Double each time
      jitter: true
    });
  }

  static createLinearBackoff(maxAttempts: number = 3): RetryPolicy {
    return new RetryPolicy({
      maxAttempts,
      baseDelay: 2000,      // 2 seconds
      maxDelay: 10000,      // Cap at 10 seconds
      backoffMultiplier: 1, // Linear (no exponential growth)
      jitter: true
    });
  }

  static createAggressiveRetry(): RetryPolicy {
    return new RetryPolicy({
      maxAttempts: 5,
      baseDelay: 500,       // Start quickly
      maxDelay: 5000,       // Short max delay
      backoffMultiplier: 1.5,
      jitter: true
    });
  }
}