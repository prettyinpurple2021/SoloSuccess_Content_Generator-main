import { useState, useCallback, useRef, useEffect } from 'react';
import { errorHandler } from '../services/errorHandlingService';

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  fallbackValue?: any;
  onError?: (error: Error, attempt: number) => void;
  onSuccess?: (result: any, attempt: number) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

export interface ErrorRecoveryState {
  isLoading: boolean;
  error: Error | null;
  attempt: number;
  hasReachedMaxRetries: boolean;
  lastSuccessTime: number | null;
}

/**
 * Hook for handling errors with automatic retry and recovery mechanisms
 */
export const useErrorRecovery = <T = any>(
  operation: () => Promise<T>,
  options: ErrorRecoveryOptions = {}
) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    fallbackValue,
    onError,
    onSuccess,
    onMaxRetriesReached,
  } = options;

  const [state, setState] = useState<ErrorRecoveryState>({
    isLoading: false,
    error: null,
    attempt: 0,
    hasReachedMaxRetries: false,
    lastSuccessTime: null,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const calculateDelay = useCallback(
    (attempt: number): number => {
      if (!exponentialBackoff) return retryDelay;
      return Math.min(retryDelay * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
    },
    [retryDelay, exponentialBackoff]
  );

  const execute = useCallback(async (): Promise<T | undefined> => {
    // Cancel any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      hasReachedMaxRetries: false,
    }));

    const attemptOperation = async (attemptNumber: number): Promise<T | undefined> => {
      try {
        setState((prev) => ({ ...prev, attempt: attemptNumber }));

        const result = await operation();

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
          lastSuccessTime: Date.now(),
        }));

        onSuccess?.(result, attemptNumber);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Log error
        errorHandler.logError(`Operation failed on attempt ${attemptNumber}`, err, {
          attempt: attemptNumber,
          maxRetries,
        });

        onError?.(err, attemptNumber);

        if (attemptNumber >= maxRetries) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err,
            hasReachedMaxRetries: true,
          }));

          onMaxRetriesReached?.(err);

          if (fallbackValue !== undefined) {
            return fallbackValue;
          }

          throw err;
        }

        // Schedule retry
        const delay = calculateDelay(attemptNumber);

        return new Promise<T | undefined>((resolve, reject) => {
          retryTimeoutRef.current = setTimeout(async () => {
            try {
              const result = await attemptOperation(attemptNumber + 1);
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          }, delay);
        });
      }
    };

    try {
      return await attemptOperation(1);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
      throw error;
    }
  }, [
    operation,
    maxRetries,
    onError,
    onSuccess,
    onMaxRetriesReached,
    fallbackValue,
    calculateDelay,
  ]);

  const retry = useCallback(() => {
    if (!state.hasReachedMaxRetries) {
      execute();
    }
  }, [execute, state.hasReachedMaxRetries]);

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState({
      isLoading: false,
      error: null,
      attempt: 0,
      hasReachedMaxRetries: false,
      lastSuccessTime: null,
    });
  }, []);

  const cancel = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    execute,
    retry,
    reset,
    cancel,
    canRetry: !state.isLoading && !state.hasReachedMaxRetries,
  };
};

/**
 * Hook for handling network-specific errors with connectivity checks
 */
export const useNetworkErrorRecovery = <T = any>(
  operation: () => Promise<T>,
  options: ErrorRecoveryOptions = {}
) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkError, setNetworkError] = useState<Error | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkError(null);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkError(new Error('Network connection lost'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const networkAwareOperation = useCallback(async (): Promise<T> => {
    if (!isOnline) {
      throw new Error('No network connection available');
    }

    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Check if it's a network error
      if (
        err.message.includes('fetch') ||
        err.message.includes('network') ||
        err.message.includes('connection') ||
        err.name === 'NetworkError'
      ) {
        setNetworkError(err);
      }

      throw err;
    }
  }, [operation, isOnline]);

  const recovery = useErrorRecovery(networkAwareOperation, {
    ...options,
    onError: (error, attempt) => {
      if (!isOnline) {
        setNetworkError(error);
      }
      options.onError?.(error, attempt);
    },
  });

  return {
    ...recovery,
    isOnline,
    networkError,
  };
};

/**
 * Hook for handling API-specific errors with authentication retry
 */
export const useApiErrorRecovery = <T = any>(
  operation: () => Promise<T>,
  options: ErrorRecoveryOptions & {
    onAuthError?: () => Promise<void>;
    onRateLimitError?: (retryAfter?: number) => void;
  } = {}
) => {
  const { onAuthError, onRateLimitError, ...recoveryOptions } = options;

  const apiAwareOperation = useCallback(async (): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Handle authentication errors
      if (err.message.includes('401') || err.message.includes('unauthorized')) {
        if (onAuthError) {
          await onAuthError();
          // Retry the operation after auth refresh
          return await operation();
        }
      }

      // Handle rate limiting
      if (err.message.includes('429') || err.message.includes('rate limit')) {
        const retryAfter = extractRetryAfter(err.message);
        onRateLimitError?.(retryAfter);

        if (retryAfter) {
          // Wait for the specified time before retrying
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          return await operation();
        }
      }

      throw err;
    }
  }, [operation, onAuthError, onRateLimitError]);

  return useErrorRecovery(apiAwareOperation, recoveryOptions);
};

/**
 * Hook for handling database operation errors with connection retry
 */
export const useDatabaseErrorRecovery = <T = any>(
  operation: () => Promise<T>,
  options: ErrorRecoveryOptions = {}
) => {
  const databaseAwareOperation = useCallback(async (): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Log database-specific context
      errorHandler.logError('Database operation failed', err, {
        operation: 'database_query',
        errorType: 'database_error',
      });

      throw err;
    }
  }, [operation]);

  return useErrorRecovery(databaseAwareOperation, {
    maxRetries: 3,
    retryDelay: 2000,
    exponentialBackoff: true,
    ...options,
  });
};

/**
 * Hook for handling AI service errors with fallback strategies
 */
export const useAIServiceErrorRecovery = <T = any>(
  operation: () => Promise<T>,
  fallbackOperation?: () => Promise<T>,
  options: ErrorRecoveryOptions = {}
) => {
  const aiAwareOperation = useCallback(async (): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // If we have a fallback and this is a service error, try fallback
      if (
        fallbackOperation &&
        (err.message.includes('service unavailable') ||
          err.message.includes('quota exceeded') ||
          err.message.includes('rate limit'))
      ) {
        try {
          return await fallbackOperation();
        } catch (_fallbackError) {
          // If fallback also fails, throw original error
          throw err;
        }
      }

      throw err;
    }
  }, [operation, fallbackOperation]);

  return useErrorRecovery(aiAwareOperation, {
    maxRetries: 2,
    retryDelay: 3000,
    exponentialBackoff: true,
    ...options,
  });
};

// Helper function to extract retry-after header value
function extractRetryAfter(errorMessage: string): number | undefined {
  const match = errorMessage.match(/retry[_\s-]?after[:\s]*(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

export default useErrorRecovery;
