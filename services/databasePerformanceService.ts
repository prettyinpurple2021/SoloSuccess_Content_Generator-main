/**
 * Database Performance Optimization Service
 * Provides query optimization, indexing, connection pooling, and performance monitoring
 */

import type { Sql, ParameterOrJSON } from 'postgres';
import { errorHandler } from './errorHandlingService';

// Performance monitoring interface
interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  userId?: string;
  operation: string;
  rowsAffected?: number;
  error?: string;
}

interface DatabasePerformanceMetrics {
  connectionPoolStats: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingConnections: number;
  };
  queryStats: {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: QueryPerformanceMetrics[];
    errorRate: number;
  };
  indexUsage: {
    [tableName: string]: {
      indexName: string;
      usage: number;
      efficiency: number;
    }[];
  };
}

class DatabasePerformanceService {
  private static instance: DatabasePerformanceService;
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second
  private maxMetricsHistory = 1000;
  private performanceAlerts: string[] = [];

  private constructor() {
    this.startPerformanceMonitoring();
  }

  static getInstance(): DatabasePerformanceService {
    if (!DatabasePerformanceService.instance) {
      DatabasePerformanceService.instance = new DatabasePerformanceService();
    }
    return DatabasePerformanceService.instance;
  }

  /**
   * Optimized query builders with proper indexing hints
   */
  getOptimizedPostsQuery(
    userId: string,
    filters?: {
      status?: string;
      campaignId?: string;
      seriesId?: string;
      dateRange?: { start: Date; end: Date };
      limit?: number;
      offset?: number;
    }
  ): { query: string; params: ParameterOrJSON<Record<string, unknown>>[] } {
    let whereConditions = ['user_id = $1'];
    const params: ParameterOrJSON<Record<string, unknown>>[] = [userId];
    let paramIndex = 2;

    // Add filters with proper indexing
    if (filters?.status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.campaignId) {
      whereConditions.push(`campaign_id = $${paramIndex}`);
      params.push(filters.campaignId);
      paramIndex++;
    }

    if (filters?.seriesId) {
      whereConditions.push(`series_id = $${paramIndex}`);
      params.push(filters.seriesId);
      paramIndex++;
    }

    if (filters?.dateRange) {
      whereConditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(filters.dateRange.start, filters.dateRange.end);
      paramIndex += 2;
    }

    const whereClause = whereConditions.join(' AND ');
    const limitClause = filters?.limit ? `LIMIT $${paramIndex}` : '';
    const offsetClause = filters?.offset ? `OFFSET $${paramIndex + (filters?.limit ? 1 : 0)}` : '';

    if (filters?.limit) {
      params.push(filters.limit);
      paramIndex++;
    }
    if (filters?.offset) {
      params.push(filters.offset);
    }

    // Optimized query with index hints
    const query = `
      SELECT 
        id, user_id, topic, idea, content, status, tags, summary, headlines,
        social_media_posts, social_media_tones, social_media_audiences,
        selected_image, schedule_date, brand_voice_id, audience_profile_id,
        campaign_id, series_id, template_id, performance_score,
        optimization_suggestions, image_style_id, created_at, updated_at, posted_at
      FROM posts 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      ${limitClause} ${offsetClause}
    `;

    return { query, params };
  }

  /**
   * Optimized count query for pagination
   */
  getOptimizedCountQuery(
    userId: string,
    filters?: {
      status?: string;
      campaignId?: string;
      seriesId?: string;
      dateRange?: { start: Date; end: Date };
    }
  ): { query: string; params: ParameterOrJSON<Record<string, unknown>>[] } {
    let whereConditions = ['user_id = $1'];
    const params: ParameterOrJSON<Record<string, unknown>>[] = [userId];
    let paramIndex = 2;

    if (filters?.status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.campaignId) {
      whereConditions.push(`campaign_id = $${paramIndex}`);
      params.push(filters.campaignId);
      paramIndex++;
    }

    if (filters?.seriesId) {
      whereConditions.push(`series_id = $${paramIndex}`);
      params.push(filters.seriesId);
      paramIndex++;
    }

    if (filters?.dateRange) {
      whereConditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(filters.dateRange.start, filters.dateRange.end);
      paramIndex += 2;
    }

    const whereClause = whereConditions.join(' AND ');

    // Use COUNT(*) with proper indexing
    const query = `
      SELECT COUNT(*) as total_count
      FROM posts 
      WHERE ${whereClause}
    `;

    return { query, params };
  }

