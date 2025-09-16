/**
 * Component Integration Examples
 * Shows how to migrate existing components to use the new InvestmentService
 * Production-ready patterns for 11+ components interacting with investments
 */

import React, { useState, useEffect } from 'react';
import {
  useInvestments,
  useInvestmentSummary,
  useInvestmentPerformance,
  useInvestmentMutations,
  useInvestmentServiceMetrics
} from '@/hooks/useInvestmentService';

// ===============================
// 1. DASHBOARD OVERVIEW INTEGRATION
// ===============================

interface DashboardOverviewProps {
  userId: string;
}

export function DashboardOverview({ userId }: DashboardOverviewProps) {
  // Replace direct Supabase calls with service hooks
  const { data: summary, loading: summaryLoading, error: summaryError } = useInvestmentSummary(
    userId,
    { refreshInterval: 60000 } // Auto-refresh every minute
  );

  const { data: performance, loading: perfLoading } = useInvestmentPerformance(userId);

  const { data: recentInvestments } = useInvestments(
    {
      userId,
      limit: 5,
      orderBy: 'created_at',
      orderDirection: 'desc'
    },
    { refreshInterval: 30000 } // More frequent refresh for recent data
  );

  if (summaryLoading) {
    return <DashboardSkeleton />;
  }

  if (summaryError) {
    return (
      <ErrorCard
        title="Unable to load dashboard"
        message={summaryError.message}
        code={summaryError.code}
      />
    );
  }

  return (
    <div className="dashboard-overview">
      <SummaryCards summary={summary} />
      <PerformanceChart data={performance} loading={perfLoading} />
      <RecentInvestments investments={recentInvestments} />
    </div>
  );
}

// ===============================
// 2. PROPERTIES PAGE INTEGRATION
// ===============================

interface PropertiesPageProps {
  userId?: string; // Optional - for authenticated users
}

export function PropertiesPage({ userId }: PropertiesPageProps) {
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  // Get user's existing investments in this property
  const { data: userInvestments } = useInvestments(
    userId ? {
      userId,
      propertyId: selectedProperty || undefined,
      status: ['confirmed']
    } : undefined,
    { immediate: !!selectedProperty }
  );

  // Investment mutation hooks
  const { createInvestment, loading: creating, error: createError } = useInvestmentMutations();

  const handleInvest = async (propertyId: string, amount: number, shares: number) => {
    if (!userId) {
      // Redirect to login or show auth modal
      return;
    }

    const investment = await createInvestment({
      property_id: propertyId,
      amount,
      shares
    });

    if (investment) {
      // Success handling - maybe show notification
      console.log('Investment created successfully');
    }
  };

  return (
    <div className="properties-page">
      <PropertyGrid
        onPropertySelect={setSelectedProperty}
        userInvestments={userInvestments || []}
      />

      {selectedProperty && (
        <InvestmentModal
          propertyId={selectedProperty}
          onInvest={handleInvest}
          loading={creating}
          error={createError}
        />
      )}
    </div>
  );
}

// ===============================
// 3. ADMIN INVESTMENTS INTEGRATION
// ===============================

export function AdminInvestments() {
  const [filters, setFilters] = useState({
    status: ['pending', 'confirmed'],
    dateRange: 'last_30_days'
  });

  // Admin view - get all investments with filters
  const { data: investments, loading, error, refetch } = useInvestments({
    status: filters.status,
    limit: 100,
    orderBy: 'created_at',
    orderDirection: 'desc'
  });

  // Admin mutations
  const { updateInvestment, loading: updating } = useInvestmentMutations();

  const handleStatusUpdate = async (investmentId: string, newStatus: string) => {
    const updated = await updateInvestment(investmentId, { status: newStatus });

    if (updated) {
      refetch(); // Refresh the list
    }
  };

  return (
    <div className="admin-investments">
      <AdminFilters filters={filters} onChange={setFilters} />

      {loading && <TableSkeleton />}

      {error && (
        <ErrorBanner
          message="Failed to load investments"
          onRetry={refetch}
        />
      )}

      <InvestmentTable
        investments={investments || []}
        onStatusUpdate={handleStatusUpdate}
        updating={updating}
      />
    </div>
  );
}

// ===============================
// 4. SHARE MARKETPLACE INTEGRATION
// ===============================

