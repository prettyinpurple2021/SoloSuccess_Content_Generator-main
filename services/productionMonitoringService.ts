/**
 * Production Monitoring Service
 *
 * Provides comprehensive monitoring and alerting for critical failures
 * in production environment.
 */

interface MonitoringConfig {
  healthCheckInterval: number;
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  alertChannels: {
    console: boolean;
    webhook: boolean;
    email: boolean;
  };
  retentionPeriod: number; // days
}

interface HealthMetrics {
  timestamp: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  memoryUsage: number;
  activeConnections: number;
  uptime: number;
  version: string;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, unknown>;
}

interface SystemError {
  id: string;
  type: 'database' | 'ai_service' | 'authentication' | 'integration' | 'application';
  message: string;
  stack?: string;
  timestamp: Date;
  userId?: string;
  requestId?: string;
  metadata: Record<string, unknown>;
}

interface MetricPoint {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
  unit?: string;
}

export interface MetricSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
  unit?: string;
}

interface ApiMetricRecord {
  timestamp: number;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
}

interface DatabaseMetricRecord {
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
}

interface AiServiceMetricRecord {
  timestamp: number;
  service: string;
  operation: string;
  duration: number;
  success: boolean;
  tokensUsed?: number;
}

interface IntegrationMetricRecord {
  timestamp: number;
  platform: string;
  operation: string;
  duration: number;
  success: boolean;
}

interface AlertRule {
  id: string;
  name: string;
  targetMetric: string;
  threshold: number;
  comparison: 'gt' | 'gte' | 'lt' | 'lte';
  windowMs: number;
  createdAt: Date;
}

