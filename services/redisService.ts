/**
 * Redis Service for Distributed Caching
 * Supports both Upstash Redis (HTTP-based, serverless-friendly) and traditional Redis (ioredis)
 */

interface RedisConfig {
  url?: string;
  token?: string; // For Upstash
  host?: string;
  port?: number;
  password?: string;
  tls?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

type UpstashRedis = {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: string, options?: { ex?: number }) => Promise<string>;
  del: (key: string | string[]) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
  ping: () => Promise<string>;
};

type IORedis = {
  get: (key: string) => Promise<string | null>;
  setex: (key: string, seconds: number, value: string) => Promise<string>;
  del: (key: string | string[]) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
  scanStream: (options: { match: string; count: number }) => {
    on: (event: string, callback: (data?: string[]) => void) => void;
  };
  ping: () => Promise<string>;
  quit: () => Promise<string>;
};

// Helper to securely check for allowed Upstash hostnames
function isAllowedUpstashHost(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === 'upstash.io' || hostname === 'upstash.com') return true;
  // Allow only direct subdomains (e.g., "eu1.upstash.io", "xyz.upstash.com")
  if (
    hostname.endsWith('.upstash.io') ||
    hostname.endsWith('.upstash.com')
  ) {
    // Only allow single-level and multi-level subdomains (no tricks)
    // Check: ensure left-side label(s) only contain valid hostname characters
    const subdomain = hostname.replace(/\.upstash\.(com|io)$/, '');
    // Subdomain segments, RFC 1035: a-z, A-Z, 0-9, hyphen; cannot start/end with hyphen
    const labels = subdomain.split('.');
    return labels.every(label => /^[a-zA-Z0-9-]+$/.test(label) && !label.startsWith('-') && !label.endsWith('-'));
  }
  return false;
}

class RedisService {
  private client: UpstashRedis | IORedis | null = null;
  private clientType: 'upstash' | 'ioredis' | null = null;
  private isInitialized = false;

