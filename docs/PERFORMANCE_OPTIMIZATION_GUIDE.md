# Performance Optimization Guide

This guide documents the performance optimizations implemented in the SoloSuccess Content Generator and provides best practices for maintaining optimal performance.

## Recent Optimizations

### 1. Database Pagination Optimization (databaseService.ts)

**Issue**: The pagination cache was preloading up to 1000 records on the first page request, causing slow initial load times and high memory usage.

**Solution**: Reduced cache preloading from 1000 to 100 records (5 pages worth), providing a balance between cache efficiency and memory usage.

```typescript
// Before: Fetching up to 1000 records
const fullData =
  await pool`SELECT * FROM posts WHERE user_id = ${userId} LIMIT ${Math.min(1000, totalCount)}`;

// After: Fetching up to 100 records
const cacheLimit = Math.min(100, totalCount);
const fullData = await pool`SELECT * FROM posts WHERE user_id = ${userId} LIMIT ${cacheLimit}`;
```

**Impact**:

- ~80% reduction in initial data fetched
- Faster page load times
- Reduced memory footprint
- Maintained cache efficiency for typical pagination scenarios

### 2. Memory Leak Prevention in Caching Service

**Issue**: The CachingService constructor created a setInterval without storing its reference, making cleanup impossible and causing memory leaks.

**Solution**: Added proper interval tracking and cleanup methods.

```typescript
export class CachingService {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxSize: number = 1000, defaultTTL: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}
```

**Impact**:

- Prevents memory leaks in long-running applications
- Allows proper cleanup when cache is no longer needed
- Added cleanupCacheServices() export for application shutdown

### 3. Consolidated Performance Monitoring

**Issue**: Multiple setInterval calls for cache monitoring (5s) and memory monitoring (10s) created unnecessary overhead.

**Solution**: Merged both monitoring tasks into a single interval running every 5 seconds.

```typescript
// Before: Two separate intervals
useEffect(() => {
  const interval1 = setInterval(updateCacheMetrics, 5000);
  return () => clearInterval(interval1);
}, []);

useEffect(() => {
  const interval2 = setInterval(updateMemoryUsage, 10000);
  return () => clearInterval(interval2);
}, []);

// After: Single consolidated interval
useEffect(() => {
  const updateMetrics = () => {
    // Update both cache and memory metrics
    updateCacheMetrics();
    updateMemoryUsage();
  };
  const interval = setInterval(updateMetrics, 5000);
  updateMetrics(); // Initial update
  return () => clearInterval(interval);
}, []);
```

**Impact**:

- Reduced timer overhead by 50%
- Simplified cleanup logic
- More consistent metric updates

### 4. Safe JSON Parsing with Error Handling

**Issue**: Multiple repetitive JSON.parse operations throughout the codebase without error handling, potentially causing crashes on malformed data.

**Solution**: Created a reusable safeJsonParse() helper function with try-catch and default values.

```typescript
// Helper function to safely parse JSON fields
function safeJsonParse<T>(value: string | T | null | undefined, defaultValue: T): T {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn('Failed to parse JSON, returning default value:', e);
      return defaultValue;
    }
  }
  return value as T;
}

// Usage in transformation functions
socialMediaPosts: safeJsonParse(dbPost.social_media_posts, {}),
socialMediaTones: safeJsonParse(dbPost.social_media_tones, {}),
```

**Impact**:

- Eliminated repetitive try-catch blocks
- Consistent error handling across all JSON parsing
- Graceful degradation with sensible defaults
- Improved code maintainability

### 5. Integration Service Sync Job Cleanup

**Issue**: Integration service used setInterval for sync jobs without proper cleanup tracking.

**Solution**: Added stopAllSyncs() method for comprehensive cleanup.

```typescript
async stopAllSyncs(): Promise<void> {
  for (const [id, syncJob] of this.syncJobs.entries()) {
    clearInterval(syncJob);
    await this.logIntegrationActivity(id, 'info', 'Automatic sync stopped during cleanup');
  }
  this.syncJobs.clear();
}
```

**Impact**:

- Proper cleanup of all sync jobs during shutdown
- Prevents background processes from continuing after service termination

## Best Practices for Future Development

### 1. Database Query Optimization

**DO:**

- Use pagination for large datasets
- Implement proper indexing on frequently queried fields
- Cache frequently accessed data with appropriate TTL
- Use connection pooling (already configured)
- Batch operations when possible

**DON'T:**

- Fetch more data than needed "just in case"
- Run queries in loops (use JOINs or batch queries)
- Forget to add WHERE clauses on large tables
- Return entire records when only specific fields are needed

### 2. Caching Strategy

**DO:**

- Set appropriate TTL based on data change frequency
  - Real-time data: 1-2 minutes
  - User-specific data: 5-10 minutes
  - Configuration data: 30-60 minutes
  - Public templates: 4+ hours
- Invalidate cache when data changes
- Monitor cache hit rates
- Use pagination cache for large result sets

