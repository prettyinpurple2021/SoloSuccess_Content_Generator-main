import type { ApiRequest, ApiResponse } from '../types';
import { z } from 'zod';
import { db } from '../../../services/databaseService';
import { apiErrorHandler } from '../../../services/apiErrorHandler';
import { errorHandler, ErrorContext } from '../../../services/errorHandlingService';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context: ErrorContext = {
    endpoint: '/api/content-series',
    operation: req.method?.toLowerCase(),
  };

  try {
    if (req.method === 'GET') {
      const userId = z
        .string()
        .min(1)
        .parse(req.query.userId as string);
      const series = await db.getContentSeries(userId);
      return res.status(200).json(series);
    }
    // POST, PUT, and DELETE are stubs unless add/update series is implemented in db
    return apiErrorHandler.handleMethodNotAllowed(req, res, ['GET']);
  } catch (error) {
    errorHandler.handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      res
    );
  }
}
