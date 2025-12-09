import { useState, useCallback, useRef, useEffect } from 'react';
import { getUserFriendlyError, logUserError, UserFriendlyError } from '../utils/errorUtils';
import { useNotificationHelpers } from '../components/NotificationSystem';

export interface ErrorState {
  error: Error | null;
  userFriendlyError: UserFriendlyError | null;
  isRecovering: boolean;
  retryCount: number;
  lastErrorTime: number | null;
}

export interface ErrorStateOptions {
  maxRetries?: number;
  autoRetryDelay?: number;
  showNotifications?: boolean;
  logErrors?: boolean;
  context?: string;
  component?: string;
  feature?: string;
}

/**
 * Hook for managing error states with user-friendly messages and recovery options
 */
export const useErrorState = (options: ErrorStateOptions = {}) => {
  const {
    maxRetries = 3,
    autoRetryDelay = 2000,
    showNotifications = true,
    logErrors = true,
    context,
    component,
    feature,
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    userFriendlyError: null,
    isRecovering: false,
    retryCount: 0,
    lastErrorTime: null,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Always call hooks - conditional logic handled inside
  const notificationHelpers = useNotificationHelpers();
  const { showError, showSuccess } = showNotifications
    ? notificationHelpers
    : {
        showError: () => {},
        showSuccess: () => {},
      };

  // Set error with user-friendly message
  const setError = useCallback(
    (error: Error | string, autoRetry: boolean = false) => {
      const errorObj = typeof error === 'string' ? new Error(error) : error;
      const userFriendlyError = getUserFriendlyError(errorObj, context);

      setErrorState((prev) => ({
        error: errorObj,
        userFriendlyError,
        isRecovering: false,
        retryCount: prev.retryCount,
        lastErrorTime: Date.now(),
      }));

      // Log error if enabled
      if (logErrors) {
        logUserError(errorObj, {
          operation: 'error_state',
          component,
          feature,
          metadata: { context, retryCount: errorState.retryCount },
        });
      }

      // Show notification if enabled
      if (showNotifications) {
        showError(userFriendlyError.title, userFriendlyError.message, {
          action: userFriendlyError.recoverable
            ? {
                label: 'Retry',
                onClick: () => retry(),
              }
            : undefined,
        });
      }

      // Auto retry if enabled and recoverable
      if (autoRetry && userFriendlyError.recoverable && errorState.retryCount < maxRetries) {
        scheduleRetry();
      }
    },
    [
      context,
      component,
      feature,
      logErrors,
      showNotifications,
      showError,
      errorState.retryCount,
      maxRetries,
      retry,
      scheduleRetry,
    ]
  );

  // Clear error state
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setErrorState({
      error: null,
      userFriendlyError: null,
      isRecovering: false,
      retryCount: 0,
      lastErrorTime: null,
    });
  }, []);

  // Retry mechanism
  const retry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setErrorState((prev) => ({
      ...prev,
      isRecovering: true,
      retryCount: prev.retryCount + 1,
    }));

    // Return a promise that resolves when retry is ready
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setErrorState((prev) => ({
          ...prev,
          error: null,
          userFriendlyError: null,
          isRecovering: false,
        }));
        resolve();
      }, 100);
    });
  }, []);

  // Schedule automatic retry
  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setErrorState((prev) => ({
      ...prev,
      isRecovering: true,
    }));

    retryTimeoutRef.current = setTimeout(() => {
      retry();
    }, autoRetryDelay);
  }, [autoRetryDelay, retry]);

  // Mark as resolved
  const markResolved = useCallback(() => {
    if (showNotifications && errorState.error) {
      showSuccess('Issue Resolved', 'The problem has been fixed successfully.');
    }
    clearError();
  }, [clearError, showNotifications, showSuccess, errorState.error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...errorState,
    setError,
    clearError,
    retry,
    markResolved,
    canRetry: errorState.retryCount < maxRetries && errorState.userFriendlyError?.recoverable,
    hasError: !!errorState.error,
  };
};

/**
 * Hook for handling async operations with error state management
 */
export const useAsyncErrorState = <T = any>(options: ErrorStateOptions = {}) => {
  const errorState = useErrorState(options);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (
      operation: () => Promise<T>,
      operationOptions?: {
        onSuccess?: (data: T) => void;
        onError?: (error: Error) => void;
        autoRetry?: boolean;
        clearPreviousError?: boolean;
      }
    ): Promise<T | null> => {
      const {
        onSuccess,
        onError,
        autoRetry = false,
        clearPreviousError = true,
      } = operationOptions || {};

      if (clearPreviousError) {
        errorState.clearError();
      }

      setIsLoading(true);

      try {
        const result = await operation();
        setData(result);
        setIsLoading(false);

        onSuccess?.(result);

        // Mark as resolved if there was a previous error
        if (errorState.hasError) {
          errorState.markResolved();
        }

        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        setIsLoading(false);

        errorState.setError(errorObj, autoRetry);
        onError?.(errorObj);

        return null;
      }
    },
    [errorState]
  );

  const retryOperation = useCallback(
    async (operation: () => Promise<T>): Promise<T | null> => {
      await errorState.retry();
      return execute(operation, { clearPreviousError: false });
    },
    [errorState, execute]
  );

  return {
    ...errorState,
    isLoading,
    data,
    execute,
    retryOperation,
    setData,
  };
};

