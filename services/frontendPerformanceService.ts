/**
 * Frontend Performance Optimization Service
 * Provides performance monitoring, optimization, and caching for React components
 */

import React from 'react';

interface PerformanceMetrics {
  componentRenderTime: number;
  memoryUsage: number;
  bundleSize: number;
  loadTime: number;
  interactionTime: number;
  cumulativeLayoutShift: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
}

interface ComponentMetrics {
  name: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  propsChanges: number;
  memoryLeaks: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

class FrontendPerformanceService {
  private static instance: FrontendPerformanceService;
  private performanceObserver: PerformanceObserver | null = null;
  private componentMetrics: Map<string, ComponentMetrics> = new Map();
  private cache: Map<string, CacheEntry<any>> = new Map();
  private renderTimes: Map<string, number> = new Map();
  private memoryMonitorInterval: NodeJS.Timeout | null = null;
  private performanceMetrics: PerformanceMetrics = {
    componentRenderTime: 0,
    memoryUsage: 0,
    bundleSize: 0,
    loadTime: 0,
    interactionTime: 0,
    cumulativeLayoutShift: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
  };

  private constructor() {
    this.initializePerformanceMonitoring();
    this.startMemoryMonitoring();
  }

  static getInstance(): FrontendPerformanceService {
    if (!FrontendPerformanceService.instance) {
      FrontendPerformanceService.instance = new FrontendPerformanceService();
    }
    return FrontendPerformanceService.instance;
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Web Vitals monitoring
    this.observeWebVitals();

    // Component render monitoring
    this.observeComponentRenders();

    // Memory usage monitoring
    this.observeMemoryUsage();

    // Bundle size monitoring
    this.observeBundleSize();
  }

