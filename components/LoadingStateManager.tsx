import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Loader, AlertCircle, CheckCircle} from 'lucide-react';

export interface LoadingState {
  [key: string]: boolean | undefined;
}

export interface LoadingOperation {
  id: string;
  label: string;
  progress?: number; // 0-100
  status: 'loading' | 'success' | 'error' | 'idle';
  error?: string;
  startTime: number;
  estimatedDuration?: number; // in milliseconds
  metadata?: Record<string, any>;
}

interface LoadingContextType {
  loadingStates: LoadingState;
  operations: Record<string, LoadingOperation>;
  setLoading: (key: string, loading: boolean, label?: string, estimatedDuration?: number) => void;
  updateProgress: (key: string, progress: number) => void;
  setError: (key: string, error: string) => void;
  setSuccess: (key: string) => void;
  clearOperation: (key: string) => void;
  clearAll: () => void;
  isLoading: (key?: string) => boolean;
  getOperation: (key: string) => LoadingOperation | undefined;
  getAllOperations: () => LoadingOperation[];
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});
  const [operations, setOperations] = useState<Record<string, LoadingOperation>>({});

  const setLoading = useCallback(
    (key: string, loading: boolean, label?: string, estimatedDuration?: number) => {
      setLoadingStates((prev) => ({ ...prev, [key]: loading }));

      if (loading) {
        setOperations((prev) => ({
          ...prev,
          [key]: {
            id: key,
            label: label || key,
            status: 'loading',
            startTime: Date.now(),
            estimatedDuration,
            progress: 0,
          },
        }));
      } else {
        setOperations((prev) => {
          const operation = prev[key];
          if (operation) {
            return {
              ...prev,
              [key]: {
                ...operation,
                status: operation.status === 'error' ? 'error' : 'success',
                progress: 100,
              },
            };
          }
          return prev;
        });

        // Clear operation after a delay
        setTimeout(() => {
          setOperations((prev) => {
            const { [key]: _removed, ...rest } = prev;
            return rest;
          });
        }, 2000);
      }
    },
    []
  );

  const updateProgress = useCallback((key: string, progress: number) => {
    setOperations((prev) => {
      const operation = prev[key];
      if (operation) {
        return {
          ...prev,
          [key]: {
            ...operation,
            progress: Math.max(0, Math.min(100, progress)),
          },
        };
      }
      return prev;
    });
  }, []);

  const setError = useCallback((key: string, error: string) => {
    setLoadingStates((prev) => ({ ...prev, [key]: false }));
    setOperations((prev) => {
      const operation = prev[key];
      if (operation) {
        return {
          ...prev,
          [key]: {
            ...operation,
            status: 'error',
            error,
            progress: 0,
          },
        };
      }
      return prev;
    });
  }, []);

  const setSuccess = useCallback((key: string) => {
    setLoadingStates((prev) => ({ ...prev, [key]: false }));
    setOperations((prev) => {
      const operation = prev[key];
      if (operation) {
        return {
          ...prev,
          [key]: {
            ...operation,
            status: 'success',
            progress: 100,
          },
        };
      }
      return prev;
    });
  }, []);

  const clearOperation = useCallback((key: string) => {
    setLoadingStates((prev) => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
    setOperations((prev) => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAll = useCallback(() => {
    setLoadingStates({});
    setOperations({});
  }, []);

  const isLoading = useCallback(
    (key?: string) => {
      if (key) {
        return Boolean(loadingStates[key]);
      }
      return Object.values(loadingStates).some(Boolean);
    },
    [loadingStates]
  );

  const getOperation = useCallback(
    (key: string) => {
      return operations[key];
    },
    [operations]
  );

  const getAllOperations = useCallback(() => {
    return Object.values(operations);
  }, [operations]);

  return (
    <LoadingContext.Provider
      value={{
        loadingStates,
        operations,
        setLoading,
        updateProgress,
        setError,
        setSuccess,
        clearOperation,
        clearAll,
        isLoading,
        getOperation,
        getAllOperations,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

/**
 * Loading indicator component with enhanced features
 */
export const LoadingIndicator: React.FC<{
  operationKey?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showProgress?: boolean;
  showTime?: boolean;
  className?: string;
}> = ({
  operationKey,
  size = 'medium',
  showLabel = true,
  showProgress = true,
  showTime = false,
  className = '',
}) => {
  const { getOperation, isLoading } = useLoading();
  const operation = operationKey ? getOperation(operationKey) : undefined;
  const loading = operationKey ? isLoading(operationKey) : false;

  if (!loading && !operation) {
    return null;
  }

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  const getElapsedTime = () => {
    if (!operation) return '';
    const elapsed = Date.now() - operation.startTime;
    return `${Math.floor(elapsed / 1000)}s`;
  };

  const getEstimatedRemaining = () => {
    if (!operation?.estimatedDuration || !operation.progress) return '';
    const elapsed = Date.now() - operation.startTime;
    const progressRatio = operation.progress / 100;
    const estimatedTotal = elapsed / progressRatio;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    return `~${Math.floor(remaining / 1000)}s left`;
  };

  const getStatusIcon = () => {
    if (!operation) {
      return <Loader className={`${sizeClasses[size]} animate-spin text-blue-500`} />;
    }

    switch (operation.status) {
      case 'loading':
        return <Loader className={`${sizeClasses[size]} animate-spin text-blue-500`} />;
      case 'success':
        return <CheckCircle className={`${sizeClasses[size]} text-green-500`} />;
      case 'error':
        return <AlertCircle className={`${sizeClasses[size]} text-red-500`} />;
      default:
        return <Loader className={`${sizeClasses[size]} animate-spin text-gray-500`} />;
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {getStatusIcon()}

      <div className="flex-1 min-w-0">
        {showLabel && operation && (
          <div className="text-sm font-medium text-gray-700 truncate">{operation.label}</div>
        )}

        {showProgress && operation && typeof operation.progress === 'number' && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${operation.progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 min-w-0">{Math.round(operation.progress)}%</span>
          </div>
        )}

        {showTime && operation && (
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{getElapsedTime()}</span>
            {operation.estimatedDuration && operation.progress && (
              <span className="text-gray-400">• {getEstimatedRemaining()}</span>
            )}
          </div>
        )}

        {operation?.error && (
          <div className="text-xs text-red-600 mt-1 truncate">{operation.error}</div>
        )}
      </div>
    </div>
  );
};

/**
 * Global loading overlay for critical operations
 */
export const GlobalLoadingOverlay: React.FC<{
  operationKey?: string;
  message?: string;
  allowCancel?: boolean;
  onCancel?: () => void;
}> = ({ operationKey, message, allowCancel = false, onCancel }) => {
  const { getOperation, isLoading } = useLoading();
  const operation = operationKey ? getOperation(operationKey) : undefined;
  const loading = operationKey ? isLoading(operationKey) : false;

  if (!loading && !operation) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="mb-4">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {operation?.label || 'Loading...'}
          </h3>

          {message && <p className="text-sm text-gray-600 mb-4">{message}</p>}

          {operation && typeof operation.progress === 'number' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{Math.round(operation.progress)}%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${operation.progress}%` }}
                />
              </div>
            </div>
          )}

          {allowCancel && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Loading skeleton component
 */
export const LoadingSkeleton: React.FC<{
  lines?: number;
  height?: string;
  className?: string;
}> = ({ lines = 3, height = 'h-4', className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`bg-gray-200 rounded ${height} ${i < lines - 1 ? 'mb-2' : ''}`}
          style={{
            width: i === lines - 1 ? '75%' : '100%',
          }}
        />
      ))}
    </div>
  );
};

/**
 * Hook for managing async operations with loading states
 */
export const useAsyncOperation = () => {
  const { setLoading, updateProgress, setError, setSuccess } = useLoading();

  const executeWithLoading = useCallback(
    async <T,>(
      operationKey: string,
      operation: (updateProgress?: (progress: number) => void) => Promise<T>,
      options?: {
        label?: string;
        estimatedDuration?: number;
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
      }
    ): Promise<T> => {
      try {
        setLoading(operationKey, true, options?.label, options?.estimatedDuration);

        const progressCallback = (progress: number) => {
          updateProgress(operationKey, progress);
        };

        const result = await operation(progressCallback);

        setSuccess(operationKey);
        options?.onSuccess?.(result);

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Operation failed';
        setError(operationKey, errorMessage);
        options?.onError?.(error instanceof Error ? error : new Error(errorMessage));
        throw error;
      }
    },
    [setLoading, updateProgress, setError, setSuccess]
  );

  return { executeWithLoading };
};

/**
 * Batch loading operations manager
 */
export const useBatchOperations = () => {
  const { setLoading, setError, setSuccess, clearAll } = useLoading();

  const executeBatch = useCallback(
    async <T,>(
      operations: Array<{
        key: string;
        label: string;
        operation: () => Promise<T>;
      }>,
      options?: {
        concurrent?: boolean;
        stopOnError?: boolean;
        onProgress?: (completed: number, total: number) => void;
      }
    ): Promise<Array<{ key: string; result?: T; error?: Error }>> => {
      const results: Array<{ key: string; result?: T; error?: Error }> = [];

      // Start all operations
      operations.forEach(({ key, label }) => {
        setLoading(key, true, label);
      });

      try {
        if (options?.concurrent) {
          // Execute all operations concurrently
          const promises = operations.map(async ({ key, operation }) => {
            try {
              const result = await operation();
              setSuccess(key);
              return { key, result };
            } catch (error) {
              const err = error instanceof Error ? error : new Error('Operation failed');
              setError(key, err.message);
              return { key, error: err };
            }
          });

          const batchResults = await Promise.all(promises);
          results.push(...batchResults);
        } else {
          // Execute operations sequentially
          for (let i = 0; i < operations.length; i++) {
            const { key, operation } = operations[i];

            try {
              const result = await operation();
              setSuccess(key);
              results.push({ key, result });
            } catch (error) {
              const err = error instanceof Error ? error : new Error('Operation failed');
              setError(key, err.message);
              results.push({ key, error: err });

              if (options?.stopOnError) {
                break;
              }
            }

            options?.onProgress?.(i + 1, operations.length);
          }
        }
      } catch (error) {
        console.error('Batch operation error:', error);
      }

      return results;
    },
    [setLoading, setError, setSuccess]
  );

  return { executeBatch };
};

export default LoadingProvider;
