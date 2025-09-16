# InvestmentService Implementation Guide

## 🚀 Quick Start

### 1. Install the Service Architecture

All files are already created in your project structure:

```
src/services/
├── types/investment.types.ts
├── infrastructure/
│   ├── CircuitBreaker.ts
│   ├── RetryPolicy.ts
│   └── CacheManager.ts
├── core/InvestmentService.ts
├── factory/InvestmentServiceFactory.ts
└── examples/component-integration.tsx

src/hooks/useInvestmentService.ts
```

### 2. Update Your Components

Replace direct Supabase calls with the service hooks. Here's how to migrate your existing components:

#### Before (Direct Supabase):
```typescript
// In your component
const [investments, setInvestments] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setInvestments(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchInvestments();
}, [userId]);
```

#### After (Service-Based):
```typescript
// Import the hook
import { useInvestments } from '@/hooks/useInvestmentService';

// In your component
const { data: investments, loading, error } = useInvestments({
  userId,
  status: ['confirmed']
});

// That's it! Error handling, retries, caching all handled automatically
```

### 3. Initialize Service in Your App Root

Add this to your main App component or root provider:

```typescript
// src/App.tsx
import { InvestmentServiceFactory } from '@/services/factory/InvestmentServiceFactory';

// Initialize service early
const investmentService = InvestmentServiceFactory.createFromEnvironment();

function App() {
  return (
    <ServiceErrorBoundary>
      {/* Your existing app components */}
    </ServiceErrorBoundary>
  );
}
```

## 🔧 Component Migration Examples

### Dashboard Overview
```typescript
// src/pages/dashboard/Overview.tsx
import { useInvestmentSummary, useInvestmentPerformance } from '@/hooks/useInvestmentService';

export function Overview({ userId }: { userId: string }) {
  const { data: summary, loading } = useInvestmentSummary(userId, {
    refreshInterval: 60000 // Auto-refresh every minute
  });

  const { data: performance } = useInvestmentPerformance(userId);

  if (loading) return <Skeleton />;

  return (
    <div>
      <SummaryCards data={summary} />
      <PerformanceChart data={performance} />
    </div>
  );
}
```

### Properties Page
```typescript
// src/pages/Properties.tsx
import { useInvestments, useInvestmentMutations } from '@/hooks/useInvestmentService';

export function Properties({ userId }: { userId?: string }) {
  const { data: userInvestments } = useInvestments(
    userId ? { userId, status: ['confirmed'] } : undefined
  );

  const { createInvestment, loading } = useInvestmentMutations();

  const handleInvest = async (propertyId: string, amount: number) => {
    const result = await createInvestment({
      property_id: propertyId,
      amount,
      shares: Math.floor(amount / 100) // Calculate shares
    });

    if (result) {
      // Success - investment created
      showSuccessNotification();
    }
  };

  return (
    <PropertiesGrid
      userInvestments={userInvestments}
      onInvest={handleInvest}
      investLoading={loading}
    />
  );
}
```

### Admin Investments
```typescript
// src/pages/admin/AdminInvestments.tsx
import { useInvestments, useInvestmentMutations } from '@/hooks/useInvestmentService';

export function AdminInvestments() {
  const { data: investments, loading, refetch } = useInvestments({
    limit: 100,
    orderBy: 'created_at',
    orderDirection: 'desc'
  });

  const { updateInvestment } = useInvestmentMutations();

  const handleStatusUpdate = async (id: string, status: string) => {
    await updateInvestment(id, { status });
    refetch(); // Refresh list
  };

  return (
    <InvestmentTable
      data={investments}
      loading={loading}
      onStatusUpdate={handleStatusUpdate}
    />
  );
}
```

## 🎯 Key Benefits

### 1. Solves JWT 406 Errors
- **Anonymous client** for reads (no JWT required)
- **Authenticated client** for writes (security maintained)
- **Automatic client selection** based on operation type

### 2. Production-Ready Reliability
- **Circuit breaker** prevents cascading failures
- **Exponential backoff** retry with jitter
- **Multi-layer caching** (memory + localStorage)
- **Comprehensive error handling**

### 3. Developer Experience
- **Simple React hooks** replace complex state management
- **TypeScript interfaces** for type safety
- **Automatic loading states** and error handling
- **Built-in caching** - no more manual optimization

### 4. Enterprise Features
- **Monitoring and metrics** for production debugging
- **Configurable environments** (dev, staging, prod)
- **Health checks** and alerting capability
- **Graceful degradation** with fallbacks

## 📊 Monitoring Dashboard

Add this to your admin panel to monitor service health:

