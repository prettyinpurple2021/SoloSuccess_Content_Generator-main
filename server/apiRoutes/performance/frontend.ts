/**
 * Frontend Performance Monitoring API
 * Provides endpoints for monitoring frontend performance metrics
 */

import type { ApiRequest, ApiResponse } from '../types';
import { errorHandler } from '../../../services/errorHandlingService';
import { productionMonitoringService } from '../../../services/productionMonitoringService';
import type { MetricSummary } from '../../../services/productionMonitoringService';

const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const action =
      typeof req.query?.action === 'string'
        ? req.query.action
        : req.query?.action?.[0] || 'metrics';
    const windowParam =
      typeof req.query?.windowMs === 'string'
        ? Number(req.query.windowMs)
        : Array.isArray(req.query?.windowMs)
          ? Number(req.query.windowMs[0])
          : undefined;
    const windowMs =
      windowParam !== undefined && Number.isFinite(windowParam) && windowParam > 0
        ? windowParam
        : DEFAULT_WINDOW_MS;

    if (req.method === 'GET') {
      switch (action) {
        case 'metrics':
          return await getFrontendMetrics(windowMs, res);

        case 'report':
          return await getPerformanceReport(windowMs, res);

        case 'recommendations':
          return await getOptimizationRecommendations(windowMs, res);

        case 'vitals':
          return await getWebVitals(windowMs, res);

        default:
          return res.status(400).json({ error: 'Invalid action parameter' });
      }
    } else if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const postAction =
        typeof req.query?.action === 'string'
          ? req.query.action
          : req.query?.action?.[0] || body?.action;

      switch (postAction) {
        case 'track':
          return await trackPerformanceMetric(body, res);

        case 'vitals':
          return await recordWebVitals(body, res);

        case 'error':
          return await recordPerformanceError(body, res);

        case 'optimize':
          return await applyOptimizations(windowMs, res);

        default:
          return res.status(400).json({ error: 'Invalid action parameter' });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    errorHandler.logError(
      'Frontend performance API error',
      error instanceof Error ? error : new Error(String(error)),
      { operation: 'frontend_performance_api' }
    );

    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get frontend performance metrics
 */
async function getFrontendMetrics(windowMs: number, res: ApiResponse) {
  const dashboard = productionMonitoringService.getDashboardData(windowMs);
  const metricsSummary = dashboard.metricsSummary.metrics;

  const lcp = metricsSummary['web_vitals_lcp']?.avg ?? null;
  const fcp = metricsSummary['web_vitals_fcp']?.avg ?? null;
  const cls = metricsSummary['web_vitals_cls']?.avg ?? null;
  const fid = metricsSummary['web_vitals_fid']?.avg ?? null;
  const tti = metricsSummary['web_vitals_tti']?.avg ?? null;
  const tbt = metricsSummary['web_vitals_total_blocking_time']?.avg ?? null;

  const metrics = {
    pageLoadTime: metricsSummary['page_load_time']?.avg ?? null,
    firstContentfulPaint: fcp,
    largestContentfulPaint: lcp,
    cumulativeLayoutShift: cls,
    firstInputDelay: fid,
    timeToInteractive: tti,
    totalBlockingTime: tbt,
    memoryUsage: metricsSummary['memory_usage'] ?? null,
    bundleSize: metricsSummary['bundle_size'] ?? null,
    cacheStats: {
      size: metricsSummary['cache_size']?.avg ?? null,
      hitRate: metricsSummary['cache_hit_rate']?.avg ?? null,
      totalHits: metricsSummary['cache_hits']?.avg ?? null,
    },
    apiOverview: dashboard.apiOverview,
    databaseOverview: dashboard.databaseOverview,
    aiOverview: dashboard.aiOverview,
    integrationOverview: dashboard.integrationOverview,
  };

  return res.status(200).json({
    success: true,
    data: {
      metrics,
      windowMs,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Get comprehensive performance report
 */
async function getPerformanceReport(windowMs: number, res: ApiResponse) {
  const dashboard = productionMonitoringService.getDashboardData(windowMs);
  const metricsSummary = dashboard.metricsSummary.metrics;

  const score = calculatePerformanceScore(metricsSummary);

  const report = {
    score,
    grade: scoreToGrade(score),
    metrics: {
      performance: score,
      accessibility: metricsSummary['accessibility_score']?.avg ?? null,
      bestPractices: metricsSummary['best_practices_score']?.avg ?? null,
      seo: metricsSummary['seo_score']?.avg ?? null,
    },
    webVitals: extractWebVitals(metricsSummary),
    apiOverview: dashboard.apiOverview,
    databaseOverview: dashboard.databaseOverview,
    aiOverview: dashboard.aiOverview,
    integrationOverview: dashboard.integrationOverview,
  };

  return res.status(200).json({
    success: true,
    data: {
      report,
      windowMs,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Get optimization recommendations
 */
async function getOptimizationRecommendations(windowMs: number, res: ApiResponse) {
  const dashboard = productionMonitoringService.getDashboardData(windowMs);
  const metricsSummary = dashboard.metricsSummary.metrics;
  const vitals = extractWebVitals(metricsSummary);

  const recommendations = buildRecommendations(vitals, metricsSummary);

  return res.status(200).json({
    success: true,
    data: {
      recommendations,
      windowMs,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Get Web Vitals metrics
 */
async function getWebVitals(windowMs: number, res: ApiResponse) {
  const dashboard = productionMonitoringService.getDashboardData(windowMs);
  const vitals = extractWebVitals(dashboard.metricsSummary.metrics);

  return res.status(200).json({
    success: true,
    data: {
      vitals,
      windowMs,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Track performance metric
 */
async function trackPerformanceMetric(
  data: {
    metric: string;
    value: number;
    component: string;
    timestamp: string;
  },
  res: ApiResponse
) {
  const { metric, value, component, timestamp } = data;
  const parsedTimestamp = timestamp ? new Date(timestamp) : new Date();
  const metricTimestamp = Number.isNaN(parsedTimestamp.getTime()) ? new Date() : parsedTimestamp;

  productionMonitoringService.recordMetric(metric, value, {
    component,
    source: 'frontend-track',
  });

  return res.status(200).json({
    success: true,
    data: {
      message: 'Metric tracked successfully',
      metric,
      value,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Record Web Vitals
 */
async function recordWebVitals(data: { vitals: Record<string, unknown> }, res: ApiResponse) {
  const { vitals } = data;

  Object.entries(vitals || {}).forEach(([name, value]) => {
    if (typeof value === 'object' && value !== null) {
      const metric = value as { value?: number; rating?: string; unit?: string };
      if (typeof metric.value === 'number') {
        productionMonitoringService.recordMetric(
          `web_vitals_${name.toLowerCase()}`,
          metric.value,
          {
            rating: metric.rating ?? 'unknown',
          },
          metric.unit
        );
      }
    } else if (typeof value === 'number') {
      productionMonitoringService.recordMetric(`web_vitals_${name.toLowerCase()}`, value);
    }
  });

  return res.status(200).json({
    success: true,
    data: {
      message: 'Web Vitals recorded successfully',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Record performance error
 */
async function recordPerformanceError(
  data: {
    error: string;
    component: string;
    context: Record<string, unknown>;
  },
  res: ApiResponse
) {
  const { error, component, context } = data;

  productionMonitoringService.recordMetric('frontend_performance_error', 1, {
    component,
    message: error,
  });

  return res.status(200).json({
    success: true,
    data: {
      message: 'Performance error recorded',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Apply performance optimizations
 */
async function applyOptimizations(windowMs: number, res: ApiResponse) {
  const dashboard = productionMonitoringService.getDashboardData(windowMs);
  const metricsSummary = dashboard.metricsSummary.metrics;
  const vitals = extractWebVitals(metricsSummary);

  const optimizationActions = deriveOptimizationActions(vitals, metricsSummary);

  return res.status(200).json({
    success: true,
    data: {
      optimizations: optimizationActions,
      windowMs,
      timestamp: new Date().toISOString(),
    },
  });
}

function extractWebVitals(metrics: Record<string, MetricSummary>): Record<string, any> {
  const map: Record<string, any> = {};
  const thresholds: Record<string, { good: number; needsImprovement: number; unit?: string }> = {
    lcp: { good: 2500, needsImprovement: 4000, unit: 'ms' },
    fcp: { good: 1800, needsImprovement: 3000, unit: 'ms' },
    cls: { good: 0.1, needsImprovement: 0.25 },
    fid: { good: 100, needsImprovement: 300, unit: 'ms' },
    ttfb: { good: 800, needsImprovement: 1800, unit: 'ms' },
    tti: { good: 3800, needsImprovement: 7300, unit: 'ms' },
  };

  Object.entries(metrics).forEach(([name, summary]) => {
    if (!name.startsWith('web_vitals_')) return;
    const key = name.replace('web_vitals_', '') as keyof typeof thresholds;
    const threshold = thresholds[key];
    const value = summary?.avg ?? null;
    if (threshold && value !== null) {
      const rating =
        value <= threshold.good
          ? 'good'
          : value <= threshold.needsImprovement
            ? 'needs-improvement'
            : 'poor';
      map[key] = {
        value,
        rating,
        threshold,
        unit: threshold.unit ?? 'ms',
      };
    }
  });

  return map;
}

function buildRecommendations(vitals: Record<string, any>, metrics: Record<string, MetricSummary>) {
  const immediate: any[] = [];
  const shortTerm: any[] = [];
  const longTerm: any[] = [];

  const lcp = vitals.lcp?.value;
  if (typeof lcp === 'number' && lcp > 2500) {
    immediate.push({
      type: 'rendering',
      title: 'Improve Largest Contentful Paint',
      description:
        'Prioritise critical content, optimise hero assets, and defer non-essential scripts.',
      impact: 'high',
    });
  }

  const cls = vitals.cls?.value;
  if (typeof cls === 'number' && cls > 0.1) {
    immediate.push({
      type: 'layout',
      title: 'Reduce layout shifts',
      description:
        'Reserve space for async content, use aspect ratios, and avoid inserting DOM elements above existing content.',
      impact: 'medium',
    });
  }

  const bundleSize = metrics['bundle_size']?.avg;
  if (typeof bundleSize === 'number' && bundleSize > 1024 * 400) {
    shortTerm.push({
      type: 'bundle',
      title: 'Reduce bundle size',
      description:
        'Analyse bundle with Vite analyzer, remove unused dependencies, and apply code splitting.',
      impact: 'high',
    });
  }

  const apiLatency = dashboardLatency(metrics);
  if (apiLatency && apiLatency > 1000) {
    shortTerm.push({
      type: 'backend',
      title: 'Optimise slow API endpoints',
      description:
        'Investigate routes with high response time and cache frequently requested data.',
      impact: 'medium',
    });
  }

  longTerm.push({
    type: 'observability',
    title: 'Automate performance regression alerts',
    description: 'Set up alert rules in monitoring dashboard for key Web Vitals thresholds.',
    impact: 'medium',
  });

  return { immediate, shortTerm, longTerm };
}

function deriveOptimizationActions(
  vitals: Record<string, any>,
  metrics: Record<string, MetricSummary>
) {
  const recommendations = buildRecommendations(vitals, metrics);
  return {
    applied: [],
    failed: [],
    recommendations,
  };
}

function calculatePerformanceScore(metrics: Record<string, MetricSummary>): number {
  const lcp = metrics['web_vitals_lcp']?.avg ?? 0;
  const cls = metrics['web_vitals_cls']?.avg ?? 0;
  const fid = metrics['web_vitals_fid']?.avg ?? 0;

  const lcpScore = lcp ? Math.max(0, 100 - (lcp - 2400) / 16) : 100;
  const clsScore = cls ? Math.max(0, 100 - cls * 400) : 100;
  const fidScore = fid ? Math.max(0, 100 - (fid - 100) / 2) : 100;

  return Math.round((lcpScore * 0.4 + clsScore * 0.3 + fidScore * 0.3) / 1.0);
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function dashboardLatency(metrics: Record<string, MetricSummary>): number | null {
  return metrics['api_response_time']?.avg ?? null;
}
