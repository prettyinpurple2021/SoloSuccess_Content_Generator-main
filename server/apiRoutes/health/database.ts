import type { ApiRequest, ApiResponse } from '../types';
/**
 * Database health monitoring API endpoint
 * Provides detailed database health status and metrics
 */

import { enhancedDb } from '../../../services/enhancedDatabaseService';
import { connectionManager } from '../../../services/databaseConnectionManager';
import { migrationService } from '../../../services/databaseMigrationService';
import { apiErrorHandler } from '../../../services/apiErrorHandler';
import { errorHandler } from '../../../services/errorHandlingService';

async function databaseHealthHandler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context = {
    endpoint: '/api/health/database',
    operation: req.method?.toLowerCase(),
  };

  if (req.method === 'GET') {
    try {
      // Get comprehensive health status
      const [basicHealth, connectionStatus, connectionMetrics, schemaValidation, integrityCheck] =
        await Promise.allSettled([
          enhancedDb.performHealthCheck(),
          enhancedDb.getHealthStatus(),
          connectionManager.getDetailedMetrics(),
          migrationService.validateSchema(),
          migrationService.performIntegrityCheck(),
        ]);

      // Determine overall health status
      const isHealthy =
        basicHealth.status === 'fulfilled' &&
        basicHealth.value.database &&
        connectionStatus.status === 'fulfilled' &&
        connectionStatus.value.isHealthy &&
        schemaValidation.status === 'fulfilled' &&
        schemaValidation.value.isValid &&
        integrityCheck.status === 'fulfilled' &&
        integrityCheck.value.passed;

      const healthData = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        checks: {
          database: {
            status: basicHealth.status === 'fulfilled' ? 'passed' : 'failed',
            healthy: basicHealth.status === 'fulfilled' ? basicHealth.value.database : false,
            connectionPool:
              basicHealth.status === 'fulfilled' ? basicHealth.value.connectionPool : false,
            responseTime:
              basicHealth.status === 'fulfilled' ? basicHealth.value.responseTime : null,
            error: basicHealth.status === 'rejected' ? basicHealth.reason?.message : null,
          },
          connection: {
            status: connectionStatus.status === 'fulfilled' ? 'passed' : 'failed',
            isHealthy:
              connectionStatus.status === 'fulfilled' ? connectionStatus.value.isHealthy : false,
            circuitBreakerOpen:
              connectionStatus.status === 'fulfilled'
                ? connectionStatus.value.circuitBreakerOpen
                : null,
            activeTransactions:
              connectionStatus.status === 'fulfilled'
                ? connectionStatus.value.activeTransactions
                : null,
            connectionHealth:
              connectionStatus.status === 'fulfilled' ? connectionStatus.value : null,
            error: connectionStatus.status === 'rejected' ? connectionStatus.reason?.message : null,
          },
          performance: {
            status: connectionMetrics.status === 'fulfilled' ? 'passed' : 'failed',
            metrics: connectionMetrics.status === 'fulfilled' ? connectionMetrics.value : null,
            error:
              connectionMetrics.status === 'rejected' ? connectionMetrics.reason?.message : null,
          },
          schema: {
            status:
              schemaValidation.status === 'fulfilled'
                ? schemaValidation.value.isValid
                  ? 'passed'
                  : 'failed'
                : 'error',
            isValid:
              schemaValidation.status === 'fulfilled' ? schemaValidation.value.isValid : false,
            missingTables:
              schemaValidation.status === 'fulfilled' ? schemaValidation.value.missingTables : [],
            missingColumns:
              schemaValidation.status === 'fulfilled' ? schemaValidation.value.missingColumns : [],
            missingIndexes:
              schemaValidation.status === 'fulfilled' ? schemaValidation.value.missingIndexes : [],
            errors:
              schemaValidation.status === 'fulfilled'
                ? schemaValidation.value.errors
                : schemaValidation.status === 'rejected'
                  ? [schemaValidation.reason?.message]
                  : [],
            warnings:
              schemaValidation.status === 'fulfilled' ? schemaValidation.value.warnings : [],
          },
          integrity: {
            status:
              integrityCheck.status === 'fulfilled'
                ? integrityCheck.value.passed
                  ? 'passed'
                  : 'failed'
                : 'error',
            passed: integrityCheck.status === 'fulfilled' ? integrityCheck.value.passed : false,
            checks: integrityCheck.status === 'fulfilled' ? integrityCheck.value.checks : [],
            error: integrityCheck.status === 'rejected' ? integrityCheck.reason?.message : null,
          },
        },
        summary: {
          overallHealth: isHealthy ? 'healthy' : 'unhealthy',
          criticalIssues: [] as string[],
          warnings: [] as string[],
          recommendations: [] as string[],
        },
      };

      // Add critical issues and recommendations
      if (!healthData.checks.database.healthy) {
        healthData.summary.criticalIssues.push('Database connection failed');
        healthData.summary.recommendations.push('Check database server status and connectivity');
      }

      if (healthData.checks.connection.circuitBreakerOpen) {
        healthData.summary.criticalIssues.push('Database circuit breaker is open');
        healthData.summary.recommendations.push(
          'Wait for circuit breaker to reset or investigate connection issues'
        );
      }

      if (!healthData.checks.schema.isValid) {
        healthData.summary.criticalIssues.push('Database schema validation failed');
        healthData.summary.recommendations.push('Run database migrations to fix schema issues');
      }

      if (!healthData.checks.integrity.passed) {
        healthData.summary.criticalIssues.push('Database integrity check failed');
        healthData.summary.recommendations.push(
          'Investigate data integrity issues and run cleanup procedures'
        );
      }

      // Add performance warnings
      if (connectionMetrics.status === 'fulfilled') {
        const metrics = connectionMetrics.value;
        if (metrics.errorRate > 5) {
          healthData.summary.warnings.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
          healthData.summary.recommendations.push(
            'Investigate database errors and optimize queries'
          );
        }

        if (metrics.averageResponseTime > 1000) {
          healthData.summary.warnings.push(
            `Slow response time: ${metrics.averageResponseTime.toFixed(0)}ms`
          );
          healthData.summary.recommendations.push(
            'Optimize database queries and check server performance'
          );
        }
      }

      // Log health check
      errorHandler.logError(
        `Database health check completed: ${healthData.status}`,
        undefined,
        {
          ...context,
          isHealthy,
          criticalIssues: healthData.summary.criticalIssues.length,
          warnings: healthData.summary.warnings.length,
        },
        isHealthy ? 'info' : 'warn'
      );

      // Set appropriate HTTP status
      const httpStatus = isHealthy ? 200 : 503;

      // Add health status headers
      res.setHeader('X-Health-Status', healthData.status);
      res.setHeader('X-Health-Timestamp', healthData.timestamp.toISOString());

      return res.status(httpStatus).json(healthData);
    } catch (error) {
      errorHandler.logError(
        'Database health check failed',
        error instanceof Error ? error : new Error(String(error)),
        context
      );

      return res.status(500).json({
        status: 'error',
        timestamp: new Date(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (req.method === 'POST') {
    // Force health check refresh
    try {
      const healthCheck = await enhancedDb.performHealthCheck();

      errorHandler.logError(
        'Forced database health check completed',
        undefined,
        { ...context, result: healthCheck },
        'info'
      );

      return res.status(200).json({
        status: 'completed',
        timestamp: new Date(),
        result: healthCheck,
      });
    } catch (error) {
      errorHandler.logError(
        'Forced database health check failed',
        error instanceof Error ? error : new Error(String(error)),
        context
      );

      return res.status(500).json({
        status: 'error',
        timestamp: new Date(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Handle method not allowed
  apiErrorHandler.handleMethodNotAllowed(req, res, ['GET', 'POST']);
}

// Export wrapped handler
export default apiErrorHandler.wrapHandler(databaseHealthHandler, '/api/health/database');