```typescript
// src/pages/admin/ServiceMonitoring.tsx
import { useInvestmentServiceMetrics } from '@/hooks/useInvestmentService';

export function ServiceMonitoring() {
  const { metrics, health, clearCache } = useInvestmentServiceMetrics();

  return (
    <div className="service-monitoring">
      <HealthStatus health={health} />
      <MetricsGrid metrics={metrics} />
      <Actions onClearCache={clearCache} />
    </div>
  );
}
```

## 🔒 Security Model

### Read Operations (Anonymous Client)
- Uses `supabaseInvestments` client
- No JWT token sent
- Bypasses 406 errors
- RLS policies still enforced by Supabase

### Write Operations (Authenticated Client)
- Uses regular `supabase` client
- JWT token required
- Full authentication and authorization
- Secure investment creation/updates

### Data Protection
- No sensitive data in error logs
- Cache keys designed to prevent data leakage
- Automatic cache invalidation on writes

## ⚙️ Configuration Options

### Environment-Based Config
```typescript
// Automatically configures based on NODE_ENV
const service = InvestmentServiceFactory.createFromEnvironment();

// Or manually specify
const prodService = InvestmentServiceFactory.createProductionService();
const devService = InvestmentServiceFactory.createDevelopmentService();
```

### Custom Configuration
```typescript
const customService = InvestmentServiceFactory.createService({
  cache: {
    ttl: 10 * 60 * 1000,     // 10 minutes
    maxMemoryItems: 2000,     // Larger cache
    enablePersistence: true
  },
  circuitBreaker: {
    failureThreshold: 3,      // Open after 3 failures
    resetTimeout: 60000       // 1 minute reset
  },
  retry: {
    maxAttempts: 5,          // More aggressive retry
    baseDelay: 2000,         // 2 second base
    maxDelay: 30000          // 30 second max
  },
  enableMetrics: true,
  enableLogging: process.env.NODE_ENV !== 'production'
});
```

## 🚦 Error Handling Strategies

### Component Level
```typescript
const { data, loading, error } = useInvestments({ userId });

if (error) {
  // Handle specific error types
  switch (error.code) {
    case 'NETWORK_ERROR':
      return <NetworkError onRetry={refetch} />;
    case 'UNAUTHORIZED':
      return <LoginPrompt />;
    default:
      return <GenericError error={error} />;
  }
}
```

### Global Error Boundary
```typescript
// Wrap your app
<ServiceErrorBoundary>
  <App />
</ServiceErrorBoundary>
```

## 🎯 Performance Optimizations

### Smart Caching
- **Memory cache** for immediate access
- **localStorage** for cross-session persistence
- **Tag-based invalidation** clears related data
- **LRU eviction** prevents memory leaks

### Request Optimization
- **Deduplication** prevents duplicate requests
- **Batch operations** where possible
- **Connection reuse** via singleton pattern
- **Lazy loading** with React hooks

### Circuit Breaking
- **Fail fast** when service is down
- **Automatic recovery** testing
- **Fallback data** for critical operations
- **Health monitoring** for proactive alerts

## 📈 Scaling Considerations

### Horizontal Scaling
- **Stateless service design** works with load balancers
- **Client-side caching** reduces server load
- **Connection pooling** via Supabase client reuse

### Performance Tuning
- Adjust cache TTL based on data freshness needs
- Tune circuit breaker thresholds for your traffic patterns
- Configure retry policies for your network conditions

### Monitoring Integration
- Export metrics to your monitoring system
- Set up alerts on circuit breaker state changes
- Monitor cache hit rates for optimization opportunities

## 🔄 Migration Checklist

- [ ] Install service architecture files
- [ ] Update components to use hooks instead of direct Supabase calls
- [ ] Add ServiceErrorBoundary to app root
- [ ] Configure environment-specific settings
- [ ] Add monitoring dashboard to admin panel
- [ ] Test JWT 406 error scenarios
- [ ] Validate caching behavior
- [ ] Set up production monitoring alerts
- [ ] Performance test with real data volumes
- [ ] Document team training on new patterns

## 🚀 Production Deployment

### Environment Variables
No additional environment variables needed - uses existing Supabase config.

### Performance Baselines
- Cache hit rate > 80%
- Circuit breaker stays CLOSED
- Average request time < 200ms
- Retry success rate > 90%

### Monitoring Alerts
- Circuit breaker OPEN state
- Cache hit rate < 60%
- Error rate > 5%
- Response time > 1 second

This enterprise-grade architecture solves your JWT 406 errors while providing production-ready reliability, performance, and maintainability for all 11+ components interacting with investment data.