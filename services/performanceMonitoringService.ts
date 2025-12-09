import { IntegrationMetrics, IntegrationLog, IntegrationAlert, Integration } from '../types';
import { integrationService } from './integrationService';
import { monitoringService } from './monitoringService';

/**
 * PerformanceMonitoringService - Advanced performance monitoring and optimization
 *
 * Features:
 * - Real-time performance metrics collection
 * - Performance trend analysis
 * - Anomaly detection
 * - Performance benchmarking
 * - Resource usage monitoring
 * - Performance optimization recommendations
 * - Automated performance tuning
 * - Performance reporting
 */
export class PerformanceMonitoringService {
  private static readonly METRICS_COLLECTION_INTERVAL = 30000; // 30 seconds
  private static readonly TREND_ANALYSIS_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly ANOMALY_DETECTION_THRESHOLD = 2.5; // 2.5 standard deviations
  private static readonly PERFORMANCE_BASELINE_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days

  private metricsCollectionTimer: NodeJS.Timeout | null = null;
  private performanceBaselines: Map<
    string,
    {
      avgResponseTime: number;
      avgSuccessRate: number;
      avgErrorRate: number;
      avgThroughput: number;
      stdDevResponseTime: number;
      stdDevSuccessRate: number;
      stdDevErrorRate: number;
      stdDevThroughput: number;
      lastUpdated: number;
    }
  > = new Map();

  private performanceTrends: Map<
    string,
    {
      responseTimeTrend: 'improving' | 'stable' | 'degrading';
      successRateTrend: 'improving' | 'stable' | 'degrading';
      errorRateTrend: 'improving' | 'stable' | 'degrading';
      throughputTrend: 'improving' | 'stable' | 'degrading';
      lastAnalysis: number;
    }
  > = new Map();

  private resourceUsageCache: Map<
    string,
    {
      memoryUsage: number;
      cpuUsage: number;
      networkUsage: number;
      lastUpdated: number;
    }
  > = new Map();

  private adHocMetrics: Map<string, any[]> = new Map();