  /**
   * Observe Web Vitals metrics
   */
  private observeWebVitals(): void {
    if (!('PerformanceObserver' in window)) return;

    // First Contentful Paint (FCP)
    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.performanceMetrics.firstContentfulPaint = entry.startTime;
        }
      }
    });

    try {
      this.performanceObserver.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('Performance Observer not supported for paint entries');
    }

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.performanceMetrics.largestContentfulPaint = lastEntry.startTime;
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('Performance Observer not supported for LCP entries');
    }

    // Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.performanceMetrics.cumulativeLayoutShift = clsValue;
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Performance Observer not supported for layout-shift entries');
    }
  }

  /**
   * Observe component render performance
   */
  private observeComponentRenders(): void {
    if (typeof window === 'undefined') return;

    // Use React DevTools Profiler API if available
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

      hook.onCommitFiberRoot = (id: number, root: any, priorityLevel: any) => {
        // Track component render times
        this.trackComponentRender('Root', performance.now());
      };
    }
  }

  /**
   * Observe memory usage
   */
  private observeMemoryUsage(): void {
    if (typeof window === 'undefined' || !(performance as any).memory) return;

    const updateMemoryMetrics = () => {
      const memory = (performance as any).memory;
      this.performanceMetrics.memoryUsage = memory.usedJSHeapSize;
    };

    updateMemoryMetrics();
    setInterval(updateMemoryMetrics, 5000); // Update every 5 seconds
  }

  /**
   * Observe bundle size
   */
  private observeBundleSize(): void {
    if (typeof window === 'undefined') return;

    // Estimate bundle size from loaded resources
    const observer = new PerformanceObserver((list) => {
      let totalSize = 0;
      for (const entry of list.getEntries()) {
        if (entry.name.includes('.js') || entry.name.includes('.css')) {
          totalSize += (entry as any).transferSize || 0;
        }
      }
      this.performanceMetrics.bundleSize = totalSize;
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Performance Observer not supported for resource entries');
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined') return;

    this.memoryMonitorInterval = setInterval(() => {
      this.checkForMemoryLeaks();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check for potential memory leaks
   */
  private checkForMemoryLeaks(): void {
    if (typeof window === 'undefined' || !(performance as any).memory) return;

    const memory = (performance as any).memory;
    const currentUsage = memory.usedJSHeapSize;
    const threshold = 50 * 1024 * 1024; // 50MB threshold

    if (currentUsage > threshold) {
      console.warn(`High memory usage detected: ${(currentUsage / 1024 / 1024).toFixed(2)}MB`);

      // Mark components with potential memory leaks
      this.componentMetrics.forEach((metrics, componentName) => {
        if (metrics.renderCount > 100 && metrics.averageRenderTime > 16) {
          metrics.memoryLeaks = true;
        }
      });
    }
  }

  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, renderTime: number): void {
    const existing = this.componentMetrics.get(componentName);

    if (existing) {
      existing.renderCount++;
      existing.lastRenderTime = renderTime;
      existing.averageRenderTime =
        (existing.averageRenderTime * (existing.renderCount - 1) + renderTime) /
        existing.renderCount;
    } else {
      this.componentMetrics.set(componentName, {
        name: componentName,
        renderCount: 1,
        averageRenderTime: renderTime,
        lastRenderTime: renderTime,
        propsChanges: 0,
        memoryLeaks: false,
      });
    }

    // Update overall component render time
    this.performanceMetrics.componentRenderTime = renderTime;
  }

  /**
   * Track props changes for component optimization
   */
  trackPropsChange(componentName: string): void {
    const metrics = this.componentMetrics.get(componentName);
    if (metrics) {
      metrics.propsChanges++;
    }
  }

  /**
   * Intelligent caching with TTL and LRU eviction
   */
  setCache<T>(key: string, data: T, ttl: number = 300000): void {
    // 5 minutes default
    // Clean expired entries first
    this.cleanExpiredCache();

    // LRU eviction if cache is too large
    if (this.cache.size >= 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });
  }

  /**
   * Get cached data
   */
  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Increment hit counter
    entry.hits++;

    return entry.data;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Preload critical resources
   */
  preloadCriticalResources(resources: string[]): void {
    if (typeof window === 'undefined') return;

    resources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;

      if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.match(/\.(jpg|jpeg|png|webp|svg)$/)) {
        link.as = 'image';
      }

      document.head.appendChild(link);
    });
  }

  /**
   * Lazy load images with intersection observer
   */
  lazyLoadImages(selector: string = 'img[data-src]'): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const images = document.querySelectorAll(selector);

    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;

            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01,
      }
    );

    images.forEach((img) => imageObserver.observe(img));
  }

  /**
   * Optimize component re-renders
   */
  optimizeComponentRenders(): {
    recommendations: string[];
    slowComponents: ComponentMetrics[];
  } {
    const recommendations: string[] = [];
    const slowComponents: ComponentMetrics[] = [];

    this.componentMetrics.forEach((metrics) => {
      // Identify slow components (>16ms render time)
      if (metrics.averageRenderTime > 16) {
        slowComponents.push(metrics);
        recommendations.push(
          `${metrics.name}: Consider memoization or optimization (avg: ${metrics.averageRenderTime.toFixed(2)}ms)`
        );
      }

      // Identify components with excessive re-renders
      if (metrics.renderCount > 50 && metrics.propsChanges / metrics.renderCount > 0.8) {
        recommendations.push(
          `${metrics.name}: High props change ratio, consider React.memo or useMemo`
        );
      }

      // Identify potential memory leaks
      if (metrics.memoryLeaks) {
        recommendations.push(
          `${metrics.name}: Potential memory leak detected, check for cleanup in useEffect`
        );
      }
    });

    return { recommendations, slowComponents };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics & {
    componentMetrics: ComponentMetrics[];
    cacheStats: {
      size: number;
      hitRate: number;
      totalHits: number;
    };
  } {
    const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
    const cacheRequests = totalHits + this.cache.size; // Approximate

    return {
      ...this.performanceMetrics,
      componentMetrics: Array.from(this.componentMetrics.values()),
      cacheStats: {
        size: this.cache.size,
        hitRate: cacheRequests > 0 ? (totalHits / cacheRequests) * 100 : 0,
        totalHits,
      },
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    score: number;
    metrics: PerformanceMetrics;
    recommendations: string[];
    criticalIssues: string[];
  } {
    const metrics = this.getPerformanceMetrics();
    const recommendations: string[] = [];
    const criticalIssues: string[] = [];
    let score = 100;

    // Evaluate First Contentful Paint
    if (metrics.firstContentfulPaint > 2500) {
      score -= 20;
      criticalIssues.push('First Contentful Paint is too slow (>2.5s)');
      recommendations.push('Optimize critical rendering path and reduce bundle size');
    } else if (metrics.firstContentfulPaint > 1800) {
      score -= 10;
      recommendations.push('Consider optimizing First Contentful Paint');
    }

    // Evaluate Largest Contentful Paint
    if (metrics.largestContentfulPaint > 4000) {
      score -= 25;
      criticalIssues.push('Largest Contentful Paint is too slow (>4s)');
      recommendations.push('Optimize largest content elements and images');
    } else if (metrics.largestContentfulPaint > 2500) {
      score -= 15;
      recommendations.push('Consider optimizing Largest Contentful Paint');
    }

    // Evaluate Cumulative Layout Shift
    if (metrics.cumulativeLayoutShift > 0.25) {
      score -= 20;
      criticalIssues.push('High Cumulative Layout Shift detected');
      recommendations.push('Add size attributes to images and reserve space for dynamic content');
    } else if (metrics.cumulativeLayoutShift > 0.1) {
      score -= 10;
      recommendations.push('Consider reducing layout shifts');
    }

    // Evaluate memory usage
    if (metrics.memoryUsage > 100 * 1024 * 1024) {
      // 100MB
      score -= 15;
      criticalIssues.push('High memory usage detected');
      recommendations.push('Check for memory leaks and optimize component lifecycle');
    }

    // Evaluate component performance
    const { recommendations: componentRecs } = this.optimizeComponentRenders();
    recommendations.push(...componentRecs);

    // Evaluate cache performance
    if (metrics.cacheStats.hitRate < 50) {
      score -= 5;
      recommendations.push('Low cache hit rate, consider caching more frequently used data');
    }

    return {
      score: Math.max(0, score),
      metrics,
      recommendations,
      criticalIssues,
    };
  }

  /**
   * Apply performance optimizations
   */
  applyOptimizations(): {
    applied: string[];
    failed: string[];
  } {
    const applied: string[] = [];
    const failed: string[] = [];

    try {
      // Enable lazy loading for images
      this.lazyLoadImages();
      applied.push('Enabled lazy loading for images');
    } catch (error) {
      failed.push(`Failed to enable lazy loading: ${error}`);
    }

    try {
      // Preload critical resources
      const criticalResources = ['/assets/main.css', '/assets/main.js'];
      this.preloadCriticalResources(criticalResources);
      applied.push('Preloaded critical resources');
    } catch (error) {
      failed.push(`Failed to preload resources: ${error}`);
    }

    try {
      // Clean expired cache
      this.cleanExpiredCache();
      applied.push('Cleaned expired cache entries');
    } catch (error) {
      failed.push(`Failed to clean cache: ${error}`);
    }

    return { applied, failed };
  }

  /**
   * Monitor component lifecycle for optimization
   */
  createComponentProfiler<P>(
    componentName: string,
    Component: React.ComponentType<P>
  ): React.ComponentType<P> {
    const ProfiledComponent = (props: P) => {
      const startTime = performance.now();

      React.useEffect(() => {
        const endTime = performance.now();
        this.trackComponentRender(componentName, endTime - startTime);
      });

      React.useEffect(() => {
        this.trackPropsChange(componentName);
      }, [props]);

      return React.createElement(Component as React.ComponentType<any>, props);
    };

    ProfiledComponent.displayName = `Profiled(${componentName})`;
    return ProfiledComponent;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    this.cache.clear();
    this.componentMetrics.clear();
  }
}

// Export singleton instance
export const frontendPerformanceService = FrontendPerformanceService.getInstance();

// React hooks for performance monitoring
export const usePerformanceMonitoring = (componentName: string) => {
  React.useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      frontendPerformanceService.trackComponentRender(componentName, endTime - startTime);
    };
  }, [componentName]);
};

export const useOptimizedState = <T>(
  initialValue: T,
  cacheKey?: string,
  ttl?: number
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = React.useState<T>(() => {
    if (cacheKey) {
      const cached = frontendPerformanceService.getCache<T>(cacheKey);
      return cached !== null ? cached : initialValue;
    }
    return initialValue;
  });

  const setOptimizedState = React.useCallback(
    (value: React.SetStateAction<T>) => {
      setState((prevState) => {
        const newState = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value;

        if (cacheKey) {
          frontendPerformanceService.setCache(cacheKey, newState, ttl);
        }

        return newState;
      });
    },
    [cacheKey, ttl]
  );

  return [state, setOptimizedState];
};

export default frontendPerformanceService;
