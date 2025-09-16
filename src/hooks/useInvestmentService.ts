/**
 * React Hook for Investment Service
 * Provides easy integration with React components
 * Handles loading states, error management, and caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { InvestmentServiceFactory } from '@/services/factory/InvestmentServiceFactory';
import { InvestmentService } from '@/services/core/InvestmentService';
import {
  Investment,
  InvestmentQuery,
  InvestmentCreate,
  InvestmentUpdate,
  InvestmentSummary,
  InvestmentPerformance,
  ServiceResult,
  ServiceError
} from '@/services/types/investment.types';

interface UseInvestmentServiceState<T> {
  data: T | null;
  loading: boolean;
  error: ServiceError | null;
  refetch: () => Promise<void>;
}

interface UseInvestmentServiceOptions {
  immediate?: boolean;  // Execute immediately on mount
  cacheKey?: string;   // Custom cache key
  refreshInterval?: number; // Auto-refresh interval in ms
}

export function useInvestmentService() {
  const serviceRef = useRef<InvestmentService>(InvestmentServiceFactory.getInstance());

  return serviceRef.current;
}

// Hook for fetching investments with query
export function useInvestments(
  query?: InvestmentQuery,
  options: UseInvestmentServiceOptions = {}
): UseInvestmentServiceState<Investment[]> {
  const service = useInvestmentService();
  const [state, setState] = useState<UseInvestmentServiceState<Investment[]>>({
    data: null,
    loading: false,
    error: null,
    refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await service.getInvestments(query);
      setState(prev => ({
        ...prev,
        data: result.data,
        error: result.error,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          code: 'HOOK_ERROR',
          message: 'Failed to fetch investments',
          details: error,
          timestamp: new Date().toISOString()
        },
        loading: false
      }));
    }
  }, [service, query]);

  useEffect(() => {
    if (options.immediate !== false) {
      fetchData();
    }
  }, [fetchData, options.immediate]);

  // Auto-refresh setup
  useEffect(() => {
    if (options.refreshInterval && options.refreshInterval > 0) {
      const interval = setInterval(fetchData, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, options.refreshInterval]);

  return {
    ...state,
    refetch: fetchData
  };
}

// Hook for single investment
export function useInvestment(
  id: string,
  options: UseInvestmentServiceOptions = {}
): UseInvestmentServiceState<Investment> {
  const service = useInvestmentService();
  const [state, setState] = useState<UseInvestmentServiceState<Investment>>({
    data: null,
    loading: false,
    error: null,
    refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    if (!id) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await service.getInvestment(id);
      setState(prev => ({
        ...prev,
        data: result.data,
        error: result.error,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          code: 'HOOK_ERROR',
          message: 'Failed to fetch investment',
          details: error,
          timestamp: new Date().toISOString()
        },
        loading: false
      }));
    }
  }, [service, id]);

  useEffect(() => {
    if (options.immediate !== false && id) {
      fetchData();
    }
  }, [fetchData, options.immediate, id]);

  return {
    ...state,
    refetch: fetchData
  };
}

// Hook for investment summary
export function useInvestmentSummary(
  userId: string,
  options: UseInvestmentServiceOptions = {}
): UseInvestmentServiceState<InvestmentSummary> {
  const service = useInvestmentService();
  const [state, setState] = useState<UseInvestmentServiceState<InvestmentSummary>>({
    data: null,
    loading: false,
    error: null,
    refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await service.getInvestmentSummary(userId);
      setState(prev => ({
        ...prev,
        data: result.data,
        error: result.error,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          code: 'HOOK_ERROR',
          message: 'Failed to fetch investment summary',
          details: error,
          timestamp: new Date().toISOString()
        },
        loading: false
      }));
    }
  }, [service, userId]);

  useEffect(() => {
    if (options.immediate !== false && userId) {
      fetchData();
    }
  }, [fetchData, options.immediate, userId]);

  // Auto-refresh for summary data
  useEffect(() => {
    const refreshInterval = options.refreshInterval || 60000; // Default 1 minute
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, options.refreshInterval]);

  return {
    ...state,
    refetch: fetchData
  };
}

// Hook for investment performance
export function useInvestmentPerformance(
  userId: string,
  options: UseInvestmentServiceOptions = {}
): UseInvestmentServiceState<InvestmentPerformance[]> {
  const service = useInvestmentService();
  const [state, setState] = useState<UseInvestmentServiceState<InvestmentPerformance[]>>({
    data: null,
    loading: false,
    error: null,
    refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await service.getInvestmentPerformance(userId);
      setState(prev => ({
        ...prev,
        data: result.data,
        error: result.error,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          code: 'HOOK_ERROR',
          message: 'Failed to fetch investment performance',
          details: error,
          timestamp: new Date().toISOString()
        },
        loading: false
      }));
    }
  }, [service, userId]);

  useEffect(() => {
    if (options.immediate !== false && userId) {
      fetchData();
    }
  }, [fetchData, options.immediate, userId]);

  return {
    ...state,
    refetch: fetchData
  };
}

// Hook for investment mutations (create, update, delete)
export function useInvestmentMutations() {
  const service = useInvestmentService();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ServiceError | null>(null);

  const createInvestment = useCallback(async (investment: InvestmentCreate): Promise<Investment | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await service.createInvestment(investment);
      if (result.success) {
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'MUTATION_ERROR',
        message: 'Failed to create investment',
        details: error,
        timestamp: new Date().toISOString()
      };
      setError(serviceError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const updateInvestment = useCallback(async (
    id: string,
    updates: InvestmentUpdate
  ): Promise<Investment | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await service.updateInvestment(id, updates);
      if (result.success) {
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'MUTATION_ERROR',
        message: 'Failed to update investment',
        details: error,
        timestamp: new Date().toISOString()
      };
      setError(serviceError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const deleteInvestment = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await service.deleteInvestment(id);
      if (result.success) {
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (error) {
      const serviceError: ServiceError = {
        code: 'MUTATION_ERROR',
        message: 'Failed to delete investment',
        details: error,
        timestamp: new Date().toISOString()
      };
      setError(serviceError);
      return false;
    } finally {
      setLoading(false);
    }
  }, [service]);

  return {
    createInvestment,
    updateInvestment,
    deleteInvestment,
    loading,
    error
  };
}

// Hook for service metrics and health monitoring
export function useInvestmentServiceMetrics() {
  const service = useInvestmentService();
  const [metrics, setMetrics] = useState(service.getServiceMetrics());
  const [health, setHealth] = useState(service.getHealthStatus());

  const refreshMetrics = useCallback(() => {
    setMetrics(service.getServiceMetrics());
    setHealth(service.getHealthStatus());
  }, [service]);

  useEffect(() => {
    const interval = setInterval(refreshMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [refreshMetrics]);

  const clearCache = useCallback(async () => {
    await service.clearCache();
    refreshMetrics();
  }, [service, refreshMetrics]);

  const resetMetrics = useCallback(() => {
    service.resetMetrics();
    refreshMetrics();
  }, [service, refreshMetrics]);

  return {
    metrics,
    health,
    refreshMetrics,
    clearCache,
    resetMetrics
  };
}