  /**
   * Initialize Redis client based on available configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Try Upstash first (best for Vercel/serverless)
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const { Redis } = await import('@upstash/redis');
        this.client = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        this.clientType = 'upstash';
        console.log('Redis: Initialized with Upstash');
      }
      // Try Redis URL (works with both Upstash and standard Redis)
      else if (process.env.REDIS_URL) {
        const redisUrl = process.env.REDIS_URL;

        // Check if it's an Upstash URL (hostname ends with upstash.io or upstash.com, or starts with https://)
        const urlObj = (() => {
          try { return new URL(redisUrl); } catch { return null; }
        })();
        const hostname = urlObj ? urlObj.hostname : '';
        if (
          isAllowedUpstashHost(hostname) ||
          redisUrl.startsWith('https://')
        ) {
          try {
            const { Redis } = await import('@upstash/redis');

            // If it's already an HTTPS URL (Upstash REST endpoint), use directly
            if (redisUrl.startsWith('https://')) {
              // Extract token from URL or use separate token env var
              const urlObj = new URL(redisUrl);
              const token = process.env.UPSTASH_REDIS_REST_TOKEN || urlObj.password;

              if (!token) {
                throw new Error(
                  'Upstash token is required. Set UPSTASH_REDIS_REST_TOKEN or include token in REDIS_URL'
                );
              }

              this.client = new Redis({
                url: redisUrl,
                token: token,
              });
            } else {
              // Parse Upstash URL format: redis://default:token@host:port
              const urlObj = new URL(redisUrl);
              const token = urlObj.password;
              const host = urlObj.hostname;
              const port = urlObj.port || '443';

              this.client = new Redis({
                url: `https://${host}:${port}`,
                token: token,
              });
            }

            this.clientType = 'upstash';
            console.log('Redis: Initialized with Upstash via REDIS_URL');
          } catch (error) {
            console.warn('Redis: Failed to initialize Upstash, trying ioredis:', error);
            // Fall through to ioredis
          }
        }

        // Use ioredis for standard Redis connections
        if (!this.client) {
          const Redis = (await import('ioredis')).default;
          this.client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            retryStrategy: (times: number) => {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
          });
          this.clientType = 'ioredis';
          console.log('Redis: Initialized with ioredis');
        }
      }
      // Try individual connection parameters
      else if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
        const Redis = (await import('ioredis')).default;
        this.client = new Redis({
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT, 10),
          password: process.env.REDIS_PASSWORD,
          tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
          maxRetriesPerRequest: 3,
        });
        this.clientType = 'ioredis';
        console.log('Redis: Initialized with ioredis (connection params)');
      } else {
        console.warn('Redis: No Redis configuration found. Caching will be disabled.');
        return;
      }

      // Test connection
      await this.testConnection();
      this.isInitialized = true;
    } catch (error) {
      console.error('Redis: Initialization failed:', error);
      this.client = null;
      this.clientType = null;
    }
  }

  /**
   * Test Redis connection
   */
  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      if (this.clientType === 'upstash') {
        await this.client.ping();
      } else {
        await this.client.ping();
      }
      console.log('Redis: Connection test successful');
    } catch (error) {
      console.error('Redis: Connection test failed:', error);
      throw error;
    }
  }

  /**
   * Get value from Redis
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) {
      await this.initialize();
      if (!this.client) {
        return null;
      }
    }

    try {
      let value: string | null;

      if (this.clientType === 'upstash') {
        value = await this.client.get(key);
      } else {
        value = await this.client.get(key);
      }

      if (!value) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(value);

      // Check if entry has expired
      if (Date.now() > entry.timestamp + entry.ttl) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Redis: Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in Redis with TTL
   */
  async set<T>(key: string, data: T, ttlSeconds: number): Promise<boolean> {
    if (!this.client) {
      await this.initialize();
      if (!this.client) {
        return false;
      }
    }

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlSeconds * 1000, // Convert to milliseconds
      };

      const value = JSON.stringify(entry);

      if (this.clientType === 'upstash') {
        // Upstash uses milliseconds for TTL
        await this.client.set(key, value, { ex: ttlSeconds });
      } else {
        // ioredis uses seconds for TTL
        await this.client.setex(key, ttlSeconds, value);
      }

      return true;
    } catch (error) {
      console.error(`Redis: Error setting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from Redis
   */
  async delete(key: string): Promise<boolean> {
    if (!this.client) {
      await this.initialize();
      if (!this.client) {
        return false;
      }
    }

    try {
      if (this.clientType === 'upstash') {
        await this.client.del(key);
      } else {
        await this.client.del(key);
      }
      return true;
    } catch (error) {
      console.error(`Redis: Error deleting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.client) {
      await this.initialize();
      if (!this.client) {
        return 0;
      }
    }

    try {
      let deletedCount = 0;

      if (this.clientType === 'upstash') {
        // Upstash doesn't support SCAN directly, so we need to use keys
        // Note: This is not recommended for production with large key sets
        const keys = await this.client.keys(pattern);
        if (keys && keys.length > 0) {
          await this.client.del(...keys);
          deletedCount = keys.length;
        }
      } else {
        // ioredis supports SCAN for better performance
        const stream = this.client.scanStream({
          match: pattern,
          count: 100,
        });

        const keys: string[] = [];
        stream.on('data', (resultKeys: string[]) => {
          keys.push(...resultKeys);
        });

        await new Promise<void>((resolve, reject) => {
          stream.on('end', resolve);
          stream.on('error', reject);
        });

        if (keys.length > 0) {
          await this.client.del(...keys);
          deletedCount = keys.length;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error(`Redis: Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.client !== null && this.isInitialized;
  }

  /**
   * Get or set pattern - fetch data if not in cache
   */
  async getOrSet<T>(key: string, fetchFunction: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFunction();
    await this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        if (this.clientType === 'ioredis') {
          await this.client.quit();
        }
        // Upstash doesn't need explicit closing
        this.client = null;
        this.clientType = null;
        this.isInitialized = false;
      } catch (error) {
        console.error('Redis: Error closing connection:', error);
      }
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();

// Initialize on module load (will be lazy-initialized on first use)
// This ensures it works in serverless environments
if (typeof window === 'undefined') {
  // Only initialize on server-side
  redisService.initialize().catch((error) => {
    console.warn('Redis: Failed to initialize on module load:', error);
  });
}
