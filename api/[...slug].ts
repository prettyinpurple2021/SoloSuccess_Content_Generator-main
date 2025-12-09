import type { VercelRequest, VercelResponse } from '@vercel/node';
import { routeRequest } from '../server/apiRoutes/router';
import { errorHandler, ErrorContext } from '../services/errorHandlingService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  const context: ErrorContext = {
    endpoint: req.url || 'unknown',
    requestId,
    timestamp: new Date(),
    metadata: {
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string) || req.headers['x-real-ip'] || 'unknown',
    },
  };

  try {
    await routeRequest(req, res);

    // Log successful request
    const duration = Date.now() - startTime;
    errorHandler.logError(
      `API request completed: ${req.method} ${req.url}`,
      undefined,
      { ...context, duration },
      'info'
    );
  } catch (error) {
    // Use proper error handling service instead of console.error
    errorHandler.handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      res
    );
  }
}