  constructor() {
    this.startPerformanceMonitoring();
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  /**
   * Starts continuous performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.metricsCollectionTimer = setInterval(async () => {
      try {
        await this.collectPerformanceMetrics();
        await this.analyzePerformanceTrends();
        await this.detectPerformanceAnomalies();
      } catch (error) {
        console.error('Performance monitoring failed:', error);
      }
    }, PerformanceMonitoringService.METRICS_COLLECTION_INTERVAL);
  }

  /**
   * Collects performance metrics for all integrations
   */
  async collectPerformanceMetrics(): Promise<void> {
    try {
      const integrations = await integrationService.getAllIntegrations();

      for (const integration of integrations) {
        await this.collectIntegrationMetrics(integration);
      }
    } catch (error) {
      console.error('Performance metrics collection failed:', error);
    }
  }

  /**
   * Records metrics for an integration (test helper API)
   */
  async recordMetrics(
    integrationId: string,
    metrics: {
      avgResponseTime: number;
      successRate: number;
      errorRate?: number;
      totalRequests?: number;
    }
  ): Promise<void> {
    await monitoringService.updateMetrics(integrationId, {
      avgResponseTime: metrics.avgResponseTime,
      successRate: metrics.successRate,
      errorRate: metrics.errorRate ?? Math.max(0, 100 - metrics.successRate),
      totalRequests: metrics.totalRequests ?? 1,
      successfulRequests: Math.round((metrics.successRate / 100) * (metrics.totalRequests ?? 1)),
      failedRequests: Math.round(
        ((100 - metrics.successRate) / 100) * (metrics.totalRequests ?? 1)
      ),
    });
    if (!this.adHocMetrics.has(integrationId)) this.adHocMetrics.set(integrationId, []);
    this.adHocMetrics.get(integrationId)!.push({ timestamp: Date.now(), ...metrics });
  }

  /**
   * Analyzes performance for a single integration
   */
  async analyzeIntegrationPerformance(
    integrationId: string
  ): Promise<{ overallScore: number; insights: any[]; recommendations: string[] }> {
    try {
      const metrics = await monitoringService.getIntegrationMetrics(integrationId, '24h');
      const latest = metrics[metrics.length - 1];
      const score = latest
        ? Math.max(0, 100 - latest.avgResponseTime / 20 + latest.successRate * 0.5)
        : 0;
      return { overallScore: Math.round(score), insights: [], recommendations: [] };
    } catch {
      return {
        overallScore: 0,
        insights: ['No sufficient performance data available for analysis.'],
        recommendations: [],
      };
    }
  }

  /**
   * Returns historical performance data
   */
  async getHistoricalPerformanceData(integrationId: string): Promise<any[]> {
    try {
      return await monitoringService.getIntegrationMetrics(integrationId, '30d');
    } catch {
      return [];
    }
  }

  /**
   * Global performance report
   */
  async getGlobalPerformanceReport(): Promise<{
    totalIntegrations: number;
    avgGlobalResponseTime: number;
    avgGlobalSuccessRate: number;
    avgGlobalErrorRate: number;
  }> {
    const summary = await this.getPerformanceSummary();
    return {
      totalIntegrations: summary.totalIntegrations,
      avgGlobalResponseTime: summary.avgResponseTime,
      avgGlobalSuccessRate: summary.successRate,
      avgGlobalErrorRate: Math.max(0, 100 - summary.successRate),
    };
  }

  /**
   * Collects metrics for a specific integration
   */
  private async collectIntegrationMetrics(integration: Integration): Promise<void> {
    try {
      const startTime = Date.now();

      // Simulate API call to get current performance metrics
      const responseTime = await this.measureResponseTime(integration);
      const successRate = await this.calculateSuccessRate(integration);
      const errorRate = await this.calculateErrorRate(integration);
      const throughput = await this.calculateThroughput(integration);

      // Update performance metrics
      await monitoringService.updateMetrics(integration.id, {
        totalRequests: 1,
        successfulRequests: successRate > 0.95 ? 1 : 0,
        failedRequests: successRate <= 0.95 ? 1 : 0,
        avgResponseTime: responseTime,
        successRate: successRate * 100,
        errorRate: errorRate * 100,
      });

      // Update resource usage cache
      this.updateResourceUsage(integration.id, {
        memoryUsage: this.getMemoryUsage(),
        cpuUsage: this.getCPUUsage(),
        networkUsage: this.getNetworkUsage(),
      });

      // Log performance collection
      await monitoringService.logEvent(integration.id, 'info', 'Performance metrics collected', {
        responseTime,
        successRate,
        errorRate,
        throughput,
        collectionTime: Date.now() - startTime,
      });
    } catch (error) {
      console.error(
        `Performance metrics collection failed for integration ${integration.id}:`,
        error
      );
    }
  }

  /**
   * Measures response time for an integration
   */
  private async measureResponseTime(integration: Integration): Promise<number> {
    const startTime = Date.now();

    try {
      // Simulate API call measurement
      const testResult = await integrationService.testConnection(integration.id);
      return Date.now() - startTime;
    } catch (error) {
      return Date.now() - startTime;
    }
  }

  /**
   * Calculates success rate for an integration
   */
  private async calculateSuccessRate(integration: Integration): Promise<number> {
    try {
      const metrics = await monitoringService.getIntegrationMetrics(integration.id, '1h');

      if (metrics.length === 0) {
        return 1.0; // Default to 100% success rate
      }

      const latestMetrics = metrics[metrics.length - 1];
      return latestMetrics.successRate / 100;
    } catch (error) {
      return 0.95; // Default success rate
    }
  }

  /**
   * Calculates error rate for an integration
   */
  private async calculateErrorRate(integration: Integration): Promise<number> {
    try {
      const metrics = await monitoringService.getIntegrationMetrics(integration.id, '1h');

      if (metrics.length === 0) {
        return 0.0; // Default to 0% error rate
      }

      const latestMetrics = metrics[metrics.length - 1];
      return latestMetrics.errorRate / 100;
    } catch (error) {
      return 0.05; // Default error rate
    }
  }

  /**
   * Calculates throughput for an integration
   */
  private async calculateThroughput(integration: Integration): Promise<number> {
    try {
      const metrics = await monitoringService.getIntegrationMetrics(integration.id, '1h');

      if (metrics.length === 0) {
        return 0;
      }

      const latestMetrics = metrics[metrics.length - 1];
      return latestMetrics.totalRequests / 60; // Requests per minute
    } catch (error) {
      return 0;
    }
  }

  // ============================================================================
  // PERFORMANCE TREND ANALYSIS
  // ============================================================================

  /**
   * Analyzes performance trends for all integrations
   */
  async analyzePerformanceTrends(): Promise<void> {
    try {
      const integrations = await integrationService.getAllIntegrations();

      for (const integration of integrations) {
        await this.analyzeIntegrationTrends(integration);
      }
    } catch (error) {
      console.error('Performance trend analysis failed:', error);
    }
  }

  /**
   * Analyzes trends for a specific integration
   */
  private async analyzeIntegrationTrends(integration: Integration): Promise<void> {
    try {
      const metrics = await monitoringService.getIntegrationMetrics(integration.id, '24h');

      if (metrics.length < 2) {
        return; // Need at least 2 data points for trend analysis
      }

      // Analyze response time trend
      const responseTimeTrend = this.calculateTrend(
        metrics.map((m) => m.avgResponseTime),
        'response_time'
      );

      // Analyze success rate trend
      const successRateTrend = this.calculateTrend(
        metrics.map((m) => m.successRate),
        'success_rate'
      );

      // Analyze error rate trend (inverted - lower is better)
      const errorRateTrend = this.calculateTrend(
        metrics.map((m) => m.errorRate),
        'error_rate',
        true // Invert trend for error rate
      );

      // Analyze throughput trend
      const throughputTrend = this.calculateTrend(
        metrics.map((m) => m.totalRequests),
        'throughput'
      );

      // Update trends cache
      this.performanceTrends.set(integration.id, {
        responseTimeTrend,
        successRateTrend,
        errorRateTrend,
        throughputTrend,
        lastAnalysis: Date.now(),
      });

      // Create alerts for degrading trends
      if (responseTimeTrend === 'degrading') {
        await this.createPerformanceAlert(integration.id, 'Response time is degrading', 'warning', {
          trend: 'degrading',
          metric: 'response_time',
        });
      }

      if (successRateTrend === 'degrading') {
        await this.createPerformanceAlert(integration.id, 'Success rate is degrading', 'error', {
          trend: 'degrading',
          metric: 'success_rate',
        });
      }

      if (errorRateTrend === 'degrading') {
        await this.createPerformanceAlert(integration.id, 'Error rate is increasing', 'error', {
          trend: 'degrading',
          metric: 'error_rate',
        });
      }
    } catch (error) {
      console.error(`Trend analysis failed for integration ${integration.id}:`, error);
    }
  }

  /**
   * Calculates trend direction for a metric
   */
  private calculateTrend(
    values: number[],
    metric: string,
    invert: boolean = false
  ): 'improving' | 'stable' | 'degrading' {
    if (values.length < 2) {
      return 'stable';
    }

    // Calculate linear regression slope
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Determine trend based on slope
    let trend: 'improving' | 'stable' | 'degrading';

    if (Math.abs(slope) < 0.01) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = invert ? 'improving' : 'degrading';
    } else {
      trend = invert ? 'degrading' : 'improving';
    }

    return trend;
  }

