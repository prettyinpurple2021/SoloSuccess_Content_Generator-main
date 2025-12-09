import {
  Integration,
  IntegrationMetrics,
  IntegrationLog,
  IntegrationAlert,
  RateLimitResult,
  EncryptedCredentials,
} from '../types';
import { CredentialEncryption } from './credentialEncryption';
import { integrationService } from './integrationService';
import { monitoringService } from './monitoringService';

/**
 * SecurityPerformanceService - Production-quality security and performance monitoring
 *
 * Features:
 * - Advanced security scanning
 * - Performance optimization
 * - Threat detection
 * - Vulnerability assessment
 * - Compliance monitoring
 * - Security incident response
 * - Performance benchmarking
 * - Resource optimization
 */
export class SecurityPerformanceService {
  private static readonly SECURITY_SCAN_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static readonly PERFORMANCE_CHECK_INTERVAL = 1 * 60 * 1000; // 1 minute
  private static readonly THREAT_DETECTION_THRESHOLD = 10; // 10 failed attempts
  private static readonly PERFORMANCE_THRESHOLD = 5000; // 5 seconds

  private securityScanTimer: NodeJS.Timeout | null = null;
  private performanceCheckTimer: NodeJS.Timeout | null = null;
  private threatDetectionMap: Map<string, number> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor() {
    this.startSecurityMonitoring();
    this.startPerformanceMonitoring();
  }

  // ============================================================================
  // SECURITY MONITORING
  // ============================================================================

  /**
   * Starts continuous security monitoring
   */
  private startSecurityMonitoring(): void {
    this.securityScanTimer = setInterval(async () => {
      try {
        await this.performSecurityScan();
      } catch (error) {
        console.error('Security scan failed:', error);
      }
    }, SecurityPerformanceService.SECURITY_SCAN_INTERVAL);
  }

  /**
   * Performs comprehensive security scan
   */
  async performSecurityScan(): Promise<void> {
    try {
      const integrations = await integrationService.getAllIntegrations();

      for (const integration of integrations) {
        await this.scanIntegrationSecurity(integration);
      }
    } catch (error) {
      console.error('Security scan error:', error);
    }
  }

