/**
 * Database connection manager with advanced pooling, monitoring, and recovery
 * Handles connection lifecycle, health monitoring, and automatic recovery
 */

import postgres, { Sql, ParameterOrJSON } from 'postgres';
import { errorHandler } from './errorHandlingService';
import { databasePerformanceService } from './databasePerformanceService';

export interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeout?: number;
  connectTimeout?: number;
  maxLifetime?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  totalQueries: number;
  failedQueries: number;
  averageResponseTime: number;
  lastError?: Error;
  lastErrorTime?: Date;
  uptime: number;
  connectionErrors: number;
}

export interface PoolStatus {
  isHealthy: boolean;
  metrics: ConnectionMetrics;
  lastHealthCheck: Date;
  nextHealthCheck: Date;
}

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private pool: Sql<Record<string, unknown>> | null = null;
  private config: ConnectionConfig;
  private metrics: ConnectionMetrics;
  private startTime: Date;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds

  private constructor() {
    this.startTime = new Date();
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      totalQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      uptime: 0,
      connectionErrors: 0,
    };
    this.config = this.loadConfiguration();
    this.initializePool();
    this.startHealthMonitoring();
  }

  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  /**
   * Gets the database connection pool
   */
  getPool(): Sql<Record<string, unknown>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }

  /**
   * Executes a query with connection management and metrics tracking
   */
  async executeQuery<T>(
    queryFn: (sql: Sql<Record<string, unknown>>) => Promise<T>,
    context?: { operation?: string; userId?: string }
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalQueries++;

    try {
      // Check if pool is available
      if (!this.pool) {
        await this.reconnect();
      }

      const pool = this.getPool();
      const result = await queryFn(pool);

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeMetrics(responseTime);

      // Track performance metrics
      if (context?.operation) {
        databasePerformanceService.recordMetrics({
          query: context.operation,
          executionTime: responseTime,
          timestamp: new Date(),
          userId: context.userId,
          operation: context.operation,
          rowsAffected: Array.isArray(result) ? result.length : 1,
        });
      }

      return result;
    } catch (error) {
      this.metrics.failedQueries++;

      // Handle connection errors
      if (this.isConnectionError(error)) {
        this.metrics.connectionErrors++;
        await this.handleConnectionError(error, context);
      }

      // Track error metrics
      if (context?.operation) {
        databasePerformanceService.recordMetrics({
          query: context.operation,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context?.userId,
          operation: context.operation,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      errorHandler.logError(
        'Database query failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: context?.operation || 'unknown',
          userId: context?.userId,
          responseTime: Date.now() - startTime,
        }
      );

      throw error;
    }
  }

  /**
   * Executes an optimized query with performance monitoring
   */
  async executeOptimizedQuery<T>(
    query: string,
    params: ReadonlyArray<ParameterOrJSON<Record<string, unknown>>>,
    operation: string,
    userId?: string
  ): Promise<T> {
    return await databasePerformanceService.executeWithMonitoring<T>(
      this.getPool(),
      query,
      params,
      operation,
      userId
    );
  }

  /**
   * Executes batch operations with transaction optimization
   */
  async executeBatch<T>(
    operations: Array<{
      query: string;
      params: ReadonlyArray<ParameterOrJSON<Record<string, unknown>>>;
      operation: string;
    }>,
    userId?: string
  ): Promise<Array<Awaited<T>>> {
    return await databasePerformanceService.executeBatchWithOptimization<T>(
      this.getPool(),
      operations,
      userId
    );
  }

  /**
   * Tests the database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        return false;
      }

      const pool = this.getPool();
      await pool`SELECT 1 as test`;
      return true;
    } catch (error) {
      errorHandler.logError(
        'Database connection test failed',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'connection_test' }
      );
      return false;
    }
  }

  /**
   * Gets current pool status and metrics
   */
  getStatus(): PoolStatus {
    const now = new Date();
    this.metrics.uptime = now.getTime() - this.startTime.getTime();

    return {
      isHealthy: this.pool !== null && this.reconnectAttempts === 0,
      metrics: { ...this.metrics },
      lastHealthCheck: new Date(),
      nextHealthCheck: new Date(Date.now() + 30000), // 30 seconds
    };
  }

  /**
   * Forces a connection pool refresh
   */
  async refreshPool(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
      }

      this.initializePool();

      errorHandler.logError(
        'Database connection pool refreshed',
        undefined,
        { operation: 'pool_refresh' },
        'info'
      );
    } catch (error) {
      errorHandler.logError(
        'Failed to refresh database connection pool',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'pool_refresh' }
      );
      throw error;
    }
  }

  /**
   * Gracefully shuts down the connection manager
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Close connection pool
    if (this.pool) {
      try {
        await this.pool.end();
        this.pool = null;

        errorHandler.logError(
          'Database connection manager shut down successfully',
          undefined,
          { operation: 'shutdown' },
          'info'
        );
      } catch (error) {
        errorHandler.logError(
          'Error during database connection manager shutdown',
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'shutdown' }
        );
      }
    }
  }

  /**
   * Gets detailed connection metrics
   */
  getDetailedMetrics(): ConnectionMetrics & {
    successRate: number;
    errorRate: number;
    uptimeHours: number;
    queriesPerSecond: number;
  } {
    const uptime = Date.now() - this.startTime.getTime();
    const uptimeSeconds = uptime / 1000;

    return {
      ...this.metrics,
      successRate:
        this.metrics.totalQueries > 0
          ? ((this.metrics.totalQueries - this.metrics.failedQueries) / this.metrics.totalQueries) *
            100
          : 100,
      errorRate:
        this.metrics.totalQueries > 0
          ? (this.metrics.failedQueries / this.metrics.totalQueries) * 100
          : 0,
      uptimeHours: uptime / (1000 * 60 * 60),
      queriesPerSecond: uptimeSeconds > 0 ? this.metrics.totalQueries / uptimeSeconds : 0,
    };
  }

  private loadConfiguration(): ConnectionConfig {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    return {
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
      connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10'),
      maxLifetime: parseInt(process.env.DB_MAX_LIFETIME || '1800'), // 30 minutes
      retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000'),
    };
  }

  private initializePool(): void {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    try {
      this.pool = postgres(connectionString, {
        ssl: { rejectUnauthorized: false },
        max: this.config.maxConnections || 20,
        idle_timeout: this.config.idleTimeout || 30,
        connect_timeout: this.config.connectTimeout || 10,
        max_lifetime: (this.config.maxLifetime || 1800) * 60, // Convert to seconds
        onnotice: (notice) => {
          errorHandler.logError(
            `Database notice: ${notice.message}`,
            undefined,
            { operation: 'database_notice' },
            'info'
          );
        },
        onparameter: (key, value) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Database parameter ${key}: ${value}`);
          }
        },
        transform: {
          undefined: null, // Transform undefined to null for PostgreSQL
        },
      });

      this.metrics.totalConnections++;
      this.reconnectAttempts = 0;

      errorHandler.logError(
        'Database connection pool initialized successfully',
        undefined,
        {
          operation: 'pool_init',
          maxConnections: this.config.maxConnections,
          idleTimeout: this.config.idleTimeout,
        },
        'info'
      );
    } catch (error) {
      this.metrics.connectionErrors++;

      errorHandler.logError(
        'Failed to initialize database connection pool',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'pool_init' }
      );

      throw error;
    }
  }

  private startHealthMonitoring(): void {
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      if (this.isShuttingDown) {
        return;
      }

      try {
        const isHealthy = await this.testConnection();

        if (!isHealthy && this.reconnectAttempts < this.maxReconnectAttempts) {
          errorHandler.logError(
            'Health check failed, attempting reconnection',
            undefined,
            {
              operation: 'health_check',
              reconnectAttempts: this.reconnectAttempts,
            },
            'warn'
          );

          await this.reconnect();
        }
      } catch (error) {
        errorHandler.logError(
          'Health check error',
          error instanceof Error ? error : new Error(String(error)),
          { operation: 'health_check' },
          'warn'
        );
      }
    }, 30000);
  }

  private async reconnect(): Promise<void> {
    if (this.isShuttingDown || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;

    try {
      // Close existing pool if it exists
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }

      // Wait before reconnecting
      await this.sleep(this.reconnectDelay * this.reconnectAttempts);

      // Initialize new pool
      this.initializePool();

      // Test the new connection
      const isHealthy = await this.testConnection();

      if (isHealthy) {
        this.reconnectAttempts = 0;

        errorHandler.logError(
          'Database reconnection successful',
          undefined,
          { operation: 'reconnect' },
          'info'
        );
      } else {
        throw new Error('Connection test failed after reconnection');
      }
    } catch (error) {
      this.metrics.connectionErrors++;

      errorHandler.logError(
        `Database reconnection attempt ${this.reconnectAttempts} failed`,
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'reconnect',
          attempt: this.reconnectAttempts,
          maxAttempts: this.maxReconnectAttempts,
        }
      );

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        errorHandler.logError(
          'Maximum reconnection attempts reached, database unavailable',
          undefined,
          { operation: 'reconnect_failed' }
        );
      }
    }
  }

  private async handleConnectionError(
    error: unknown,
    _context?: Record<string, unknown>
  ): Promise<void> {
    this.metrics.lastError = error instanceof Error ? error : new Error(String(error));
    this.metrics.lastErrorTime = new Date();

    // Attempt reconnection if not already in progress
    if (this.reconnectAttempts === 0) {
      await this.reconnect();
    }
  }

  private isConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const errorMessage = error.message.toLowerCase();
    const connectionErrorKeywords = [
      'connection',
      'connect',
      'timeout',
      'network',
      'econnrefused',
      'enotfound',
      'etimedout',
    ];

    return connectionErrorKeywords.some((keyword) => errorMessage.includes(keyword));
  }

  private updateResponseTimeMetrics(responseTime: number): void {
    // Calculate rolling average response time
    const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.totalQueries - 1);
    this.metrics.averageResponseTime =
      (totalResponseTime + responseTime) / this.metrics.totalQueries;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const connectionManager = DatabaseConnectionManager.getInstance();
