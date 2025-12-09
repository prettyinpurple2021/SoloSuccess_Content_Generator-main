import { IntegrationMetrics, IntegrationLog, IntegrationAlert } from '../types';
import { db } from './neonService';

export class MonitoringService {
  private metricsCache: Map<string, IntegrationMetrics[]> = new Map();
  private logsCache: Map<string, IntegrationLog[]> = new Map();
  private alertsCache: Map<string, IntegrationAlert[]> = new Map();

  /**
   * Get metrics for an integration
   */
  async getIntegrationMetrics(
    integrationId: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<IntegrationMetrics[]> {
    try {
      // Check cache first
      const cacheKey = `${integrationId}-${timeRange}`;
      if (this.metricsCache.has(cacheKey)) {
        return this.metricsCache.get(cacheKey)!;
      }

      // Calculate time range
      const endTime = new Date();
      const startTime = new Date();
      switch (timeRange) {
        case '1h':
          startTime.setHours(startTime.getHours() - 1);
          break;
        case '24h':
          startTime.setDate(startTime.getDate() - 1);
          break;
        case '7d':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(startTime.getDate() - 30);
          break;
      }

      // Fetch from database
      const metrics = await db.getIntegrationMetrics(integrationId, startTime, endTime);

      // Cache results
      this.metricsCache.set(cacheKey, metrics);

      // Clear cache after 5 minutes
      setTimeout(
        () => {
          this.metricsCache.delete(cacheKey);
        },
        5 * 60 * 1000
      );

      return metrics;
    } catch (error) {
      console.error('Error fetching integration metrics:', error);
      throw new Error(
        `Failed to fetch metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get logs for an integration
   */
  async getIntegrationLogs(
    integrationId: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
    level?: 'info' | 'warn' | 'error'
  ): Promise<IntegrationLog[]> {
    try {
      // Check cache first
      const cacheKey = `${integrationId}-${timeRange}-${level || 'all'}`;
      if (this.logsCache.has(cacheKey)) {
        return this.logsCache.get(cacheKey)!;
      }

      // Calculate time range
      const endTime = new Date();
      const startTime = new Date();
      switch (timeRange) {
        case '1h':
          startTime.setHours(startTime.getHours() - 1);
          break;
        case '24h':
          startTime.setDate(startTime.getDate() - 1);
          break;
        case '7d':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(startTime.getDate() - 30);
          break;
      }

      // Fetch from database
      const logs = await db.getIntegrationLogs(integrationId, startTime, endTime, level);

      // Cache results
      this.logsCache.set(cacheKey, logs);

      // Clear cache after 2 minutes
      setTimeout(
        () => {
          this.logsCache.delete(cacheKey);
        },
        2 * 60 * 1000
      );

      return logs;
    } catch (error) {
      console.error('Error fetching integration logs:', error);
      throw new Error(
        `Failed to fetch logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get alerts for an integration
   */
  async getIntegrationAlerts(
    integrationId: string,
    status?: 'active' | 'resolved' | 'dismissed'
  ): Promise<IntegrationAlert[]> {
    try {
      // Check cache first
      const cacheKey = `${integrationId}-${status || 'all'}`;
      if (this.alertsCache.has(cacheKey)) {
        return this.alertsCache.get(cacheKey)!;
      }

      // Fetch from database
      const alerts = await db.getIntegrationAlerts(integrationId, status);

      // Cache results
      this.alertsCache.set(cacheKey, alerts);

      // Clear cache after 1 minute
      setTimeout(() => {
        this.alertsCache.delete(cacheKey);
      }, 60 * 1000);

      return alerts;
    } catch (error) {
      console.error('Error fetching integration alerts:', error);
      throw new Error(
        `Failed to fetch alerts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all metrics across all integrations
   */
  async getAllMetrics(
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<IntegrationMetrics[]> {
    try {
      // Calculate time range
      const endTime = new Date();
      const startTime = new Date();
      switch (timeRange) {
        case '1h':
          startTime.setHours(startTime.getHours() - 1);
          break;
        case '24h':
          startTime.setDate(startTime.getDate() - 1);
          break;
        case '7d':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(startTime.getDate() - 30);
          break;
      }

      // Fetch from database
      const metrics = await db.getIntegrationMetrics(null, startTime, endTime);
      return metrics;
    } catch (error) {
      console.error('Error fetching all metrics:', error);
      throw new Error(
        `Failed to fetch metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all logs across all integrations
   */
  async getAllLogs(
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
    level?: 'info' | 'warn' | 'error'
  ): Promise<IntegrationLog[]> {
    try {
      // Calculate time range
      const endTime = new Date();
      const startTime = new Date();
      switch (timeRange) {
        case '1h':
          startTime.setHours(startTime.getHours() - 1);
          break;
        case '24h':
          startTime.setDate(startTime.getDate() - 1);
          break;
        case '7d':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(startTime.getDate() - 30);
          break;
      }

      // Fetch from database
      const logs = await db.getIntegrationLogs(null, startTime, endTime, level);
      return logs;
    } catch (error) {
      console.error('Error fetching all logs:', error);
      throw new Error(
        `Failed to fetch logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets list of integrations (helper used by tests)
   */
  async getIntegrations(): Promise<any[]> {
    try {
      // Delegate to database service; tests may stub this
      // @ts-expect-error - dynamic db shim may expose getIntegrations
      if (typeof (db as any).getIntegrations === 'function') {
        // @ts-expect-error - invoking optional method on dynamic db shim
        return await (db as any).getIntegrations();
      }
    } catch {
      // ignore
    }
    return [];
  }

  /**
   * Get all alerts across all integrations
   */
  async getAllAlerts(status?: 'active' | 'resolved' | 'dismissed'): Promise<IntegrationAlert[]> {
    try {
      // Fetch from database
      const alerts = await db.getIntegrationAlerts(null, status);
      return alerts;
    } catch (error) {
      console.error('Error fetching all alerts:', error);
      throw new Error(
        `Failed to fetch alerts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      await db.resolveIntegrationAlert(alertId);

      // Clear cache for this integration
      this.alertsCache.clear();
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw new Error(
        `Failed to resolve alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new alert
   */
  async createAlert(
    alert: Omit<IntegrationAlert, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IntegrationAlert> {
    try {
      const newAlert = await db.addIntegrationAlert({
        ...alert,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Clear cache
      this.alertsCache.clear();

      return newAlert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw new Error(
        `Failed to create alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Log an integration event
   */
  async logEvent(
    integrationId: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    details?: any
  ): Promise<void> {
    try {
      const log: IntegrationLog = {
        id: crypto.randomUUID(),
        integrationId,
        level,
        message,
        details,
        timestamp: new Date(),
      };

      await db.addIntegrationLog(log);

      // Clear cache
      this.logsCache.clear();
    } catch (error) {
      console.error('Error logging event:', error);
      // Don't throw here as logging failures shouldn't break the main flow
    }
  }

  /**
   * Update integration metrics
   */
  async updateMetrics(integrationId: string, metrics: Partial<IntegrationMetrics>): Promise<void> {
    try {
      const existingMetrics = await db.getIntegrationMetrics(integrationId);
      const latestMetrics = existingMetrics[existingMetrics.length - 1];

      if (latestMetrics) {
        // Update existing metrics
        const updatedMetrics: IntegrationMetrics = {
          ...latestMetrics,
          ...metrics,
          timestamp: new Date(),
        };
        await db.updateIntegrationMetrics(latestMetrics.id, updatedMetrics);
      } else {
        // Create new metrics record
        const newMetrics: IntegrationMetrics = {
          id: crypto.randomUUID(),
          integrationId,
          totalRequests: metrics.totalRequests || 0,
          successfulRequests: metrics.successfulRequests || 0,
          failedRequests: metrics.failedRequests || 0,
          avgResponseTime: metrics.avgResponseTime || 0,
          successRate: metrics.successRate || 0,
          errorRate: metrics.errorRate || 0,
          timestamp: new Date(),
        };
        await db.updateIntegrationMetrics(newMetrics.id, newMetrics);
      }

      // Clear cache
      this.metricsCache.clear();
    } catch (error) {
      console.error('Error updating metrics:', error);
      // Don't throw here as metrics failures shouldn't break the main flow
    }
  }

  /**
   * Get health score for an integration
   */
  async getHealthScore(integrationId: string): Promise<number> {
    try {
      const metrics = await this.getIntegrationMetrics(integrationId, '24h');
      const alerts = await this.getIntegrationAlerts(integrationId, 'active');

      if (metrics.length === 0) {
        return 0;
      }

      const latestMetrics = metrics[metrics.length - 1];
      let healthScore = 100;

      // Deduct points for low success rate
      if (latestMetrics.successRate < 95) {
        healthScore -= (95 - latestMetrics.successRate) * 2;
      }

      // Deduct points for high error rate
      if (latestMetrics.errorRate > 5) {
        healthScore -= (latestMetrics.errorRate - 5) * 3;
      }

      // Deduct points for slow response time
      if (latestMetrics.avgResponseTime > 5000) {
        healthScore -= Math.min(20, (latestMetrics.avgResponseTime - 5000) / 1000);
      }

      // Deduct points for active alerts
      healthScore -= alerts.length * 10;

      return Math.max(0, Math.min(100, healthScore));
    } catch (error) {
      console.error('Error calculating health score:', error);
      return 0;
    }
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(): Promise<{
    totalIntegrations: number;
    connectedIntegrations: number;
    activeIntegrations: number;
    totalAlerts: number;
    criticalAlerts: number;
    avgResponseTime: number;
    totalRequests: number;
    successRate: number;
  }> {
    try {
      const [metrics, alerts] = await Promise.all([
        this.getAllMetrics('24h'),
        this.getAllAlerts('active'),
      ]);

      const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
      const avgResponseTime =
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length
          : 0;
      const successRate =
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length
          : 0;

      return {
        totalIntegrations: 0, // This would come from integration service
        connectedIntegrations: 0, // This would come from integration service
        activeIntegrations: 0, // This would come from integration service
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter((a) => a.severity === 'critical').length,
        avgResponseTime,
        totalRequests,
        successRate,
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw new Error(
        `Failed to get dashboard summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.metricsCache.clear();
    this.logsCache.clear();
    this.alertsCache.clear();
  }
}

export const monitoringService = new MonitoringService();
