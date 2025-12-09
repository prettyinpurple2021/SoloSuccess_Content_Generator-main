import { errorHandler } from '../services/errorHandlingService';

/**
 * Enhanced error handling utilities for the frontend
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

/**
 * Converts technical errors into user-friendly messages
 */
export const getUserFriendlyError = (
  error: Error | string,
  context?: string
): UserFriendlyError => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorLower = errorMessage.toLowerCase();

  // Network errors
  if (
    errorLower.includes('network') ||
    errorLower.includes('fetch') ||
    errorLower.includes('connection')
  ) {
    return {
      title: 'Connection Problem',
      message:
        'Unable to connect to our servers. Please check your internet connection and try again.',
      action: 'Check your internet connection and retry',
      severity: 'medium',
      recoverable: true,
    };
  }

  // Authentication errors
  if (
    errorLower.includes('unauthorized') ||
    errorLower.includes('401') ||
    errorLower.includes('authentication')
  ) {
    return {
      title: 'Authentication Required',
      message: 'Your session has expired. Please sign in again to continue.',
      action: 'Sign in again',
      severity: 'medium',
      recoverable: true,
    };
  }

  // Permission errors
  if (
    errorLower.includes('forbidden') ||
    errorLower.includes('403') ||
    errorLower.includes('permission')
  ) {
    return {
      title: 'Access Denied',
      message: 'You don&apos;t have permission to perform this action.',
      action: 'Contact support if you believe this is an error',
      severity: 'medium',
      recoverable: false,
    };
  }

  // Rate limiting
  if (
    errorLower.includes('rate limit') ||
    errorLower.includes('429') ||
    errorLower.includes('too many requests')
  ) {
    return {
      title: 'Too Many Requests',
      message: "You're making requests too quickly. Please wait a moment and try again.",
      action: 'Wait a few seconds and retry',
      severity: 'low',
      recoverable: true,
    };
  }

  // Server errors
  if (
    errorLower.includes('500') ||
    errorLower.includes('internal server') ||
    errorLower.includes('server error')
  ) {
    return {
      title: 'Server Error',
      message: "Our servers are experiencing issues. We're working to fix this.",
      action: 'Try again in a few minutes',
      severity: 'high',
      recoverable: true,
    };
  }

  // Validation errors
  if (
    errorLower.includes('validation') ||
    errorLower.includes('invalid') ||
    errorLower.includes('required')
  ) {
    return {
      title: 'Invalid Input',
      message: 'Please check your input and make sure all required fields are filled correctly.',
      action: 'Review and correct your input',
      severity: 'low',
      recoverable: true,
    };
  }

  // Timeout errors
  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return {
      title: 'Request Timeout',
      message: 'The operation took too long to complete. This might be due to a slow connection.',
      action: 'Try again with a better connection',
      severity: 'medium',
      recoverable: true,
    };
  }

  // AI service specific errors
  if (context === 'ai_service') {
    if (errorLower.includes('quota') || errorLower.includes('limit')) {
      return {
        title: 'AI Service Limit Reached',
        message: "You've reached the limit for AI-generated content. Please try again later.",
        action: 'Wait and try again, or upgrade your plan',
        severity: 'medium',
        recoverable: true,
      };
    }

    return {
      title: 'AI Service Error',
      message:
        'The AI service is temporarily unavailable. Your content will be saved and you can try generating again later.',
      action: 'Try again in a few minutes',
      severity: 'medium',
      recoverable: true,
    };
  }

  // Database errors
  if (context === 'database') {
    return {
      title: 'Data Error',
      message: 'There was a problem saving or retrieving your data. Your work may not be saved.',
      action: 'Try saving again or refresh the page',
      severity: 'high',
      recoverable: true,
    };
  }

  // Code splitting / chunk loading errors
  if (errorLower.includes('loading chunk') || errorLower.includes('chunkloaderror')) {
    return {
      title: 'App Update Available',
      message:
        'A new version of the app is available. Please refresh the page to get the latest version.',
      action: 'Refresh the page',
      severity: 'medium',
      recoverable: true,
    };
  }

  // Generic fallback
  return {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. If this continues, please contact support.',
    action: 'Try again or contact support',
    severity: 'medium',
    recoverable: true,
  };
};

/**
 * Enhanced error logging with context
 */
export const logUserError = (
  error: Error | string,
  context: {
    operation?: string;
    component?: string;
    userId?: string;
    feature?: string;
    metadata?: Record<string, any>;
  } = {}
) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  errorHandler.logError(`User error in ${context.component || 'unknown component'}`, errorObj, {
    operation: context.operation || 'user_action',
    component: context.component,
    userId: context.userId,
    feature: context.feature,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date(),
    ...context.metadata,
  });
};

/**
 * Creates a standardized error response for API calls
 */