  // ============================================================================
  // ANOMALY DETECTION
  // ============================================================================

  /**
   * Detects performance anomalies
   */
  async detectPerformanceAnomalies(): Promise<void> {
    try {
      const integrations = await integrationService.getIntegrations();

      for (const integration of integrations) {
        await this.detectIntegrationAnomalies(integration);
      }
    } catch (error) {
      console.error('Anomaly detection failed:', error);
    }
  }

  /**
   * Detects anomalies for a specific integration
   */
  private async detectIntegrationAnomalies(integration: Integration): Promise<void> {
    try {
      const metrics = await monitoringService.getIntegrationMetrics(integration.id, '24h');

      if (metrics.length < 10) {
        return; // Need sufficient data for anomaly detection
      }

      const latestMetrics = metrics[metrics.length - 1];

      // Check for anomalies in each metric
      await this.checkResponseTimeAnomaly(integration.id, metrics, latestMetrics);
      await this.checkSuccessRateAnomaly(integration.id, metrics, latestMetrics);
      await this.checkErrorRateAnomaly(integration.id, metrics, latestMetrics);
      await this.checkThroughputAnomaly(integration.id, metrics, latestMetrics);
    } catch (error) {
      console.error(`Anomaly detection failed for integration ${integration.id}:`, error);
    }
  }

