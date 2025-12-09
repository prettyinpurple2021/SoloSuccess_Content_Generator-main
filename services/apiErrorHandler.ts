/**
 * API-specific error handling utilities
 * Provides standardized error handling for all API endpoints
 */

import { z } from 'zod';
import { errorHandler, ErrorContext } from './errorHandlingService';
import type { ApiRequest, ApiResponse } from '../server/apiRoutes/types';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export class ApiErrorHandler {
  private static instance: ApiErrorHandler;

  static getInstance(): ApiErrorHandler {
    if (!ApiErrorHandler.instance) {
      ApiErrorHandler.instance = new ApiErrorHandler();
    }
    return ApiErrorHandler.instance;
  }

  /**
   * Wraps an API handler with comprehensive error handling
   */
  wrapHandler(handler: (req: ApiRequest, res: ApiResponse) => Promise<void>, endpoint: string) {
    return async (req: ApiRequest, res: ApiResponse) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();

      // Add CORS headers
      this.addCorsHeaders(res);

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      const context: ErrorContext = {
        endpoint,
        requestId,
        timestamp: new Date(),
        metadata: {
          method: req.method,
          userAgent: req.headers?.['user-agent'],
          ip: req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'],
        },
      };

      try {
        // Add request ID to response headers
        res.setHeader('X-Request-ID', requestId);

        // Execute the handler
        await handler(req, res);

        // Log successful request
        const duration = Date.now() - startTime;
        errorHandler.logError(
          `API request completed: ${req.method} ${endpoint}`,
          undefined,
          { ...context, duration },
          'info'
        );
      } catch (error) {
        // Handle the error
        errorHandler.handleApiError(error, context, res);
      }
    };
  }

  /**
   * Validates request data using Zod schema
   */
  validateRequest<T>(data: unknown, schema: z.ZodSchema<T>, context?: ErrorContext): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        errorHandler.logError('Request validation failed', new Error('Validation error'), {
          ...context,
          validationErrors,
        });

        throw new Error(
          `Validation failed: ${validationErrors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Validates query parameters
   */
  validateQuery<T>(
    query: Record<string, string | string[] | undefined>,
    schema: z.ZodSchema<T>,
    context?: ErrorContext
  ): T {
    return this.validateRequest(query, schema, { ...context, operation: 'query_validation' });
  }

  /**
   * Validates request body
   */
  validateBody<T>(body: unknown, schema: z.ZodSchema<T>, context?: ErrorContext): T {
    return this.validateRequest(body, schema, { ...context, operation: 'body_validation' });
  }

  /**
   * Handles method not allowed errors
   */
  handleMethodNotAllowed(req: ApiRequest, res: ApiResponse, allowedMethods: string[]): void {
    res.setHeader('Allow', allowedMethods.join(', '));

    errorHandler.logError(`Method not allowed: ${req.method}`, new Error('Method not allowed'), {
      endpoint: 'unknown',
      metadata: { method: req.method, allowedMethods },
    });

    res.status(405).json({
      error: 'Method Not Allowed',
      message: `Method ${req.method} is not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
      code: 'METHOD_NOT_ALLOWED',
      timestamp: new Date(),
    });
  }

  /**
   * Handles authentication errors
   */
  handleAuthError(
    req: ApiRequest,
    res: ApiResponse,
    message: string = 'Authentication required'
  ): void {
    errorHandler.logError('Authentication error', new Error(message), {
      endpoint: 'unknown',
      metadata: { method: req.method },
    });

    res.status(401).json({
      error: 'Unauthorized',
      message,
      code: 'UNAUTHORIZED',
      timestamp: new Date(),
    });
  }

  /**
   * Handles authorization errors
   */
  handleAuthzError(req: ApiRequest, res: ApiResponse, message: string = 'Access denied'): void {
    errorHandler.logError('Authorization error', new Error(message), {
      endpoint: 'unknown',
      metadata: { method: req.method },
    });

    res.status(403).json({
      error: 'Forbidden',
      message,
      code: 'FORBIDDEN',
      timestamp: new Date(),
    });
  }

  /**
   * Handles rate limiting errors
   */
  handleRateLimitError(req: ApiRequest, res: ApiResponse, retryAfter: number = 60): void {
    res.setHeader('Retry-After', retryAfter.toString());

    errorHandler.logError('Rate limit exceeded', new Error('Rate limit exceeded'), {
      endpoint: 'unknown',
      metadata: { method: req.method, retryAfter },
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
      timestamp: new Date(),
    });
  }

  /**
   * Sanitizes input data to prevent injection attacks
   */
  sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      // Basic XSS prevention
      return data
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeInput(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Adds security headers to response
   */
  addSecurityHeaders(res: ApiResponse): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
  }

  /**
   * Adds CORS headers to response
   */
  addCorsHeaders(res: ApiResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  /**
   * Logs API request metrics
   */
  logRequestMetrics(
    req: ApiRequest,
    res: ApiResponse,
    startTime: number,
    context?: ErrorContext
  ): void {
    const duration = Date.now() - startTime;
    const method = req.method || 'UNKNOWN';

    errorHandler.logError(
      `API Request: ${method} - ${duration}ms`,
      undefined,
      {
        ...context,
        operation: 'api_request',
        metadata: {
          method,
          duration,
          userAgent: req.headers?.['user-agent'],
        },
      },
      'info'
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const apiErrorHandler = ApiErrorHandler.getInstance();

// Common validation schemas
export const commonSchemas = {
  userId: z.string().min(1, 'User ID is required'),
  id: z.string().min(1, 'ID is required'),
  pagination: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val) : 20)),
  }),
  dateRange: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
};
