/**
 * Authentication middleware for API routes
 * Validates Stack Auth tokens and extracts user information
 *
 * Note: For Vercel serverless functions, Stack Auth authentication
 * is typically handled client-side. This middleware validates userId
 * from query parameters against the authenticated user.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stackServerApp } from '../../../stack';
import { ApiRequest, ApiResponse } from '../types';
import { apiErrorHandler } from '../../../services/apiErrorHandler';
import { errorHandler, ErrorContext } from '../../../services/errorHandlingService';

export interface AuthenticatedRequest extends ApiRequest {
  user?: {
    id: string;
    email?: string;
    displayName?: string;
  };
}

/**
 * Authentication middleware that validates Stack Auth tokens
 * This should be applied to protected routes
 *
 * For Vercel serverless functions, we validate the userId from the request
 * against the authenticated user from Stack Auth cookies/headers
 */
export async function requireAuth(
  req: ApiRequest,
  res: ApiResponse,
  vercelReq: VercelRequest,
  vercelRes: VercelResponse,
  next: (req: AuthenticatedRequest, res: ApiResponse) => Promise<void>
): Promise<void> {
  const context: ErrorContext = {
    endpoint: 'auth_middleware',
    metadata: {
      method: req.method,
    },
  };

  try {
    let user = null;

    // Try to get user from Stack Auth using the Vercel request/response
    // Stack Auth uses cookies for browser-based authentication
    try {
      const stackUser = await stackServerApp.getUser({ or: 'redirect' });
      if (stackUser) {
        user = {
          id: stackUser.id,
          email: stackUser.primaryEmail || undefined,
          displayName: stackUser.displayName || undefined,
        };
      }
    } catch {
      // If getUser fails, try extracting from Authorization header
      const authHeader = (req.headers?.['authorization'] as string) || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          // @ts-expect-error Stack Auth type mismatch with current TypeScript version
          const stackUser = await stackServerApp.getUser({ accessToken: token });
          if (stackUser) {
            user = {
              id: stackUser.id,
              email: stackUser.primaryEmail || undefined,
              displayName: stackUser.displayName || undefined,
            };
          }
        } catch (tokenError) {
          // Token validation failed - log error
          errorHandler.logError(
            'Token authentication failed',
            tokenError instanceof Error ? tokenError : new Error(String(tokenError)),
            context,
            'warn'
          );
        }
      }
    }

    if (!user) {
      // No authenticated user found
      return apiErrorHandler.handleAuthError(req, res, 'Authentication required');
    }

    // Add user to request and continue
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = user;

    await next(authenticatedReq, res);
  } catch (error) {
    errorHandler.handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      res
    );
  }
}

/**
 * Optional authentication middleware
 * Adds user to request if authenticated, but doesn't fail if not
 */
export async function optionalAuth(
  req: ApiRequest,
  res: ApiResponse,
  vercelReq: VercelRequest,
  vercelRes: VercelResponse,
  next: (req: AuthenticatedRequest, res: ApiResponse) => Promise<void>
): Promise<void> {
  try {
    let user = null;

    // Try to get user from Stack Auth
    try {
      const stackUser = await stackServerApp.getUser();
      if (stackUser) {
        user = {
          id: stackUser.id,
          email: stackUser.primaryEmail || undefined,
          displayName: stackUser.displayName || undefined,
        };
      }
    } catch {
      // Try Authorization header if cookies don't work
      const authHeader = (req.headers?.['authorization'] as string) || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          // @ts-expect-error Stack Auth type mismatch with current TypeScript version
          const stackUser = await stackServerApp.getUser({ accessToken: token });
          if (stackUser) {
            user = {
              id: stackUser.id,
              email: stackUser.primaryEmail || undefined,
              displayName: stackUser.displayName || undefined,
            };
          }
        } catch {
          // Ignore auth errors for optional auth
        }
      }
    }

    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = user || undefined;

    await next(authenticatedReq, res);
  } catch (error) {
    errorHandler.handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint: 'optional_auth_middleware' },
      res
    );
  }
}

/**
 * Validates that the authenticated user owns the resource
 * Compares userId from query/params with authenticated user ID
 */
export function requireOwnership(
  userIdFromRequest: string | undefined,
  authenticatedUserId: string | undefined
): boolean {
  if (!authenticatedUserId) {
    return false;
  }

  if (!userIdFromRequest) {
    return false;
  }

  return userIdFromRequest === authenticatedUserId;
}

/**
 * Simplified auth check for routes that validate userId from query params
 * This is a lighter-weight alternative when full Stack Auth integration
 * isn't needed in the API route itself
 */
export function validateUserId(
  req: ApiRequest,
  res: ApiResponse,
  userId: string | undefined
): string | null {
  if (!userId) {
    apiErrorHandler.handleAuthError(req, res, 'User ID is required');
    return null;
  }

  // Basic validation - in production, this should also verify
  // that the userId matches the authenticated user
  if (typeof userId !== 'string' || userId.length === 0) {
    apiErrorHandler.handleAuthError(req, res, 'Invalid user ID');
    return null;
  }

  return userId;
}
