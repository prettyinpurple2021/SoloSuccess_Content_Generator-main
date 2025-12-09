# Utility Functions

This directory contains reusable utility functions organized by functionality.

## Available Utilities

### performanceUtils.ts

Performance optimization utilities for efficient data processing and async operations.

**Key Functions:**

- `filterMap()` - Combine filter and map in a single iteration
- `debounce()` - Limit function call frequency
- `throttle()` - Ensure function called at most once per interval
- `memoize()` - Cache expensive function results
- `chunkArray()` - Split arrays for batch processing
- `groupBy()` - Group array items by key
- `uniqueBy()` - Remove duplicates efficiently
- `retry()` - Retry async operations with exponential backoff
- `batchAsync()` - Process async operations in controlled batches
- `LRUCache` - In-memory Least Recently Used cache
- `measureTime()` - Profile function execution time

**Usage Examples:**

```typescript
import { filterMap, debounce, retry, LRUCache } from './utils/performanceUtils';

// Efficient filtering and mapping
const activeUserNames = filterMap(
  users,
  (user) => user.active,
  (user) => user.name
);

// Debounced search
const handleSearch = debounce((query: string) => {
  fetchSearchResults(query);
}, 300);

// Retry with exponential backoff
const data = await retry(() => fetchFromAPI(), {
  maxAttempts: 3,
  delayMs: 1000,
  exponentialBackoff: true,
});

// LRU Cache
const cache = new LRUCache<string, User>(100);
cache.set('user1', userData);
const user = cache.get('user1');
```

### errorUtils.ts

Error handling and logging utilities.

## Best Practices

1. **Use filterMap instead of chaining filter().map()**

   ```typescript
   // ❌ Bad - two iterations
   const result = items.filter((x) => x.active).map((x) => x.value);

   // ✅ Good - one iteration
   const result = filterMap(
     items,
     (x) => x.active,
     (x) => x.value
   );
   ```

2. **Debounce expensive operations**

   ```typescript
   // ❌ Bad - calls on every keystroke
   onChange={(e) => fetchResults(e.target.value)}

   // ✅ Good - debounced
   const debouncedFetch = debounce(fetchResults, 300);
   onChange={(e) => debouncedFetch(e.target.value)}
   ```

3. **Use retry for unreliable network calls**

   ```typescript
   // ❌ Bad - fails on first error
   const data = await fetch(url);

   // ✅ Good - retries with backoff
   const data = await retry(() => fetch(url), { maxAttempts: 3 });
   ```

4. **Batch async operations to prevent overload**

   ```typescript
   // ❌ Bad - all at once (100 concurrent calls)
   const results = await Promise.all(userIds.map(fetchUser));

   // ✅ Good - batched (5 at a time)
   const results = await batchAsync(userIds, fetchUser, { batchSize: 5 });
   ```

## Adding New Utilities

When adding new utility functions:

1. **Choose the right file**: Place functions in logically grouped files
2. **Add JSDoc comments**: Document parameters, return values, and examples
3. **Write tests**: Ensure utilities work correctly
4. **Update this README**: Add the new function to the list above
5. **Consider performance**: Optimize for common use cases

## Testing

Run tests for utilities:

```bash
npm test utils/
```

## Contributing

When modifying utilities:

1. Maintain backward compatibility when possible
2. Update documentation and examples
3. Add tests for new functionality
4. Profile performance-critical changes
5. Update the CHANGELOG.md
