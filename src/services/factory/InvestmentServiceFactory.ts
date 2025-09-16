/**
 * Investment Service Factory
 * Creates configured service instances for different environments
 * Centralized configuration management for production deployment
 */

import { InvestmentService } from '../core/InvestmentService';
import { InvestmentServiceConfig } from '../types/investment.types';

export class InvestmentServiceFactory {
  private static instance: InvestmentService | null = null;

  /**
   * Get singleton instance of InvestmentService
   * Ensures consistent configuration across the application
   */
  static getInstance(): InvestmentService {
    if (!this.instance) {
      this.instance = this.createProductionService();
    }
    return this.instance;
  }

  /**
   * Create a new service instance with custom configuration
   */
  static createService(config: InvestmentServiceConfig): InvestmentService {
    return new InvestmentService(config);
  }

  /**
   * Production-ready configuration
   * Optimized for high-traffic applications with 11+ components
   */
  static createProductionService(): InvestmentService {
    const config: InvestmentServiceConfig = {
      cache: {
        ttl: 5 * 60 * 1000,        // 5 minutes default TTL
        maxMemoryItems: 1000,      // Limit memory usage
        enablePersistence: true,    // Enable localStorage caching
        persistenceKey: 'inv_cache:',
        enableCompression: false    // Keep simple for now
      },
      circuitBreaker: {
        failureThreshold: 5,        // Open after 5 failures
        resetTimeout: 30000,        // Try reset after 30 seconds
        monitoringPeriod: 60000     // Monitor over 1 minute window
      },
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,            // Start with 1 second
        maxDelay: 10000,            // Cap at 10 seconds
        backoffMultiplier: 2        // Exponential backoff
      },
      enableMetrics: true,
      enableLogging: true
    };

    return new InvestmentService(config);
  }

  /**
   * Development configuration
   * More aggressive caching and logging for debugging
   */
  static createDevelopmentService(): InvestmentService {
    const config: InvestmentServiceConfig = {
      cache: {
        ttl: 2 * 60 * 1000,        // 2 minutes for faster development
        maxMemoryItems: 500,
        enablePersistence: true,
        persistenceKey: 'dev_inv_cache:',
        enableCompression: false
      },
      circuitBreaker: {
        failureThreshold: 3,        // Fail faster in development
        resetTimeout: 15000,        // Shorter reset time
        monitoringPeriod: 30000
      },
      retry: {
        maxAttempts: 2,             // Fewer retries for faster feedback
        baseDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      enableMetrics: true,
      enableLogging: true
    };

    return new InvestmentService(config);
  }

  /**
   * Testing configuration
   * Minimal caching and retry for predictable tests
   */
  static createTestService(): InvestmentService {
    const config: InvestmentServiceConfig = {
      cache: {
        ttl: 1000,                 // Very short TTL
        maxMemoryItems: 100,
        enablePersistence: false,   // No persistence in tests
        persistenceKey: 'test_cache:',
        enableCompression: false
      },
      circuitBreaker: {
        failureThreshold: 2,        // Quick failure for tests
        resetTimeout: 5000,
        monitoringPeriod: 10000
      },
      retry: {
        maxAttempts: 1,             // No retries in tests by default
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 1
      },
      enableMetrics: false,
      enableLogging: false
    };

    return new InvestmentService(config);
  }

  /**
   * High-performance configuration
   * For applications with heavy investment data requirements
   */
  static createHighPerformanceService(): InvestmentService {
    const config: InvestmentServiceConfig = {
      cache: {
        ttl: 10 * 60 * 1000,       // 10 minutes - longer caching
        maxMemoryItems: 2000,       // More items in memory
        enablePersistence: true,
        persistenceKey: 'hp_inv_cache:',
        enableCompression: true     // Enable compression for storage efficiency
      },
      circuitBreaker: {
        failureThreshold: 10,       // Higher threshold before opening
        resetTimeout: 60000,        // Longer reset time
        monitoringPeriod: 120000    // 2-minute monitoring window
      },
      retry: {
        maxAttempts: 5,             // More aggressive retry
        baseDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 1.5
      },
      enableMetrics: true,
      enableLogging: false         // Reduce logging overhead
    };

    return new InvestmentService(config);
  }

  /**
   * Resilient configuration
   * For applications that need maximum reliability
   */
  static createResilientService(): InvestmentService {
    const config: InvestmentServiceConfig = {
      cache: {
        ttl: 15 * 60 * 1000,       // 15 minutes - aggressive caching
        maxMemoryItems: 1500,
        enablePersistence: true,
        persistenceKey: 'resilient_inv_cache:',
        enableCompression: true
      },
      circuitBreaker: {
        failureThreshold: 3,        // Quick circuit breaking
        resetTimeout: 45000,
        monitoringPeriod: 90000
      },
      retry: {
        maxAttempts: 5,             // Maximum retry attempts
        baseDelay: 2000,            // Longer initial delay
        maxDelay: 60000,            // Very high max delay
        backoffMultiplier: 2.5      // Aggressive backoff
      },
      enableMetrics: true,
      enableLogging: true
    };

    return new InvestmentService(config);
  }

  /**
   * Reset singleton instance
   * Useful for testing or configuration changes
   */
  static reset(): void {
    this.instance = null;
  }

  /**
   * Get configuration preset by environment
   */
  static getConfigByEnvironment(env: string = 'production'): InvestmentService {
    switch (env.toLowerCase()) {
      case 'development':
      case 'dev':
        return this.createDevelopmentService();

      case 'test':
      case 'testing':
        return this.createTestService();

      case 'staging':
        return this.createProductionService(); // Use production config for staging

      case 'performance':
      case 'perf':
        return this.createHighPerformanceService();

      case 'resilient':
      case 'reliable':
        return this.createResilientService();

      case 'production':
      case 'prod':
      default:
        return this.createProductionService();
    }
  }

  /**
   * Create service with environment variable configuration
   */
  static createFromEnvironment(): InvestmentService {
    const env = import.meta.env.MODE || 'production';
    return this.getConfigByEnvironment(env);
  }
}