/**
 * AI Usage Monitoring Service
 *
 * Monitors AI service usage, tracks performance metrics,
 * and provides insights for optimization and cost management.
 */

interface UsageEvent {
  id: string;
  timestamp: Date;
  service: string;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  metadata?: Record<string, any>;
}

interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalCost: number;
  totalTokensUsed: number;
  requestsPerHour: number;
  errorRate: number;
  topErrors: Array<{ error: string; count: number }>;
  operationBreakdown: Record<string, number>;
}

interface UsageAlert {
  id: string;
  type: 'cost' | 'rate_limit' | 'error_rate' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  threshold: number;
  currentValue: number;
  acknowledged: boolean;
}

interface MonitoringConfig {
  costThresholds: {
    daily: number;
    monthly: number;
  };
  performanceThresholds: {
    averageResponseTime: number;
    errorRate: number;
  };
  rateLimitThresholds: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  alerting: {
    enabled: boolean;
    webhookUrl?: string;
    emailNotifications?: boolean;
  };
}

export class AIUsageMonitoringService {
  private events: UsageEvent[] = [];
  private alerts: UsageAlert[] = [];
  private config: MonitoringConfig;
  private alertCallbacks: Array<(alert: UsageAlert) => void> = [];

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      costThresholds: {
        daily: 50, // $50 per day
        monthly: 1000, // $1000 per month
      },
      performanceThresholds: {
        averageResponseTime: 5000, // 5 seconds
        errorRate: 0.1, // 10%
      },
      rateLimitThresholds: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
      },
      alerting: {
        enabled: true,
      },
      ...config,
    };

    this.loadEventsFromStorage();
    this.startPeriodicCleanup();
  }

  /**
   * Record a usage event
   */
  recordEvent(event: Omit<UsageEvent, 'id' | 'timestamp'>): void {
    const fullEvent: UsageEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    this.events.push(fullEvent);
    this.saveEventsToStorage();
    this.checkThresholds();
  }

  /**
   * Get usage metrics for a specific time period
   */
  getUsageMetrics(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): UsageMetrics {
    const now = new Date();
    const startTime = this.getStartTime(now, timeframe);
    const relevantEvents = this.events.filter((event) => event.timestamp >= startTime);

    const totalRequests = relevantEvents.length;
    const successfulRequests = relevantEvents.filter((event) => event.success).length;
    const failedRequests = totalRequests - successfulRequests;

    const averageResponseTime =
      totalRequests > 0
        ? relevantEvents.reduce((sum, event) => sum + event.duration, 0) / totalRequests
        : 0;

    const totalCost = relevantEvents.reduce((sum, event) => sum + (event.cost || 0), 0);
    const totalTokensUsed = relevantEvents.reduce(
      (sum, event) => sum + (event.inputTokens || 0) + (event.outputTokens || 0),
      0
    );

    const hoursInTimeframe = this.getHoursInTimeframe(timeframe);
    const requestsPerHour = totalRequests / hoursInTimeframe;
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

    // Calculate top errors
    const errorCounts = new Map<string, number>();
    relevantEvents
      .filter((event) => !event.success && event.error)
      .forEach((event) => {
        const error = event.error!;
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
      });

    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate operation breakdown
    const operationCounts = new Map<string, number>();
    relevantEvents.forEach((event) => {
      operationCounts.set(event.operation, (operationCounts.get(event.operation) || 0) + 1);
    });

    const operationBreakdown = Object.fromEntries(operationCounts);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      totalCost,
      totalTokensUsed,
      requestsPerHour,
      errorRate,
      topErrors,
      operationBreakdown,
    };
  }

  /**
   * Get cost analysis
   */
  getCostAnalysis(): {
    dailyCost: number;
    monthlyCost: number;
    projectedMonthlyCost: number;
    costByOperation: Record<string, number>;
    costTrend: Array<{ date: string; cost: number }>;
  } {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyEvents = this.events.filter((event) => event.timestamp >= dayStart);
    const monthlyEvents = this.events.filter((event) => event.timestamp >= monthStart);

    const dailyCost = dailyEvents.reduce((sum, event) => sum + (event.cost || 0), 0);
    const monthlyCost = monthlyEvents.reduce((sum, event) => sum + (event.cost || 0), 0);

    // Project monthly cost based on current daily average
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const projectedMonthlyCost = dayOfMonth > 0 ? (monthlyCost / dayOfMonth) * daysInMonth : 0;

    // Cost by operation
    const operationCosts = new Map<string, number>();
    monthlyEvents.forEach((event) => {
      const cost = event.cost || 0;
      operationCosts.set(event.operation, (operationCosts.get(event.operation) || 0) + cost);
    });

    const costByOperation = Object.fromEntries(operationCosts);

    // Cost trend (last 7 days)
    const costTrend: Array<{ date: string; cost: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateEnd = new Date(dateStart);
      dateEnd.setDate(dateEnd.getDate() + 1);

      const dayEvents = this.events.filter(
        (event) => event.timestamp >= dateStart && event.timestamp < dateEnd
      );
      const dayCost = dayEvents.reduce((sum, event) => sum + (event.cost || 0), 0);

      costTrend.push({
        date: date.toISOString().split('T')[0],
        cost: dayCost,
      });
    }

    return {
      dailyCost,
      monthlyCost,
      projectedMonthlyCost,
      costByOperation,
      costTrend,
    };
  }

  /**
   * Get performance insights
   */
  getPerformanceInsights(): {
    slowestOperations: Array<{ operation: string; averageTime: number }>;
    performanceTrend: Array<{ hour: string; averageTime: number }>;
    recommendations: string[];
  } {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter((event) => event.timestamp >= last24Hours);

    // Calculate slowest operations
    const operationTimes = new Map<string, number[]>();
    recentEvents.forEach((event) => {
      if (!operationTimes.has(event.operation)) {
        operationTimes.set(event.operation, []);
      }
      operationTimes.get(event.operation)!.push(event.duration);
    });

    const slowestOperations = Array.from(operationTimes.entries())
      .map(([operation, times]) => ({
        operation,
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);

    // Performance trend by hour
    const performanceTrend: Array<{ hour: string; averageTime: number }> = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(Date.now() - i * 60 * 60 * 1000);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourEnd.getHours() + 1);

      const hourEvents = recentEvents.filter(
        (event) => event.timestamp >= hourStart && event.timestamp < hourEnd
      );

      const averageTime =
        hourEvents.length > 0
          ? hourEvents.reduce((sum, event) => sum + event.duration, 0) / hourEvents.length
          : 0;

      performanceTrend.push({
        hour: hourStart.toISOString().split('T')[1].substring(0, 5),
        averageTime,
      });
    }

    // Generate recommendations
    const recommendations: string[] = [];
    const metrics = this.getUsageMetrics('day');

    if (metrics.averageResponseTime > this.config.performanceThresholds.averageResponseTime) {
      recommendations.push('Consider implementing caching to reduce response times');
    }

    if (metrics.errorRate > this.config.performanceThresholds.errorRate) {
      recommendations.push('High error rate detected - review error handling and retry logic');
    }

    if (metrics.requestsPerHour > this.config.rateLimitThresholds.requestsPerHour * 0.8) {
      recommendations.push('Approaching rate limits - consider implementing request queuing');
    }

    const costAnalysis = this.getCostAnalysis();
    if (costAnalysis.projectedMonthlyCost > this.config.costThresholds.monthly) {
      recommendations.push('Projected monthly cost exceeds threshold - optimize usage patterns');
    }

    return {
      slowestOperations,
      performanceTrend,
      recommendations,
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): UsageAlert[] {
    return this.alerts.filter((alert) => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find((alert) => alert.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveAlertsToStorage();
    }
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback: (alert: UsageAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfigToStorage();
  }

  /**
   * Export usage data for analysis
   */
  exportUsageData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'service', 'operation', 'duration', 'success', 'error', 'cost'];
      const rows = this.events.map((event) => [
        event.timestamp.toISOString(),
        event.service,
        event.operation,
        event.duration.toString(),
        event.success.toString(),
        event.error || '',
        (event.cost || 0).toString(),
      ]);

      return [headers, ...rows].map((row) => row.join(',')).join('\n');
    }

    return JSON.stringify(this.events, null, 2);
  }

  // Private methods

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStartTime(now: Date, timeframe: string): Date {
    switch (timeframe) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private getHoursInTimeframe(timeframe: string): number {
    switch (timeframe) {
      case 'hour':
        return 1;
      case 'day':
        return 24;
      case 'week':
        return 168;
      case 'month':
        return 720;
      default:
        return 24;
    }
  }

  private checkThresholds(): void {
    if (!this.config.alerting.enabled) return;

    const metrics = this.getUsageMetrics('day');
    const costAnalysis = this.getCostAnalysis();

    // Check cost thresholds
    if (costAnalysis.dailyCost > this.config.costThresholds.daily) {
      this.createAlert({
        type: 'cost',
        severity: 'high',
        message: `Daily cost threshold exceeded: $${costAnalysis.dailyCost.toFixed(2)}`,
        threshold: this.config.costThresholds.daily,
        currentValue: costAnalysis.dailyCost,
      });
    }

    if (costAnalysis.projectedMonthlyCost > this.config.costThresholds.monthly) {
      this.createAlert({
        type: 'cost',
        severity: 'medium',
        message: `Projected monthly cost exceeds threshold: $${costAnalysis.projectedMonthlyCost.toFixed(2)}`,
        threshold: this.config.costThresholds.monthly,
        currentValue: costAnalysis.projectedMonthlyCost,
      });
    }

    // Check performance thresholds
    if (metrics.averageResponseTime > this.config.performanceThresholds.averageResponseTime) {
      this.createAlert({
        type: 'performance',
        severity: 'medium',
        message: `Average response time exceeds threshold: ${metrics.averageResponseTime.toFixed(0)}ms`,
        threshold: this.config.performanceThresholds.averageResponseTime,
        currentValue: metrics.averageResponseTime,
      });
    }

    if (metrics.errorRate > this.config.performanceThresholds.errorRate) {
      this.createAlert({
        type: 'error_rate',
        severity: 'high',
        message: `Error rate exceeds threshold: ${(metrics.errorRate * 100).toFixed(1)}%`,
        threshold: this.config.performanceThresholds.errorRate,
        currentValue: metrics.errorRate,
      });
    }

    // Check rate limit thresholds
    if (metrics.requestsPerHour > this.config.rateLimitThresholds.requestsPerHour) {
      this.createAlert({
        type: 'rate_limit',
        severity: 'high',
        message: `Request rate exceeds threshold: ${metrics.requestsPerHour.toFixed(0)} requests/hour`,
        threshold: this.config.rateLimitThresholds.requestsPerHour,
        currentValue: metrics.requestsPerHour,
      });
    }
  }

  private createAlert(alertData: Omit<UsageAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alert: UsageAlert = {
      ...alertData,
      id: this.generateAlertId(),
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.saveAlertsToStorage();

    // Notify subscribers
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }

  private startPeriodicCleanup(): void {
    // Clean up old events every hour
    setInterval(
      () => {
        const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
        this.events = this.events.filter((event) => event.timestamp > cutoffDate);
        this.saveEventsToStorage();

        // Clean up old acknowledged alerts
        const alertCutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
        this.alerts = this.alerts.filter(
          (alert) => !alert.acknowledged || alert.timestamp > alertCutoffDate
        );
        this.saveAlertsToStorage();
      },
      60 * 60 * 1000
    ); // Every hour
  }

  private saveEventsToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        // Keep only last 1000 events in localStorage
        const eventsToSave = this.events.slice(-1000);
        localStorage.setItem('ai_usage_events', JSON.stringify(eventsToSave));
      }
    } catch (error) {
      console.warn('Failed to save usage events:', error);
    }
  }

  private loadEventsFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('ai_usage_events');
        if (stored) {
          const events = JSON.parse(stored);
          this.events = events.map((event: any) => ({
            ...event,
            timestamp: new Date(event.timestamp),
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to load usage events:', error);
    }
  }

  private saveAlertsToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ai_usage_alerts', JSON.stringify(this.alerts));
      }
    } catch (error) {
      console.warn('Failed to save usage alerts:', error);
    }
  }

  private saveConfigToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ai_monitoring_config', JSON.stringify(this.config));
      }
    } catch (error) {
      console.warn('Failed to save monitoring config:', error);
    }
  }
}

// Export singleton instance
export const aiUsageMonitoringService = new AIUsageMonitoringService();
