import { lazy } from 'react';
import { frontendPerformanceService } from '../services/frontendPerformanceService';

// Enhanced lazy loading with performance monitoring and preloading
const createLazyComponent = <T extends React.ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string,
  preload: boolean = false
) => {
  const LazyComponent = lazy(() => {
    const startTime = performance.now();
    return importFn().then((module) => {
      const loadTime = performance.now() - startTime;
      frontendPerformanceService.trackComponentRender(`${componentName}_load`, loadTime);
      return module;
    });
  });

  // Preload component if specified
  if (preload && typeof window !== 'undefined') {
    // Preload after a short delay to not block initial render
    setTimeout(() => {
      importFn().catch(() => {
        // Ignore preload errors
      });
    }, 100);
  }

  return LazyComponent;
};

// Critical components (preloaded)
export const LazyIntegrationManager = createLazyComponent(
  () => import('./IntegrationManager'),
  'IntegrationManager',
  true
);

export const LazyAnalyticsDashboard = createLazyComponent(
  () => import('./AnalyticsDashboard').then((module) => ({ default: module.AnalyticsDashboard })),
  'AnalyticsDashboard',
  true
);

// Heavy components (lazy loaded on demand)
export const LazyErrorReportingSystem = createLazyComponent(
  () => import('./ErrorReportingSystem'),
  'ErrorReportingSystem'
);

export const LazyEnhancedErrorExample = createLazyComponent(
  () => import('./EnhancedErrorExample'),
  'EnhancedErrorExample'
);

export const LazyRepurposingWorkflow = createLazyComponent(
  () => import('./RepurposingWorkflow'),
  'RepurposingWorkflow'
);

export const LazyImageStyleManager = createLazyComponent(
  () => import('./ImageStyleManager'),
  'ImageStyleManager'
);

export const LazyContentSeriesManager = createLazyComponent(
  () => import('./ContentSeriesManager'),
  'ContentSeriesManager'
);

export const LazyTemplateLibrary = createLazyComponent(
  () => import('./TemplateLibrary'),
  'TemplateLibrary'
);

export const LazyPerformanceInsights = createLazyComponent(
  () => import('./PerformanceInsights').then((module) => ({ default: module.PerformanceInsights })),
  'PerformanceInsights'
);

export const LazyDragDropContentBuilder = createLazyComponent(
  () => import('./DragDropContentBuilder'),
  'DragDropContentBuilder'
);

export const LazyVoiceCommands = createLazyComponent(
  () => import('./VoiceCommands'),
  'VoiceCommands'
);

export const LazyGamificationSystem = createLazyComponent(
  () => import('./GamificationSystem'),
  'GamificationSystem'
);

// Note: Service modules are not React components and should not be lazy loaded as components

// Loading fallback component
export const ComponentLoadingFallback: React.FC<{ name?: string }> = ({ name }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-gray-600">Loading {name || 'component'}...</p>
    </div>
  </div>
);

// Error fallback for lazy components
export const ComponentErrorFallback: React.FC<{
  error?: Error;
  retry?: () => void;
  componentName?: string;
}> = ({ error, retry, componentName }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
        <span className="text-white text-sm">!</span>
      </div>
      <h3 className="font-medium text-red-900">Failed to load {componentName || 'component'}</h3>
    </div>

    <p className="text-sm text-red-700 mb-4">
      {error?.message || 'The component could not be loaded. This might be due to a network issue.'}
    </p>

    {retry && (
      <button
        onClick={retry}
        className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

export default {
  LazyErrorReportingSystem,
  LazyEnhancedErrorExample,
  LazyIntegrationManager,
  LazyRepurposingWorkflow,
  LazyImageStyleManager,
  LazyContentSeriesManager,
  LazyTemplateLibrary,
  LazyAnalyticsDashboard,
  LazyPerformanceInsights,
  LazyDragDropContentBuilder,
  LazyVoiceCommands,
  LazyGamificationSystem,
  ComponentLoadingFallback,
  ComponentErrorFallback,
};