export const createApiError = (
  response: Response,
  operation: string,
  context?: Record<string, any>
): Error => {
  const error = new Error(`API Error: ${response.status} ${response.statusText}`);

  // Add additional properties to the error
  (error as any).status = response.status;
  (error as any).statusText = response.statusText;
  (error as any).operation = operation;
  (error as any).context = context;

  return error;
};

/**
 * Wraps async operations with error handling
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: {
    operation: string;
    component?: string;
    feature?: string;
    fallback?: T;
    onError?: (error: Error) => void;
  }
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    logUserError(errorObj, {
      operation: context.operation,
      component: context.component,
      feature: context.feature,
    });

    context.onError?.(errorObj);

    if (context.fallback !== undefined) {
      return context.fallback;
    }

    throw errorObj;
  }
};

/**
 * Debounced error reporting to prevent spam
 */
class DebouncedErrorReporter {
  private errorCounts = new Map<string, number>();
  private lastReportTime = new Map<string, number>();
  private readonly debounceTime = 5000; // 5 seconds
  private readonly maxReports = 3; // Max reports per error type

  report(error: Error, context?: Record<string, any>) {
    const errorKey = `${error.name}:${error.message}`;
    const now = Date.now();

    const lastReport = this.lastReportTime.get(errorKey) || 0;
    const count = this.errorCounts.get(errorKey) || 0;

    // If we've reported this error too many times recently, skip it
    if (count >= this.maxReports && now - lastReport < this.debounceTime * 10) {
      return;
    }

    // If it's been reported recently, skip it
    if (now - lastReport < this.debounceTime) {
      return;
    }

    // Report the error
    logUserError(error, context);

    // Update tracking
    this.errorCounts.set(errorKey, count + 1);
    this.lastReportTime.set(errorKey, now);

    // Clean up old entries periodically
    if (this.errorCounts.size > 100) {
      this.cleanup();
    }
  }

  private cleanup() {
    const now = Date.now();
    const cutoff = now - this.debounceTime * 20; // 100 seconds ago

    for (const [key, time] of this.lastReportTime.entries()) {
      if (time < cutoff) {
        this.errorCounts.delete(key);
        this.lastReportTime.delete(key);
      }
    }
  }
}

export const debouncedErrorReporter = new DebouncedErrorReporter();

/**
 * Error recovery strategies
 */
export const errorRecoveryStrategies = {
  // Retry with exponential backoff
  retryWithBackoff: async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  },

  // Retry with circuit breaker
  retryWithCircuitBreaker: (() => {
    const failures = new Map<string, { count: number; lastFailure: number }>();
    const circuitBreakerThreshold = 5;
    const circuitBreakerTimeout = 60000; // 1 minute

    return async <T>(operation: () => Promise<T>, operationKey: string): Promise<T> => {
      const failure = failures.get(operationKey);
      const now = Date.now();

      // Check if circuit breaker is open
      if (failure && failure.count >= circuitBreakerThreshold) {
        if (now - failure.lastFailure < circuitBreakerTimeout) {
          throw new Error('Circuit breaker is open - operation temporarily disabled');
        } else {
          // Reset circuit breaker
          failures.delete(operationKey);
        }
      }

      try {
        const result = await operation();
        // Reset failure count on success
        failures.delete(operationKey);
        return result;
      } catch (error) {
        // Increment failure count
        const currentFailure = failures.get(operationKey) || { count: 0, lastFailure: 0 };
        failures.set(operationKey, {
          count: currentFailure.count + 1,
          lastFailure: now,
        });

        throw error;
      }
    };
  })(),

  // Fallback to cached data
  withFallback: async <T>(
    operation: () => Promise<T>,
    fallbackData: T,
    cacheKey?: string
  ): Promise<T> => {
    try {
      const result = await operation();

      // Cache successful result
      if (cacheKey) {
        localStorage.setItem(
          `fallback_${cacheKey}`,
          JSON.stringify({
            data: result,
            timestamp: Date.now(),
          })
        );
      }

      return result;
    } catch (error) {
      // Try to get cached data
      if (cacheKey) {
        try {
          const cached = localStorage.getItem(`fallback_${cacheKey}`);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            // Use cached data if it's less than 1 hour old
            if (Date.now() - timestamp < 3600000) {
              console.warn('Using cached fallback data due to error:', error);
              return data;
            }
          }
        } catch (cacheError) {
          console.warn('Failed to retrieve cached fallback data:', cacheError);
        }
      }

      console.warn('Using static fallback data due to error:', error);
      return fallbackData;
    }
  },
};

export default {
  getUserFriendlyError,
  logUserError,
  createApiError,
  withErrorHandling,
  debouncedErrorReporter,
  errorRecoveryStrategies,
};