export function ShareMarketplace({ userId }: { userId: string }) {
  // Get user's investments that can be sold
  const { data: sellableInvestments } = useInvestments({
    userId,
    status: ['confirmed'],
    limit: 50
  });

  // Get marketplace listings (all users' sell orders)
  const { data: marketplaceListings } = useInvestments({
    status: ['listed_for_sale'], // Custom status for marketplace
    limit: 100,
    orderBy: 'created_at',
    orderDirection: 'desc'
  });

  return (
    <div className="share-marketplace">
      <div className="marketplace-sections">
        <section>
          <h2>Your Investments</h2>
          <SellableInvestmentsList
            investments={sellableInvestments || []}
          />
        </section>

        <section>
          <h2>Marketplace</h2>
          <MarketplaceListings
            listings={marketplaceListings || []}
          />
        </section>
      </div>
    </div>
  );
}

// ===============================
// 5. INVESTMENT PERFORMANCE CHART
// ===============================

interface InvestmentPerformanceChartProps {
  userId: string;
  timeRange: 'week' | 'month' | 'quarter' | 'year';
}

export function InvestmentPerformanceChart({
  userId,
  timeRange
}: InvestmentPerformanceChartProps) {
  const { data: performance, loading, error } = useInvestmentPerformance(userId, {
    refreshInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  // Process performance data for charting
  const chartData = React.useMemo(() => {
    if (!performance) return [];

    return performance.map(p => ({
      name: p.property_name,
      initial: p.initial_amount,
      current: p.current_value,
      roi: p.roi_percentage,
      date: p.investment_date
    }));
  }, [performance]);

  if (loading) return <ChartSkeleton />;
  if (error) return <ChartError error={error} />;

  return (
    <div className="performance-chart">
      <ChartComponent data={chartData} timeRange={timeRange} />
    </div>
  );
}

// ===============================
// 6. SERVICE MONITORING DASHBOARD
// ===============================

export function ServiceMonitoringDashboard() {
  const {
    metrics,
    health,
    refreshMetrics,
    clearCache,
    resetMetrics
  } = useInvestmentServiceMetrics();

  const isHealthy = health.healthy;
  const successRate = metrics.service.totalRequests > 0
    ? (metrics.service.successfulRequests / metrics.service.totalRequests) * 100
    : 100;

  return (
    <div className="service-monitoring">
      <div className="health-status">
        <StatusIndicator
          status={isHealthy ? 'healthy' : 'unhealthy'}
          label="Service Health"
        />
        <div className="health-details">
          <span>Circuit Breaker: {health.circuitBreakerState}</span>
          <span>Success Rate: {successRate.toFixed(1)}%</span>
          <span>Cache Hit Rate: {metrics.cache.hitRate.toFixed(1)}%</span>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="Total Requests"
          value={metrics.service.totalRequests}
          icon="📊"
        />
        <MetricCard
          title="Cache Hits"
          value={metrics.cache.hits}
          icon="💾"
        />
        <MetricCard
          title="Failures"
          value={metrics.service.failedRequests}
          icon="❌"
        />
        <MetricCard
          title="Retries"
          value={metrics.retry.totalAttempts}
          icon="🔄"
        />
      </div>

      <div className="actions">
        <button onClick={refreshMetrics}>Refresh Metrics</button>
        <button onClick={clearCache}>Clear Cache</button>
        <button onClick={resetMetrics}>Reset Metrics</button>
      </div>
    </div>
  );
}

// ===============================
// 7. ERROR BOUNDARY FOR SERVICE ERRORS
// ===============================

interface ServiceErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ServiceErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ServiceErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ServiceErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('InvestmentService Error:', error, errorInfo);

    // In production, send to error reporting service
    // reportError(error, { context: 'InvestmentService', ...errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="service-error-boundary">
          <h2>Investment Service Unavailable</h2>
          <p>
            We're experiencing technical difficulties with our investment service.
            Please try again in a few moments.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ===============================
// UTILITY COMPONENTS
// ===============================

function ErrorCard({ title, message, code }: {
  title: string;
  message: string;
  code: string;
}) {
  return (
    <div className="error-card">
      <h3>{title}</h3>
      <p>{message}</p>
      <small>Error Code: {code}</small>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      {/* Skeleton loading animation */}
    </div>
  );
}

function StatusIndicator({ status, label }: {
  status: 'healthy' | 'unhealthy';
  label: string;
}) {
  const color = status === 'healthy' ? 'green' : 'red';
  return (
    <div className={`status-indicator ${status}`}>
      <span className={`dot ${color}`}></span>
      <span>{label}</span>
    </div>
  );
}

function MetricCard({ title, value, icon }: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="metric-card">
      <div className="icon">{icon}</div>
      <div className="content">
        <div className="value">{value.toLocaleString()}</div>
        <div className="title">{title}</div>
      </div>
    </div>
  );
}