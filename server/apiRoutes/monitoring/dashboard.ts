import type { ApiRequest, ApiResponse } from '../types';
import { productionMonitoringService } from '../../../services/productionMonitoringService';
import { apiErrorHandler } from '../../../services/apiErrorHandler';
import { errorHandler, ErrorContext } from '../../../services/errorHandlingService';

/**
 * Monitoring Dashboard API
 *
 * Provides real-time monitoring data for production dashboard
 */

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context: ErrorContext = {
    endpoint: '/api/monitoring/dashboard',
    operation: req.method?.toLowerCase(),
  };

  try {
    // Set CORS headers
    apiErrorHandler.addCorsHeaders(res);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    switch (req.method) {
      case 'GET':
        return handleGetDashboard(req, res);
      case 'POST':
        return handlePostMetric(req, res);
      case 'PUT':
        return handleUpdateAlert(req, res);
      case 'DELETE':
        return handleDeleteAlert(req, res);
      default:
        return apiErrorHandler.handleMethodNotAllowed(req, res, ['GET', 'POST', 'PUT', 'DELETE']);
    }
  } catch (error) {
    errorHandler.handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      res
    );
  }
}

async function handleGetDashboard(req: ApiRequest, res: ApiResponse) {
  const { timeWindow } = req.query;
  const windowMs = timeWindow ? parseInt(timeWindow as string) * 1000 : 60 * 60 * 1000; // Default 1 hour

  const dashboardData = productionMonitoringService.getDashboardData();
  const metricsSummary = productionMonitoringService.getMetricsSummary(windowMs);
  const alertHistory = productionMonitoringService.getAlertHistory(20);

  // Add system statistics
  const systemStats = {
    uptime: process.uptime() * 1000,
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    timestamp: Date.now(),
  };

  const response = {
    ...dashboardData,
    metricsSummary,
    alertHistory,
    systemStats,
    timeWindow: windowMs,
  };

  res.status(200).json(response);
}

async function handlePostMetric(req: ApiRequest, res: ApiResponse) {
  const body = req.body as {
    name?: string;
    value?: number;
    tags?: Record<string, string>;
    unit?: string;
  };
  const { name, value, tags, unit } = body;

  if (!name || value === undefined) {
    return res.status(400).json({ error: 'Missing required fields: name, value' });
  }

  productionMonitoringService.recordMetric(name, value, tags, unit);

  res.status(201).json({
    success: true,
    message: 'Metric recorded successfully',
  });
}

async function handleUpdateAlert(req: ApiRequest, res: ApiResponse) {
  const body = req.body as { alertId?: string; action?: string };
  const { alertId, action } = body;

  if (!alertId || !action) {
    return res.status(400).json({ error: 'Missing required fields: alertId, action' });
  }

  if (action === 'resolve') {
    const success = productionMonitoringService.resolveAlert(alertId);
    if (success) {
      res.status(200).json({ success: true, message: 'Alert resolved' });
    } else {
      res.status(404).json({ error: 'Alert not found' });
    }
  } else {
    res.status(400).json({ error: 'Invalid action. Supported actions: resolve' });
  }
}

async function handleDeleteAlert(req: ApiRequest, res: ApiResponse) {
  const { ruleId } = req.query;

  if (!ruleId) {
    return res.status(400).json({ error: 'Missing required parameter: ruleId' });
  }

  const success = productionMonitoringService.deleteAlertRule(ruleId as string);

  if (success) {
    res.status(200).json({ success: true, message: 'Alert rule deleted' });
  } else {
    res.status(404).json({ error: 'Alert rule not found' });
  }
}
