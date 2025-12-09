/**
 * Caching Service for Enhanced Content Features
 * Implements efficient caching strategies for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class CachingService {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = { hits: 0, misses: 0 };
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxSize: number = 1000, defaultTTL: number = 5 * 60 * 1000) {
    // 5 minutes default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // If cache is at max size, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Destroy the cache service and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Get or set pattern - fetch data if not in cache
   */
  async getOrSet<T>(key: string, fetchFunction: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const data = await fetchFunction();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Preload frequently accessed data
   */
  async preload(
    preloadFunctions: Array<{ key: string; fn: () => Promise<any>; ttl?: number }>
  ): Promise<void> {
    const promises = preloadFunctions.map(async ({ key, fn, ttl }) => {
      try {
        const data = await fn();
        this.set(key, data, ttl);
      } catch (error) {
        console.warn(`Failed to preload cache key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }
}

/**
 * Specialized caching strategies for different data types
 */
export class ContentCachingService extends CachingService {
  constructor() {
    super(2000, 10 * 60 * 1000); // 10 minutes default for content
  }

  // Cache keys
  private static readonly KEYS = {
    USER_POSTS: (userId: string) => `posts:user:${userId}`,
    POST_ANALYTICS: (postId: string) => `analytics:post:${postId}`,
    CAMPAIGN_POSTS: (campaignId: string) => `posts:campaign:${campaignId}`,
    BRAND_VOICES: (userId: string) => `brand_voices:user:${userId}`,
    AUDIENCE_PROFILES: (userId: string) => `audience_profiles:user:${userId}`,
    CONTENT_TEMPLATES: (userId: string) => `templates:user:${userId}`,
    PUBLIC_TEMPLATES: () => 'templates:public',
    PERFORMANCE_REPORT: (userId: string, timeframe: string) => `performance:${userId}:${timeframe}`,
    TOP_CONTENT: (userId: string, timeframe: string, platform?: string) =>
      `top_content:${userId}:${timeframe}:${platform || 'all'}`,
    OPTIMAL_TIMES: (userId: string, platform?: string) =>
      `optimal_times:${userId}:${platform || 'all'}`,
    DASHBOARD_DATA: (userId: string) => `dashboard:${userId}`,
    ANALYTICS_SUMMARY: (userId: string, period: string) => `analytics_summary:${userId}:${period}`,
  };

  /**
   * Cache user posts with short TTL for real-time updates
   */
  async cacheUserPosts<T>(userId: string, fetchFn: () => Promise<T>): Promise<T> {
    return this.getOrSet(
      ContentCachingService.KEYS.USER_POSTS(userId),
      fetchFn,
      2 * 60 * 1000 // 2 minutes for posts (frequent updates)
    );
  }

  /**
   * Cache post analytics with medium TTL
   */
  async cachePostAnalytics<T>(postId: string, fetchFn: () => Promise<T>): Promise<T> {
    return this.getOrSet(
      ContentCachingService.KEYS.POST_ANALYTICS(postId),
      fetchFn,
      5 * 60 * 1000 // 5 minutes for analytics
    );
  }

  /**
   * Cache brand voices with longer TTL (less frequent changes)
   */
  async cacheBrandVoices<T>(userId: string, fetchFn: () => Promise<T>): Promise<T> {
    return this.getOrSet(
      ContentCachingService.KEYS.BRAND_VOICES(userId),
      fetchFn,
      30 * 60 * 1000 // 30 minutes for brand voices
    );
  }

  /**
   * Cache audience profiles with longer TTL
   */
  async cacheAudienceProfiles<T>(userId: string, fetchFn: () => Promise<T>): Promise<T> {
    return this.getOrSet(
      ContentCachingService.KEYS.AUDIENCE_PROFILES(userId),
      fetchFn,
      30 * 60 * 1000 // 30 minutes for audience profiles
    );
  }

  /**
   * Cache content templates with longer TTL
   */
  async cacheContentTemplates<T>(userId: string, fetchFn: () => Promise<T>): Promise<T> {
    return this.getOrSet(
      ContentCachingService.KEYS.CONTENT_TEMPLATES(userId),
      fetchFn,
      60 * 60 * 1000 // 1 hour for templates
    );
  }

  /**
   * Cache public templates with very long TTL
   */
  async cachePublicTemplates<T>(fetchFn: () => Promise<T>): Promise<T> {
    return this.getOrSet(
      ContentCachingService.KEYS.PUBLIC_TEMPLATES(),
      fetchFn,
      4 * 60 * 60 * 1000 // 4 hours for public templates
    );
  }

  /**
   * Cache performance reports with medium TTL
   */
  async cachePerformanceReport<T>(
    userId: string,
    timeframe: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    return this.getOrSet(
      ContentCachingService.KEYS.PERFORMANCE_REPORT(userId, timeframe),
      fetchFn,
      15 * 60 * 1000 // 15 minutes for performance reports
    );
  }

  /**
   * Cache top content with medium TTL
   */
  async cacheTopContent<T>(
    userId: string,
    timeframe: string,
    fetchFn: () => Promise<T>,
    platform?: string
  ): Promise<T> {
    return this.getOrSet(
      ContentCachingService.KEYS.TOP_CONTENT(userId, timeframe, platform),
      fetchFn,
      10 * 60 * 1000 // 10 minutes for top content
    );
  }

  /**
   * Cache optimal posting times with long TTL
   */
  async cacheOptimalTimes<T>(
    userId: string,
    fetchFn: () => Promise<T>,
    platform?: string
  ): Promise<T> {
    return this.getOrSet(
      ContentCachingService.KEYS.OPTIMAL_TIMES(userId, platform),
      fetchFn,
      2 * 60 * 60 * 1000 // 2 hours for optimal times
    );
  }

  /**
   * Cache dashboard data with short TTL for real-time feel
   */
  async cacheDashboardData<T>(userId: string, fetchFn: () => Promise<T>): Promise<T> {
    return this.getOrSet(
      ContentCachingService.KEYS.DASHBOARD_DATA(userId),
      fetchFn,
      3 * 60 * 1000 // 3 minutes for dashboard
    );
  }

  /**
   * Cache analytics summary with medium TTL
   */
  async cacheAnalyticsSummary<T>(
    userId: string,
    period: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    return this.getOrSet(
      ContentCachingService.KEYS.ANALYTICS_SUMMARY(userId, period),
      fetchFn,
      15 * 60 * 1000 // 15 minutes for analytics summary
    );
  }

  /**
   * Invalidate user-specific cache when data changes
   */
  invalidateUserCache(userId: string): number {
    return this.invalidatePattern(
      `(posts|brand_voices|audience_profiles|templates|performance|dashboard|analytics_summary):.*${userId}`
    );
  }

  /**
   * Invalidate post-specific cache when post changes
   */
  invalidatePostCache(postId: string): number {
    return this.invalidatePattern(`(analytics|posts):.*${postId}`);
  }

  /**
   * Invalidate campaign-specific cache when campaign changes
   */
  invalidateCampaignCache(campaignId: string): number {
    return this.invalidatePattern(`(posts|performance):.*${campaignId}`);
  }

  /**
   * Preload essential user data
   */
  async preloadUserData(
    userId: string,
    dataFetchers: {
      posts?: () => Promise<any>;
      brandVoices?: () => Promise<any>;
      audienceProfiles?: () => Promise<any>;
      templates?: () => Promise<any>;
      dashboardData?: () => Promise<any>;
    }
  ): Promise<void> {
    const preloadFunctions = [];

    if (dataFetchers.posts) {
      preloadFunctions.push({
        key: ContentCachingService.KEYS.USER_POSTS(userId),
        fn: dataFetchers.posts,
        ttl: 2 * 60 * 1000,
      });
    }

    if (dataFetchers.brandVoices) {
      preloadFunctions.push({
        key: ContentCachingService.KEYS.BRAND_VOICES(userId),
        fn: dataFetchers.brandVoices,
        ttl: 30 * 60 * 1000,
      });
    }

    if (dataFetchers.audienceProfiles) {
      preloadFunctions.push({
        key: ContentCachingService.KEYS.AUDIENCE_PROFILES(userId),
        fn: dataFetchers.audienceProfiles,
        ttl: 30 * 60 * 1000,
      });
    }

    if (dataFetchers.templates) {
      preloadFunctions.push({
        key: ContentCachingService.KEYS.CONTENT_TEMPLATES(userId),
        fn: dataFetchers.templates,
        ttl: 60 * 60 * 1000,
      });
    }

    if (dataFetchers.dashboardData) {
      preloadFunctions.push({
        key: ContentCachingService.KEYS.DASHBOARD_DATA(userId),
        fn: dataFetchers.dashboardData,
        ttl: 3 * 60 * 1000,
      });
    }

    await this.preload(preloadFunctions);
  }
}

/**
 * Pagination cache for large datasets
 */
export class PaginationCache {
  private cache = new Map<
    string,
    { data: any[]; totalCount: number; timestamp: number; ttl: number }
  >();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Cache paginated results
   */
  set(key: string, data: any[], totalCount: number, ttl?: number): void {
    this.cache.set(key, {
      data,
      totalCount,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Get paginated results
   */
  get(key: string, page: number, pageSize: number): { data: any[]; totalCount: number } | null {
    const entry = this.cache.get(key);

    if (!entry || Date.now() > entry.timestamp + entry.ttl) {
      if (entry) this.cache.delete(key);
      return null;
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      data: entry.data.slice(startIndex, endIndex),
      totalCount: entry.totalCount,
    };
  }

  /**
   * Generate pagination cache key
   */
  static generateKey(baseKey: string, filters?: Record<string, any>): string {
    const filterString = filters ? JSON.stringify(filters) : '';
    return `${baseKey}:${filterString}`;
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instances
export const contentCache = new ContentCachingService();
export const paginationCache = new PaginationCache();

// Clean up pagination cache every 5 minutes
// Store interval reference for potential cleanup
const paginationCleanupInterval = setInterval(() => paginationCache.cleanup(), 5 * 60 * 1000);

// Export cleanup function for proper resource management
export const cleanupCacheServices = () => {
  contentCache.destroy();
  clearInterval(paginationCleanupInterval);
};
