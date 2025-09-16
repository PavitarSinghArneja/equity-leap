/**
 * Enterprise-Grade Investment Service
 * Handles JWT 406 errors with hybrid client approach
 * Implements circuit breaker, retry logic, and multi-layer caching
 * Production-ready service for 11+ components interaction
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase, supabaseInvestments } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

import {
  Investment,
  InvestmentQuery,
  InvestmentCreate,
  InvestmentUpdate,
  InvestmentSummary,
  InvestmentPerformance,
  ServiceResult,
  ServiceError,
  InvestmentServiceConfig,
  ClientType
} from '../types/investment.types';

import { CircuitBreaker, CircuitBreakerState } from '../infrastructure/CircuitBreaker';
import { RetryPolicy } from '../infrastructure/RetryPolicy';
import { CacheManager } from '../infrastructure/CacheManager';

export class InvestmentService {
  private circuitBreaker: CircuitBreaker;
  private retryPolicy: RetryPolicy;
  private cache: CacheManager;
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    circuitBreakerActivations: 0,
    retryAttempts: 0
  };

  constructor(private config: InvestmentServiceConfig) {
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    this.retryPolicy = new RetryPolicy(config.retry);
    this.cache = new CacheManager(config.cache);
  }

  // ===============================
  // READ OPERATIONS (Anonymous Client)
  // ===============================

  async getInvestments(query?: InvestmentQuery): Promise<ServiceResult<Investment[]>> {
    return this.executeOperation(
      'getInvestments',
      () => this._getInvestments(query),
      ClientType.ANONYMOUS,
      ['investments', query?.userId || 'all', query?.propertyId || 'all']
    );
  }

  async getInvestment(id: string): Promise<ServiceResult<Investment>> {
    return this.executeOperation(
      'getInvestment',
      () => this._getInvestment(id),
      ClientType.ANONYMOUS,
      ['investment', id]
    );
  }

  async getInvestmentSummary(userId: string): Promise<ServiceResult<InvestmentSummary>> {
    return this.executeOperation(
      'getInvestmentSummary',
      () => this._getInvestmentSummary(userId),
      ClientType.ANONYMOUS,
      ['summary', userId]
    );
  }

  async getInvestmentPerformance(userId: string): Promise<ServiceResult<InvestmentPerformance[]>> {
    return this.executeOperation(
      'getInvestmentPerformance',
      () => this._getInvestmentPerformance(userId),
      ClientType.ANONYMOUS,
      ['performance', userId]
    );
  }

  async getUserInvestmentsByProperty(
    userId: string,
    propertyId: string
  ): Promise<ServiceResult<Investment[]>> {
    return this.executeOperation(
      'getUserInvestmentsByProperty',
      () => this._getUserInvestmentsByProperty(userId, propertyId),
      ClientType.ANONYMOUS,
      ['user-property', userId, propertyId]
    );
  }

  // ===============================
  // WRITE OPERATIONS (Authenticated Client)
  // ===============================

  async createInvestment(investment: InvestmentCreate): Promise<ServiceResult<Investment>> {
    return this.executeOperation(
      'createInvestment',
      () => this._createInvestment(investment),
      ClientType.AUTHENTICATED,
      null, // No caching for writes
      true  // Invalidate related cache
    );
  }

  async updateInvestment(
    id: string,
    updates: InvestmentUpdate
  ): Promise<ServiceResult<Investment>> {
    return this.executeOperation(
      'updateInvestment',
      () => this._updateInvestment(id, updates),
      ClientType.AUTHENTICATED,
      null,
      true
    );
  }

  async deleteInvestment(id: string): Promise<ServiceResult<void>> {
    return this.executeOperation(
      'deleteInvestment',
      () => this._deleteInvestment(id),
      ClientType.AUTHENTICATED,
      null,
      true
    );
  }

  // ===============================
  // PRIVATE IMPLEMENTATION METHODS
  // ===============================

  private async _getInvestments(query?: InvestmentQuery): Promise<Investment[]> {
    const client = this.getClient(ClientType.ANONYMOUS);
    let queryBuilder = client.from('investments').select('*');

    if (query) {
      if (query.userId) queryBuilder = queryBuilder.eq('user_id', query.userId);
      if (query.propertyId) queryBuilder = queryBuilder.eq('property_id', query.propertyId);
      if (query.status?.length) queryBuilder = queryBuilder.in('status', query.status);
      if (query.minAmount) queryBuilder = queryBuilder.gte('amount', query.minAmount);
      if (query.maxAmount) queryBuilder = queryBuilder.lte('amount', query.maxAmount);
      if (query.orderBy) {
        queryBuilder = queryBuilder.order(query.orderBy, {
          ascending: query.orderDirection === 'asc'
        });
      }
      if (query.limit) queryBuilder = queryBuilder.limit(query.limit);
      if (query.offset) queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 50) - 1);
    }

    const { data, error } = await queryBuilder;

    if (error) throw this.createServiceError('QUERY_FAILED', error.message, error);
    return data || [];
  }

  private async _getInvestment(id: string): Promise<Investment> {
    const client = this.getClient(ClientType.ANONYMOUS);
    const { data, error } = await client
      .from('investments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw this.createServiceError('QUERY_FAILED', error.message, error);
    if (!data) throw this.createServiceError('NOT_FOUND', `Investment ${id} not found`);

    return data;
  }

  private async _getInvestmentSummary(userId: string): Promise<InvestmentSummary> {
    const client = this.getClient(ClientType.ANONYMOUS);

    // Use a single query with aggregation for better performance
    const { data, error } = await client
      .from('investments')
      .select('amount, shares, status, valuation')
      .eq('user_id', userId);

    if (error) throw this.createServiceError('QUERY_FAILED', error.message, error);

    const investments = data || [];
    const confirmedInvestments = investments.filter(inv => inv.status === 'confirmed');

    return {
      total_invested: confirmedInvestments.reduce((sum, inv) => sum + inv.amount, 0),
      total_shares: confirmedInvestments.reduce((sum, inv) => sum + inv.shares, 0),
      total_properties: new Set(confirmedInvestments.map(inv => inv.property_id)).size,
      current_value: confirmedInvestments.reduce((sum, inv) => sum + (inv.valuation || inv.amount), 0),
      total_roi: 0, // Calculate based on current_value vs total_invested
      pending_investments: investments.filter(inv => inv.status === 'pending').length
    };
  }

  private async _getInvestmentPerformance(userId: string): Promise<InvestmentPerformance[]> {
    const client = this.getClient(ClientType.ANONYMOUS);

    // Join with properties table for property names
    const { data, error } = await client
      .from('investments')
      .select(`
        id,
        amount,
        shares,
        valuation,
        created_at,
        properties (
          name
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'confirmed');

    if (error) throw this.createServiceError('QUERY_FAILED', error.message, error);

    return (data || []).map(inv => ({
      investment_id: inv.id,
      property_name: inv.properties?.name || 'Unknown Property',
      initial_amount: inv.amount,
      current_value: inv.valuation || inv.amount,
      roi_percentage: inv.valuation ? ((inv.valuation - inv.amount) / inv.amount) * 100 : 0,
      shares_owned: inv.shares,
      investment_date: inv.created_at
    }));
  }

  private async _getUserInvestmentsByProperty(
    userId: string,
    propertyId: string
  ): Promise<Investment[]> {
    const client = this.getClient(ClientType.ANONYMOUS);
    const { data, error } = await client
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .eq('property_id', propertyId);

    if (error) throw this.createServiceError('QUERY_FAILED', error.message, error);
    return data || [];
  }

  private async _createInvestment(investment: InvestmentCreate): Promise<Investment> {
    const client = this.getClient(ClientType.AUTHENTICATED);
    const { data, error } = await client
      .from('investments')
      .insert(investment)
      .select()
      .single();

    if (error) throw this.createServiceError('CREATE_FAILED', error.message, error);
    return data;
  }

  private async _updateInvestment(id: string, updates: InvestmentUpdate): Promise<Investment> {
    const client = this.getClient(ClientType.AUTHENTICATED);
    const { data, error } = await client
      .from('investments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw this.createServiceError('UPDATE_FAILED', error.message, error);
    return data;
  }

  private async _deleteInvestment(id: string): Promise<void> {
    const client = this.getClient(ClientType.AUTHENTICATED);
    const { error } = await client
      .from('investments')
      .delete()
      .eq('id', id);

    if (error) throw this.createServiceError('DELETE_FAILED', error.message, error);
  }

  // ===============================
  // INFRASTRUCTURE METHODS
  // ===============================

  private async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    clientType: ClientType,
    cacheKey?: string[] | null,
    invalidateCache: boolean = false
  ): Promise<ServiceResult<T>> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Check cache for read operations
      if (cacheKey && !invalidateCache) {
        const cached = await this.cache.get<T>(cacheKey.join(':'));
        if (cached) {
          this.metrics.cacheHits++;
          return this.createSuccessResult(cached);
        }
      }

      // Execute with circuit breaker and retry
      const result = await this.circuitBreaker.execute(
        () => this.retryPolicy.execute(operation, this.isRetryableError),
        this.getFallback(operationName)
      );

      // Cache successful results
      if (cacheKey && !invalidateCache && result) {
        await this.cache.set(cacheKey.join(':'), result, undefined, ['investments']);
      }

      // Invalidate related cache entries
      if (invalidateCache) {
        await this.cache.invalidateByTag('investments');
      }

      this.metrics.successfulRequests++;
      this.logOperation(operationName, 'SUCCESS', Date.now() - startTime);

      return this.createSuccessResult(result);

    } catch (error) {
      this.metrics.failedRequests++;
      this.logOperation(operationName, 'ERROR', Date.now() - startTime, error);

      return this.createErrorResult(
        error.code || 'OPERATION_FAILED',
        error.message || 'An unexpected error occurred',
        error
      );
    }
  }

  private getClient(type: ClientType): SupabaseClient<Database> {
    // Use anonymous client for reads to avoid JWT 406 errors
    // Use authenticated client for writes to maintain security
    return type === ClientType.ANONYMOUS ? supabaseInvestments : supabase;
  }

  private isRetryableError = (error: any): boolean => {
    // JWT 406 errors are retryable
    if (error?.status === 406) return true;

    // Network and temporary errors
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE'];
    return retryableCodes.includes(error?.code);
  };

  private getFallback(operationName: string) {
    // Return fallback functions for critical operations
    const fallbacks: Record<string, () => Promise<any>> = {
      getInvestmentSummary: async () => ({
        total_invested: 0,
        total_shares: 0,
        total_properties: 0,
        current_value: 0,
        total_roi: 0,
        pending_investments: 0
      }),
      getInvestments: async () => [],
      getInvestmentPerformance: async () => []
    };

    return fallbacks[operationName];
  }

  private createServiceError(code: string, message: string, details?: any): ServiceError {
    return {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    };
  }

  private createSuccessResult<T>(data: T): ServiceResult<T> {
    return {
      data,
      error: null,
      success: true
    };
  }

  private createErrorResult(code: string, message: string, details?: any): ServiceResult<any> {
    return {
      data: null,
      error: this.createServiceError(code, message, details),
      success: false
    };
  }

  private logOperation(
    operation: string,
    status: 'SUCCESS' | 'ERROR',
    duration: number,
    error?: any
  ): void {
    if (!this.config.enableLogging) return;

    const logData = {
      operation,
      status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      circuitBreakerState: this.circuitBreaker.getState(),
      error: error ? { code: error.code, message: error.message } : undefined
    };

    if (status === 'ERROR') {
      console.error('InvestmentService Error:', logData);
    } else {
      console.info('InvestmentService Operation:', logData);
    }
  }

  // ===============================
  // PUBLIC UTILITY METHODS
  // ===============================

  getServiceMetrics() {
    return {
      service: { ...this.metrics },
      circuitBreaker: this.circuitBreaker.getMetrics(),
      retry: this.retryPolicy.getMetrics(),
      cache: this.cache.getMetrics()
    };
  }

  getHealthStatus() {
    const cbHealthy = this.circuitBreaker.isHealthy();
    const cbState = this.circuitBreaker.getState();

    return {
      healthy: cbHealthy,
      circuitBreakerState: cbState,
      lastUpdate: new Date().toISOString(),
      details: {
        circuitBreakerOpen: cbState === CircuitBreakerState.OPEN,
        recentSuccessRate: this.calculateSuccessRate(),
        cacheHitRate: this.cache.getMetrics().hitRate
      }
    };
  }

  private calculateSuccessRate(): number {
    const total = this.metrics.totalRequests;
    return total > 0 ? (this.metrics.successfulRequests / total) * 100 : 100;
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      circuitBreakerActivations: 0,
      retryAttempts: 0
    };

    this.retryPolicy.resetMetrics();
    this.cache.resetMetrics();
  }
}