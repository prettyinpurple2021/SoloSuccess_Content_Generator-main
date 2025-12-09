import type { ApiRequest, ApiResponse } from '../types';
import { z } from 'zod';
import { db } from '../../../services/databaseService';
import { apiErrorHandler } from '../../../services/apiErrorHandler';
import { errorHandler, ErrorContext } from '../../../services/errorHandlingService';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context: ErrorContext = {
    endpoint: '/api/image-styles',
    operation: req.method?.toLowerCase(),
  };

  try {
    if (req.method === 'GET') {
      const userId = z
        .string()
        .optional()
        .parse(req.query.userId as string | undefined);
      const styles = await db.getImageStyles(userId);
      return res.status(200).json(styles);
    }
    // POST, PUT, and DELETE are stubs unless create/update functions are added to db
    return apiErrorHandler.handleMethodNotAllowed(req, res, ['GET']);
  } catch (error) {
    errorHandler.handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      res
    );
  }
}