class ProductionMonitoringService {
  private config: MonitoringConfig;
  private metrics: HealthMetrics[] = [];
  private alerts: Alert[] = [];
  private errors: SystemError[] = [];
  private isMonitoring = false;
  private healthCheckTimer?: NodeJS.Timeout;
  private startTime = Date.now();
  private metricStore = new Map<string, MetricPoint[]>();
  private apiMetrics: ApiMetricRecord[] = [];
  private databaseMetrics: DatabaseMetricRecord[] = [];
  private aiServiceMetrics: AiServiceMetricRecord[] = [];
  private integrationMetrics: IntegrationMetricRecord[] = [];
  private alertRules = new Map<string, AlertRule>();
  private readonly maxMetricEntries = 5000;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      healthCheckInterval: 60000, // 1 minute
      alertThresholds: {
        errorRate: 0.05, // 5%
        responseTime: 5000, // 5 seconds
        memoryUsage: 0.85, // 85%
        cpuUsage: 0.8, // 80%
      },
      alertChannels: {
        console: true,
        webhook: false,
        email: false,
      },
      retentionPeriod: 7, // 7 days
      ...config,
    };
  }

  /**
   * Start monitoring system
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('🔍 Monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting production monitoring...');

    // Start periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    // Initial health check
    this.performHealthCheck();

    // Set up error handlers
    this.setupErrorHandlers();

    console.log(
      `✅ Production monitoring started (interval: ${this.config.healthCheckInterval}ms)`
    );
  }

  /**
   * Stop monitoring system
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    console.log('🔍 Production monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();

      // Check all system components
      const [databaseHealth, aiServiceHealth, authHealth, integrationHealth, systemHealth] =
        await Promise.allSettled([
          this.checkDatabaseHealth(),
          this.checkAIServiceHealth(),
          this.checkAuthenticationHealth(),
          this.checkIntegrationHealth(),
          this.checkSystemHealth(),
        ]);

      const responseTime = Date.now() - startTime;

      // Calculate overall health status
      const healthChecks = [
        databaseHealth,
        aiServiceHealth,
        authHealth,
        integrationHealth,
        systemHealth,
      ];

      const failedChecks = healthChecks.filter((check) => check.status === 'rejected').length;
      const totalChecks = healthChecks.length;
      const errorRate = failedChecks / totalChecks;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (errorRate > 0.5) {
        status = 'unhealthy';
      } else if (errorRate > 0.2) {
        status = 'degraded';
      }

      // Create health metrics
      const metrics: HealthMetrics = {
        timestamp: new Date(),
        status,
        responseTime,
        errorRate,
        memoryUsage: this.getMemoryUsage(),
        activeConnections: this.getActiveConnections(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
      };

      this.metrics.push(metrics);
      this.cleanupOldMetrics();

      // Check for alerts
      this.checkAlertConditions(metrics);

      // Log health status
      if (status === 'healthy') {
        console.log(`✅ Health check passed (${responseTime}ms)`);
      } else if (status === 'degraded') {
        console.log(
          `⚠️ System degraded (${responseTime}ms, ${(errorRate * 100).toFixed(1)}% error rate)`
        );
      } else {
        console.log(
          `❌ System unhealthy (${responseTime}ms, ${(errorRate * 100).toFixed(1)}% error rate)`
        );
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.recordError('application', 'Health check failed', error);
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Dynamic import to avoid circular dependencies
      const { testConnection } = await import('./neonService.js');
      await testConnection();
      return true;
    } catch (error) {
      this.recordError('database', 'Database health check failed', error);
      throw error;
    }
  }

  /**
   * Check AI service health
   */
  private async checkAIServiceHealth(): Promise<boolean> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
      }

      // Simple configuration check - avoid making actual API calls
      // to prevent unnecessary costs and rate limiting
      return true;
    } catch (error) {
      this.recordError('ai_service', 'AI service health check failed', error);
      throw error;
    }
  }

  /**
   * Check authentication health
   */
  private async checkAuthenticationHealth(): Promise<boolean> {
    try {
      const requiredVars = [
        'VITE_STACK_PROJECT_ID',
        'VITE_STACK_PUBLISHABLE_CLIENT_KEY',
        'STACK_SECRET_SERVER_KEY',
      ];

      const missingVars = requiredVars.filter((varName) => !process.env[varName]);

      if (missingVars.length > 0) {
        throw new Error(`Missing authentication variables: ${missingVars.join(', ')}`);
      }

      return true;
    } catch (error) {
      this.recordError('authentication', 'Authentication health check failed', error);
      throw error;
    }
  }

  /**
   * Check integration health
   */
  private async checkIntegrationHealth(): Promise<boolean> {
    try {
      if (!process.env.INTEGRATION_ENCRYPTION_SECRET) {
        throw new Error('Integration encryption secret not configured');
      }

      if (process.env.INTEGRATION_ENCRYPTION_SECRET.length < 32) {
        throw new Error('Integration encryption secret too short');
      }

      return true;
    } catch (error) {
      this.recordError('integration', 'Integration health check failed', error);
      throw error;
    }
  }

  /**
   * Check system health (memory, etc.)
   */
  private async checkSystemHealth(): Promise<boolean> {
    try {
      const memoryUsage = this.getMemoryUsage();

      if (memoryUsage > this.config.alertThresholds.memoryUsage) {
        throw new Error(`High memory usage: ${(memoryUsage * 100).toFixed(1)}%`);
      }

      return true;
    } catch (error) {
      this.recordError('application', 'System health check failed', error);
      throw error;
    }
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      // Estimate based on heap used vs heap total
      return usage.heapUsed / usage.heapTotal;
    }
    return 0;
  }

  /**
   * Get active connections count (placeholder)
   */
  private getActiveConnections(): number {
    // In a real implementation, this would track actual connections
    return 0;
  }

  /**
   * Check for alert conditions
   */
  private checkAlertConditions(metrics: HealthMetrics): void {
    const { alertThresholds } = this.config;

    // Check error rate
    if (metrics.errorRate > alertThresholds.errorRate) {
      this.createAlert(
        'critical',
        'High Error Rate',
        `Error rate is ${(metrics.errorRate * 100).toFixed(1)}% (threshold: ${(alertThresholds.errorRate * 100).toFixed(1)}%)`,
        { errorRate: metrics.errorRate, threshold: alertThresholds.errorRate }
      );
    }

    // Check response time
    if (metrics.responseTime > alertThresholds.responseTime) {
      this.createAlert(
        'warning',
        'Slow Response Time',
        `Response time is ${metrics.responseTime}ms (threshold: ${alertThresholds.responseTime}ms)`,
        { responseTime: metrics.responseTime, threshold: alertThresholds.responseTime }
      );
    }

    // Check memory usage
    if (metrics.memoryUsage > alertThresholds.memoryUsage) {
      this.createAlert(
        'warning',
        'High Memory Usage',
        `Memory usage is ${(metrics.memoryUsage * 100).toFixed(1)}% (threshold: ${(alertThresholds.memoryUsage * 100).toFixed(1)}%)`,
        { memoryUsage: metrics.memoryUsage, threshold: alertThresholds.memoryUsage }
      );
    }

    // Check system status
    if (metrics.status === 'unhealthy') {
      this.createAlert('critical', 'System Unhealthy', 'Multiple system components are failing', {
        status: metrics.status,
        errorRate: metrics.errorRate,
      });
    } else if (metrics.status === 'degraded') {
      this.createAlert(
        'warning',
        'System Degraded',
        'Some system components are experiencing issues',
        { status: metrics.status, errorRate: metrics.errorRate }
      );
    }
  }

  /**
   * Create and send alert
   */
  private createAlert(
    type: Alert['type'],
    title: string,
    message: string,
    metadata: Record<string, unknown> = {}
  ): void {
    const alert: Alert = {
      id: this.generateId(),
      type,
      title,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata,
    };

    this.alerts.push(alert);
    this.sendAlert(alert);
    this.cleanupOldAlerts();
  }

  /**
   * Send alert through configured channels
   */
  private sendAlert(alert: Alert): void {
    const { alertChannels } = this.config;

    // Console logging
    if (alertChannels.console) {
      const icon =
        alert.type === 'critical'
          ? '🚨'
          : alert.type === 'error'
            ? '❌'
            : alert.type === 'warning'
              ? '⚠️'
              : 'ℹ️';

      console.log(`${icon} ALERT [${alert.type.toUpperCase()}] ${alert.title}: ${alert.message}`);

      if (Object.keys(alert.metadata).length > 0) {
        console.log('   Metadata:', JSON.stringify(alert.metadata, null, 2));
      }
    }

    // Webhook notifications
    if (alertChannels.webhook && process.env.MONITORING_WEBHOOK_URL) {
      this.sendWebhookAlert(alert);
    }

    // Email notifications (placeholder)
    if (alertChannels.email && process.env.MONITORING_EMAIL_ENDPOINT) {
      this.sendEmailAlert(alert);
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert): Promise<void> {
    try {
      const webhookUrl = process.env.MONITORING_WEBHOOK_URL;
      if (!webhookUrl) return;

      const payload = {
        alert: {
          id: alert.id,
          type: alert.type,
          title: alert.title,
          message: alert.message,
          timestamp: alert.timestamp.toISOString(),
          metadata: alert.metadata,
        },
        service: 'solosuccess-ai-content-factory',
        environment: process.env.NODE_ENV || 'development',
      };

      // Use fetch if available, otherwise skip
      if (typeof fetch !== 'undefined') {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Send email alert (placeholder)
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    try {
      // Placeholder for email integration
      console.log(`📧 Email alert would be sent: ${alert.title}`);
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }

  /**
   * Record system error
   */
  recordError(
    type: SystemError['type'],
    message: string,
    error: unknown,
    userId?: string,
    requestId?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    const systemError: SystemError = {
      id: this.generateId(),
      type,
      message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      userId,
      requestId,
      metadata: {
        ...metadata,
        originalError: error instanceof Error ? error.message : String(error),
      },
    };

    this.errors.push(systemError);
    this.cleanupOldErrors();

    // Create alert for critical errors
    if (type === 'database' || type === 'authentication') {
      this.createAlert('critical', `${type} Error`, message, {
        errorType: type,
        userId,
        requestId,
      });
    } else {
      this.createAlert('error', `${type} Error`, message, {
        errorType: type,
        userId,
        requestId,
      });
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10): Alert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): SystemError[] {
    return this.errors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get health metrics for time range
   */
  getHealthMetrics(hours = 24): HealthMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.filter((metric) => metric.timestamp >= cutoff);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      console.log(`✅ Alert resolved: ${alert.title}`);
      return true;
    }
    return false;
  }

  /**
   * Aggregate key monitoring data for dashboard consumption
   */
  getDashboardData(windowMs: number = 60 * 60 * 1000) {
    const healthStatus = this.getHealthStatus();
    const metricsSummary = this.getMetricsSummary(windowMs);
    const apiOverview = this.aggregateApiMetrics(windowMs);
    const databaseOverview = this.aggregateDatabaseMetrics(windowMs);
    const aiOverview = this.aggregateAiMetrics(windowMs);
    const integrationOverview = this.aggregateIntegrationMetrics(windowMs);

    return {
      generatedAt: Date.now(),
      windowMs,
      healthStatus,
      monitoringStats: this.getMonitoringStats(),
      metricsSummary,
      apiOverview,
      databaseOverview,
      aiOverview,
      integrationOverview,
      recentAlerts: this.getRecentAlerts(10),
      recentErrors: this.getRecentErrors(10),
    };
  }

  /**
   * Summarize collected custom metrics within a timeframe
   */
  getMetricsSummary(windowMs: number): {
    totalMetrics: number;
    generatedAt: number;
    metrics: Record<string, MetricSummary>;
  } {
    const summaries: Record<string, MetricSummary> = {};
    let total = 0;
    const cutoff = Date.now() - windowMs;

    this.metricStore.forEach((series, name) => {
      const relevant = series.filter((point) => point.timestamp >= cutoff);
      if (relevant.length === 0) {
        return;
      }

      const summary = this.summarizeMetricPoints(relevant);
      summaries[name] = summary;
      total += summary.count;
    });

    return {
      totalMetrics: total,
      generatedAt: Date.now(),
      metrics: summaries,
    };
  }

  /**
   * Get recent alert history with optional limit
   */
  getAlertHistory(limit: number = 50): Alert[] {
    const sorted = [...this.alerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return sorted.slice(0, limit);
  }

  /**
   * Record arbitrary metric values for custom dashboards
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>, unit?: string): void {
    const normalizedTags = tags
      ? Object.fromEntries(
          Object.entries(tags).map(([key, tagValue]) => [key, String(tagValue ?? 'unknown')])
        )
      : undefined;

    const point: MetricPoint = {
      timestamp: Date.now(),
      value,
      tags: normalizedTags,
      unit,
    };

    const series = this.metricStore.get(name) ?? [];
    series.push(point);
    this.pruneMetricSeries(series);
    this.metricStore.set(name, series);
  }

  /**
   * Record API response metrics
   */
  recordApiResponseTime(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number
  ): void {
    const record: ApiMetricRecord = {
      timestamp: Date.now(),
      endpoint,
      method: method.toUpperCase(),
      responseTime,
      statusCode,
    };

    this.apiMetrics.push(record);
    this.pruneTimedRecords(this.apiMetrics);

    this.recordMetric(
      'api_response_time',
      responseTime,
      {
        endpoint,
        method: record.method,
        status: String(statusCode),
      },
      'ms'
    );

    this.recordMetric('api_request_count', 1, {
      endpoint,
      method: record.method,
      status: String(statusCode),
      success: String(statusCode < 400),
    });
  }

  /**
   * Record database performance metrics
   */
  recordDatabaseMetrics(operation: string, duration: number, success: boolean): void {
    const record: DatabaseMetricRecord = {
      timestamp: Date.now(),
      operation,
      duration,
      success,
    };

    this.databaseMetrics.push(record);
    this.pruneTimedRecords(this.databaseMetrics);

    this.recordMetric(
      'database_operation_duration',
      duration,
      {
        operation,
        success: String(success),
      },
      'ms'
    );

    if (!success) {
      this.recordMetric('database_operation_error', 1, { operation });
    }
  }

  /**
   * Record AI service usage metrics
   */
  recordAIServiceMetrics(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    tokensUsed?: number
  ): void {
    const record: AiServiceMetricRecord = {
      timestamp: Date.now(),
      service,
      operation,
      duration,
      success,
      tokensUsed,
    };

    this.aiServiceMetrics.push(record);
    this.pruneTimedRecords(this.aiServiceMetrics);

    this.recordMetric(
      'ai_service_duration',
      duration,
      {
        service,
        operation,
        success: String(success),
      },
      'ms'
    );

    if (typeof tokensUsed === 'number') {
      this.recordMetric('ai_tokens_used', tokensUsed, { service, operation });
    }

    if (!success) {
      this.recordMetric('ai_service_error', 1, { service, operation });
    }
  }

  /**
   * Record integration performance metrics
   */
  recordIntegrationMetrics(
    platform: string,
    operation: string,
    duration: number,
    success: boolean
  ): void {
    const record: IntegrationMetricRecord = {
      timestamp: Date.now(),
      platform,
      operation,
      duration,
      success,
    };

    this.integrationMetrics.push(record);
    this.pruneTimedRecords(this.integrationMetrics);

    this.recordMetric(
      'integration_operation_duration',
      duration,
      {
        platform,
        operation,
        success: String(success),
      },
      'ms'
    );

    if (!success) {
      this.recordMetric('integration_operation_error', 1, { platform, operation });
    }
  }

  /**
   * Delete stored alert rule configuration
   */
  deleteAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  /**
   * Register an alert rule (used by tests and future configuration APIs)
   */
  registerAlertRule(rule: Omit<AlertRule, 'createdAt'> & { createdAt?: Date }): AlertRule {
    const stored: AlertRule = {
      ...rule,
      createdAt: rule.createdAt ?? new Date(),
    };
    this.alertRules.set(stored.id, stored);
    return stored;
  }

  private summarizeMetricPoints(points: MetricPoint[]): MetricSummary {
    const values = points.map((point) => point.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, value) => acc + value, 0);
    const unit = points.find((point) => point.unit)?.unit;

    return {
      count,
      avg: count > 0 ? sum / count : 0,
      min: count > 0 ? values[0] : 0,
      max: count > 0 ? values[count - 1] : 0,
      p95: this.computePercentile(values, 0.95),
      unit,
    };
  }

  private pruneMetricSeries(series: MetricPoint[]): void {
    const cutoff = Date.now() - this.getRetentionMs();
    while (series.length && series[0].timestamp < cutoff) {
      series.shift();
    }
    if (series.length > this.maxMetricEntries) {
      series.splice(0, series.length - this.maxMetricEntries);
    }
  }

  private pruneTimedRecords<T extends { timestamp: number }>(records: T[]): void {
    const cutoff = Date.now() - this.getRetentionMs();
    while (records.length && records[0].timestamp < cutoff) {
      records.shift();
    }
    if (records.length > this.maxMetricEntries) {
      records.splice(0, records.length - this.maxMetricEntries);
    }
  }

  private filterByWindow<T extends { timestamp: number }>(records: T[], windowMs: number): T[] {
    const cutoff = Date.now() - windowMs;
    return records.filter((record) => record.timestamp >= cutoff);
  }

  private aggregateApiMetrics(windowMs: number) {
    const records = this.filterByWindow(this.apiMetrics, windowMs);
    if (records.length === 0) {
      return {
        count: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        successRate: 100,
        errorRate: 0,
        byEndpoint: [] as Array<{
          endpoint: string;
          count: number;
          avgResponseTime: number;
          errorRate: number;
          methods: Array<{ method: string; count: number; avgResponseTime: number }>;
        }>,
      };
    }

    const responseTimes = records.map((record) => record.responseTime).sort((a, b) => a - b);
    const count = responseTimes.length;
    const sum = responseTimes.reduce((acc, value) => acc + value, 0);
    const avg = sum / count;
    const p95 = this.computePercentile(responseTimes, 0.95);
    const successCount = records.filter((record) => record.statusCode < 400).length;
    const errorCount = count - successCount;

    const endpoints = new Map<
      string,
      {
        count: number;
        totalResponseTime: number;
        errorCount: number;
        methods: Map<
          string,
          {
            count: number;
            totalResponseTime: number;
            errorCount: number;
          }
        >;
      }
    >();

    records.forEach((record) => {
      const endpointEntry = endpoints.get(record.endpoint) ?? {
        count: 0,
        totalResponseTime: 0,
        errorCount: 0,
        methods: new Map<
          string,
          {
            count: number;
            totalResponseTime: number;
            errorCount: number;
          }
        >(),
      };

      endpointEntry.count += 1;
      endpointEntry.totalResponseTime += record.responseTime;
      if (record.statusCode >= 400) {
        endpointEntry.errorCount += 1;
      }

      const methodKey = record.method;
      const methodEntry = endpointEntry.methods.get(methodKey) ?? {
        count: 0,
        totalResponseTime: 0,
        errorCount: 0,
      };
      methodEntry.count += 1;
      methodEntry.totalResponseTime += record.responseTime;
      if (record.statusCode >= 400) {
        methodEntry.errorCount += 1;
      }
      endpointEntry.methods.set(methodKey, methodEntry);

      endpoints.set(record.endpoint, endpointEntry);
    });

    const byEndpoint = Array.from(endpoints.entries()).map(([endpoint, data]) => {
      const methods = Array.from(data.methods.entries()).map(([method, stats]) => ({
        method,
        count: stats.count,
        avgResponseTime: stats.count ? stats.totalResponseTime / stats.count : 0,
      }));

      return {
        endpoint,
        count: data.count,
        avgResponseTime: data.count ? data.totalResponseTime / data.count : 0,
        errorRate: data.count ? (data.errorCount / data.count) * 100 : 0,
        methods,
      };
    });

    return {
      count,
      avgResponseTime: avg,
      p95ResponseTime: p95,
      successRate: (successCount / count) * 100,
      errorRate: (errorCount / count) * 100,
      byEndpoint,
    };
  }

  private aggregateDatabaseMetrics(windowMs: number) {
    const records = this.filterByWindow(this.databaseMetrics, windowMs);
    if (records.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        p95Duration: 0,
        errorRate: 0,
        operations: [] as Array<{
          operation: string;
          count: number;
          avgDuration: number;
          errorRate: number;
        }>,
      };
    }

    const durations = records.map((record) => record.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((acc, value) => acc + value, 0);
    const avg = sum / count;
    const p95 = this.computePercentile(durations, 0.95);
    const errorCount = records.filter((record) => !record.success).length;

    const operations = new Map<
      string,
      { count: number; totalDuration: number; errorCount: number }
    >();

    records.forEach((record) => {
      const opEntry = operations.get(record.operation) ?? {
        count: 0,
        totalDuration: 0,
        errorCount: 0,
      };
      opEntry.count += 1;
      opEntry.totalDuration += record.duration;
      if (!record.success) {
        opEntry.errorCount += 1;
      }
      operations.set(record.operation, opEntry);
    });

    const operationStats = Array.from(operations.entries()).map(([operation, data]) => ({
      operation,
      count: data.count,
      avgDuration: data.count ? data.totalDuration / data.count : 0,
      errorRate: data.count ? (data.errorCount / data.count) * 100 : 0,
    }));

    return {
      count,
      avgDuration: avg,
      p95Duration: p95,
      errorRate: (errorCount / count) * 100,
      operations: operationStats,
    };
  }

  private aggregateAiMetrics(windowMs: number) {
    const records = this.filterByWindow(this.aiServiceMetrics, windowMs);
    if (records.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        p95Duration: 0,
        successRate: 100,
        services: [] as Array<{
          service: string;
          count: number;
          avgDuration: number;
          successRate: number;
          avgTokens?: number;
        }>,
      };
    }

    const durations = records.map((record) => record.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((acc, value) => acc + value, 0);
    const avg = sum / count;
    const p95 = this.computePercentile(durations, 0.95);
    const successCount = records.filter((record) => record.success).length;

    const services = new Map<
      string,
      {
        count: number;
        totalDuration: number;
        successCount: number;
        totalTokens: number;
        tokenSamples: number;
      }
    >();

    records.forEach((record) => {
      const serviceEntry = services.get(record.service) ?? {
        count: 0,
        totalDuration: 0,
        successCount: 0,
        totalTokens: 0,
        tokenSamples: 0,
      };
      serviceEntry.count += 1;
      serviceEntry.totalDuration += record.duration;
      if (record.success) {
        serviceEntry.successCount += 1;
      }
      if (typeof record.tokensUsed === 'number') {
        serviceEntry.totalTokens += record.tokensUsed;
        serviceEntry.tokenSamples += 1;
      }
      services.set(record.service, serviceEntry);
    });

    const serviceStats = Array.from(services.entries()).map(([service, data]) => ({
      service,
      count: data.count,
      avgDuration: data.count ? data.totalDuration / data.count : 0,
      successRate: data.count ? (data.successCount / data.count) * 100 : 0,
      avgTokens: data.tokenSamples > 0 ? data.totalTokens / data.tokenSamples : undefined,
    }));

    return {
      count,
      avgDuration: avg,
      p95Duration: p95,
      successRate: (successCount / count) * 100,
      services: serviceStats,
    };
  }

  private aggregateIntegrationMetrics(windowMs: number) {
    const records = this.filterByWindow(this.integrationMetrics, windowMs);
    if (records.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        p95Duration: 0,
        successRate: 100,
        platforms: [] as Array<{
          platform: string;
          count: number;
          avgDuration: number;
          successRate: number;
        }>,
      };
    }

    const durations = records.map((record) => record.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((acc, value) => acc + value, 0);
    const avg = sum / count;
    const p95 = this.computePercentile(durations, 0.95);
    const successCount = records.filter((record) => record.success).length;

    const platforms = new Map<
      string,
      { count: number; totalDuration: number; successCount: number }
    >();

    records.forEach((record) => {
      const platformEntry = platforms.get(record.platform) ?? {
        count: 0,
        totalDuration: 0,
        successCount: 0,
      };
      platformEntry.count += 1;
      platformEntry.totalDuration += record.duration;
      if (record.success) {
        platformEntry.successCount += 1;
      }
      platforms.set(record.platform, platformEntry);
    });

    const platformStats = Array.from(platforms.entries()).map(([platform, data]) => ({
      platform,
      count: data.count,
      avgDuration: data.count ? data.totalDuration / data.count : 0,
      successRate: data.count ? (data.successCount / data.count) * 100 : 0,
    }));

    return {
      count,
      avgDuration: avg,
      p95Duration: p95,
      successRate: (successCount / count) * 100,
      platforms: platformStats,
    };
  }

  private computePercentile(values: number[], percentile: number): number {
    if (values.length === 0) {
      return 0;
    }
    if (values.length === 1) {
      return values[0];
    }
    const index = Math.min(
      values.length - 1,
      Math.max(0, Math.floor(percentile * values.length) - 1)
    );
    return values[index];
  }

  private getRetentionMs(): number {
    return this.config.retentionPeriod * 24 * 60 * 60 * 1000;
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof process !== 'undefined') {
      process.on('unhandledRejection', (reason, promise) => {
        this.recordError(
          'application',
          'Unhandled Promise Rejection',
          reason,
          undefined,
          undefined,
          {
            promise: promise.toString(),
          }
        );
      });

      process.on('uncaughtException', (error) => {
        this.recordError('application', 'Uncaught Exception', error);
        // Don't exit the process in production monitoring
      });
    }

    // Handle window errors in browser environment
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.recordError('application', 'JavaScript Error', event.error, undefined, undefined, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.recordError('application', 'Unhandled Promise Rejection', event.reason);
      });
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter((metric) => metric.timestamp >= cutoff);
  }

  /**
   * Clean up old alerts
   */
  private cleanupOldAlerts(): void {
    const cutoff = new Date(Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter((alert) => alert.timestamp >= cutoff);
  }

  /**
   * Clean up old errors
   */
  private cleanupOldErrors(): void {
    const cutoff = new Date(Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    this.errors = this.errors.filter((error) => error.timestamp >= cutoff);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    isActive: boolean;
    uptime: number;
    totalMetrics: number;
    totalAlerts: number;
    totalErrors: number;
    currentStatus: string;
  } {
    const currentHealth = this.getHealthStatus();

    return {
      isActive: this.isMonitoring,
      uptime: Date.now() - this.startTime,
      totalMetrics: this.metrics.length,
      totalAlerts: this.alerts.length,
      totalErrors: this.errors.length,
      currentStatus: currentHealth?.status || 'unknown',
    };
  }
}

// Create singleton instance
const productionMonitoringService = new ProductionMonitoringService();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  productionMonitoringService.startMonitoring();
}

export { ProductionMonitoringService, productionMonitoringService };
export type { MonitoringConfig, HealthMetrics, Alert, SystemError };
