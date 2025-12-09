import React from 'react';
import { SectionErrorBoundary, ComponentErrorBoundary } from './ErrorBoundaryEnhanced';
import { useLoading, LoadingIndicator } from './LoadingStateManager';
import { useNotificationHelpers } from './NotificationSystem';
import { useErrorState, useAsyncErrorState } from '../hooks/useErrorState';
import { useErrorRecovery } from '../hooks/useErrorRecovery';

/**
 * Example component demonstrating enhanced error handling features
 */
export const EnhancedErrorExample: React.FC = () => {
  const { setLoading } = useLoading();
  const { showSuccess, showError } = useNotificationHelpers();
  const errorState = useErrorState({
    component: 'EnhancedErrorExample',
    feature: 'demo',
    showNotifications: true,
  });

  const asyncErrorState = useAsyncErrorState({
    component: 'EnhancedErrorExample',
    feature: 'async_demo',
  });

  const errorRecovery = useErrorRecovery(
    async () => {
      // Simulate an operation that might fail
      if (Math.random() > 0.7) {
        throw new Error('Random failure for demo');
      }
      return 'Success!';
    },
    {
      maxRetries: 3,
      onError: (error, attempt) => {
        console.log(`Attempt ${attempt} failed:`, error.message);
      },
      onSuccess: (result, attempt) => {
        console.log(`Success on attempt ${attempt}:`, result);
      },
    }
  );

  const handleSimulateError = () => {
    const errors = [
      'Network connection failed',
      'Authentication required',
      'Rate limit exceeded',
      'Server error occurred',
      'Validation failed',
      'Timeout error',
    ];

    const randomError = errors[Math.floor(Math.random() * errors.length)];
    errorState.setError(new Error(randomError));
  };

  const handleAsyncOperation = async () => {
    await asyncErrorState.execute(
      async () => {
        setLoading('demo_operation', true, 'Processing demo operation...');

        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Randomly fail
        if (Math.random() > 0.6) {
          throw new Error('Async operation failed');
        }

        setLoading('demo_operation', false);
        return { message: 'Async operation completed successfully!' };
      },
      {
        onSuccess: (data) => {
          showSuccess('Success!', data.message);
        },
        autoRetry: true,
      }
    );
  };

  const handleErrorRecovery = async () => {
    try {
      const result = await errorRecovery.execute();
      showSuccess('Recovery Success!', `Operation completed: ${result}`);
    } catch {
      showError('Recovery Failed', 'All retry attempts exhausted');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Enhanced Error Handling Demo</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Error State Demo */}
          <SectionErrorBoundary sectionName="Error State Demo">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Error State Management</h3>

              {errorState.hasError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-red-900">
                        {errorState.userFriendlyError?.title}
                      </h4>
                      <p className="text-sm text-red-700 mt-1">
                        {errorState.userFriendlyError?.message}
                      </p>
                      {errorState.userFriendlyError?.action && (
                        <p className="text-xs text-red-600 mt-2">
                          💡 {errorState.userFriendlyError.action}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={errorState.clearError}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>

                  {errorState.canRetry && (
                    <button
                      onClick={errorState.retry}
                      disabled={errorState.isRecovering}
                      className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {errorState.isRecovering ? 'Retrying...' : 'Retry'}
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleSimulateError}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Simulate Error
                </button>

                <div className="text-xs text-gray-600">Retry count: {errorState.retryCount}</div>
              </div>
            </div>
          </SectionErrorBoundary>

          {/* Async Error State Demo */}
          <SectionErrorBoundary sectionName="Async Error State Demo">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Async Operations</h3>

              <LoadingIndicator
                operationKey="demo_operation"
                showLabel={true}
                showProgress={false}
                showTime={true}
              />

              {asyncErrorState.data && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800">{asyncErrorState.data.message}</p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleAsyncOperation}
                  disabled={asyncErrorState.isLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {asyncErrorState.isLoading ? 'Processing...' : 'Start Async Operation'}
                </button>

                {asyncErrorState.hasError && asyncErrorState.canRetry && (
                  <button
                    onClick={() =>
                      asyncErrorState.retryOperation(async () => {
                        // Retry the same operation
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                        return { message: 'Retry successful!' };
                      })
                    }
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    Retry Operation
                  </button>
                )}
              </div>
            </div>
          </SectionErrorBoundary>

          {/* Error Recovery Demo */}
          <SectionErrorBoundary sectionName="Error Recovery Demo">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Automatic Error Recovery</h3>

              {errorRecovery.error && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-orange-800 text-sm">
                    Attempt {errorRecovery.attempt}: {errorRecovery.error.message}
                  </p>
                  {errorRecovery.hasReachedMaxRetries && (
                    <p className="text-red-600 text-xs mt-1">Max retries reached</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleErrorRecovery}
                  disabled={errorRecovery.isLoading}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {errorRecovery.isLoading ? 'Attempting...' : 'Test Error Recovery'}
                </button>

                <div className="text-xs text-gray-600">Attempts: {errorRecovery.attempt} / 3</div>

                {errorRecovery.canRetry && (
                  <button
                    onClick={errorRecovery.retry}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Manual Retry
                  </button>
                )}
              </div>
            </div>
          </SectionErrorBoundary>

          {/* Component Error Boundary Demo */}
          <ComponentErrorBoundary componentName="Problematic Component">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Component Error Boundary</h3>

              <ProblematicComponent />
            </div>
          </ComponentErrorBoundary>
        </div>
      </div>
    </div>
  );
};

/**
 * Component that can throw errors for demonstration
 */
const ProblematicComponent: React.FC = () => {
  const [shouldError, setShouldError] = React.useState(false);

  if (shouldError) {
    throw new Error('Intentional component error for demo');
  }

  return (
    <div className="space-y-2">
      <p className="text-gray-600 text-sm">This component is wrapped in an error boundary.</p>

      <button
        onClick={() => setShouldError(true)}
        className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Trigger Component Error
      </button>
    </div>
  );
};

export default EnhancedErrorExample;
