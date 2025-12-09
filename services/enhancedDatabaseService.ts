/**
 * Enhanced Database Service
 *
 * Production-quality solution for database connection management
 * with advanced pooling, monitoring, and failover capabilities.
 */

import postgres from 'postgres';

interface ConnectionPoolConfig {
  max: number;
  min: number;
  idle_timeout: number;
  connect_timeout: number;
  prepare: boolean;
  types: Record<string, unknown>;
  onnotice?: (notice: postgres.Notice) => void;
  debug?: boolean;
}

interface HealthMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  averageQueryTime: number;
  errorRate: number;
  lastError?: string;
  uptime: number;
}

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

class EnhancedDatabaseService {
  private pool: postgres.Sql | null = null;
  private readOnlyPool: postgres.Sql | null = null;
  private config: ConnectionPoolConfig;
  private metrics: HealthMetrics;
  private queryHistory: QueryMetrics[] = [];
  private connectionAttempts = 0;
  private maxConnectionAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private isConnected = false;
  private startTime = Date.now();
  private circuitBreaker = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    threshold: 10,
    timeout: 60000, // 1 minute
  };

  constructor() {
    this.config = {
      max: 20, // Maximum connections
      min: 2, // Minimum connections to maintain
      idle_timeout: 30, // 30 seconds
      connect_timeout: 10, // 10 seconds
      prepare: true, // Use prepared statements
      types: {
        // Custom type parsers if needed
      },
      onnotice: (notice) => {
        console.log('Database notice:', notice);
      },
      debug: process.env.NODE_ENV === 'development',
    };

    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      averageQueryTime: 0,
      errorRate: 0,
      uptime: 0,
    };

    this.initialize();
  }

  /**
   * Initialize database connections with retry logic
   */
  private async initialize(): Promise<void> {
    try {
      await this.connect();
      this.setupHealthMonitoring();
      this.setupConnectionRecovery();
    } catch (error) {
      console.error('Failed to initialize database service:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Establish database connections with advanced configuration
   */
  private async connect(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    try {
      console.log('🔌 Connecting to database...');

      // Primary connection pool
      this.pool = postgres(process.env.DATABASE_URL, {
        ...this.config,
        connection: {
          application_name: 'solosuccess_primary',
        },
        ssl: { rejectUnauthorized: false },
        transform: {
          undefined: null, // Transform undefined to null
        },
      });

      // Read-only connection pool (for read replicas if available)
      const readOnlyUrl = process.env.DATABASE_READ_URL || process.env.DATABASE_URL;
      this.readOnlyPool = postgres(readOnlyUrl, {
        ...this.config,
        max: Math.ceil(this.config.max * 0.6), // 60% of max for read-only
        connection: {
          application_name: 'solosuccess_readonly',
        },
        ssl: { rejectUnauthorized: false },
      });

      // Test connections
      await this.testConnection();

      this.isConnected = true;
      this.connectionAttempts = 0;
      this.reconnectDelay = 1000; // Reset delay
      this.circuitBreaker.failureCount = 0;

      console.log('✅ Database connected successfully');
    } catch (error) {
      this.isConnected = false;
      this.connectionAttempts++;

      console.error(`❌ Database connection failed (attempt ${this.connectionAttempts}):`, error);

      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        this.circuitBreaker.isOpen = true;
        this.circuitBreaker.lastFailureTime = Date.now();
        throw new Error(
          `Failed to connect to database after ${this.maxConnectionAttempts} attempts`
        );
      }

      throw error;
    }
  }

  /**
   * Test database connection health
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }

      const result = await this.pool`SELECT 1 as test, NOW() as timestamp`;

      if (result.length > 0 && result[0].test === 1) {
        return true;
      }

      throw new Error('Invalid test query result');
    } catch (error) {
      console.error('Database connection test failed:', error);
      throw error;
    }
  }

  /**
   * Execute query with connection management and monitoring
   */
  async executeQuery<T = unknown[]>(query: TemplateStringsArray, ...params: unknown[]): Promise<T> {
    return this.executeWithErrorHandling(async () => {
      if (!this.pool) {
        throw new Error('Database not connected');
      }

      if (this.circuitBreaker.isOpen) {
        const timeSinceFailure = Date.now() - this.circuitBreaker.lastFailureTime;
        if (timeSinceFailure < this.circuitBreaker.timeout) {
          throw new Error('Database circuit breaker is open. Service temporarily unavailable.');
        } else {
          // Try to reset circuit breaker
          this.circuitBreaker.isOpen = false;
          this.circuitBreaker.failureCount = 0;
        }
      }

      const startTime = Date.now();
      const queryString = this.formatQuery(query, params);

      try {
        const result = await this.pool(query, ...params);

        const duration = Date.now() - startTime;
        this.recordQueryMetrics(queryString, duration, true);

        return result as T;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordQueryMetrics(queryString, duration, false, error);

        // Update circuit breaker
        this.circuitBreaker.failureCount++;
        if (this.circuitBreaker.failureCount >= this.circuitBreaker.threshold) {
          this.circuitBreaker.isOpen = true;
          this.circuitBreaker.lastFailureTime = Date.now();
          console.log('🚨 Database circuit breaker opened');
        }

        throw error;
      }
    });
  }

  /**
   * Execute read-only query (uses read replica if available)
   */
  async executeReadQuery<T = unknown[]>(
    query: TemplateStringsArray,
    ...params: unknown[]
  ): Promise<T> {
    return this.executeWithErrorHandling(async () => {
      const pool = this.readOnlyPool || this.pool;

      if (!pool) {
        throw new Error('Database not connected');
      }

      const startTime = Date.now();
      const queryString = this.formatQuery(query, params);

      try {
        const result = await pool(query, ...params);

        const duration = Date.now() - startTime;
        this.recordQueryMetrics(`[READ] ${queryString}`, duration, true);

        return result as T;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordQueryMetrics(`[READ] ${queryString}`, duration, false, error);
        throw error;
      }
    });
  }

  /**
   * Execute transaction with automatic retry
   */
  async executeTransaction<T>(callback: (sql: postgres.Sql) => Promise<T>): Promise<T> {
    return this.executeWithErrorHandling(async () => {
      if (!this.pool) {
        throw new Error('Database not connected');
      }

      const startTime = Date.now();

      try {
        const result = await this.pool.begin(callback);

        const duration = Date.now() - startTime;
        this.recordQueryMetrics('[TRANSACTION]', duration, true);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordQueryMetrics('[TRANSACTION]', duration, false, error);
        throw error;
      }
    });
  }

  /**
   * Execute with comprehensive error handling and retry logic
   */
  private async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if error is recoverable
        if (this.isRecoverableError(error)) {
          if (attempt < maxRetries) {
            const delay = this.getRetryDelay(attempt);
            console.log(
              `🔄 Retrying database operation in ${delay}ms (attempt ${attempt}/${maxRetries})`
            );
            await this.sleep(delay);

            // Try to reconnect if connection was lost
            if (this.isConnectionError(error)) {
              await this.handleConnectionError();
            }

            continue;
          }
        }

        // Non-recoverable error or max retries reached
        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * Handle connection errors with automatic recovery
   */
  private async handleConnectionError(): Promise<void> {
    console.log('🔄 Attempting to recover database connection...');

    try {
      this.isConnected = false;

      // Close existing connections
      if (this.pool) {
        await this.pool.end();
      }
      if (this.readOnlyPool) {
        await this.readOnlyPool.end();
      }

      // Reconnect
      await this.connect();
    } catch (error) {
      console.error('Failed to recover database connection:', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Schedule automatic reconnection
   */
  private scheduleReconnect(): void {
    const delay = Math.min(this.reconnectDelay, this.maxReconnectDelay);

    console.log(`⏰ Scheduling database reconnection in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Setup health monitoring
   */
  private setupHealthMonitoring(): void {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateHealthMetrics();
    }, 30000);

    // Cleanup old query history every 5 minutes
    setInterval(() => {
      this.cleanupQueryHistory();
    }, 300000);
  }

  /**
   * Setup connection recovery monitoring
   */
  private setupConnectionRecovery(): void {
    // Check connection health every minute
    setInterval(async () => {
      if (this.isConnected) {
        try {
          await this.testConnection();
        } catch (error) {
          console.error('Health check failed, attempting recovery:', error);
          await this.handleConnectionError();
        }
      }
    }, 60000);
  }

  /**
   * Update health metrics
   */
  private updateHealthMetrics(): void {
    const now = Date.now();
    const recentQueries = this.queryHistory.filter(
      (q) => now - q.timestamp.getTime() < 300000 // Last 5 minutes
    );

    const totalQueries = recentQueries.length;
    const failedQueries = recentQueries.filter((q) => !q.success).length;
    const totalDuration = recentQueries.reduce((sum, q) => sum + q.duration, 0);

    this.metrics = {
      ...this.metrics,
      totalQueries: this.queryHistory.length,
      averageQueryTime: totalQueries > 0 ? totalDuration / totalQueries : 0,
      errorRate: totalQueries > 0 ? failedQueries / totalQueries : 0,
      uptime: now - this.startTime,
    };

    // Log metrics if error rate is high
    if (this.metrics.errorRate > 0.1) {
      // 10% error rate
      console.warn(`⚠️ High database error rate: ${(this.metrics.errorRate * 100).toFixed(1)}%`);
    }
  }

  /**
   * Record query metrics
   */
  private recordQueryMetrics(
    query: string,
    duration: number,
    success: boolean,
    error?: unknown
  ): void {
    const metric: QueryMetrics = {
      query: query.substring(0, 100), // Truncate long queries
      duration,
      timestamp: new Date(),
      success,
      error: error instanceof Error ? error.message : undefined,
    };

    this.queryHistory.push(metric);

    // Log slow queries
    if (duration > 5000) {
      // 5 seconds
      console.warn(`🐌 Slow query detected (${duration}ms): ${metric.query}`);
    }
  }

  /**
   * Cleanup old query history
   */
  private cleanupQueryHistory(): void {
    const cutoff = Date.now() - 3600000; // 1 hour
    const initialLength = this.queryHistory.length;

    this.queryHistory = this.queryHistory.filter((q) => q.timestamp.getTime() > cutoff);

    const cleaned = initialLength - this.queryHistory.length;
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old query metrics`);
    }
  }

  /**
   * Utility methods
   */
  private formatQuery(query: TemplateStringsArray, params: unknown[]): string {
    let formatted = query[0];
    for (let i = 0; i < params.length; i++) {
      formatted += `$${i + 1}${query[i + 1]}`;
    }
    return formatted;
  }

  private isRecoverableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const recoverableErrors = [
      'connection terminated',
      'connection closed',
      'connection timeout',
      'connection refused',
      'network error',
      'temporary failure',
      'deadlock detected',
    ];

    return recoverableErrors.some((pattern) => error.message.toLowerCase().includes(pattern));
  }

  private isConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const connectionErrors = [
      'connection terminated',
      'connection closed',
      'connection refused',
      'network error',
    ];

    return connectionErrors.some((pattern) => error.message.toLowerCase().includes(pattern));
  }

  private getRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    const jitter = Math.random() * 0.1 * delay; // 10% jitter
    return delay + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Public methods
   */
  getHealthMetrics(): HealthMetrics {
    this.updateHealthMetrics();
    return { ...this.metrics };
  }

  getConnectionStatus(): {
    isConnected: boolean;
    circuitBreakerOpen: boolean;
    connectionAttempts: number;
    uptime: number;
  } {
    return {
      isConnected: this.isConnected,
      circuitBreakerOpen: this.circuitBreaker.isOpen,
      connectionAttempts: this.connectionAttempts,
      uptime: Date.now() - this.startTime,
    };
  }

  getRecentQueries(limit = 10): QueryMetrics[] {
    return this.queryHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async forceReconnect(): Promise<void> {
    console.log('🔄 Forcing database reconnection...');
    await this.handleConnectionError();
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = 0;
    console.log('🔄 Database circuit breaker reset');
  }

  /**
   * Perform health check (alias for testConnection)
   */
  async performHealthCheck(): Promise<{
    database: boolean;
    connectionPool: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    const isHealthy = await this.testConnection();
    const responseTime = Date.now() - startTime;

    return {
      database: isHealthy,
      connectionPool: this.isConnected && !this.circuitBreaker.isOpen,
      responseTime,
    };
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    metrics: HealthMetrics;
    connectionStatus: {
      isConnected: boolean;
      circuitBreakerOpen: boolean;
      connectionAttempts: number;
      uptime: number;
    };
    activeTransactions?: number;
    circuitBreakerOpen?: boolean;
  }> {
    const isHealthy = await this.testConnection();
    const connectionStatus = this.getConnectionStatus();
    return {
      isHealthy,
      metrics: this.getHealthMetrics(),
      connectionStatus,
      activeTransactions: 0, // Not tracked in this implementation
      circuitBreakerOpen: connectionStatus.circuitBreakerOpen,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down database connections...');

    try {
      if (this.pool) {
        await this.pool.end();
      }
      if (this.readOnlyPool) {
        await this.readOnlyPool.end();
      }

      this.isConnected = false;
      console.log('✅ Database connections closed gracefully');
    } catch (error) {
      console.error('Error during database shutdown:', error);
    }
  }
}

// Create singleton instance
const enhancedDatabaseService = new EnhancedDatabaseService();
const enhancedDb = enhancedDatabaseService;

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => enhancedDatabaseService.shutdown());
  process.on('SIGINT', () => enhancedDatabaseService.shutdown());
}

export { EnhancedDatabaseService, enhancedDatabaseService, enhancedDb };
export type { ConnectionPoolConfig, HealthMetrics, QueryMetrics };