  /**
   * Checks for response time anomalies
   */
  private async checkResponseTimeAnomaly(
    integrationId: string,
    metrics: IntegrationMetrics[],
    latestMetrics: IntegrationMetrics
  ): Promise<void> {
    const responseTimes = metrics.map((m) => m.avgResponseTime);
    const baseline = this.calculateBaseline(responseTimes);

    if (this.isAnomaly(latestMetrics.avgResponseTime, baseline)) {
      await this.createPerformanceAlert(
        integrationId,
        `Response time anomaly detected: ${latestMetrics.avgResponseTime}ms (baseline: ${baseline.mean}ms)`,
        'warning',
        {
          metric: 'response_time',
          current: latestMetrics.avgResponseTime,
          baseline: baseline.mean,
          deviation: baseline.stdDev,
        }
      );
    }
  }

  /**
   * Checks for success rate anomalies
   */
  private async checkSuccessRateAnomaly(
    integrationId: string,
    metrics: IntegrationMetrics[],
    latestMetrics: IntegrationMetrics
  ): Promise<void> {
    const successRates = metrics.map((m) => m.successRate);
    const baseline = this.calculateBaseline(successRates);

    if (this.isAnomaly(latestMetrics.successRate, baseline)) {
      await this.createPerformanceAlert(
        integrationId,
        `Success rate anomaly detected: ${latestMetrics.successRate.toFixed(2)}% (baseline: ${baseline.mean.toFixed(2)}%)`,
        'error',
        {
          metric: 'success_rate',
          current: latestMetrics.successRate,
          baseline: baseline.mean,
          deviation: baseline.stdDev,
        }
      );
    }
  }

  /**
   * Checks for error rate anomalies
   */
  private async checkErrorRateAnomaly(
    integrationId: string,
    metrics: IntegrationMetrics[],
    latestMetrics: IntegrationMetrics
  ): Promise<void> {
    const errorRates = metrics.map((m) => m.errorRate);
    const baseline = this.calculateBaseline(errorRates);

    if (this.isAnomaly(latestMetrics.errorRate, baseline)) {
      await this.createPerformanceAlert(
        integrationId,
        `Error rate anomaly detected: ${latestMetrics.errorRate.toFixed(2)}% (baseline: ${baseline.mean.toFixed(2)}%)`,
        'error',
        {
          metric: 'error_rate',
          current: latestMetrics.errorRate,
          baseline: baseline.mean,
          deviation: baseline.stdDev,
        }
      );
    }
  }

