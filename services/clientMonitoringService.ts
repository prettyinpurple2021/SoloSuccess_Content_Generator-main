/**
 * Client-Side Monitoring Service
 *
 * Collects and sends client-side performance metrics and errors to the monitoring system
 */

interface WebVitalsMetric {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface ErrorInfo {
  message: string;
  stack?: string;
  component?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

class ClientMonitoringService {
  private isEnabled: boolean;
  private apiEndpoint: string;
  private sessionId: string;
  private userId?: string;
  private metricsQueue: Array<{ type: string; data: Record<string, unknown>; timestamp: number }> =
    [];
  private flushInterval: number = 30000; // 30 seconds
  private maxQueueSize: number = 100;

  constructor() {
    this.isEnabled = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';
    this.apiEndpoint = '/api/monitoring/metrics';
    this.sessionId = this.generateSessionId();

    if (this.isEnabled) {
      this.initializeMonitoring();
    }
  }

  /**
   * Initialize client-side monitoring
   */
  private initializeMonitoring(): void {
    // Set up Web Vitals monitoring
    this.initializeWebVitals();

    // Set up error monitoring
    this.initializeErrorMonitoring();

    // Set up performance monitoring
    this.initializePerformanceMonitoring();

    // Set up periodic metrics flushing
    this.initializeMetricsFlush();

    // Set up page visibility monitoring
    this.initializeVisibilityMonitoring();
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals(): void {
    // This would integrate with web-vitals library
    // For now, we'll use Performance Observer API

    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      this.observePerformanceEntry('largest-contentful-paint', (entries) => {
        const lastEntry = entries[entries.length - 1];
        this.recordWebVital('LCP', lastEntry.startTime);
      });

      // First Input Delay (FID)
      this.observePerformanceEntry('first-input', (entries) => {
        const firstEntry = entries[0];
        this.recordWebVital('FID', firstEntry.processingStart - firstEntry.startTime);
      });

      // Cumulative Layout Shift (CLS)
      this.observePerformanceEntry('layout-shift', (entries) => {
        let clsValue = 0;
        entries.forEach(
          (entry: PerformanceEntry & { hadRecentInput?: boolean; value?: number }) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value || 0;
            }
          }
        );
        this.recordWebVital('CLS', clsValue);
      });
    }

    // Time to First Byte (TTFB)
    if ('performance' in window && 'timing' in window.performance) {
      window.addEventListener('load', () => {
        const timing = window.performance.timing;
        const ttfb = timing.responseStart - timing.navigationStart;
        this.recordWebVital('TTFB', ttfb);
      });
    }
  }

