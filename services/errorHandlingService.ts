/**
 * Production-grade error handling service
 * Provides comprehensive error management, logging, and recovery mechanisms
 */

export interface ErrorContext {
  userId?: string;
  operation?: string;
  endpoint?: string;
  requestId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  // Database-specific context
  table?: string;
  query?: string;
  transactionId?: string;
  errorType?: string;
  consecutiveFailures?: number;
  healthStatus?: any;
  isHealthy?: boolean;
  result?: any;
  // Additional context fields
  [key: string]: any;
}

export interface ErrorLog {
  id: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  error?: Error;
  context?: ErrorContext;
  timestamp: Date;
  stack?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  retryableErrors: string[];
}

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errorLogs: ErrorLog[] = [];
  private maxLogSize = 1000;
  private retryConfigs: Map<string, RetryConfig> = new Map();

  private constructor() {
    this.initializeRetryConfigs();
  }

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  private initializeRetryConfigs(): void {
    // Database operations
    this.retryConfigs.set('database', {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      exponentialBackoff: true,
      retryableErrors: ['connection', 'timeout', 'temporary'],
    });

    // AI service operations
    this.retryConfigs.set('ai_service', {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 10000,
      exponentialBackoff: true,
      retryableErrors: ['rate_limit', 'timeout', 'service_unavailable'],
    });

    // Integration operations
    this.retryConfigs.set('integration', {
      maxAttempts: 2,
      baseDelay: 1500,
      maxDelay: 8000,
      exponentialBackoff: true,
      retryableErrors: ['rate_limit', 'timeout', 'temporary'],
    });
  }

  /**
   * Logs an error with context and metadata
   */
  logError(
    message: string,
    error?: Error,
    context?: ErrorContext,
    level: 'error' | 'warn' | 'info' = 'error'
  ): void {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      level,
      message,
      error,
      context: {
        ...context,
        timestamp: new Date(),
      },
      timestamp: new Date(),
      stack: error?.stack,
    };

    this.errorLogs.push(errorLog);

    // Maintain log size limit
    if (this.errorLogs.length > this.maxLogSize) {
      this.errorLogs = this.errorLogs.slice(-this.maxLogSize);
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${level.toUpperCase()}] ${message}`, {
        error,
        context,
      });
    }

    // In production, this would send to external logging service
    this.sendToExternalLogging(errorLog);
  }

  /**
   * Creates a standardized error response
   */
  createErrorResponse(
    message: string,
    error?: Error,
    code?: string,
    details?: any,
    requestId?: string
  ): ErrorResponse {
    return {
      error: 'Internal Server Error',
      message,
      code,
      details,
      timestamp: new Date(),
      requestId,
    };
  }

  /**
   * Handles API errors with proper HTTP status codes and logging
   */
  handleApiError(error: unknown, context: ErrorContext, res: any): void {
    let statusCode = 500;
    let errorMessage = 'Internal Server Error';
    let errorCode = 'INTERNAL_ERROR';
    let details: any = undefined;

    if (error instanceof Error) {
      // Parse known error types
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorMessage = 'Resource not found';
        errorCode = 'NOT_FOUND';
      } else if (
        error.message.includes('unauthorized') ||
        error.message.includes('access denied')
      ) {
        statusCode = 403;
        errorMessage = 'Access denied';
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('validation') || error.message.includes('invalid')) {
        statusCode = 400;
        errorMessage = 'Invalid request data';
        errorCode = 'VALIDATION_ERROR';
        details = { originalError: error.message };
      } else if (error.message.includes('rate limit')) {
        statusCode = 429;
        errorMessage = 'Rate limit exceeded';
        errorCode = 'RATE_LIMIT';
      } else if (error.message.includes('timeout')) {
        statusCode = 408;
        errorMessage = 'Request timeout';
        errorCode = 'TIMEOUT';
      }
    }

    // Log the error
    this.logError(
      `API Error: ${errorMessage}`,
      error instanceof Error ? error : new Error(String(error)),
      {
        ...context,
        statusCode,
        errorCode,
      }
    );

    // Send error response
    const errorResponse = this.createErrorResponse(
      errorMessage,
      error instanceof Error ? error : undefined,
      errorCode,
      details,
      context.requestId
    );

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Executes an operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    operationType: string,
    context?: ErrorContext
  ): Promise<T> {
    const config = this.retryConfigs.get(operationType) || this.retryConfigs.get('database')!;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        const isRetryable = this.isRetryableError(lastError, config);

        if (!isRetryable || attempt === config.maxAttempts) {
          this.logError(`Operation failed after ${attempt} attempts: ${operationType}`, lastError, {
            ...context,
            attempt,
            maxAttempts: config.maxAttempts,
          });
          throw lastError;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, config);

        this.logError(
          `Operation failed, retrying in ${delay}ms: ${operationType}`,
          lastError,
          { ...context, attempt, delay },
          'warn'
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Wraps async operations with comprehensive error handling
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    fallback?: T,
    context?: ErrorContext
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.logError(
        'Safe execution failed',
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      return fallback;
    }
  }

  /**
   * Gets recent error logs
   */
  getRecentErrors(limit: number = 50): ErrorLog[] {
    return this.errorLogs
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Gets error statistics
   */
  getErrorStats(timeframe: number = 24 * 60 * 60 * 1000): {
    total: number;
    byLevel: Record<string, number>;
    byOperation: Record<string, number>;
    errorRate: number;
  } {
    const cutoff = new Date(Date.now() - timeframe);
    const recentErrors = this.errorLogs.filter((log) => log.timestamp > cutoff);

    const byLevel: Record<string, number> = {};
    const byOperation: Record<string, number> = {};

    recentErrors.forEach((log) => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      if (log.context?.operation) {
        byOperation[log.context.operation] = (byOperation[log.context.operation] || 0) + 1;
      }
    });

    return {
      total: recentErrors.length,
      byLevel,
      byOperation,
      errorRate: recentErrors.length / (timeframe / (60 * 60 * 1000)), // errors per hour
    };
  }

  /**
   * Clears old error logs
   */
  clearOldLogs(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge);
    this.errorLogs = this.errorLogs.filter((log) => log.timestamp > cutoff);
  }

  private isRetryableError(error: Error, config: RetryConfig): boolean {
    const errorMessage = error.message.toLowerCase();
    return config.retryableErrors.some((retryableError) =>
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    if (!config.exponentialBackoff) {
      return config.baseDelay;
    }

    const delay = config.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private sendToExternalLogging(errorLog: ErrorLog): void {
    // In production, this would send to services like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - CloudWatch
    // For now, we'll just store locally

    if (process.env.NODE_ENV === 'production') {
      // Example: Send to external service
      // await fetch('/api/logging', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorLog)
      // });
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandlingService.getInstance();