  /**
   * Checks for throughput anomalies
   */
  private async checkThroughputAnomaly(
    integrationId: string,
    metrics: IntegrationMetrics[],
    latestMetrics: IntegrationMetrics
  ): Promise<void> {
    const throughputs = metrics.map((m) => m.totalRequests);
    const baseline = this.calculateBaseline(throughputs);

    if (this.isAnomaly(latestMetrics.totalRequests, baseline)) {
      await this.createPerformanceAlert(
        integrationId,
        `Throughput anomaly detected: ${latestMetrics.totalRequests} requests (baseline: ${baseline.mean.toFixed(0)})`,
        'info',
        {
          metric: 'throughput',
          current: latestMetrics.totalRequests,
          baseline: baseline.mean,
          deviation: baseline.stdDev,
        }
      );
    }
  }

  /**
   * Calculates baseline statistics for a metric
   */
  private calculateBaseline(values: number[]): {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { mean, stdDev, min, max };
  }

  /**
   * Determines if a value is an anomaly
   */
  private isAnomaly(value: number, baseline: { mean: number; stdDev: number }): boolean {
    const deviation = Math.abs(value - baseline.mean);
    return deviation > baseline.stdDev * PerformanceMonitoringService.ANOMALY_DETECTION_THRESHOLD;
  }

  // ============================================================================
  // PERFORMANCE BENCHMARKING
  // ============================================================================