  /**
   * Observe performance entries
   */
  private observePerformanceEntry(
    type: string,
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type, buffered: true });
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  /**
   * Record Web Vital metric
   */
  private recordWebVital(name: string, value: number): void {
    const rating = this.getWebVitalRating(name, value);

    const metric: WebVitalsMetric = {
      name,
      value,
      id: this.generateMetricId(),
      delta: value, // For simplicity, using value as delta
      rating,
    };

    this.queueMetric('web-vitals', {
      ...metric,
      pathname: window.location.pathname,
      sessionId: this.sessionId,
      userId: this.userId,
    });
  }

  /**
   * Get Web Vital rating based on thresholds
   */
  private getWebVitalRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Initialize error monitoring
   */
  private initializeErrorMonitoring(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.recordError({
        message: event.message,
        stack: event.error?.stack,
        component: 'global',
        severity: 'high',
        url: event.filename,
        userAgent: navigator.userAgent,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        message: `Unhandled promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
        component: 'promise',
        severity: 'high',
        userAgent: navigator.userAgent,
      });
    });

    // React error boundary integration (if using React)
    if (typeof window !== 'undefined' && 'React' in window) {
      this.setupReactErrorBoundary();
    }
  }

  /**
   * Set up React error boundary integration
   */
  private setupReactErrorBoundary(): void {
    // This would be integrated with React Error Boundary
    // For now, we'll just set up a global handler
    (
      window as {
        __REACT_ERROR_HANDLER__?: (error: Error, errorInfo: { componentStack?: string }) => void;
      }
    ).__REACT_ERROR_HANDLER__ = (error: Error, errorInfo: { componentStack?: string }) => {
      this.recordError({
        message: error.message,
        stack: error.stack,
        component: errorInfo.componentStack?.split('\n')[1]?.trim() || 'react',
        severity: 'high',
      });
    };
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
        const firstPaint = this.getFirstPaintTime();

        this.queueMetric('custom', {
          metrics: [
            {
              name: 'page_load_time',
              value: loadTime,
              tags: { page: window.location.pathname },
              unit: 'ms',
            },
            {
              name: 'dom_content_loaded',
              value: domContentLoaded,
              tags: { page: window.location.pathname },
              unit: 'ms',
            },
            {
              name: 'first_paint',
              value: firstPaint,
              tags: { page: window.location.pathname },
              unit: 'ms',
            },
          ],
        });
      }, 0);
    });

    // Monitor resource loading
    if ('PerformanceObserver' in window) {
      this.observePerformanceEntry('resource', (entries) => {
        entries.forEach(
          (entry: PerformanceEntry & { duration?: number; initiatorType?: string }) => {
            if ((entry.duration || 0) > 1000) {
              // Only track slow resources
              this.queueMetric('custom', {
                metrics: [
                  {
                    name: 'slow_resource_load',
                    value: entry.duration || 0,
                    tags: {
                      resource: entry.name,
                      type: entry.initiatorType || 'unknown',
                    },
                    unit: 'ms',
                  },
                ],
              });
            }
          }
        );
      });
    }
  }

  /**
   * Get first paint time
   */
  private getFirstPaintTime(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find((entry) => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  /**
   * Initialize metrics flushing
   */
  private initializeMetricsFlush(): void {
    // Flush metrics periodically
    setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);

    // Flush metrics on page unload
    window.addEventListener('beforeunload', () => {
      this.flushMetrics(true);
    });

    // Flush metrics when queue is full
    setInterval(() => {
      if (this.metricsQueue.length >= this.maxQueueSize) {
        this.flushMetrics();
      }
    }, 5000);
  }

  /**
   * Initialize page visibility monitoring
   */
  private initializeVisibilityMonitoring(): void {
    let visibilityStart = Date.now();
    let isVisible = !document.hidden;

    document.addEventListener('visibilitychange', () => {
      const now = Date.now();

      if (document.hidden && isVisible) {
        // Page became hidden
        const visibleTime = now - visibilityStart;
        this.queueMetric('custom', {
          metrics: [
            {
              name: 'page_visible_time',
              value: visibleTime,
              tags: { page: window.location.pathname },
              unit: 'ms',
            },
          ],
        });
        isVisible = false;
      } else if (!document.hidden && !isVisible) {
        // Page became visible
        visibilityStart = now;
        isVisible = true;
      }
    });
  }

  /**
   * Record an error
   */
  recordError(errorInfo: ErrorInfo): void {
    if (!this.isEnabled) return;

    this.queueMetric('error', {
      ...errorInfo,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  /**
   * Record custom metric
   */
  recordCustomMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
    unit?: string
  ): void {
    if (!this.isEnabled) return;

    this.queueMetric('custom', {
      metrics: [
        {
          name,
          value,
          tags: {
            ...tags,
            sessionId: this.sessionId,
            userId: this.userId || 'anonymous',
          },
          unit,
        },
      ],
    });
  }

  /**
   * Record API call performance
   */
  recordApiCall(endpoint: string, method: string, responseTime: number, statusCode: number): void {
    if (!this.isEnabled) return;

    this.queueMetric('api-performance', {
      endpoint,
      method,
      responseTime,
      statusCode,
      sessionId: this.sessionId,
      userId: this.userId,
      userAgent: navigator.userAgent,
    });
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Queue metric for sending
   */
  private queueMetric(type: string, data: Record<string, unknown>): void {
    this.metricsQueue.push({
      type,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Flush queued metrics to server
   */
  private async flushMetrics(isBeforeUnload: boolean = false): Promise<void> {
    if (this.metricsQueue.length === 0) return;

    const metricsToSend = [...this.metricsQueue];
    this.metricsQueue = [];

    try {
      const requests = metricsToSend.map((metric) =>
        this.sendMetric(metric.type, metric.data, isBeforeUnload)
      );

      if (isBeforeUnload) {
        // Use sendBeacon for reliability during page unload
        requests.forEach((request) => request.catch(() => {})); // Ignore errors during unload
      } else {
        await Promise.allSettled(requests);
      }
    } catch (error) {
      console.warn('Failed to flush metrics:', error);
      // Re-queue failed metrics (up to a limit)
      if (this.metricsQueue.length < this.maxQueueSize / 2) {
        this.metricsQueue.unshift(...metricsToSend.slice(0, 10));
      }
    }
  }

  /**
   * Send individual metric to server
   */
  private async sendMetric(
    type: string,
    data: Record<string, unknown>,
    useBeacon: boolean = false
  ): Promise<void> {
    const payload = { type, data };

    if (useBeacon && 'sendBeacon' in navigator) {
      navigator.sendBeacon(this.apiEndpoint, JSON.stringify(payload));
      return;
    }

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: useBeacon,
    });

    if (!response.ok) {
      throw new Error(`Failed to send metric: ${response.status}`);
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${this.secureRandomString(9)}`;
  }

  /**
   * Generate metric ID
   */
  private generateMetricId(): string {
    return `metric_${Date.now()}_${this.secureRandomString(9)}`;
  }
  /**
   * Generate a cryptographically secure random string.
   */
  private secureRandomString(length: number): string {
    let randomStr = '';
    const charsetSize = 36;
    const maxValue = Math.floor(256 / charsetSize) * charsetSize; // 252

    // Use browser crypto API if available
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      // Browser: use window.crypto
      while (randomStr.length < length) {
        const arr = new Uint8Array(1);
        window.crypto.getRandomValues(arr);
        const value = arr[0];
        if (value < maxValue) {
          randomStr += (value % charsetSize).toString(36);
        }
        // else, discard and try again
      }
    } else {
      // Fallback: use Math.random (less secure but works in all environments)
      // This should rarely be used since modern browsers support window.crypto
      while (randomStr.length < length) {
        const value = Math.floor(Math.random() * 256);
        if (value < maxValue) {
          randomStr += (value % charsetSize).toString(36);
        }
        // else, discard and try again
      }
    }
    return randomStr;
  }
}

// Create singleton instance
export const clientMonitoringService = new ClientMonitoringService();

export default ClientMonitoringService;
