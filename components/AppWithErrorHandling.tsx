import React, { useEffect, useState } from 'react';
import { ErrorBoundaryEnhanced, PageErrorBoundary } from './ErrorBoundaryEnhanced';
import { LoadingProvider } from './LoadingStateManager';
import { NotificationProvider, useNotificationHelpers } from './NotificationSystem';
import { FeedbackWidget, FeedbackButton, useFeedback } from './UserFeedbackSystem';
import { useErrorReporting } from './ErrorReportingSystem';
import { errorHandler } from '../services/errorHandlingService';
import App from '../App';

/**
 * Enhanced App wrapper with comprehensive error handling, loading states, and user feedback
 */
const AppWithErrorHandling: React.FC = () => {
  const { isOpen: isFeedbackOpen, openFeedback, closeFeedback, submitFeedback } = useFeedback();
  const { reportError } = useErrorReporting();
  const [globalError, setGlobalError] = useState<Error | null>(null);

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);

      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

      reportError(error, {
        type: 'unhandled_promise_rejection',
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });

      // Log to error handling service
      errorHandler.logError('Unhandled promise rejection', error, {
        operation: 'global_error_handler',
        errorType: 'unhandled_promise_rejection',
      });

      // Prevent the default browser behavior
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);

      const error = event.error instanceof Error ? event.error : new Error(event.message);

      reportError(error, {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });

      // Log to error handling service
      errorHandler.logError('Global JavaScript error', error, {
        operation: 'global_error_handler',
        errorType: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // Add global error listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [reportError]);

  // Handle critical errors that should show global error state
  const handleCriticalError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Critical error caught by boundary:', error, errorInfo);

    reportError(error, {
      type: 'critical_error',
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Log to error handling service
    errorHandler.logError('Critical application error', error, {
      operation: 'critical_error_handler',
      errorType: 'critical_error',
      componentStack: errorInfo.componentStack,
    });

    setGlobalError(error);
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (feedbackData: Parameters<typeof submitFeedback>[0]) => {
    try {
      await submitFeedback(feedbackData);

      // In a real app, this would send to your backend
      console.log('Feedback submitted:', feedbackData);

      // Log feedback submission
      errorHandler.logError(
        'User feedback submitted',
        new Error('Feedback'),
        {
          operation: 'feedback_submission',
          errorType: 'user_feedback',
          feedbackType: feedbackData.type,
          feedbackTitle: feedbackData.title,
        },
        'info'
      );
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  };

  // If there's a critical error, show global error state
  if (globalError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-900/20 via-purple-900/20 to-pink-900/20">
        <div className="max-w-lg w-full glass-card p-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💀</span>
          </div>

          <h1 className="text-xl font-semibold text-white mb-2">Application Error</h1>

          <p className="text-white/80 mb-6">
            The application encountered a critical error and needs to be reloaded.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors"
            >
              Reload Application
            </button>

            <button
              onClick={() => openFeedback('error', { errorId: globalError.message })}
              className="w-full border border-white/20 text-white py-2 px-4 rounded-lg hover:bg-white/10 transition-colors"
            >
              Report This Error
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <LoadingProvider>
        <PageErrorBoundary>
          <ErrorBoundaryEnhanced
            level="page"
            onError={handleCriticalError}
            allowRetry={true}
            allowReload={true}
            allowReport={true}
          >
            <App />

            {/* Feedback System */}
            <FeedbackButton onClick={() => openFeedback()} position="bottom-right" />

            <FeedbackWidget
              isOpen={isFeedbackOpen}
              onClose={closeFeedback}
              onSubmit={handleFeedbackSubmit}
              position="bottom-right"
            />
          </ErrorBoundaryEnhanced>
        </PageErrorBoundary>
      </LoadingProvider>
    </NotificationProvider>
  );
};

/**
 * Enhanced notification wrapper component
 */
export const AppNotificationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showError, showSuccess, showWarning, showInfo } = useNotificationHelpers();

  // Global notification handlers
  useEffect(() => {
    // Listen for custom events to show notifications
    const handleShowNotification = (event: CustomEvent) => {
      const { type, title, message, options } = event.detail;

      switch (type) {
        case 'error':
          showError(title, message, options);
          break;
        case 'success':
          showSuccess(title, message, options);
          break;
        case 'warning':
          showWarning(title, message, options);
          break;
        case 'info':
          showInfo(title, message, options);
          break;
      }
    };

    window.addEventListener('show-notification', handleShowNotification as EventListener);

    return () => {
      window.removeEventListener('show-notification', handleShowNotification as EventListener);
    };
  }, [showError, showSuccess, showWarning, showInfo]);

  return <>{children}</>;
};

/**
 * Utility function to show notifications from anywhere in the app
 */
export const showGlobalNotification = (
  type: 'error' | 'success' | 'warning' | 'info',
  title: string,
  message?: string,
  options?: Record<string, unknown>
) => {
  const event = new CustomEvent('show-notification', {
    detail: { type, title, message, options },
  });
  window.dispatchEvent(event);
};

export default AppWithErrorHandling;
