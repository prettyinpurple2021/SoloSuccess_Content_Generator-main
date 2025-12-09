import type { ApiRequest, ApiResponse } from '../types';
import { productionMonitoringService } from '../../../services/productionMonitoringService';
import { apiErrorHandler } from '../../../services/apiErrorHandler';
import { errorHandler, ErrorContext } from '../../../services/errorHandlingService';

/**
 * Metrics Collection API
 *
 * Collects and processes various application metrics for monitoring
 */

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context: ErrorContext = {
    endpoint: '/api/monitoring/metrics',
    operation: req.method?.toLowerCase(),
  };

  try {
    // Set CORS headers
    apiErrorHandler.addCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return apiErrorHandler.handleMethodNotAllowed(req, res, ['POST']);
    }

    const body = req.body as { type?: string; data?: unknown };
    const { type, data } = body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Missing required fields: type, data' });
    }

    switch (type) {
      case 'web-vitals':
        handleWebVitalsMetrics(data as any);
        break;
      case 'api-performance':
        handleApiPerformanceMetrics(data as any);
        break;
      case 'database-performance':
        handleDatabasePerformanceMetrics(data as any);
        break;
      case 'ai-service-performance':
        handleAIServicePerformanceMetrics(data as any);
        break;
      case 'integration-performance':
        handleIntegrationPerformanceMetrics(data as any);
        break;
      case 'error':
        handleErrorMetrics(data as any);
        break;
      case 'custom':
        handleCustomMetrics(data as any);
        break;
      default:
        return res.status(400).json({ error: `Unknown metric type: ${type}` });
    }

    res.status(200).json({ success: true, message: 'Metrics recorded successfully' });
  } catch (error) {
    errorHandler.handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      res
    );
  }
}

function handleWebVitalsMetrics(data: {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: string;
  pathname?: string;
}) {
  const { name, value, rating } = data;

  const tags = {
    metric_type: 'web_vitals',
    rating: rating || 'unknown',
    page: data.pathname || 'unknown',
  };

  productionMonitoringService.recordMetric(`web_vitals_${name.toLowerCase()}`, value, tags, 'ms');

  // Record rating as a separate metric for alerting
  const ratingValue = rating === 'good' ? 1 : rating === 'needs-improvement' ? 2 : 3;
  productionMonitoringService.recordMetric(
    `web_vitals_rating_${name.toLowerCase()}`,
    ratingValue,
    tags
  );
}

function handleApiPerformanceMetrics(data: {
  endpoint?: string;
  method?: string;
  responseTime?: number;
  statusCode?: number;
  userAgent?: string;
}) {
  const { endpoint, method, responseTime, statusCode, userAgent } = data;

  productionMonitoringService.recordApiResponseTime(
    endpoint || 'unknown',
    method || 'GET',
    responseTime || 0,
    statusCode || 200
  );

  // Record additional context
  const requestTags = {
    endpoint: endpoint || 'unknown',
    method: method || 'GET',
    user_agent: userAgent || 'unknown',
  };
  productionMonitoringService.recordMetric('api_request', 1, requestTags);
}

function handleDatabasePerformanceMetrics(data: {
  operation?: string;
  duration?: number;
  success?: boolean;
  query?: string;
  rowCount?: number;
}) {
  const { operation, duration, success, query, rowCount } = data;

  productionMonitoringService.recordDatabaseMetrics(
    operation || 'unknown',
    duration || 0,
    success !== false
  );

  // Record additional database metrics
  if (rowCount !== undefined) {
    const tags = { operation: operation || 'unknown' };
    productionMonitoringService.recordMetric('database_rows_affected', rowCount, tags);
  }

  if (query) {
    const tags = { operation: operation || 'unknown', query_type: getQueryType(query) };
    productionMonitoringService.recordMetric('database_query', 1, tags);
  }
}

function handleAIServicePerformanceMetrics(data: {
  service?: string;
  operation?: string;
  duration?: number;
  success?: boolean;
  tokensUsed?: number;
  model?: string;
  cost?: number;
}) {
  const { service, operation, duration, success, tokensUsed, model, cost } = data;

  productionMonitoringService.recordAIServiceMetrics(
    service || 'unknown',
    operation || 'unknown',
    duration || 0,
    success !== false,
    tokensUsed
  );

  // Record additional AI metrics
  if (model) {
    const tags = { service: service || 'unknown', operation: operation || 'unknown', model };
    productionMonitoringService.recordMetric('ai_model_usage', 1, tags);
  }

  if (cost !== undefined) {
    const tags = { service: service || 'unknown', operation: operation || 'unknown' };
    productionMonitoringService.recordMetric('ai_service_cost', cost, tags, 'usd');
  }
}

function handleIntegrationPerformanceMetrics(data: {
  platform?: string;
  operation?: string;
  duration?: number;
  success?: boolean;
  rateLimitRemaining?: number;
  dataSize?: number;
}) {
  const { platform, operation, duration, success, rateLimitRemaining, dataSize } = data;

  productionMonitoringService.recordIntegrationMetrics(
    platform || 'unknown',
    operation || 'unknown',
    duration || 0,
    success !== false
  );

  // Record additional integration metrics
  if (rateLimitRemaining !== undefined) {
    const tags = { platform: platform || 'unknown', operation: operation || 'unknown' };
    productionMonitoringService.recordMetric(
      'integration_rate_limit_remaining',
      rateLimitRemaining,
      tags
    );
  }

  if (dataSize !== undefined) {
    const tags = { platform: platform || 'unknown', operation: operation || 'unknown' };
    productionMonitoringService.recordMetric('integration_data_size', dataSize, tags, 'bytes');
  }
}

function handleErrorMetrics(data: {
  message?: string;
  stack?: string;
  component?: string;
  severity?: string;
  userId?: string;
  sessionId?: string;
}) {
  const { stack, component, severity, userId } = data;

  const tags = {
    component: component || 'unknown',
    severity: severity || 'error',
    has_user: userId ? 'true' : 'false',
  };

  productionMonitoringService.recordMetric('application_error', 1, tags);

  // Record error by component
  if (component) {
    productionMonitoringService.recordMetric(`error_${component}`, 1, tags);
  }

  // Record JavaScript errors separately
  if (stack && stack.includes('at ')) {
    productionMonitoringService.recordMetric('javascript_error', 1, tags);
  }
}

function handleCustomMetrics(data: {
  metrics: Array<{ name: string; value: number; tags?: Record<string, string>; unit?: string }>;
}) {
  const { metrics } = data;

  if (!Array.isArray(metrics)) {
    throw new Error('Custom metrics must be an array');
  }

  metrics.forEach((metric) => {
    const { name, value, tags, unit } = metric;
    if (name && value !== undefined) {
      productionMonitoringService.recordMetric(name, value, tags, unit);
    }
  });
}

function getQueryType(query: string): string {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.startsWith('select')) return 'select';
  if (normalizedQuery.startsWith('insert')) return 'insert';
  if (normalizedQuery.startsWith('update')) return 'update';
  if (normalizedQuery.startsWith('delete')) return 'delete';
  if (normalizedQuery.startsWith('create')) return 'create';
  if (normalizedQuery.startsWith('drop')) return 'drop';
  if (normalizedQuery.startsWith('alter')) return 'alter';

  return 'other';
}