/**
 * Hook for handling form errors with field-specific error states
 */
export const useFormErrorState = (options: ErrorStateOptions = {}) => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const globalErrorState = useErrorState(options);

  const setFieldError = useCallback((field: string, error: string) => {
    setFieldErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const hasAnyErrors = hasFieldErrors || globalErrorState.hasError;

  const validateField = useCallback(
    (field: string, value: any, validator: (value: any) => string | null) => {
      const error = validator(value);
      if (error) {
        setFieldError(field, error);
        return false;
      } else {
        clearFieldError(field);
        return true;
      }
    },
    [setFieldError, clearFieldError]
  );

  return {
    ...globalErrorState,
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    hasFieldErrors,
    hasAnyErrors,
    validateField,
    getFieldError: (field: string) => fieldErrors[field] || null,
    hasFieldError: (field: string) => !!fieldErrors[field],
  };
};

/**
 * Hook for handling batch operations with individual error tracking
 */
export const useBatchErrorState = <T = any>(options: ErrorStateOptions = {}) => {
  const [batchState, setBatchState] = useState<{
    isLoading: boolean;
    results: Array<{ success: boolean; data?: T; error?: Error }>;
    completedCount: number;
    totalCount: number;
  }>({
    isLoading: false,
    results: [],
    completedCount: 0,
    totalCount: 0,
  });

  const globalErrorState = useErrorState(options);

  const executeBatch = useCallback(
    async (
      operations: Array<() => Promise<T>>,
      batchOptions?: {
        concurrent?: boolean;
        stopOnError?: boolean;
        onProgress?: (completed: number, total: number) => void;
        onItemComplete?: (
          index: number,
          result: { success: boolean; data?: T; error?: Error }
        ) => void;
      }
    ) => {
      const {
        concurrent = false,
        stopOnError = false,
        onProgress,
        onItemComplete,
      } = batchOptions || {};

      setBatchState({
        isLoading: true,
        results: [],
        completedCount: 0,
        totalCount: operations.length,
      });

      globalErrorState.clearError();

      const results: Array<{ success: boolean; data?: T; error?: Error }> = [];

      try {
        if (concurrent) {
          // Execute all operations concurrently
          const promises = operations.map(async (operation, index) => {
            try {
              const data = await operation();
              const result = { success: true, data };
              results[index] = result;
              onItemComplete?.(index, result);
              return result;
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              const result = { success: false, error: err };
              results[index] = result;
              onItemComplete?.(index, result);
              return result;
            }
          });

          await Promise.all(promises);
        } else {
          // Execute operations sequentially
          for (let i = 0; i < operations.length; i++) {
            try {
              const data = await operations[i]();
              const result = { success: true, data };
              results.push(result);
              onItemComplete?.(i, result);
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              const result = { success: false, error: err };
              results.push(result);
              onItemComplete?.(i, result);

              if (stopOnError) {
                break;
              }
            }

            setBatchState((prev) => ({
              ...prev,
              completedCount: i + 1,
              results: [...results],
            }));

            onProgress?.(i + 1, operations.length);
          }
        }

        const failedCount = results.filter((r) => !r.success).length;
        const successCount = results.filter((r) => r.success).length;

        setBatchState({
          isLoading: false,
          results,
          completedCount: results.length,
          totalCount: operations.length,
        });

        // Set global error if there were failures
        if (failedCount > 0) {
          const errorMessage = `${failedCount} of ${operations.length} operations failed`;
          globalErrorState.setError(new Error(errorMessage));
        }

        return {
          results,
          successCount,
          failedCount,
          totalCount: operations.length,
        };
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        globalErrorState.setError(errorObj);

        setBatchState((prev) => ({
          ...prev,
          isLoading: false,
        }));

        throw errorObj;
      }
    },
    [globalErrorState]
  );

  return {
    ...globalErrorState,
    ...batchState,
    executeBatch,
    progress:
      batchState.totalCount > 0 ? (batchState.completedCount / batchState.totalCount) * 100 : 0,
    hasFailures: batchState.results.some((r) => !r.success),
    successCount: batchState.results.filter((r) => r.success).length,
    failureCount: batchState.results.filter((r) => !r.success).length,
  };
};

export default useErrorState;
