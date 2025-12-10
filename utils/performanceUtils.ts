/**
 * Performance Utilities
 *
 * Helper functions for optimizing common operations in the application.
 * These utilities help avoid performance pitfalls and provide reusable patterns.
 */

/**
 * Efficiently batch array operations to reduce iterations
 * Instead of chaining .filter().map(), this function does both in a single pass
 *
 * @example
 * // Before (two iterations):
 * const result = items.filter(x => x.active).map(x => x.value);
 *
 * // After (one iteration):
 * const result = filterMap(items, x => x.active, x => x.value);
 */
export function filterMap<T, U>(
  array: T[],
  predicate: (item: T, index: number) => boolean,
  transform: (item: T, index: number) => U
): U[] {
  const result: U[] = [];
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    // Check for undefined if strict indexed access is enabled
    if (item === undefined) continue;

    if (predicate(item, i)) {
      result.push(transform(item, i));
    }
  }
  return result;
}

/**
 * Debounce function to limit how often a function can be called
 * Useful for search inputs, window resize handlers, etc.
 *
 * @example
 * const debouncedSearch = debounce((query) => fetchResults(query), 300);
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to ensure a function is called at most once per time period
 * Different from debounce - guarantees execution at regular intervals
 *
 * @example
 * const throttledScroll = throttle(() => updateScrollPosition(), 100);
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoize expensive function calls
 * Caches results based on argument serialization
 *
 * Note: Uses JSON.stringify for key generation by default. For complex objects with
 * circular references or when performance is critical, provide a custom keyFn.
 *
 * @example
 * const expensiveCalc = memoize((a, b) => a * b * Math.random());
 *
 * // With custom key function:
 * const customMemo = memoize(
 *   (user) => processUser(user),
 *   { keyFn: (user) => user.id }
 * );
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  options: {
    maxCacheSize?: number;
    keyFn?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const { maxCacheSize = 100, keyFn = (...args: any[]) => JSON.stringify(args) } = options;
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn(...args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);

    // Limit cache size to prevent memory issues
    // Map maintains insertion order, so first key is least recently used
    if (cache.size >= maxCacheSize) {
      const firstIter = cache.keys().next();
      if (!firstIter.done) {
        cache.delete(firstIter.value);
      }
    }

    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Chunk array into smaller arrays of specified size
 * Useful for batch processing and pagination
 *
 * @example
 * const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
 * const chunks = chunkArray(items, 3);
 * // Result: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be positive');
  }

  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Group array items by a key function
 * More efficient than multiple filter operations
 *
 * @example
 * const users = [
 *   { name: 'Alice', role: 'admin' },
 *   { name: 'Bob', role: 'user' },
 *   { name: 'Charlie', role: 'admin' }
 * ];
 * const grouped = groupBy(users, u => u.role);
 * // Result: { admin: [Alice, Charlie], user: [Bob] }
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string | number): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  for (const item of array) {
    const key = String(keyFn(item));
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key]!.push(item);
  }

  return groups;
}

/**
 * Remove duplicates from array based on a key function
 * More efficient than filter with indexOf
 *
 * @example
 * const items = [
 *   { id: 1, name: 'A' },
 *   { id: 2, name: 'B' },
 *   { id: 1, name: 'C' }
 * ];
 * const unique = uniqueBy(items, item => item.id);
 * // Result: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
 */
export function uniqueBy<T>(array: T[], keyFn: (item: T) => string | number): T[] {
  const seen = new Set<string | number>();
  const result: T[] = [];

  for (const item of array) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

/**
 * Efficiently find the first item matching a condition and transform it
 * Stops iteration as soon as match is found
 *
 * @example
 * const user = findAndMap(users, u => u.id === targetId, u => u.name);
 */
export function findAndMap<T, U>(
  array: T[],
  predicate: (item: T) => boolean,
  transform: (item: T) => U
): U | undefined {
  for (const item of array) {
    if (predicate(item)) {
      return transform(item);
    }
  }
  return undefined;
}

/**
 * Create a delay promise for async operations
 * Useful for rate limiting and testing
 *
 * @example
 * await delay(1000); // Wait 1 second
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * Useful for network requests and flaky operations
 *
 * @example
 * const result = await retry(
 *   () => fetchDataFromAPI(),
 *   { maxAttempts: 3, delayMs: 1000 }
 * );
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    maxDelayMs?: number;
    exponentialBackoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    maxDelayMs = 30000, // Cap at 30 seconds to prevent extremely long delays
    exponentialBackoff = true,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        // Cap exponential backoff to prevent unbounded delay growth
        const waitTime = exponentialBackoff
          ? Math.min(delayMs * Math.pow(2, attempt - 1), maxDelayMs)
          : delayMs;

        if (onRetry) {
          onRetry(attempt, lastError);
        }

        await delay(waitTime);
      }
    }
  }

  throw lastError || new Error('Retry failed with no error');
}

/**
 * Batch async operations to limit concurrency
 * Prevents overwhelming the system with too many parallel operations
 *
 * @example
 * const results = await batchAsync(
 *   userIds,
 *   id => fetchUser(id),
 *   { batchSize: 5 }
 * );
 */
export async function batchAsync<T, U>(
  items: T[],
  asyncFn: (item: T) => Promise<U>,
  options: {
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<U[]> {
  const { batchSize = 10, onProgress } = options;
  const results: U[] = [];
  const chunks = chunkArray(items, batchSize);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;
    
    const chunkResults = await Promise.all(chunk.map(asyncFn));
    results.push(...chunkResults);

    if (onProgress) {
      onProgress(results.length, items.length);
    }
  }

  return results;
}

/**
 * Simple in-memory LRU (Least Recently Used) cache
 * Automatically evicts least recently used items when capacity is reached
 *
 * @example
 * const cache = new LRUCache<string, User>(100);
 * cache.set('user1', userData);
 * const user = cache.get('user1');
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // Delete existing key to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestIter = this.cache.keys().next();
      if (!oldestIter.done) {
        this.cache.delete(oldestIter.value);
      }
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Measure execution time of a function
 * Useful for performance profiling
 *
 * @example
 * const [result, duration] = await measureTime(async () => {
 *   return await expensiveOperation();
 * });
 * console.log(`Operation took ${duration}ms`);
 */
export async function measureTime<T>(fn: () => Promise<T> | T): Promise<[T, number]> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return [result, duration];
}
