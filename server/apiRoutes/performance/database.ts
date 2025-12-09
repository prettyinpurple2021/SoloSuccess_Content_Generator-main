/**
 * Database Performance Monitoring API
 * Provides endpoints for monitoring database performance and applying optimizations
 */

import type { ApiRequest, ApiResponse } from '../types';
import { connectionManager } from '../../../services/databaseConnectionManager';
import { databasePerformanceService } from '../../../services/databasePerformanceService';
import { errorHandler } from '../../../services/errorHandlingService';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const action =
      typeof req.query?.action === 'string'
        ? req.query.action
        : req.query?.action?.[0] || 'metrics';

    if (req.method === 'GET') {
      switch (action) {
        case 'metrics':
          return await getPerformanceMetrics(res);

        case 'health':
          return await getDatabaseHealth(res);

        case 'analysis':
          return await getPerformanceAnalysis(res);

        case 'recommendations':
          return await getOptimizationRecommendations(res);

        case 'alerts':
          return await getPerformanceAlerts(res);

        default:
          return res.status(400).json({ error: 'Invalid action parameter' });
      }
    } else if (req.method === 'POST') {
      switch (action) {
        case 'optimize':
          return await applyOptimizations(res);

        case 'analyze':
          return await analyzeIndexUsage(res);

        case 'cleanup':
          return await cleanupOldData(res);

        case 'reindex':
          return await reindexTables(res);

        default:
          return res.status(400).json({ error: 'Invalid action parameter' });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    errorHandler.logError(
      'Database performance API error',
      error instanceof Error ? error : new Error(String(error)),
      { operation: 'performance_api' }
    );

    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get current performance metrics
 */
async function getPerformanceMetrics(res: ApiResponse) {
  const performanceMetrics = databasePerformanceService.getPerformanceMetrics();
  const connectionMetrics = connectionManager.getDetailedMetrics();
  const poolStatus = connectionManager.getStatus();

  return res.status(200).json({
    success: true,
    data: {
      performance: performanceMetrics,
      connection: connectionMetrics,
      pool: poolStatus,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Get database health status
 */
async function getDatabaseHealth(res: ApiResponse) {
  const healthCheck = await connectionManager.testConnection();
  const poolStatus = connectionManager.getStatus();

  return res.status(200).json({
    success: true,
    data: {
      health: healthCheck,
      pool: poolStatus,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Get performance analysis and index usage
 */
async function getPerformanceAnalysis(res: ApiResponse) {
  const pool = connectionManager.getPool();
  const analysis = await databasePerformanceService.analyzeIndexUsage(pool);

  return res.status(200).json({
    success: true,
    data: {
      analysis,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Get optimization recommendations
 */
async function getOptimizationRecommendations(res: ApiResponse) {
  // Get performance recommendations from database
  const recommendations = await connectionManager.executeOptimizedQuery(
    'SELECT * FROM get_performance_recommendations()',
    [],
    'get_recommendations'
  );

  // Get performance health check
  const healthCheck = await connectionManager.executeOptimizedQuery(
    'SELECT * FROM performance_health_check()',
    [],
    'health_check'
  );

  return res.status(200).json({
    success: true,
    data: {
      recommendations,
      healthCheck,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Get performance alerts
 */
async function getPerformanceAlerts(res: ApiResponse) {
  const alerts = databasePerformanceService.getPerformanceAlerts();

  return res.status(200).json({
    success: true,
    data: {
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Apply database optimizations
 */
async function applyOptimizations(res: ApiResponse) {
  const pool = connectionManager.getPool();
  const result = await databasePerformanceService.applyOptimizations(pool);

  return res.status(200).json({
    success: true,
    data: {
      applied: result.applied,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Analyze index usage
 */
async function analyzeIndexUsage(res: ApiResponse) {
  const pool = connectionManager.getPool();
  const analysis = await databasePerformanceService.analyzeIndexUsage(pool);

  return res.status(200).json({
    success: true,
    data: {
      analysis,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Clean up old data
 */
async function cleanupOldData(res: ApiResponse) {
  const result = (await connectionManager.executeOptimizedQuery(
    'SELECT cleanup_old_analytics_data($1)',
    [90], // Keep 90 days of data
    'cleanup_old_data'
  )) as Array<{ cleanup_old_analytics_data?: string }>;

  return res.status(200).json({
    success: true,
    data: {
      result: result[0]?.cleanup_old_analytics_data || 'Cleanup completed',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Reindex performance critical tables
 */
async function reindexTables(res: ApiResponse) {
  const result = (await connectionManager.executeOptimizedQuery(
    'SELECT reindex_performance_critical_tables()',
    [],
    'reindex_tables'
  )) as Array<{ reindex_performance_critical_tables?: string }>;

  return res.status(200).json({
    success: true,
    data: {
      result: result[0]?.reindex_performance_critical_tables || 'Reindex completed',
      timestamp: new Date().toISOString(),
    },
  });
}
