// services/utils/rateLimiter.ts

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit?: number;
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
  retryAfter?: number;
}

export class RateLimiter {
  private static limits: Map<string, RateLimitConfig> = new Map();
  private static usage: Map<
    string,
    {
      minute: { count: number; resetTime: number };
      hour: { count: number; resetTime: number };
      day: { count: number; resetTime: number };
    }
  > = new Map();

  /**
   * Configure rate limits for a service
   */
  static configureLimits(service: string, config: RateLimitConfig): void {
    this.limits.set(service, config);
  }

  /**
   * Check if a request is allowed
   */
  static async checkLimit(service: string, userId?: string): Promise<RateLimitInfo> {
    const key = userId ? `${service}:${userId}` : service;
    const config = this.limits.get(service);

    if (!config) {
      return {
        remaining: Number.MAX_SAFE_INTEGER,
        resetTime: Date.now() + 60000,
        limit: Number.MAX_SAFE_INTEGER,
      };
    }

    const now = Date.now();
    const usage = this.usage.get(key) || {
      minute: { count: 0, resetTime: now + 60000 },
      hour: { count: 0, resetTime: now + 3600000 },
      day: { count: 0, resetTime: now + 86400000 },
    };

    // Reset counters if time windows have passed
    if (now >= usage.minute.resetTime) {
      usage.minute = { count: 0, resetTime: now + 60000 };
    }
    if (now >= usage.hour.resetTime) {
      usage.hour = { count: 0, resetTime: now + 3600000 };
    }
    if (now >= usage.day.resetTime) {
      usage.day = { count: 0, resetTime: now + 86400000 };
    }

    // Check limits
    const minuteLimit = config.requestsPerMinute;
    const hourLimit = config.requestsPerHour;
    const dayLimit = config.requestsPerDay;

    if (usage.minute.count >= minuteLimit) {
      return {
        remaining: 0,
        resetTime: usage.minute.resetTime,
        limit: minuteLimit,
        retryAfter: Math.ceil((usage.minute.resetTime - now) / 1000),
      };
    }

    if (usage.hour.count >= hourLimit) {
      return {
        remaining: 0,
        resetTime: usage.hour.resetTime,
        limit: hourLimit,
        retryAfter: Math.ceil((usage.hour.resetTime - now) / 1000),
      };
    }

    if (usage.day.count >= dayLimit) {
      return {
        remaining: 0,
        resetTime: usage.day.resetTime,
        limit: dayLimit,
        retryAfter: Math.ceil((usage.day.resetTime - now) / 1000),
      };
    }

    // Update usage
    usage.minute.count++;
    usage.hour.count++;
    usage.day.count++;
    this.usage.set(key, usage);

    return {
      remaining: Math.min(
        minuteLimit - usage.minute.count,
        hourLimit - usage.hour.count,
        dayLimit - usage.day.count
      ),
      resetTime: Math.min(usage.minute.resetTime, usage.hour.resetTime, usage.day.resetTime),
      limit: Math.min(minuteLimit, hourLimit, dayLimit),
    };
  }

  /**
   * Wait for rate limit reset
   */
  static async waitForReset(service: string, userId?: string): Promise<void> {
    const rateLimitInfo = await this.checkLimit(service, userId);

    if (rateLimitInfo.retryAfter && rateLimitInfo.retryAfter > 0) {
      console.log(
        `Rate limit exceeded for ${service}, waiting ${rateLimitInfo.retryAfter} seconds`
      );
      await this.sleep(rateLimitInfo.retryAfter * 1000);
    }
  }

  /**
   * Execute a function with rate limiting
   */
  static async executeWithRateLimit<T>(
    service: string,
    fn: () => Promise<T>,
    userId?: string
  ): Promise<T> {
    await this.waitForReset(service, userId);
    return fn();
  }

  /**
   * Get current usage for a service
   */
  static getUsage(
    service: string,
    userId?: string
  ): {
    minute: { count: number; limit: number; remaining: number };
    hour: { count: number; limit: number; remaining: number };
    day: { count: number; limit: number; remaining: number };
  } {
    const key = userId ? `${service}:${userId}` : service;
    const config = this.limits.get(service);
    const usage = this.usage.get(key);

    if (!config || !usage) {
      return {
        minute: { count: 0, limit: 0, remaining: 0 },
        hour: { count: 0, limit: 0, remaining: 0 },
        day: { count: 0, limit: 0, remaining: 0 },
      };
    }

    return {
      minute: {
        count: usage.minute.count,
        limit: config.requestsPerMinute,
        remaining: Math.max(0, config.requestsPerMinute - usage.minute.count),
      },
      hour: {
        count: usage.hour.count,
        limit: config.requestsPerHour,
        remaining: Math.max(0, config.requestsPerHour - usage.hour.count),
      },
      day: {
        count: usage.day.count,
        limit: config.requestsPerDay,
        remaining: Math.max(0, config.requestsPerDay - usage.day.count),
      },
    };
  }

  /**
   * Reset usage for a service
   */
  static resetUsage(service: string, userId?: string): void {
    const key = userId ? `${service}:${userId}` : service;
    this.usage.delete(key);
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Pre-configured rate limits for common services
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  twitter: {
    requestsPerMinute: 15,
    requestsPerHour: 300,
    requestsPerDay: 1000,
  },
  linkedin: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 500,
  },
  facebook: {
    requestsPerMinute: 20,
    requestsPerHour: 200,
    requestsPerDay: 1000,
  },
  instagram: {
    requestsPerMinute: 20,
    requestsPerHour: 200,
    requestsPerDay: 1000,
  },
  reddit: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
  },
  pinterest: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 1000,
  },
  bluesky: {
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
  },
  google_analytics: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 1000,
  },
  openai: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
  },
  claude: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
  },
};

// Initialize default rate limits
Object.entries(DEFAULT_RATE_LIMITS).forEach(([service, config]) => {
  RateLimiter.configureLimits(service, config);
});

export default RateLimiter;
