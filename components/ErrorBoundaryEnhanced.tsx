import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
  featureName?: string;
  showDetails?: boolean;
  allowRetry?: boolean;
  allowReload?: boolean;
  allowReport?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  showDetails: boolean;
  retryCount: number;
}

export class ErrorBoundaryEnhanced extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by enhanced boundary:', error);
      console.error('Error info:', errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to analytics/monitoring service
    this.logError(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorData = {
        errorId: this.state.errorId,
        level: this.props.level || 'component',
        featureName: this.props.featureName,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.state.retryCount,
      };

      // Store locally for debugging
      const existingErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      existingErrors.push(errorData);

      // Keep only last 20 errors
      if (existingErrors.length > 20) {
        existingErrors.splice(0, existingErrors.length - 20);
      }

      localStorage.setItem('app_errors', JSON.stringify(existingErrors));

      // Send to error tracking service in production
      if (process.env.NODE_ENV === 'production') {
        // This would integrate with services like Sentry, LogRocket, etc.
        console.log('Error logged:', errorData);
      }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        showDetails: false,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;

    const errorReport = {
      errorId,
      level: this.props.level || 'component',
      featureName: this.props.featureName,
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      componentStack: errorInfo?.componentStack || 'No component stack',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount,
    };

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2)).then(() => {
      alert('Error report copied to clipboard! Please paste it when reporting the issue.');
    });
  };

  private toggleDetails = () => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  private getErrorSeverity = (): 'low' | 'medium' | 'high' | 'critical' => {
    const { level } = this.props;
    const { error } = this.state;

    if (level === 'page') return 'critical';
    if (level === 'section') return 'high';

    // Check error type
    if (error?.message.includes('ChunkLoadError') || error?.message.includes('Loading chunk')) {
      return 'medium'; // Code splitting errors
    }

    if (error?.message.includes('Network Error') || error?.message.includes('fetch')) {
      return 'medium'; // Network errors
    }

    return 'low'; // Component-level errors
  };

  private getErrorIcon = () => {
    const _severity = this.getErrorSeverity();

    switch (severity) {
      case 'critical':
        return '💀';
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      default:
        return '🐛';
    }
  };

  private getErrorTitle = () => {
    const { featureName, level } = this.props;
    const _severity = this.getErrorSeverity();

    if (featureName) {
      return `${featureName} Error ${this.getErrorIcon()}`;
    }

    switch (level) {
      case 'page':
        return `Page Error ${this.getErrorIcon()}`;
      case 'section':
        return `Section Error ${this.getErrorIcon()}`;
      default:
        return `Component Error ${this.getErrorIcon()}`;
    }
  };

  private getErrorMessage = () => {
    const { error } = this.state;
    const { level, featureName } = this.props;

    if (error?.message.includes('ChunkLoadError') || error?.message.includes('Loading chunk')) {
      return 'Failed to load application code. This might be due to a network issue or an app update.';
    }

    if (error?.message.includes('Network Error') || error?.message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }

    if (level === 'page') {
      return 'This page encountered an unexpected error and cannot be displayed.';
    }

    if (featureName) {
      return `The ${featureName} feature encountered an error. Other features should still work normally.`;
    }

    return 'A component on this page encountered an error. The rest of the page should still work.';
  };

  private getRecoveryOptions = () => {
    const { allowRetry = true, allowReload = true, allowReport = true } = this.props;
    const { retryCount } = this.state;
    const _severity = this.getErrorSeverity();

    return {
      showRetry: allowRetry && retryCount < this.maxRetries,
      showReload: allowReload && (severity === 'high' || severity === 'critical'),
      showReport: allowReport,
      showDetails: this.props.showDetails !== false,
    };
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const _severity = this.getErrorSeverity();
      const options = this.getRecoveryOptions();
      const { error, errorInfo: _errorInfo, errorId, showDetails } = this.state;

      // For critical errors, show full-screen error
      if (severity === 'critical') {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 relative">
            {/* Background effects */}
            <div className="fixed inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-purple-900/20 to-pink-900/20" />
            </div>

            <div className="max-w-lg w-full glass-card p-6 relative sparkles neon-glow">
              {/* Sparkle effects */}
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute text-red-400 animate-pulse"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                    }}
                  >
                    💀
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold holo-text">{this.getErrorTitle()}</h1>
                  <p className="text-sm text-white/70">Error ID: {errorId}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-white/80 mb-4">{this.getErrorMessage()}</p>

                {options.showDetails && (
                  <div className="mb-4">
                    <button
                      onClick={this.toggleDetails}
                      className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {showDetails ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      {showDetails ? 'Hide' : 'Show'} Technical Details
                    </button>

                    {showDetails && error && (
                      <div className="mt-3 bg-black/30 p-3 rounded text-xs font-mono overflow-auto max-h-32">
                        <div className="text-red-400 font-semibold mb-2">{error.message}</div>
                        {process.env.NODE_ENV === 'development' && (
                          <div className="text-white/70">{error.stack}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {options.showRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full holo-button flex items-center justify-center gap-2 sparkles"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again ✨ ({this.maxRetries - this.state.retryCount} attempts left)
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {options.showReload && (
                    <button
                      onClick={this.handleReload}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-glass-purple border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      Reload 🏠
                    </button>
                  )}

                  {options.showReport && (
                    <button
                      onClick={this.handleReportError}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-pink-400/50 text-pink-300 rounded-lg hover:bg-pink-500/10 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Report 📋
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/20">
                <p className="text-xs text-white/60 text-center">
                  If this problem persists, please contact support with the error ID above. 💌
                </p>
              </div>
            </div>
          </div>
        );
      }

      // For non-critical errors, show inline error component
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-red-900 mb-1">{this.getErrorTitle()}</h3>

              <p className="text-sm text-red-700 mb-3">{this.getErrorMessage()}</p>

              {options.showDetails && (
                <div className="mb-3">
                  <button
                    onClick={this.toggleDetails}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 transition-colors"
                  >
                    {showDetails ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {showDetails ? 'Hide' : 'Show'} Details
                  </button>

                  {showDetails && error && (
                    <div className="mt-2 bg-red-100 p-2 rounded text-xs font-mono overflow-auto max-h-24">
                      <div className="text-red-800 font-semibold">{error.message}</div>
                      {process.env.NODE_ENV === 'development' && (
                        <div className="text-red-600 mt-1 text-xs">
                          {error.stack?.split('\n').slice(0, 3).join('\n')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {options.showRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry ({this.maxRetries - this.state.retryCount} left)
                  </button>
                )}

                {options.showReport && (
                  <button
                    onClick={this.handleReportError}
                    className="flex items-center gap-1 px-3 py-1 border border-red-300 text-red-700 text-sm rounded hover:bg-red-50 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Report
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with enhanced error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryEnhanced {...options}>
      <Component {...props} />
    </ErrorBoundaryEnhanced>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Specialized error boundaries for different use cases
 */
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryEnhanced level="page" allowRetry={true} allowReload={true}>
    {children}
  </ErrorBoundaryEnhanced>
);

export const SectionErrorBoundary: React.FC<{
  children: ReactNode;
  sectionName: string;
  onRetry?: () => void;
}> = ({ children, sectionName, onRetry }) => (
  <ErrorBoundaryEnhanced
    level="section"
    featureName={sectionName}
    allowRetry={true}
    allowReload={false}
    onError={(error, errorInfo) => {
      console.error(`Section error in ${sectionName}:`, error, errorInfo);
      if (onRetry) {
        // Auto-retry after a delay for section errors
        setTimeout(onRetry, 2000);
      }
    }}
  >
    {children}
  </ErrorBoundaryEnhanced>
);

export const ComponentErrorBoundary: React.FC<{
  children: ReactNode;
  componentName: string;
}> = ({ children, componentName }) => (
  <ErrorBoundaryEnhanced
    level="component"
    featureName={componentName}
    allowRetry={true}
    allowReload={false}
    showDetails={false}
  >
    {children}
  </ErrorBoundaryEnhanced>
);

export default ErrorBoundaryEnhanced;
