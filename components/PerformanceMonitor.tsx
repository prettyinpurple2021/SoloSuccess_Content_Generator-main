import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, Database, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { contentCache } from '../services/cachingService';
import { HoloCard, HoloButton, HoloText, SparkleEffect, FloatingSkull } from './HolographicTheme';

export const PERF_EVENT_NAME = 'ss_perf_api_call';

interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTimes: { [key: string]: number };
  cacheHitRate: number;
  memoryUsage: number;
  errorCount: number;
  lastUpdated: Date;
}

interface PerformanceMonitorProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ isVisible, onToggle }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    apiResponseTimes: {},
    cacheHitRate: 0,
    memoryUsage: 0,
    errorCount: 0,
    lastUpdated: new Date(),
  });

  const [isRecording, setIsRecording] = useState(false);

  // Performance observer for measuring page load times
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'performance' in window &&
      'PerformanceObserver' in window
    ) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              setMetrics((prev) => ({
                ...prev,
                pageLoadTime: Math.max(0, navEntry.loadEventEnd - navEntry.navigationStart),
                lastUpdated: new Date(),
              }));
            }
          });
        });

        observer.observe({ entryTypes: ['navigation'] });

        return () => observer.disconnect();
      } catch {
        // Not critical — ignore if PerformanceObserver fails in some envs
        return;
      }
    }
  }, []);

  // Monitor API response times (internal recorder)
  const recordApiCall = useCallback((endpoint: string, duration: number) => {
    setMetrics((prev) => ({
      ...prev,
      apiResponseTimes: {
        ...prev.apiResponseTimes,
        [endpoint]: duration,
      },
      lastUpdated: new Date(),
    }));
  }, []);

  // Listen for global perf events dispatched by usePerformanceMonitor or other producers
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && detail.endpoint && typeof detail.duration === 'number') {
        recordApiCall(detail.endpoint, detail.duration);
      }
    };
    window.addEventListener(PERF_EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(PERF_EVENT_NAME, handler as EventListener);
  }, [recordApiCall]);

  // Consolidated metrics update - combines cache and memory monitoring in single interval
  useEffect(() => {
    const updateMetrics = () => {
      try {
        // Update cache metrics
        const cacheStats = contentCache.getStats();
        let hitRate = typeof cacheStats.hitRate === 'number' ? cacheStats.hitRate : 0;
        // If hitRate seems to be fractional (0..1), convert to percent
        if (hitRate > 0 && hitRate <= 1) {
          hitRate = hitRate * 100;
        }

        // Update memory usage (if available)
        let memoryUsage = 0;
        const mem = (performance as any).memory;
        if (
          mem &&
          typeof mem.usedJSHeapSize === 'number' &&
          typeof mem.jsHeapSizeLimit === 'number'
        ) {
          memoryUsage = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
        }

        setMetrics((prev) => ({
          ...prev,
          cacheHitRate: hitRate,
          memoryUsage,
          lastUpdated: new Date(),
        }));
      } catch {
        // ignore errors from metrics introspection
      }
    };

    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, []);

  // Monitor errors
  useEffect(() => {
    const handleError = () => {
      setMetrics((prev) => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        lastUpdated: new Date(),
      }));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  const getPerformanceStatus = () => {
    const apiTimes = Object.values(metrics.apiResponseTimes);
    const avgApiTime = apiTimes.length
      ? apiTimes.reduce((sum, time) => sum + time, 0) / apiTimes.length
      : 0;

    if (avgApiTime > 2000 || metrics.memoryUsage > 80 || metrics.errorCount > 5) {
      return { status: 'poor', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (avgApiTime > 1000 || metrics.memoryUsage > 60 || metrics.errorCount > 2) {
      return { status: 'fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else {
      return { status: 'good', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
  };

  const performanceStatus = getPerformanceStatus();

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className={`fixed bottom-20 right-6 w-12 h-12 glass-card text-white rounded-full shadow-lg hover:shadow-xl transition-all z-30 flex items-center justify-center sparkles neon-glow`}
        title="Performance Monitor"
      >
        <Activity className="w-5 h-5" />
        <SparkleEffect count={2} size="small" />
      </button>
    );
  }

  return (
    <HoloCard className="fixed bottom-6 right-20 w-80 z-30">
      <SparkleEffect count={6} size="small" />
      <FloatingSkull className="absolute top-2 right-12" size="small" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <HoloText variant="subtitle" glow>
            Performance ⚡
          </HoloText>
          <div
            className={`w-2 h-2 rounded-full ${
              performanceStatus.status === 'good'
                ? 'bg-green-400 shadow-lg shadow-green-400/50'
                : performanceStatus.status === 'fair'
                  ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50'
                  : 'bg-red-400 shadow-lg shadow-red-400/50'
            }`}
          />
        </div>
        <button onClick={onToggle} className="text-white/60 hover:text-white transition-colors">
          ✕
        </button>
      </div>

      {/* Metrics */}
      <div className="p-4 space-y-4">
        {/* Page Load Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <HoloText className="text-sm">Page Load ⏱️</HoloText>
          </div>
          <HoloText className="text-sm font-medium">
            {metrics.pageLoadTime > 0 ? `${Math.round(metrics.pageLoadTime)}ms` : 'N/A'}
          </HoloText>
        </div>

        {/* Cache Hit Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-green-400" />
            <HoloText className="text-sm">Cache Hit Rate 💾</HoloText>
          </div>
          <HoloText className="text-sm font-medium">{metrics.cacheHitRate.toFixed(1)}% ✨</HoloText>
        </div>

        {/* Memory Usage */}
        {metrics.memoryUsage > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-600">Memory Usage</span>
            </div>
            <span className="text-sm font-medium">{metrics.memoryUsage.toFixed(1)}%</span>
          </div>
        )}

        {/* Error Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-gray-600">Errors</span>
          </div>
          <span className="text-sm font-medium">{metrics.errorCount}</span>
        </div>

        {/* API Response Times */}
        {Object.keys(metrics.apiResponseTimes).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">API Response Times</h4>
            <div className="space-y-1">
              {Object.entries(metrics.apiResponseTimes)
                .slice(-3)
                .map(([endpoint, time]) => (
                  <div key={endpoint} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 truncate">{endpoint}</span>
                    <span
                      className={`font-medium ${
                        time > 2000
                          ? 'text-red-600'
                          : time > 1000
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      }`}
                    >
                      {Math.round(time)}ms
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Overall Status */}
        <div className={`p-3 rounded-lg bg-glass-cyan border border-white/20`}>
          <div className="flex items-center gap-2">
            {performanceStatus.status === 'good' ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            )}
            <HoloText className="text-sm font-medium" glow>
              Performance:{' '}
              {performanceStatus.status.charAt(0).toUpperCase() + performanceStatus.status.slice(1)}
              {performanceStatus.status === 'good'
                ? ' 🌟'
                : performanceStatus.status === 'fair'
                  ? ' ⚡'
                  : ' 💀'}
            </HoloText>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-white/60 text-center">
          Last updated: {metrics.lastUpdated.toLocaleTimeString()} ⏰
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-white/20 bg-glass-purple rounded-b-lg">
        <div className="flex gap-2">
          <HoloButton
            onClick={() => {
              contentCache.clear();
              setMetrics((prev) => ({ ...prev, errorCount: 0 }));
            }}
            className="flex-1 text-xs sparkles"
          >
            Clear Cache 🗑️
          </HoloButton>
          <HoloButton
            onClick={() => window.location.reload()}
            variant="secondary"
            className="flex-1 text-xs"
          >
            Reload 🔄
          </HoloButton>
        </div>
      </div>
    </HoloCard>
  );
};

/**
 * Hook for performance monitoring
 *
 * Use recordApiCall(endpoint, startTime) — it will dispatch a global event that
 * the PerformanceMonitor component listens for and records.
 */
export const usePerformanceMonitor = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const recordApiCall = useCallback((endpoint: string, startTime: number) => {
    const duration = Date.now() - startTime;
    // Broadcast to any PerformanceMonitor instances
    try {
      const event = new CustomEvent(PERF_EVENT_NAME, { detail: { endpoint, duration } });
      window.dispatchEvent(event);
    } catch {
      // CustomEvent might fail in some environments — fallback to console
      console.log(`API Call: ${endpoint} took ${duration}ms`);
    }
  }, []);

  return {
    isVisible,
    toggle,
    recordApiCall,
  };
};

export default PerformanceMonitor;