**DON'T:**

- Cache everything indefinitely
- Forget to invalidate stale data
- Cache sensitive data without encryption
- Set unlimited cache sizes

### 3. React Component Optimization

**DO:**

- Use useMemo for expensive calculations
- Use useCallback for functions passed as props
- Implement React.memo for components that re-render unnecessarily
- Split large components into smaller, focused components
- Use lazy loading for heavy components

**Example:**

```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// Memoize callback functions
const handleClick = useCallback(
  (id: string) => {
    updateItem(id);
  },
  [updateItem]
);

// Memoize components
const MemoizedComponent = React.memo(Component);
```

**DON'T:**

- Define functions inside render (use useCallback)
- Create new objects/arrays in render without useMemo
- Forget to add dependency arrays to useEffect/useMemo/useCallback
- Over-optimize – profile first, optimize later

### 4. JSON Operations

**DO:**

- Use safeJsonParse() helper for all database JSON parsing
- Stringify only when necessary
- Cache parsed results when used multiple times
- Validate JSON structure after parsing

**DON'T:**

- Parse the same JSON multiple times
- Use JSON.parse without error handling
- Stringify objects unnecessarily
- Ignore parsing errors

### 5. Async Operations

**DO:**

- Use Promise.all for parallel operations
- Implement proper error handling
- Set appropriate timeouts
- Show loading states to users
- Cancel pending requests when component unmounts

**Example:**

```typescript
// Parallel execution
const [users, posts, comments] = await Promise.all([fetchUsers(), fetchPosts(), fetchComments()]);

// With cleanup
useEffect(() => {
  let cancelled = false;

  async function fetchData() {
    const data = await apiCall();
    if (!cancelled) {
      setData(data);
    }
  }

  fetchData();
  return () => {
    cancelled = true;
  };
}, []);
```

**DON'T:**

- Make sequential API calls that could be parallel
- Forget to handle errors
- Leave pending promises on unmount
- Block the UI thread with long-running operations

### 6. Memory Management

**DO:**

- Clear intervals and timeouts on cleanup
- Unsubscribe from event listeners
- Cancel ongoing requests when components unmount
- Monitor memory usage in production
- Implement proper cleanup in useEffect return functions

**Example:**

```typescript
useEffect(() => {
  const interval = setInterval(updateData, 5000);
  const listener = window.addEventListener('resize', handleResize);

  return () => {
    clearInterval(interval);
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

**DON'T:**

- Create intervals without cleanup
- Keep references to unmounted components
- Store large objects in closures unnecessarily
- Forget cleanup in custom hooks

## Performance Monitoring

### Built-in Tools

1. **Performance Monitor Component**: Displays real-time metrics
   - Page load time
   - Cache hit rate
   - Memory usage
   - API response times
   - Error count

2. **Cache Statistics**: Monitor cache performance

   ```typescript
   const stats = contentCache.getStats();
   console.log('Cache hit rate:', stats.hitRate);
   console.log('Cache size:', stats.size);
   ```

3. **Frontend Performance Service**: Track component render times
   ```typescript
   frontendPerformanceService.trackComponentRender('MyComponent', renderTime);
   ```

### Chrome DevTools

Use the following Chrome DevTools features:

- **Performance Tab**: Record and analyze runtime performance
- **Memory Tab**: Check for memory leaks
- **Network Tab**: Monitor API call timing and payload sizes
- **Lighthouse**: Automated performance audits

### Key Metrics to Monitor

1. **First Contentful Paint (FCP)**: < 1.8s (good)
2. **Largest Contentful Paint (LCP)**: < 2.5s (good)
3. **Time to Interactive (TTI)**: < 3.8s (good)
4. **Cumulative Layout Shift (CLS)**: < 0.1 (good)
5. **Total Blocking Time (TBT)**: < 200ms (good)

## Database Indexing Recommendations

Consider adding indexes for frequently queried fields:

```sql
-- Posts table indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_schedule_date ON posts(schedule_date);
CREATE INDEX idx_posts_campaign_id ON posts(campaign_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- Composite indexes for common query patterns
CREATE INDEX idx_posts_user_status ON posts(user_id, status);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);

-- Brand voices indexes
CREATE INDEX idx_brand_voices_user_id ON brand_voices(user_id);

-- Campaigns indexes
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Integration logs indexes
CREATE INDEX idx_integration_logs_integration_id ON integration_logs(integration_id);
CREATE INDEX idx_integration_logs_timestamp ON integration_logs(timestamp DESC);
```

## Conclusion

Performance optimization is an ongoing process. Always:

1. **Measure first** – Profile before optimizing
2. **Optimize bottlenecks** – Focus on the biggest impacts
3. **Test thoroughly** – Ensure optimizations don't break functionality
4. **Monitor continuously** – Track metrics in production
5. **Document changes** – Update this guide with new optimizations

For questions or suggestions, please open an issue in the repository.