  /**
   * Scans individual integration for security issues
   */
  private async scanIntegrationSecurity(integration: Integration): Promise<void> {
    try {
      const securityIssues: string[] = [];
      const recommendations: string[] = [];

      // Check credential encryption
      const encryptionCheck = this.checkCredentialEncryption(integration);
      if (!encryptionCheck.isSecure) {
        securityIssues.push(...encryptionCheck.issues);
        recommendations.push(...encryptionCheck.recommendations);
      }

      // Check for suspicious activity
      const threatCheck = await this.checkThreatActivity(integration);
      if (threatCheck.isThreat) {
        securityIssues.push(...threatCheck.issues);
        recommendations.push(...threatCheck.recommendations);
      }

      // Check access patterns
      const accessCheck = await this.checkAccessPatterns(integration);
      if (!accessCheck.isNormal) {
        securityIssues.push(...accessCheck.issues);
        recommendations.push(...accessCheck.recommendations);
      }

      // Check configuration security
      const configCheck = this.checkConfigurationSecurity(integration);
      if (!configCheck.isSecure) {
        securityIssues.push(...configCheck.issues);
        recommendations.push(...configCheck.recommendations);
      }

      // Create alerts for security issues
      if (securityIssues.length > 0) {
        await this.createSecurityAlert(integration, securityIssues, recommendations);
      }

      // Log security scan results
      await monitoringService.logEvent(
        integration.id,
        securityIssues.length > 0 ? 'warn' : 'info',
        `Security scan completed: ${securityIssues.length} issues found`,
        {
          securityIssues,
          recommendations,
          scanTimestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error(`Security scan failed for integration ${integration.id}:`, error);
    }
  }

  /**
   * Checks credential encryption security
   */
  private checkCredentialEncryption(integration: Integration): {
    isSecure: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const credentials = integration.credentials;

    // Check if credentials are properly encrypted
    if (!credentials.encrypted || !credentials.iv || !credentials.authTag) {
      issues.push('Credentials are not properly encrypted');
      recommendations.push('Re-encrypt credentials using AES-256-GCM encryption');
    }

    // Check encryption algorithm
    if (credentials.algorithm && credentials.algorithm !== 'AES-256-GCM') {
      issues.push('Credentials are using outdated encryption algorithm');
      recommendations.push('Upgrade to AES-256-GCM encryption');
    }

    // Check for weak encryption keys
    if (credentials.salt && credentials.salt.length < 32) {
      issues.push('Encryption salt is too short');
      recommendations.push('Use a 32-byte random salt for key derivation');
    }

    return {
      isSecure: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Checks for threat activity
   */
  private async checkThreatActivity(integration: Integration): Promise<{
    isThreat: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Get recent logs
      const logs = await monitoringService.getIntegrationLogs(integration.id, '1h');
      const errorLogs = logs.filter((log) => log.level === 'error');
      const failedAttempts = errorLogs.filter(
        (log) =>
          log.message.includes('authentication') ||
          log.message.includes('unauthorized') ||
          log.message.includes('forbidden')
      );

      // Check for brute force attempts
      if (failedAttempts.length > SecurityPerformanceService.THREAT_DETECTION_THRESHOLD) {
        issues.push(
          `Potential brute force attack detected: ${failedAttempts.length} failed attempts in the last hour`
        );
        recommendations.push('Enable rate limiting and consider temporary IP blocking');
      }

      // Check for unusual access patterns
      const uniqueIPs = new Set(
        failedAttempts.map((log) => log.metadata?.ipAddress).filter(Boolean)
      );
      if (uniqueIPs.size > 5) {
        issues.push(`Unusual access pattern detected: ${uniqueIPs.size} different IP addresses`);
        recommendations.push('Review access logs and consider implementing geo-blocking');
      }

      // Update threat detection map
      const threatKey = `${integration.id}:${Date.now()}`;
      this.threatDetectionMap.set(threatKey, failedAttempts.length);

      // Clean old entries
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      for (const [key, timestamp] of this.threatDetectionMap.entries()) {
        if (timestamp < oneHourAgo) {
          this.threatDetectionMap.delete(key);
        }
      }
    } catch (error) {
      console.error('Threat activity check failed:', error);
    }

    return {
      isThreat: issues.length > 0,
      issues,
      recommendations,
    };
  }

  /**
   * Checks access patterns for anomalies
   */
  private async checkAccessPatterns(integration: Integration): Promise<{
    isNormal: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Get recent metrics
      const metrics = await monitoringService.getIntegrationMetrics(integration.id, '24h');

      if (metrics.length === 0) {
        return { isNormal: true, issues, recommendations };
      }

      const latestMetrics = metrics[metrics.length - 1];
      if (!latestMetrics) {
        return { isNormal: true, issues, recommendations };
      }
      const avgRequestsPerHour = latestMetrics.totalRequests / 24;

      // Check for unusual request volume
      if (latestMetrics.totalRequests > avgRequestsPerHour * 3) {
        issues.push('Unusual request volume detected');
        recommendations.push('Review recent activity and consider implementing request throttling');
      }

      // Check for high error rate
      if (latestMetrics.errorRate > 10) {
        issues.push('High error rate detected');
        recommendations.push('Investigate error patterns and review integration configuration');
      }
    } catch (error) {
      console.error('Access pattern check failed:', error);
    }

    return {
      isNormal: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Checks configuration security
   */
  private checkConfigurationSecurity(integration: Integration): {
    isSecure: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const config = integration.configuration;

    // Check rate limits
    if (config.rateLimits) {
      if (config.rateLimits.requestsPerMinute > 1000) {
        issues.push('Rate limits are too high, potential security risk');
        recommendations.push('Reduce rate limits to prevent abuse');
      }

      if (config.rateLimits.burstLimit > 50) {
        issues.push('Burst limit is too high');
        recommendations.push('Reduce burst limit to prevent sudden traffic spikes');
      }
    }

    // Check error handling
    if (config.errorHandling) {
      if (!config.errorHandling.alertOnFailure) {
        issues.push('Error alerts are not enabled');
        recommendations.push('Enable error alerts for security monitoring');
      }

      if (config.errorHandling.maxRetries > 5) {
        issues.push('Maximum retries is too high');
        recommendations.push('Reduce maximum retries to prevent resource exhaustion');
      }
    }

    // Check webhook security
    if (config.webhooks) {
      for (const webhook of config.webhooks) {
        if (!webhook.secret) {
          issues.push('Webhook does not have a secret for verification');
          recommendations.push('Add webhook secret for secure verification');
        }

        if (webhook.timeout && webhook.timeout > 30000) {
          issues.push('Webhook timeout is too high');
          recommendations.push('Reduce webhook timeout to prevent hanging requests');
        }
      }
    }

    return {
      isSecure: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Creates security alert
   */
  private async createSecurityAlert(
    integration: Integration,
    issues: string[],
    recommendations: string[]
  ): Promise<void> {
    try {
      await monitoringService.createAlert({
        integrationId: integration.id,
        type: 'warning',
        title: 'Security Issues Detected',
        message: `Security scan found ${issues.length} issue(s): ${issues.join(', ')}`,
        severity: issues.length > 3 ? 'high' : 'medium',
        isResolved: false,
        metadata: {
          issues,
          recommendations,
          scanType: 'security',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to create security alert:', error);
    }
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  /**
   * Starts continuous performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.performanceCheckTimer = setInterval(async () => {
      try {
        await this.performPerformanceCheck();
      } catch (error) {
        console.error('Performance check failed:', error);
      }
    }, SecurityPerformanceService.PERFORMANCE_CHECK_INTERVAL);
  }

  /**
   * Performs comprehensive performance check
   */
  async performPerformanceCheck(): Promise<void> {
    try {
      const integrations = await integrationService.getAllIntegrations();

      for (const integration of integrations) {
        await this.checkIntegrationPerformance(integration);
      }
    } catch (error) {
      console.error('Performance check error:', error);
    }
  }

  /**
   * Checks individual integration performance
   */
  private async checkIntegrationPerformance(integration: Integration): Promise<void> {
    try {
      const performanceIssues: string[] = [];
      const recommendations: string[] = [];

      // Check response times
      const responseTimeCheck = await this.checkResponseTimes(integration);
      if (!responseTimeCheck.isOptimal) {
        performanceIssues.push(...responseTimeCheck.issues);
        recommendations.push(...responseTimeCheck.recommendations);
      }

      // Check resource usage
      const resourceCheck = await this.checkResourceUsage(integration);
      if (!resourceCheck.isOptimal) {
        performanceIssues.push(...resourceCheck.issues);
        recommendations.push(...resourceCheck.recommendations);
      }

      // Check sync performance
      const syncCheck = await this.checkSyncPerformance(integration);
      if (!syncCheck.isOptimal) {
        performanceIssues.push(...syncCheck.issues);
        recommendations.push(...syncCheck.recommendations);
      }

      // Check rate limit efficiency
      const rateLimitCheck = await this.checkRateLimitEfficiency(integration);
      if (!rateLimitCheck.isOptimal) {
        performanceIssues.push(...rateLimitCheck.issues);
        recommendations.push(...rateLimitCheck.recommendations);
      }

      // Create performance alerts
      if (performanceIssues.length > 0) {
        await this.createPerformanceAlert(integration, performanceIssues, recommendations);
      }

      // Log performance check results
      await monitoringService.logEvent(
        integration.id,
        performanceIssues.length > 0 ? 'warn' : 'info',
        `Performance check completed: ${performanceIssues.length} issues found`,
        {
          performanceIssues,
          recommendations,
          checkTimestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error(`Performance check failed for integration ${integration.id}:`, error);
    }
  }

  /**
   * Checks response times
   */
  private async checkResponseTimes(integration: Integration): Promise<{
    isOptimal: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const metrics = await monitoringService.getIntegrationMetrics(integration.id, '1h');

      if (metrics.length === 0) {
        return { isOptimal: true, issues, recommendations };
      }

      const latestMetrics = metrics[metrics.length - 1];
      if (!latestMetrics) {
        return { isOptimal: true, issues, recommendations };
      }
      const avgResponseTime = latestMetrics.averageResponseTime;

      // Check if response time is too high
      if (avgResponseTime > SecurityPerformanceService.PERFORMANCE_THRESHOLD) {
        issues.push(`Average response time is too high: ${avgResponseTime}ms`);
        recommendations.push('Optimize API calls or consider upgrading to faster endpoints');
      }

      // Check for response time spikes
      const responseTimes = metrics.map((m) => m.averageResponseTime);
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const responseTimeVariation = maxResponseTime - minResponseTime;

      if (responseTimeVariation > avgResponseTime * 2) {
        issues.push('High response time variation detected');
        recommendations.push('Investigate inconsistent performance and consider load balancing');
      }

      // Store performance metrics for trend analysis
      const metricsKey = `${integration.id}:response_time`;
      const currentMetrics = this.performanceMetrics.get(metricsKey) || [];
      currentMetrics.push(avgResponseTime);

      // Keep only last 100 measurements
      if (currentMetrics.length > 100) {
        currentMetrics.shift();
      }

      this.performanceMetrics.set(metricsKey, currentMetrics);
    } catch (error) {
      console.error('Response time check failed:', error);
    }

    return {
      isOptimal: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Checks resource usage
   */
  private async checkResourceUsage(integration: Integration): Promise<{
    isOptimal: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const metrics = await monitoringService.getIntegrationMetrics(integration.id, '24h');

      if (metrics.length === 0) {
        return { isOptimal: true, issues, recommendations };
      }

      const latestMetrics = metrics[metrics.length - 1];
      if (!latestMetrics) {
        return { isOptimal: true, issues, recommendations };
      }
      const totalRequests = latestMetrics.totalRequests;

      // Check for excessive resource usage
      if (totalRequests > 10000) {
        issues.push('High resource usage detected');
        recommendations.push('Consider implementing request batching or caching');
      }

      // Check for inefficient error handling
      const errorRate = latestMetrics.errorRate;
      if (errorRate > 5) {
        issues.push('High error rate indicates inefficient resource usage');
        recommendations.push('Optimize error handling and retry logic');
      }
    } catch (error) {
      console.error('Resource usage check failed:', error);
    }

    return {
      isOptimal: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Checks sync performance
   */
  private async checkSyncPerformance(integration: Integration): Promise<{
    isOptimal: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const lastSync = integration.lastSync;
      if (!lastSync) {
        issues.push('No sync activity detected');
        recommendations.push('Enable automatic syncing or perform manual sync');
        return { isOptimal: false, issues, recommendations };
      }

      const now = new Date();
      const timeSinceLastSync = now.getTime() - lastSync.getTime();
      const syncInterval = this.getSyncIntervalMs(integration.syncFrequency);

      // Check if sync is overdue
      if (timeSinceLastSync > syncInterval * 2) {
        issues.push('Sync is significantly overdue');
        recommendations.push('Check sync configuration and network connectivity');
      }

      // Check sync frequency efficiency
      if (integration.syncFrequency === 'realtime' && timeSinceLastSync > 60000) {
        issues.push('Real-time sync is not performing as expected');
        recommendations.push('Consider switching to hourly or daily sync frequency');
      }
    } catch (error) {
      console.error('Sync performance check failed:', error);
    }

    return {
      isOptimal: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Checks rate limit efficiency
   */
  private async checkRateLimitEfficiency(integration: Integration): Promise<{
    isOptimal: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const rateLimitResult = await integrationService.checkRateLimit(integration.id, 'api_call');

      // Check if rate limits are being hit frequently
      if (!rateLimitResult.allowed) {
        issues.push('Rate limits are being exceeded');
        recommendations.push('Increase rate limits or optimize request patterns');
      }

      // Check if rate limits are too conservative
      if (rateLimitResult.remaining > 80) {
        issues.push('Rate limits may be too conservative');
        recommendations.push('Consider increasing rate limits for better performance');
      }

      // Check rate limit configuration
      const config = integration.configuration;
      if (config.rateLimits) {
        const requestsPerMinute = config.rateLimits.requestsPerMinute;
        const requestsPerHour = config.rateLimits.requestsPerHour;
        const requestsPerDay = config.rateLimits.requestsPerDay;

        // Check for inconsistent rate limits
        if (requestsPerMinute * 60 > requestsPerHour) {
          issues.push('Rate limits are inconsistent (minute vs hour)');
          recommendations.push('Align rate limits across different time windows');
        }

        if (requestsPerHour * 24 > requestsPerDay) {
          issues.push('Rate limits are inconsistent (hour vs day)');
          recommendations.push('Align rate limits across different time windows');
        }
      }
    } catch (error) {
      console.error('Rate limit efficiency check failed:', error);
    }

    return {
      isOptimal: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Creates performance alert
   */
  private async createPerformanceAlert(
    integration: Integration,
    issues: string[],
    recommendations: string[]
  ): Promise<void> {
    try {
      await monitoringService.createAlert({
        integrationId: integration.id,
        type: 'info',
        title: 'Performance Issues Detected',
        message: `Performance check found ${issues.length} issue(s): ${issues.join(', ')}`,
        severity: issues.length > 3 ? 'medium' : 'low',
        isResolved: false,
        metadata: {
          issues,
          recommendations,
          checkType: 'performance',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to create performance alert:', error);
    }
  }

  // ============================================================================
  // SECURITY INCIDENT RESPONSE
  // ============================================================================

  /**
   * Handles security incident
   */
  async handleSecurityIncident(
    integrationId: string,
    incident: {
      type: 'brute_force' | 'suspicious_activity' | 'credential_compromise' | 'data_breach';
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      evidence: any;
    }
  ): Promise<void> {
    try {
      // Create critical alert
      await monitoringService.createAlert({
        integrationId,
        type: 'error',
        title: `Security Incident: ${incident.type}`,
        message: incident.description,
        severity: incident.severity,
        isResolved: false,
        metadata: {
          incidentType: incident.type,
          evidence: incident.evidence,
          timestamp: new Date().toISOString(),
        },
      });

      // Take automatic response actions based on severity
      if (incident.severity === 'critical' || incident.severity === 'high') {
        await this.takeEmergencyActions(integrationId, incident);
      }

      // Log security incident
      await monitoringService.logEvent(
        integrationId,
        'error',
        `Security incident detected: ${incident.type}`,
        {
          incident,
          responseActions: 'Emergency actions triggered',
        }
      );
    } catch (error) {
      console.error('Failed to handle security incident:', error);
    }
  }

  /**
   * Takes emergency actions for critical security incidents
   */
  private async takeEmergencyActions(integrationId: string, incident: any): Promise<void> {
    try {
      const integration = await integrationService.getIntegrationById(integrationId);
      if (!integration) return;

      // Disable integration temporarily
      await integrationService.updateIntegration(integrationId, {
        isActive: false,
      }, integration.userId);

      // Stop all sync jobs
      await integrationService.stopSync(integrationId);

      // Create emergency alert
      await monitoringService.createAlert({
        integrationId,
        type: 'error',
        title: 'Emergency Actions Taken',
        message: 'Integration has been temporarily disabled due to security incident',
        severity: 'critical',
        isResolved: false,
        metadata: {
          emergencyActions: ['disabled_integration', 'stopped_sync'],
          incident: incident,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to take emergency actions:', error);
    }
  }

  // ============================================================================
  // PERFORMANCE OPTIMIZATION
  // ============================================================================

  /**
   * Optimizes integration performance
   */
  async optimizeIntegrationPerformance(integrationId: string): Promise<{
    optimizations: string[];
    performanceGain: number;
    recommendations: string[];
  }> {
    try {
      const integration = await integrationService.getIntegrationById(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const optimizations: string[] = [];
      const recommendations: string[] = [];
      let performanceGain = 0;

      // Optimize sync frequency
      const syncOptimization = this.optimizeSyncFrequency(integration);
      if (syncOptimization.optimized) {
        optimizations.push(syncOptimization.optimization);
        performanceGain += syncOptimization.gain;
        recommendations.push(syncOptimization.recommendation);
      }

      // Optimize rate limits
      const rateLimitOptimization = this.optimizeRateLimits(integration);
      if (rateLimitOptimization.optimized) {
        optimizations.push(rateLimitOptimization.optimization);
        performanceGain += rateLimitOptimization.gain;
        recommendations.push(rateLimitOptimization.recommendation);
      }

      // Optimize batch size
      const batchOptimization = this.optimizeBatchSize(integration);
      if (batchOptimization.optimized) {
        optimizations.push(batchOptimization.optimization);
        performanceGain += batchOptimization.gain;
        recommendations.push(batchOptimization.recommendation);
      }

      // Apply optimizations
      if (optimizations.length > 0) {
        await integrationService.updateIntegration(integrationId, {
          configuration: {
            ...integration.configuration,
            syncSettings: {
              ...integration.configuration.syncSettings,
              ...syncOptimization.config,
              ...batchOptimization.config,
            },
            rateLimits: {
              ...integration.configuration.rateLimits,
              ...rateLimitOptimization.config,
            },
          },
        }, integration.userId);
      }

      return {
        optimizations,
        performanceGain,
        recommendations,
      };
    } catch (error) {
      throw new Error(
        `Performance optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getSyncIntervalMs(frequency: string): number {
    switch (frequency) {
      case 'realtime':
        return 30 * 1000;
      case 'hourly':
        return 60 * 60 * 1000;
      case 'daily':
        return 24 * 60 * 60 * 1000;
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  }

  private optimizeSyncFrequency(integration: Integration): {
    optimized: boolean;
    optimization: string;
    gain: number;
    recommendation: string;
    config?: any;
  } {
    const metrics = this.performanceMetrics.get(`${integration.id}:response_time`) || [];

    if (metrics.length === 0) {
      return { optimized: false, optimization: '', gain: 0, recommendation: '' };
    }

    const avgResponseTime = metrics.reduce((sum, time) => sum + time, 0) / metrics.length;

    // If response times are consistently high, recommend less frequent syncing
    if (avgResponseTime > 3000 && integration.syncFrequency === 'realtime') {
      return {
        optimized: true,
        optimization: 'Changed sync frequency from real-time to hourly',
        gain: 20,
        recommendation: 'Consider using hourly sync for better performance',
        config: { syncInterval: 60 * 60 * 1000 },
      };
    }

    return { optimized: false, optimization: '', gain: 0, recommendation: '' };
  }

  private optimizeRateLimits(integration: Integration): {
    optimized: boolean;
    optimization: string;
    gain: number;
    recommendation: string;
    config?: any;
  } {
    const config = integration.configuration.rateLimits;

    if (!config) {
      return { optimized: false, optimization: '', gain: 0, recommendation: '' };
    }

    // If rate limits are too conservative, increase them
    if (config.requestsPerMinute < 50) {
      return {
        optimized: true,
        optimization: 'Increased rate limits for better performance',
        gain: 15,
        recommendation: 'Monitor performance after increasing rate limits',
        config: {
          requestsPerMinute: Math.min(100, config.requestsPerMinute * 2),
          requestsPerHour: Math.min(1000, config.requestsPerHour * 2),
          requestsPerDay: Math.min(10000, config.requestsPerDay * 2),
        },
      };
    }

    return { optimized: false, optimization: '', gain: 0, recommendation: '' };
  }

  private optimizeBatchSize(integration: Integration): {
    optimized: boolean;
    optimization: string;
    gain: number;
    recommendation: string;
    config?: any;
  } {
    const config = integration.configuration.syncSettings;

    if (!config) {
      return { optimized: false, optimization: '', gain: 0, recommendation: '' };
    }

    // If batch size is too small, increase it for better performance
    if (config.batchSize < 50) {
      return {
        optimized: true,
        optimization: 'Increased batch size for better performance',
        gain: 10,
        recommendation: 'Monitor memory usage with larger batch sizes',
        config: { batchSize: Math.min(200, config.batchSize * 2) },
      };
    }

    return { optimized: false, optimization: '', gain: 0, recommendation: '' };
  }

  /**
   * Stops all monitoring services
   */
  stopMonitoring(): void {
    if (this.securityScanTimer) {
      clearInterval(this.securityScanTimer);
      this.securityScanTimer = null;
    }

    if (this.performanceCheckTimer) {
      clearInterval(this.performanceCheckTimer);
      this.performanceCheckTimer = null;
    }
  }

  /**
   * Gets security and performance summary
   */
  async getSecurityPerformanceSummary(): Promise<{
    securityScore: number;
    performanceScore: number;
    totalIssues: number;
    criticalIssues: number;
    recommendations: string[];
  }> {
    try {
      const integrations = await integrationService.getAllIntegrations();
      let totalSecurityIssues = 0;
      let totalPerformanceIssues = 0;
      let criticalIssues = 0;
      const allRecommendations: string[] = [];

      for (const integration of integrations) {
        // Get recent alerts
        const alerts = await monitoringService.getIntegrationAlerts(integration.id);
        const securityAlerts = alerts.filter((a) => a.metadata?.scanType === 'security');
        const performanceAlerts = alerts.filter((a) => a.metadata?.checkType === 'performance');
        const criticalAlerts = alerts.filter(
          (a) => a.severity === 'critical' || a.severity === 'high'
        );

        totalSecurityIssues += securityAlerts.length;
        totalPerformanceIssues += performanceAlerts.length;
        criticalIssues += criticalAlerts.length;

        // Collect recommendations
        securityAlerts.forEach((alert) => {
          if (alert.metadata?.recommendations && Array.isArray(alert.metadata.recommendations)) {
            allRecommendations.push(...(alert.metadata.recommendations as string[]));
          }
        });

        performanceAlerts.forEach((alert) => {
          if (alert.metadata?.recommendations && Array.isArray(alert.metadata.recommendations)) {
            allRecommendations.push(...(alert.metadata.recommendations as string[]));
          }
        });
      }

      // Calculate scores (0-100)
      const securityScore = Math.max(0, 100 - totalSecurityIssues * 10);
      const performanceScore = Math.max(0, 100 - totalPerformanceIssues * 5);

      return {
        securityScore,
        performanceScore,
        totalIssues: totalSecurityIssues + totalPerformanceIssues,
        criticalIssues,
        recommendations: [...new Set(allRecommendations)], // Remove duplicates
      };
    } catch (error) {
      console.error('Failed to get security performance summary:', error);
      return {
        securityScore: 0,
        performanceScore: 0,
        totalIssues: 0,
        criticalIssues: 0,
        recommendations: [],
      };
    }
  }
}

// Export singleton instance
export const securityPerformanceService = new SecurityPerformanceService();
