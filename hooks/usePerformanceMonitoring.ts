import { useEffect, useRef, useCallback, useState } from 'react';
import { frontendPerformanceService } from '../services/frontendPerformanceService';
import React from 'react';

interface PerformanceMetrics {
  renderTime: number;
  renderCount: number;
  memoryUsage: number;
  isSlowRender: boolean;
}

interface UsePerformanceMonitoringOptions {
  componentName: string;
  trackRenders?: boolean;
  trackMemory?: boolean;
  slowRenderThreshold?: number;
  onSlowRender?: (metrics: PerformanceMetrics) => void;
}

export const usePerformanceMonitoring = ({
  componentName,
  trackRenders = true,
  trackMemory = false,
  slowRenderThreshold = 16, // 16ms for 60fps
  onSlowRender,
}: UsePerformanceMonitoringOptions) => {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    renderCount: 0,
    memoryUsage: 0,
    isSlowRender: false,
  });

  // Start render timing
  const startRenderTiming = useCallback(() => {
    if (trackRenders) {
      renderStartTime.current = performance.now();
    }
  }, [trackRenders]);

  // End render timing and record metrics
  const endRenderTiming = useCallback(() => {
    if (!trackRenders || renderStartTime.current === 0) return;

    const renderTime = performance.now() - renderStartTime.current;
    renderCount.current += 1;

    const isSlowRender = renderTime > slowRenderThreshold;
    let memoryUsage = 0;

    // Get memory usage if tracking is enabled
    if (trackMemory && 'memory' in performance) {
      memoryUsage = (performance as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
    }

    const newMetrics: PerformanceMetrics = {
      renderTime,
      renderCount: renderCount.current,
      memoryUsage,
      isSlowRender,
    };

    setMetrics(newMetrics);

    // Track with performance service
    frontendPerformanceService.trackComponentRender(componentName, renderTime);

    // Call slow render callback if applicable
    if (isSlowRender && onSlowRender) {
      onSlowRender(newMetrics);
    }

    // Reset start time
    renderStartTime.current = 0;
  }, [componentName, trackRenders, trackMemory, slowRenderThreshold, onSlowRender]);

  // Start timing on every render
  startRenderTiming();

  // End timing after render is complete
  useEffect(() => {
    endRenderTiming();
  });

  return metrics;
};

export const useComponentProfiler = (componentName: string) => {
  const renderTimes = useRef<number[]>([]);
  const maxSamples = 100;

  const profileRender = useCallback(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Store render time
      renderTimes.current.push(renderTime);
      if (renderTimes.current.length > maxSamples) {
        renderTimes.current.shift();
      }

      // Track with performance service
      frontendPerformanceService.trackComponentRender(componentName, renderTime);
    };
  }, [componentName]);

  const getProfileData = useCallback(() => {
    const times = renderTimes.current;
    if (times.length === 0) return null;

    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    return {
      samples: times.length,
      average: avg,
      min,
      max,
      p95,
      slowRenders: times.filter((t) => t > 16).length,
    };
  }, []);

  return { profileRender, getProfileData };
};

export const useMemoryMonitoring = (componentName: string, interval: number = 5000) => {
  const [memoryMetrics, setMemoryMetrics] = useState({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
    timestamp: Date.now(),
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return;
    }

    const updateMemoryMetrics = () => {
      const memory = (
        performance as {
          memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      const newMetrics = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      };

      setMemoryMetrics(newMetrics);

      // Check for potential memory leaks
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      if (usedMB > 100) {
        // 100MB threshold
        console.warn(`High memory usage in ${componentName}: ${usedMB.toFixed(2)}MB`);
      }
    };

    updateMemoryMetrics();
    const intervalId = setInterval(updateMemoryMetrics, interval);

    return () => clearInterval(intervalId);
  }, [componentName, interval]);

  return memoryMetrics;
};

export const useRenderOptimization = <T>(
  value: T,
  deps: React.DependencyList,
  cacheKey?: string
) => {
  const memoizedValue = React.useMemo(() => {
    // Cache the computed value if cache key is provided
    if (cacheKey) {
      const cached = frontendPerformanceService.getCache<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Store in cache if cache key is provided
    if (cacheKey) {
      frontendPerformanceService.setCache(cacheKey, value);
    }

    return value;
  }, [...deps, cacheKey, value]);

  return memoizedValue;
};

export const useAsyncPerformance = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState({
    duration: 0,
    success: false,
    timestamp: 0,
  });

  const executeWithPerformanceTracking = useCallback(
    async <T>(operation: () => Promise<T>, operationName: string): Promise<T> => {
      const startTime = performance.now();
      setIsLoading(true);
      setError(null);

      try {
        const result = await operation();
        const duration = performance.now() - startTime;

        setMetrics({
          duration,
          success: true,
          timestamp: Date.now(),
        });

        // Track with performance service
        frontendPerformanceService.trackComponentRender(`async_${operationName}`, duration);

        return result;
      } catch (err) {
        const duration = performance.now() - startTime;
        const error = err instanceof Error ? err : new Error(String(err));

        setError(error);
        setMetrics({
          duration,
          success: false,
          timestamp: Date.now(),
        });

        // Track error with performance service
        frontendPerformanceService.trackComponentRender(`async_${operationName}_error`, duration);

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    error,
    metrics,
    executeWithPerformanceTracking,
  };
};

export const useWebVitals = () => {
  const [vitals, setVitals] = useState({
    fcp: 0,
    lcp: 0,
    cls: 0,
    fid: 0,
    ttfb: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setVitals((prev) => ({ ...prev, fcp: entry.startTime }));
        }
      }
    });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setVitals((prev) => ({ ...prev, lcp: lastEntry.startTime }));
    });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value || 0;
        }
      }
      setVitals((prev) => ({ ...prev, cls: clsValue }));
    });

    try {
      fcpObserver.observe({ entryTypes: ['paint'] });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch {
      console.warn('Some Performance Observer features not supported');
    }

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
    };
  }, []);

  return vitals;
};

export default usePerformanceMonitoring;
