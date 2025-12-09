// services/utils/apiErrorHandler.ts

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
  originalError?: any;
}

export class ApiErrorHandler {
  private static defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error) => this.isRetryableError(error),
  };

  /**
   * Execute an API call with automatic retry logic
   */
  static async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const retryOptions = { ...this.defaultRetryOptions, ...options };
    let lastError: any;

    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;

        // Don't retry on the last attempt
        if (attempt === retryOptions.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!retryOptions.retryCondition!(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryOptions.baseDelay * Math.pow(retryOptions.backoffMultiplier, attempt),
          retryOptions.maxDelay
        );

        console.warn(
          `API call failed (attempt ${attempt + 1}/${retryOptions.maxRetries + 1}), retrying in ${delay}ms:`,
          error
        );

        await this.sleep(delay);
      }
    }

    throw this.createApiError(lastError);
  }

  /**
   * Execute multiple API calls in parallel with retry logic
   */
  static async executeBatchWithRetry<T>(
    apiCalls: (() => Promise<T>)[],
    options: Partial<RetryOptions> = {}
  ): Promise<{ results: T[]; errors: ApiError[] }> {
    const results: T[] = [];
    const errors: ApiError[] = [];

    const promises = apiCalls.map(async (apiCall, index) => {
      try {
        const result = await this.executeWithRetry(apiCall, options);
        results[index] = result;
      } catch (error) {
        errors[index] = this.createApiError(error);
      }
    });

    await Promise.allSettled(promises);
    return { results, errors };
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: any): boolean {
    // Network errors
    if (error.name === 'NetworkError' || error.name === 'TypeError') {
      return true;
    }

    // HTTP status codes that are retryable
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      return status >= 500 || status === 429; // Server errors and rate limits
    }

    // Timeout errors
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      return true;
    }

    // Rate limit errors
    if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
      return true;
    }

    return false;
  }

  /**
   * Create a standardized API error
   */
  private static createApiError(error: any): ApiError {
    const isRetryable = this.isRetryableError(error);

    let code = 'UNKNOWN_ERROR';
    let message = 'An unknown error occurred';

    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      code = `HTTP_${status}`;

      switch (status) {
        case 400:
          message = 'Bad request - please check your input';
          break;
        case 401:
          message = 'Unauthorized - please check your credentials';
          break;
        case 403:
          message = 'Forbidden - insufficient permissions';
          break;
        case 404:
          message = 'Resource not found';
          break;
        case 429:
          message = 'Rate limit exceeded - please try again later';
          break;
        case 500:
          message = 'Internal server error';
          break;
        case 502:
        case 503:
        case 504:
          message = 'Service temporarily unavailable';
          break;
        default:
          message = `HTTP ${status} error`;
      }
    } else if (error.message) {
      message = error.message;

      if (error.message.includes('network')) {
        code = 'NETWORK_ERROR';
      } else if (error.message.includes('timeout')) {
        code = 'TIMEOUT_ERROR';
      } else if (error.message.includes('rate limit')) {
        code = 'RATE_LIMIT_ERROR';
      }
    }

    return {
      code,
      message,
      statusCode: error.status || error.statusCode,
      retryable: isRetryable,
      originalError: error,
    };
  }

  /**
   * Sleep utility for delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  static async handleRateLimit(
    error: any,
    retryCount: number = 0,
    maxRetries: number = 3
  ): Promise<void> {
    if (error.status === 429 || error.message?.includes('rate limit')) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
      console.warn(`Rate limited, waiting ${delay}ms before retry ${retryCount + 1}/${maxRetries}`);
      await this.sleep(delay);
    }
  }

  /**
   * Log API errors with context
   */
  static logError(
    error: ApiError,
    context: {
      service: string;
      operation: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      service: context.service,
      operation: context.operation,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        retryable: error.retryable,
      },
      userId: context.userId,
      metadata: context.metadata,
    };

    if (error.statusCode && error.statusCode >= 500) {
      console.error('API Error (Server):', logData);
    } else if (error.statusCode && error.statusCode >= 400) {
      console.warn('API Error (Client):', logData);
    } else {
      console.error('API Error (Unknown):', logData);
    }

    // In production, you might want to send this to a logging service
    // this.sendToLoggingService(logData);
  }

  /**
   * Create a circuit breaker for API calls
   */
  static createCircuitBreaker(failureThreshold: number = 5, timeout: number = 60000) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return async <T>(apiCall: () => Promise<T>): Promise<T> => {
      const now = Date.now();

      // Check if circuit should be reset
      if (state === 'OPEN' && now - lastFailureTime > timeout) {
        state = 'HALF_OPEN';
      }

      // If circuit is open, reject immediately
      if (state === 'OPEN') {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }

      try {
        const result = await apiCall();

        // Reset on success
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }

        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        if (failures >= failureThreshold) {
          state = 'OPEN';
        }

        throw error;
      }
    };
  }

  /**
   * Validate API response
   */
  static validateResponse<T>(response: any, validator: (data: any) => data is T): T {
    if (!response) {
      throw new Error('Empty response received');
    }

    if (!validator(response)) {
      throw new Error('Invalid response format');
    }

    return response;
  }

  /**
   * Create timeout wrapper for API calls
   */
  static withTimeout<T>(apiCall: () => Promise<T>, timeoutMs: number = 30000): Promise<T> {
    return Promise.race([
      apiCall(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`API call timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  }
}

export default ApiErrorHandler;