  /**
   * Execute query with performance monitoring
   */
  async executeWithMonitoring<T>(
    pool: Sql<Record<string, unknown>>,
    query: string,
    params: ReadonlyArray<ParameterOrJSON<Record<string, unknown>>>,
    operation: string,
    userId?: string
  ): Promise<T> {
    const startTime = Date.now();
    let error: string | undefined;

    try {
      const result = await pool.unsafe(query, params);
      const executionTime = Date.now() - startTime;

      // Record metrics
      this.recordQueryMetrics({
        query: this.sanitizeQuery(query),
        executionTime,
        timestamp: new Date(),
        userId,
        operation,
        rowsAffected: Array.isArray(result) ? result.length : 1,
      });

      // Check for slow queries
      if (executionTime > this.slowQueryThreshold) {
        this.handleSlowQuery(query, executionTime, operation, userId);
      }

      return result as T;
    } catch (err) {
      const executionTime = Date.now() - startTime;
      error = err instanceof Error ? err.message : String(err);

      // Record error metrics
      this.recordQueryMetrics({
        query: this.sanitizeQuery(query),
        executionTime,
        timestamp: new Date(),
        userId,
        operation,
        error,
      });

      throw err;
    }
  }

  /**
   * Batch operations with transaction optimization
   */
  async executeBatchWithOptimization<T>(
    pool: Sql<Record<string, unknown>>,
    operations: Array<{
      query: string;
      params: ReadonlyArray<ParameterOrJSON<Record<string, unknown>>>;
      operation: string;
    }>,
    userId?: string
  ): Promise<Array<Awaited<T>>> {
    const startTime = Date.now();

    try {
      const results = await pool.begin(async (sql) => {
        const batchResults: Array<Awaited<T>> = [];

        for (const op of operations) {
          const result = await this.executeWithMonitoring<T>(
            sql,
            op.query,
            op.params,
            op.operation,
            userId
          );
          batchResults.push(result);
        }

        return batchResults;
      });

      const totalTime = Date.now() - startTime;

      // Log batch performance
      errorHandler.logError(
        `Batch operation completed: ${operations.length} operations in ${totalTime}ms`,
        undefined,
        {
          operation: 'batch_operation',
          userId,
          operationCount: operations.length,
          totalTime,
        },
        'info'
      );

      return results;
    } catch (error) {
      const totalTime = Date.now() - startTime;

      errorHandler.logError(
        'Batch operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'batch_operation_error',
          userId,
          operationCount: operations.length,
          totalTime,
        }
      );

      throw error;
    }
  }

  /**
   * Database index optimization recommendations
   */
  async analyzeIndexUsage(pool: Sql<Record<string, unknown>>): Promise<{
    recommendations: string[];
    currentIndexes: Array<Record<string, unknown>>;
    missingIndexes: string[];
  }> {
    try {
      // Get current index usage statistics
      const indexStats = await pool`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
      `;

      // Get table statistics
      const tableStats = await pool`
        SELECT 
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          n_tup_ins,
          n_tup_upd,
          n_tup_del
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY seq_scan DESC
      `;

      const recommendations: string[] = [];
      const missingIndexes: string[] = [];

      // Analyze posts table specifically
      const postsTable = tableStats.find((t) => t.tablename === 'posts');
      if (postsTable) {
        const seqScanRatio = postsTable.seq_scan / (postsTable.seq_scan + postsTable.idx_scan || 1);

        if (seqScanRatio > 0.1) {
          // More than 10% sequential scans
          recommendations.push(
            'Posts table has high sequential scan ratio. Consider adding indexes for common query patterns.'
          );
        }

        // Check for missing composite indexes
        const postsIndexes = indexStats.filter((i) => i.tablename === 'posts');
        const hasUserStatusIndex = postsIndexes.some(
          (i) => i.indexname.includes('user_id') && i.indexname.includes('status')
        );

        if (!hasUserStatusIndex) {
          missingIndexes.push(
            'CREATE INDEX CONCURRENTLY idx_posts_user_status ON posts(user_id, status);'
          );
          recommendations.push('Add composite index on (user_id, status) for filtered queries');
        }

        const hasUserDateIndex = postsIndexes.some(
          (i) => i.indexname.includes('user_id') && i.indexname.includes('created_at')
        );

        if (!hasUserDateIndex) {
          missingIndexes.push(
            'CREATE INDEX CONCURRENTLY idx_posts_user_date ON posts(user_id, created_at DESC);'
          );
          recommendations.push(
            'Add composite index on (user_id, created_at) for chronological queries'
          );
        }
      }

      // Check other tables
      for (const table of ['brand_voices', 'audience_profiles', 'campaigns', 'integrations']) {
        const tableData = tableStats.find((t) => t.tablename === table);
        if (tableData) {
          const seqScanRatio = tableData.seq_scan / (tableData.seq_scan + tableData.idx_scan || 1);

          if (seqScanRatio > 0.2) {
            recommendations.push(
              `${table} table has high sequential scan ratio. Review query patterns and indexing.`
            );
          }
        }
      }

      return {
        recommendations,
        currentIndexes: indexStats,
        missingIndexes,
      };
    } catch (error) {
      errorHandler.logError(
        'Failed to analyze index usage',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'index_analysis' }
      );

      return {
        recommendations: ['Unable to analyze index usage due to error'],
        currentIndexes: [],
        missingIndexes: [],
      };
    }
  }

  /**
   * Apply recommended database optimizations
   */
  async applyOptimizations(pool: postgres.Sql): Promise<{
    applied: string[];
    failed: string[];
  }> {
    const applied: string[] = [];
    const failed: string[] = [];

    try {
      const analysis = await this.analyzeIndexUsage(pool);

      // Apply missing indexes
      for (const indexQuery of analysis.missingIndexes) {
        try {
          await pool.unsafe(indexQuery);
          applied.push(indexQuery);

          errorHandler.logError(
            `Applied database optimization: ${indexQuery}`,
            undefined,
            { operation: 'optimization_applied' },
            'info'
          );
        } catch (error) {
          failed.push(`${indexQuery}: ${error instanceof Error ? error.message : String(error)}`);

          errorHandler.logError(
            'Failed to apply database optimization',
            error instanceof Error ? error : new Error(String(error)),
            { operation: 'optimization_failed', query: indexQuery }
          );
        }
      }

      // Update table statistics
      try {
        await pool`ANALYZE posts, brand_voices, audience_profiles, campaigns, integrations`;
        applied.push('Updated table statistics');
      } catch (error) {
        failed.push(
          `Statistics update failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } catch (error) {
      errorHandler.logError(
        'Failed to apply database optimizations',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'apply_optimizations' }
      );
    }

    return { applied, failed };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): DatabasePerformanceMetrics {
    const now = Date.now();
    const recentMetrics = this.queryMetrics.filter(
      (m) => now - m.timestamp.getTime() < 3600000 // Last hour
    );

    const totalQueries = recentMetrics.length;
    const errorQueries = recentMetrics.filter((m) => m.error).length;
    const averageExecutionTime =
      totalQueries > 0
        ? recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries
        : 0;

    const slowQueries = recentMetrics
      .filter((m) => m.executionTime > this.slowQueryThreshold)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      connectionPoolStats: {
        totalConnections: 20, // From pool config
        activeConnections: 0, // Would need pool monitoring
        idleConnections: 0,
        waitingConnections: 0,
      },
      queryStats: {
        totalQueries,
        averageExecutionTime,
        slowQueries,
        errorRate: totalQueries > 0 ? (errorQueries / totalQueries) * 100 : 0,
      },
      indexUsage: {}, // Would be populated from actual analysis
    };
  }

  /**
   * Performance monitoring and alerting
   */
  private startPerformanceMonitoring(): void {
    // Clean up old metrics every 5 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);

    // Performance analysis every 15 minutes
    setInterval(() => {
      this.analyzePerformance();
    }, 900000);
  }

  private recordQueryMetrics(metrics: QueryPerformanceMetrics): void {
    this.queryMetrics.push(metrics);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }
  }

  private handleSlowQuery(
    query: string,
    executionTime: number,
    operation: string,
    userId?: string
  ): void {
    const alert = `Slow query detected: ${operation} took ${executionTime}ms`;
    this.performanceAlerts.push(alert);

    errorHandler.logError(
      alert,
      undefined,
      {
        operation: 'slow_query',
        executionTime,
        query: this.sanitizeQuery(query),
        userId,
      },
      'warn'
    );

    // Keep only recent alerts
    if (this.performanceAlerts.length > 100) {
      this.performanceAlerts = this.performanceAlerts.slice(-100);
    }
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from query for logging
    return query
      .replace(/\$\d+/g, '?') // Replace parameter placeholders
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 200); // Limit length
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - 3600000; // 1 hour ago
    this.queryMetrics = this.queryMetrics.filter((m) => m.timestamp.getTime() > cutoff);
  }

  private analyzePerformance(): void {
    const metrics = this.getPerformanceMetrics();

    // Alert on high error rate
    if (metrics.queryStats.errorRate > 5) {
      errorHandler.logError(
        `High database error rate: ${metrics.queryStats.errorRate.toFixed(2)}%`,
        undefined,
        { operation: 'performance_alert', errorRate: metrics.queryStats.errorRate },
        'warn'
      );
    }

    // Alert on slow average response time
    if (metrics.queryStats.averageExecutionTime > 500) {
      errorHandler.logError(
        `Slow average query time: ${metrics.queryStats.averageExecutionTime.toFixed(2)}ms`,
        undefined,
        { operation: 'performance_alert', avgTime: metrics.queryStats.averageExecutionTime },
        'warn'
      );
    }
  }

  /**
   * Get performance alerts
   */
  getPerformanceAlerts(): string[] {
    return [...this.performanceAlerts];
  }

  /**
   * Clear performance alerts
   */
  clearPerformanceAlerts(): void {
    this.performanceAlerts = [];
  }

  /**
   * Public method to record query metrics (for external use)
   */
  recordMetrics(metrics: QueryPerformanceMetrics): void {
    this.recordQueryMetrics(metrics);
  }
}

// Export singleton instance
export const databasePerformanceService = DatabasePerformanceService.getInstance();
export default databasePerformanceService;
