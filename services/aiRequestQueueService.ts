/**
 * AI Request Queue Service
 *
 * Production-quality solution for handling AI service rate limits
 * with intelligent queuing, caching, and fallback mechanisms.
 */

interface QueuedRequest<T = unknown> {
  id: string;
  userId: string;
  type: 'topic' | 'ideas' | 'content' | 'social' | 'image' | 'summary' | 'headlines' | 'tags';
  payload: unknown;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  resolve: (result: T) => void;
  reject: (error: Error) => void;
}

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  cooldownPeriod: number; // milliseconds
}

interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: Date;
  ttl: number; // milliseconds
  hitCount: number;
}

class AIRequestQueueService {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private rateLimitConfig: RateLimitConfig;
  private requestCounts = {
    minute: { count: 0, resetTime: Date.now() + 60000 },
    hour: { count: 0, resetTime: Date.now() + 3600000 },
    day: { count: 0, resetTime: Date.now() + 86400000 },
  };
  private cache = new Map<string, CacheEntry>();
  private circuitBreaker = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    threshold: 5,
    timeout: 30000, // 30 seconds
  };

  constructor(config?: Partial<RateLimitConfig>) {
    this.rateLimitConfig = {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10,
      cooldownPeriod: 1000,
      ...config,
    };

    // Start processing queue
    this.startProcessing();

    // Setup cache cleanup
    setInterval(() => this.cleanupCache(), 300000); // 5 minutes
  }

  /**
   * Add request to queue with intelligent prioritization
   */
  async queueRequest<T>(
    userId: string,
    type: QueuedRequest['type'],
    payload: unknown,
    priority: QueuedRequest['priority'] = 'normal',
    maxRetries = 3
  ): Promise<T> {
    // Check cache first
    const cacheKey = this.generateCacheKey(type, payload);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit for ${type} request`);
      return cached as T;
    }

    // Check circuit breaker
    if (this.circuitBreaker.isOpen) {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure < this.circuitBreaker.timeout) {
        throw new Error('AI service temporarily unavailable. Please try again later.');
      } else {
        // Reset circuit breaker
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failureCount = 0;
      }
    }

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: this.generateRequestId(),
        userId,
        type,
        payload,
        priority,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries,
        resolve,
        reject,
      };

      // Insert request based on priority
      this.insertByPriority(request);

      console.log(
        `📝 Queued ${type} request (priority: ${priority}, queue size: ${this.queue.length})`
      );

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queue with rate limiting and error handling
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Check rate limits
      if (!this.canMakeRequest()) {
        const waitTime = this.getWaitTime();
        console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
        continue;
      }

      const request = this.queue.shift()!;

      try {
        console.log(`🔄 Processing ${request.type} request (${request.id})`);

        const result = await this.executeRequest(request);

        // Cache successful result
        const cacheKey = this.generateCacheKey(request.type, request.payload);
        this.addToCache(cacheKey, result, this.getCacheTTL(request.type));

        // Update rate limit counters
        this.updateRateLimitCounters();

        // Reset circuit breaker on success
        this.circuitBreaker.failureCount = 0;

        request.resolve(result as any);

        console.log(`✅ Completed ${request.type} request (${request.id})`);
      } catch (error) {
        console.error(`❌ Failed ${request.type} request (${request.id}):`, error);

        // Handle circuit breaker
        this.circuitBreaker.failureCount++;
        if (this.circuitBreaker.failureCount >= this.circuitBreaker.threshold) {
          this.circuitBreaker.isOpen = true;
          this.circuitBreaker.lastFailureTime = Date.now();
          console.log('🚨 Circuit breaker opened - AI service temporarily disabled');
        }

        // Retry logic
        if (request.retryCount < request.maxRetries) {
          request.retryCount++;
          const delay = this.getRetryDelay(request.retryCount);

          console.log(
            `🔄 Retrying ${request.type} request in ${delay}ms (attempt ${request.retryCount}/${request.maxRetries})`
          );

          setTimeout(() => {
            this.insertByPriority(request);
          }, delay);
        } else {
          // Max retries reached, try fallback
          const fallbackResult = await this.tryFallback(request);
          if (fallbackResult) {
            request.resolve(fallbackResult as any);
          } else {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            request.reject(
              new Error(
                `AI service request failed after ${request.maxRetries} retries: ${errorMessage}`
              )
            );
          }
        }
      }

      // Add cooldown between requests
      await this.sleep(this.rateLimitConfig.cooldownPeriod);
    }

    this.processing = false;
  }

  /**
   * Execute the actual AI request
   */
  private async executeRequest(request: QueuedRequest<any>): Promise<unknown> {
    const geminiService = await import('./geminiService.js');

    switch (request.type) {
      case 'topic':
        return await geminiService.generateTopic();

      case 'ideas':
        return await geminiService.generateIdeas(request.payload as string);

      case 'content':
        const { idea, brandVoice, audienceProfile } = request.payload as any;
        return await geminiService.generatePersonalizedContent(idea, brandVoice, audienceProfile);

      case 'social':
        const { topic, platform, tone, length } = request.payload as any;
        return await geminiService.generateSocialMediaPost(topic, platform, tone, length);

      case 'image':
        const { prompt, options } = request.payload as any;
        return await geminiService.generateImage(prompt, options);

      case 'summary':
        return await geminiService.generateSummary(request.payload as string);

      case 'headlines':
        return await geminiService.generateHeadlines(request.payload as string);

      case 'tags':
        return await geminiService.generateTags(request.payload as string);

      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }

  /**
   * Try fallback mechanisms for failed requests
   */
  private async tryFallback(request: QueuedRequest<any>): Promise<unknown | null> {
    console.log(`🔄 Attempting fallback for ${request.type} request`);

    switch (request.type) {
      case 'topic':
        return this.getFallbackTopic();

      case 'ideas':
        return this.getFallbackIdeas(request.payload as string);

      case 'content':
        return this.getFallbackContent(request.payload as any);

      case 'social':
        return this.getFallbackSocialPost(request.payload as any);

      case 'summary':
        return this.getFallbackSummary(request.payload as string);

      case 'headlines':
        return this.getFallbackHeadlines(request.payload as string);

      case 'tags':
        return this.getFallbackTags(request.payload as string);

      default:
        return null;
    }
  }

  /**
   * Fallback content generators
   */
  private getFallbackTopic(): string {
    const fallbackTopics = [
      'Productivity Tips for Remote Workers',
      'Digital Marketing Strategies for Small Businesses',
      'Personal Finance Management in 2025',
      'Sustainable Living Practices',
      'Technology Trends and Innovation',
      'Health and Wellness in the Digital Age',
      'Career Development and Professional Growth',
      'Creative Problem-Solving Techniques',
    ];

    return fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)];
  }

  private getFallbackIdeas(topic: string): string[] {
    return [
      `Introduction to ${topic}: Getting Started`,
      `Advanced Strategies for ${topic}`,
      `Common Mistakes to Avoid in ${topic}`,
      `Future Trends in ${topic}`,
      `Case Studies: Success Stories in ${topic}`,
    ];
  }

  private getFallbackContent({ idea }: { idea: string }): string {
    return `# ${idea}

## Introduction

This content is temporarily generated using our fallback system while our AI service is experiencing high demand. 

## Key Points

- Understanding the fundamentals
- Practical implementation strategies  
- Best practices and recommendations
- Common challenges and solutions

## Conclusion

We're working to restore full AI content generation capabilities. Please try again in a few minutes for enhanced, personalized content.

*This is a fallback response. For full AI-generated content, please retry your request.*`;
  }

  private getFallbackSocialPost({ topic, platform }: { topic: string; platform: string }): {
    content: string;
  } {
    const platformEmojis = {
      twitter: '🐦',
      linkedin: '💼',
      facebook: '👥',
      instagram: '📸',
    };

    const emoji = platformEmojis[platform as keyof typeof platformEmojis] || '📝';

    return {
      content: `${emoji} Exploring ${topic} - sharing insights and strategies. What's your experience? #${topic.replace(/\s+/g, '')} #productivity`,
    };
  }

  private getFallbackSummary(content: string): string {
    const sentences = content.split('.').filter((s) => s.trim().length > 0);
    const firstSentence = sentences[0]?.trim() + '.';
    return firstSentence || 'Content summary temporarily unavailable.';
  }

  private getFallbackHeadlines(content: string): string[] {
    const title = content.split('\n')[0]?.replace('#', '').trim() || 'Untitled';
    return [
      title,
      `${title}: A Complete Guide`,
      `Everything You Need to Know About ${title}`,
      `${title} - Tips and Strategies`,
      `Mastering ${title} in 2025`,
    ];
  }

  private getFallbackTags(content: string): string[] {
    const commonTags = ['productivity', 'tips', 'strategy', 'guide', 'business', 'success'];
    const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const contentTags = [...new Set(words)].slice(0, 3);

    return [...contentTags, ...commonTags].slice(0, 8);
  }

  /**
   * Rate limiting logic
   */
  private canMakeRequest(): boolean {
    this.resetCountersIfNeeded();

    return (
      this.requestCounts.minute.count < this.rateLimitConfig.requestsPerMinute &&
      this.requestCounts.hour.count < this.rateLimitConfig.requestsPerHour &&
      this.requestCounts.day.count < this.rateLimitConfig.requestsPerDay
    );
  }

  private getWaitTime(): number {
    this.resetCountersIfNeeded();

    const waitTimes: number[] = [];

    if (this.requestCounts.minute.count >= this.rateLimitConfig.requestsPerMinute) {
      waitTimes.push(this.requestCounts.minute.resetTime - Date.now());
    }

    if (this.requestCounts.hour.count >= this.rateLimitConfig.requestsPerHour) {
      waitTimes.push(this.requestCounts.hour.resetTime - Date.now());
    }

    if (this.requestCounts.day.count >= this.rateLimitConfig.requestsPerDay) {
      waitTimes.push(this.requestCounts.day.resetTime - Date.now());
    }

    return Math.max(...waitTimes, 1000); // Minimum 1 second wait
  }

  private updateRateLimitCounters(): void {
    this.requestCounts.minute.count++;
    this.requestCounts.hour.count++;
    this.requestCounts.day.count++;
  }

  private resetCountersIfNeeded(): void {
    const now = Date.now();

    if (now >= this.requestCounts.minute.resetTime) {
      this.requestCounts.minute.count = 0;
      this.requestCounts.minute.resetTime = now + 60000;
    }

    if (now >= this.requestCounts.hour.resetTime) {
      this.requestCounts.hour.count = 0;
      this.requestCounts.hour.resetTime = now + 3600000;
    }

    if (now >= this.requestCounts.day.resetTime) {
      this.requestCounts.day.count = 0;
      this.requestCounts.day.resetTime = now + 86400000;
    }
  }

  /**
   * Caching logic
   */
  private generateCacheKey(type: string, payload: unknown): string {
    const payloadStr = JSON.stringify(payload);
    return `${type}:${this.hashString(payloadStr)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.data;
  }

  private addToCache(key: string, data: unknown, ttl: number): void {
    this.cache.set(key, {
      key,
      data,
      timestamp: new Date(),
      ttl,
      hitCount: 0,
    });
  }

  private getCacheTTL(type: string): number {
    const ttls = {
      topic: 3600000, // 1 hour
      ideas: 1800000, // 30 minutes
      content: 900000, // 15 minutes
      social: 600000, // 10 minutes
      image: 7200000, // 2 hours
      summary: 1800000, // 30 minutes
      headlines: 1800000, // 30 minutes
      tags: 3600000, // 1 hour
    };

    return ttls[type as keyof typeof ttls] || 900000; // Default 15 minutes
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Utility methods
   */
  private insertByPriority(request: QueuedRequest<any>): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const requestPriority = priorityOrder[request.priority];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const queuePriority = priorityOrder[this.queue[i].priority];
      if (requestPriority < queuePriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, request);
  }

  private getRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);
    const jitter = Math.random() * 0.1 * delay; // 10% jitter
    return delay + jitter;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private startProcessing(): void {
    // Process queue every 5 seconds if there are pending requests
    setInterval(() => {
      if (this.queue.length > 0 && !this.processing) {
        this.processQueue();
      }
    }, 5000);
  }

  /**
   * Public methods for monitoring
   */
  getQueueStatus(): {
    queueLength: number;
    processing: boolean;
    rateLimits: {
      minute: { count: number; resetTime: number };
      hour: { count: number; resetTime: number };
      day: { count: number; resetTime: number };
    };
    circuitBreaker: {
      isOpen: boolean;
      failureCount: number;
      lastFailureTime: number;
      threshold: number;
      timeout: number;
    };
    cacheSize: number;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      rateLimits: this.requestCounts,
      circuitBreaker: this.circuitBreaker,
      cacheSize: this.cache.size,
    };
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = 0;
    console.log('🔄 Circuit breaker reset');
  }
}

// Create singleton instance
const aiRequestQueueService = new AIRequestQueueService();

export { AIRequestQueueService, aiRequestQueueService };
export type { QueuedRequest, RateLimitConfig, CacheEntry };