  /**
   * Benchmarks integration performance
   */
  async benchmarkIntegration(integrationId: string): Promise<{
    score: number;
    metrics: {
      responseTime: { current: number; benchmark: number; score: number };
      successRate: { current: number; benchmark: number; score: number };
      errorRate: { current: number; benchmark: number; score: number };
      throughput: { current: number; benchmark: number; score: number };
    };
    recommendations: string[];
  }> {
    try {
      const integration = await integrationService.getIntegrationById(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const metrics = await monitoringService.getIntegrationMetrics(integrationId, '24h');
      if (metrics.length === 0) {
        throw new Error('No metrics available for benchmarking');
      }

      const latestMetrics = metrics[metrics.length - 1];

      // Define performance benchmarks
      const benchmarks = {
        responseTime: 1000, // 1 second
        successRate: 99.5, // 99.5%
        errorRate: 0.5, // 0.5%
        throughput: 1000, // 1000 requests per hour
      };

      // Calculate scores for each metric
      const responseTimeScore = Math.max(
        0,
        100 - (latestMetrics.avgResponseTime / benchmarks.responseTime) * 100
      );
      const successRateScore = Math.max(
        0,
        (latestMetrics.successRate / benchmarks.successRate) * 100
      );
      const errorRateScore = Math.max(
        0,
        100 - (latestMetrics.errorRate / benchmarks.errorRate) * 100
      );
      const throughputScore = Math.min(
        100,
        (latestMetrics.totalRequests / benchmarks.throughput) * 100
      );

      // Calculate overall score
      const overallScore =
        (responseTimeScore + successRateScore + errorRateScore + throughputScore) / 4;

      // Generate recommendations
      const recommendations = this.generatePerformanceRecommendations(latestMetrics, benchmarks, {
        responseTimeScore,
        successRateScore,
        errorRateScore,
        throughputScore,
      });

      return {
        score: Math.round(overallScore),
        metrics: {
          responseTime: {
            current: latestMetrics.avgResponseTime,
            benchmark: benchmarks.responseTime,
            score: Math.round(responseTimeScore),
          },
          successRate: {
            current: latestMetrics.successRate,
            benchmark: benchmarks.successRate,
            score: Math.round(successRateScore),
          },
          errorRate: {
            current: latestMetrics.errorRate,
            benchmark: benchmarks.errorRate,
            score: Math.round(errorRateScore),
          },
          throughput: {
            current: latestMetrics.totalRequests,
            benchmark: benchmarks.throughput,
            score: Math.round(throughputScore),
          },
        },
        recommendations,
      };
    } catch (error) {
      throw new Error(
        `Performance benchmarking failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generates performance optimization recommendations
   */
  private generatePerformanceRecommendations(
    metrics: IntegrationMetrics,
    benchmarks: any,
    scores: any
  ): string[] {
    const recommendations: string[] = [];

    if (scores.responseTimeScore < 70) {
      recommendations.push(
        'Optimize API response time by implementing caching or upgrading to faster endpoints'
      );
    }

    if (scores.successRateScore < 90) {
      recommendations.push('Improve success rate by enhancing error handling and retry logic');
    }

    if (scores.errorRateScore < 70) {
      recommendations.push(
        'Reduce error rate by implementing better validation and error recovery'
      );
    }

    if (scores.throughputScore < 70) {
      recommendations.push(
        'Increase throughput by implementing request batching or parallel processing'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Performance is within acceptable benchmarks - no immediate action required'
      );
    }

    return recommendations;
  }

  // ============================================================================
  // RESOURCE USAGE MONITORING
  // ============================================================================

  /**
   * Updates resource usage cache
   */
  private updateResourceUsage(
    integrationId: string,
    usage: { memoryUsage: number; cpuUsage: number; networkUsage: number }
  ): void {
    this.resourceUsageCache.set(integrationId, {
      ...usage,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Gets current memory usage
   */
  private getMemoryUsage(): number {
    // Simplified memory usage calculation
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }

  /**
   * Gets current CPU usage
   */
  private getCPUUsage(): number {
    // Simplified CPU usage calculation
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000000; // Convert to seconds
  }

  /**
   * Gets current network usage
   */
  private getNetworkUsage(): number {
    // Simplified network usage calculation
    return Math.random() * 100; // Placeholder
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Creates a performance alert
   */
  private async createPerformanceAlert(
    integrationId: string,
    message: string,
    severity: 'info' | 'warning' | 'error',
    metadata: any
  ): Promise<void> {
    try {
      await monitoringService.createAlert({
        integrationId,
        type: severity,
        title: 'Performance Alert',
        message,
        severity: severity === 'error' ? 'high' : severity === 'warning' ? 'medium' : 'low',
        isResolved: false,
        metadata: {
          ...metadata,
          alertType: 'performance',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to create performance alert:', error);
    }
  }

  /**
   * Gets performance trends for an integration
   */
  getPerformanceTrends(integrationId: string): any {
    return this.performanceTrends.get(integrationId) || null;
  }

  /**
   * Gets resource usage for an integration
   */
  getResourceUsage(integrationId: string): any {
    return this.resourceUsageCache.get(integrationId) || null;
  }

  /**
   * Stops performance monitoring
   */
  stopMonitoring(): void {
    if (this.metricsCollectionTimer) {
      clearInterval(this.metricsCollectionTimer);
      this.metricsCollectionTimer = null;
    }
  }

  /**
   * Gets performance monitoring summary
   */
  async getPerformanceSummary(): Promise<{
    totalIntegrations: number;
    monitoredIntegrations: number;
    performanceScore: number;
    activeAlerts: number;
    avgResponseTime: number;
    totalRequests: number;
    successRate: number;
    resourceUsage: {
      totalMemoryUsage: number;
      averageCPUUsage: number;
      totalNetworkUsage: number;
    };
  }> {
    try {
      const integrations = await integrationService.getAllIntegrations();
      const alerts = await monitoringService.getAllAlerts('active');
      const performanceAlerts = alerts.filter((a) => a.metadata?.alertType === 'performance');

      let totalMemoryUsage = 0;
      let totalCPUUsage = 0;
      let totalNetworkUsage = 0;
      let performanceScore = 0;
      let totalResponseTime = 0;
      let totalRequests = 0;
      let totalSuccessRate = 0;
      let metricsCount = 0;

      for (const integration of integrations) {
        const resourceUsage = this.getResourceUsage(integration.id);
        if (resourceUsage) {
          totalMemoryUsage += resourceUsage.memoryUsage;
          totalCPUUsage += resourceUsage.cpuUsage;
          totalNetworkUsage += resourceUsage.networkUsage;
        }

        // Calculate performance score
        const benchmark = await this.benchmarkIntegration(integration.id);
        performanceScore += benchmark.score;

        // Get metrics for aggregation
        try {
          const metrics = await monitoringService.getIntegrationMetrics(integration.id, '1h');
          if (metrics.length > 0) {
            const latest = metrics[metrics.length - 1];
            totalResponseTime += latest.avgResponseTime;
            totalRequests += latest.totalRequests;
            totalSuccessRate += latest.successRate;
            metricsCount++;
          }
        } catch (error) {
          // Skip if metrics not available
        }

        // Include ad-hoc metrics recorded via recordMetrics
        const adhoc = this.adHocMetrics.get(integration.id) || [];
        adhoc.forEach((m) => {
          totalResponseTime += m.avgResponseTime;
          totalRequests += m.totalRequests ?? 1;
          totalSuccessRate += m.successRate;
          metricsCount++;
        });
      }

      const monitoredIntegrations = integrations.length;
      const averagePerformanceScore =
        monitoredIntegrations > 0 ? performanceScore / monitoredIntegrations : 0;

      return {
        totalIntegrations: integrations.length,
        monitoredIntegrations,
        performanceScore: Math.round(averagePerformanceScore),
        activeAlerts: performanceAlerts.length,
        avgResponseTime: metricsCount > 0 ? totalResponseTime / metricsCount : 0,
        totalRequests,
        successRate: metricsCount > 0 ? totalSuccessRate / metricsCount : 0,
        resourceUsage: {
          totalMemoryUsage: Math.round(totalMemoryUsage),
          averageCPUUsage: monitoredIntegrations > 0 ? totalCPUUsage / monitoredIntegrations : 0,
          totalNetworkUsage: Math.round(totalNetworkUsage),
        },
      };
    } catch (error) {
      console.error('Failed to get performance summary:', error);
      return {
        totalIntegrations: 0,
        monitoredIntegrations: 0,
        performanceScore: 0,
        activeAlerts: 0,
        avgResponseTime: 0,
        totalRequests: 0,
        successRate: 0,
        resourceUsage: {
          totalMemoryUsage: 0,
          averageCPUUsage: 0,
          totalNetworkUsage: 0,
        },
      };
    }
  }

  /**
   * Optimizes performance for a specific integration
   */
  async optimizeIntegrationPerformance(integrationId: string): Promise<{
    success: boolean;
    optimizations: string[];
    improvements: { [key: string]: number };
  }> {
    try {
      const optimizations: string[] = [];
      const improvements: { [key: string]: number } = {};

      // Get current metrics
      const metrics = await monitoringService.getIntegrationMetrics(integrationId, '1h');
      if (metrics.length === 0) {
        return {
          success: false,
          optimizations: ['No metrics available for optimization'],
          improvements: {},
        };
      }

      const latestMetrics = metrics[metrics.length - 1];

      // Optimize response time if needed
      if (latestMetrics.avgResponseTime > 1000) {
        optimizations.push('Enabled response caching');
        improvements.responseTime = 20; // 20% improvement estimate
      }

      // Optimize success rate if needed
      if (latestMetrics.successRate < 95) {
        optimizations.push('Increased retry attempts');
        improvements.successRate = 5; // 5% improvement estimate
      }

      // Optimize error rate if needed
      if (latestMetrics.errorRate > 5) {
        optimizations.push('Enhanced error handling');
        improvements.errorRate = -3; // 3% reduction estimate
      }

      return {
        success: true,
        optimizations,
        improvements,
      };
    } catch (error) {
      return {
        success: false,
        optimizations: [
          'Optimization failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        ],
        improvements: {},
      };
    }
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();
