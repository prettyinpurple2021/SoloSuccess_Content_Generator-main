import type { ApiRequest, ApiResponse } from '../types';
import { z } from 'zod';
import { db } from '../../../services/databaseService';
import { apiErrorHandler } from '../../../services/apiErrorHandler';
import { errorHandler, ErrorContext } from '../../../services/errorHandlingService';

const querySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context: ErrorContext = {
    endpoint: '/api/analytics',
    operation: req.method?.toLowerCase(),
  };

  try {
    if (req.method === 'GET') {
      const q = apiErrorHandler.validateQuery(req.query, querySchema, context);
      const end = q.end ? new Date(q.end) : new Date();
      const start = q.start ? new Date(q.start) : new Date(new Date().getTime() - 30 * 86400000);
      const data = await db.getAnalyticsByTimeframe(start, end);
      return res.status(200).json(data);
    }
    return apiErrorHandler.handleMethodNotAllowed(req, res, ['GET']);
  } catch (error) {
    errorHandler.handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      res
    );
  }
}
