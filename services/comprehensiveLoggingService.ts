import { IntegrationLog, IntegrationAlert, Integration } from '../types';
import { monitoringService } from './monitoringService';

/**
 * ComprehensiveLoggingService - Production-quality logging and audit trail
 *
 * Features:
 * - Structured logging with multiple levels
 * - Audit trail for all integration activities
 * - Performance logging
 * - Security event logging
 * - Error tracking and analysis
 * - Log aggregation and correlation
 * - Log retention and archival
 * - Real-time log streaming
 * - Log analysis and insights
 */
export class ComprehensiveLoggingService {
  private static readonly LOG_RETENTION_DAYS = 90;
  private static readonly AUDIT_LOG_RETENTION_DAYS = 365;
  private static readonly PERFORMANCE_LOG_SAMPLE_RATE = 0.1; // 10% sampling
  private static readonly MAX_LOG_ENTRIES_PER_BATCH = 1000;

  private logBuffer: Map<string, IntegrationLog[]> = new Map();
  private auditTrail: Map<string, any[]> = new Map();
  private performanceLogs: Map<string, any[]> = new Map();
  private securityEvents: Map<string, any[]> = new Map();

  private logLevels = {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5,
  };

  private currentLogLevel = this.logLevels.INFO;

  // ============================================================================
  // STRUCTURED LOGGING
  // ============================================================================

  /**
   * Logs a message with structured data
   */
  async log(
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal',
    integrationId: string,
    message: string,
    context?: {
      operation?: string;
      userId?: string;
      requestId?: string;
      duration?: number;
      metadata?: any;
      tags?: string[];
    }
  ): Promise<void> {
    try {
      // Check if log level is enabled
      if (
        this.logLevels[level.toUpperCase() as keyof typeof this.logLevels] < this.currentLogLevel
      ) {
        return;
      }

      const logEntry: IntegrationLog = {
        id: crypto.randomUUID(),
        integrationId,
        level,
        message,
        metadata: context?.metadata || {},
        details: {
          timestamp: new Date().toISOString(),
          level: level.toUpperCase(),
          operation: context?.operation || 'unknown',
          userId: context?.userId,
          requestId: context?.requestId,
          duration: context?.duration,
          metadata: context?.metadata,
          tags: context?.tags || [],
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0',
        },
        timestamp: new Date(),
      };

      // Add to buffer for batch processing
      this.addToLogBuffer(integrationId, logEntry);

      // Also push immediately to monitoring so downstream sinks and telemetry observers see writes in real time
      try {
        await monitoringService.logEvent(integrationId, level as any, message, logEntry.details);
      } catch {
        // ignore sink errors
      }

      // Create audit trail entry for important operations
      if (this.shouldCreateAuditTrail(level, context?.operation)) {
        await this.createAuditTrailEntry(integrationId, level, message, context);
      }

      // Log performance data for performance-related operations
      if (context?.operation?.includes('sync') || context?.operation?.includes('api')) {
        await this.logPerformanceData(integrationId, level, message, context);
      }

      // Log security events for security-related operations
      if (this.isSecurityEvent(level, message, context)) {
        await this.logSecurityEvent(integrationId, level, message, context);
      }

      // Process log buffer if it's full
      if (this.shouldProcessLogBuffer(integrationId)) {
        await this.processLogBuffer(integrationId);
      }
    } catch (error) {
      console.error('Failed to log message:', error);
    }
  }

  /**
   * Simple getter for logs via monitoring service (test helper)
   */
  async getLogs(
    integrationId: string,
    options?: { level?: 'info' | 'warn' | 'error'; timeRange?: '24h' | '7d' | '30d' }
  ): Promise<IntegrationLog[]> {
    const range = options?.timeRange || '24h';
    const level = options?.level;
    try {
      return await monitoringService.getIntegrationLogs(integrationId, range, level as any);
    } catch {
      // Fallback to in-memory buffer
      return this.logBuffer.get(integrationId) || [];
    }
  }

  /**
   * Naive subscription using polling; returns unsubscribe
   */
  subscribeToLogs(
    callback: (log: IntegrationLog) => void,
    integrationId: string,
    options?: { intervalMs?: number }
  ): () => void {
    let lastCount = 0;
    const interval = setInterval(async () => {
      try {
        const logs = await monitoringService.getIntegrationLogs(integrationId, '24h');
        if (logs.length > lastCount) {
          logs.slice(lastCount).forEach((l) => callback(l));
          lastCount = logs.length;
        }
      } catch {
        // ignore
      }
    }, options?.intervalMs ?? 500);
    return () => clearInterval(interval);
  }

  /**
   * Logs trace-level message
   */
  async trace(integrationId: string, message: string, context?: any): Promise<void> {
    await this.log('trace', integrationId, message, context);
  }

  /**
   * Logs debug-level message
   */
  async debug(integrationId: string, message: string, context?: any): Promise<void> {
    await this.log('debug', integrationId, message, context);
  }

  /**
   * Logs info-level message
   */
  async info(integrationId: string, message: string, context?: any): Promise<void> {
    await this.log('info', integrationId, message, context);
  }

  /**
   * Logs warning-level message
   */
  async warn(integrationId: string, message: string, context?: any): Promise<void> {
    await this.log('warn', integrationId, message, context);
  }

  /**
   * Logs error-level message
   */
  async error(integrationId: string, message: string, context?: any): Promise<void> {
    await this.log('error', integrationId, message, context);
  }

  /**
   * Logs fatal-level message
   */
  async fatal(integrationId: string, message: string, context?: any): Promise<void> {
    await this.log('fatal', integrationId, message, context);
  }

  // ============================================================================
  // AUDIT TRAIL
  // ============================================================================

  /**
   * Creates audit trail entry
   */
  private async createAuditTrailEntry(
    integrationId: string,
    level: string,
    message: string,
    context?: any
  ): Promise<void> {
    try {
      const auditEntry = {
        id: crypto.randomUUID(),
        integrationId,
        timestamp: new Date().toISOString(),
        level,
        message,
        operation: context?.operation || 'unknown',
        userId: context?.userId,
        requestId: context?.requestId,
        ipAddress: context?.metadata?.ipAddress,
        userAgent: context?.metadata?.userAgent,
        resource: context?.metadata?.resource,
        action: context?.metadata?.action,
        result: context?.metadata?.result,
        changes: context?.metadata?.changes,
        metadata: context?.metadata,
      };

      // Add to audit trail buffer
      if (!this.auditTrail.has(integrationId)) {
        this.auditTrail.set(integrationId, []);
      }
      this.auditTrail.get(integrationId)!.push(auditEntry);

      // Store audit trail in database
      await monitoringService.logEvent(
        integrationId,
        level as any,
        `AUDIT: ${message}`,
        auditEntry
      );
    } catch (error) {
      console.error('Failed to create audit trail entry:', error);
    }
  }

  /**
   * Gets audit trail for an integration
   */
  async getAuditTrail(
    integrationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      operation?: string;
      userId?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    try {
      const auditEntries = this.auditTrail.get(integrationId) || [];

      let filtered = auditEntries;

      // Apply filters
      if (options?.startDate) {
        filtered = filtered.filter((entry) => new Date(entry.timestamp) >= options.startDate!);
      }

      if (options?.endDate) {
        filtered = filtered.filter((entry) => new Date(entry.timestamp) <= options.endDate!);
      }

      if (options?.operation) {
        filtered = filtered.filter((entry) => entry.operation === options.operation);
      }

      if (options?.userId) {
        filtered = filtered.filter((entry) => entry.userId === options.userId);
      }

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply limit
      if (options?.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      return filtered;
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      return [];
    }
  }

  // ============================================================================
  // PERFORMANCE LOGGING
  // ============================================================================

  /**
   * Logs performance data
   */
  private async logPerformanceData(
    integrationId: string,
    level: string,
    message: string,
    context?: any
  ): Promise<void> {
    try {
      // Sample performance logs to avoid overwhelming the system
      if (Math.random() > ComprehensiveLoggingService.PERFORMANCE_LOG_SAMPLE_RATE) {
        return;
      }

      const performanceEntry = {
        id: crypto.randomUUID(),
        integrationId,
        timestamp: new Date().toISOString(),
        level,
        message,
        operation: context?.operation || 'unknown',
        duration: context?.duration || 0,
        responseTime: context?.metadata?.responseTime || 0,
        throughput: context?.metadata?.throughput || 0,
        memoryUsage: context?.metadata?.memoryUsage || 0,
        cpuUsage: context?.metadata?.cpuUsage || 0,
        networkLatency: context?.metadata?.networkLatency || 0,
        requestSize: context?.metadata?.requestSize || 0,
        responseSize: context?.metadata?.responseSize || 0,
        metadata: context?.metadata,
      };

      // Add to performance logs buffer
      if (!this.performanceLogs.has(integrationId)) {
        this.performanceLogs.set(integrationId, []);
      }
      this.performanceLogs.get(integrationId)!.push(performanceEntry);
    } catch (error) {
      console.error('Failed to log performance data:', error);
    }
  }

  /**
   * Gets performance logs for an integration
   */
  async getPerformanceLogs(
    integrationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      operation?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    try {
      const performanceEntries = this.performanceLogs.get(integrationId) || [];

      let filtered = performanceEntries;

      // Apply filters
      if (options?.startDate) {
        filtered = filtered.filter((entry) => new Date(entry.timestamp) >= options.startDate!);
      }

      if (options?.endDate) {
        filtered = filtered.filter((entry) => new Date(entry.timestamp) <= options.endDate!);
      }

      if (options?.operation) {
        filtered = filtered.filter((entry) => entry.operation === options.operation);
      }

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply limit
      if (options?.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      return filtered;
    } catch (error) {
      console.error('Failed to get performance logs:', error);
      return [];
    }
  }

  // ============================================================================
  // SECURITY EVENT LOGGING
  // ============================================================================

  /**
   * Logs security event
   */
  private async logSecurityEvent(
    integrationId: string,
    level: string,
    message: string,
    context?: any
  ): Promise<void> {
    try {
      const securityEntry = {
        id: crypto.randomUUID(),
        integrationId,
        timestamp: new Date().toISOString(),
        level,
        message,
        eventType: context?.metadata?.eventType || 'unknown',
        severity: context?.metadata?.severity || 'medium',
        source: context?.metadata?.source || 'unknown',
        ipAddress: context?.metadata?.ipAddress,
        userAgent: context?.metadata?.userAgent,
        userId: context?.userId,
        requestId: context?.requestId,
        threatLevel: context?.metadata?.threatLevel || 'low',
        action: context?.metadata?.action || 'none',
        metadata: context?.metadata,
      };

      // Add to security events buffer
      if (!this.securityEvents.has(integrationId)) {
        this.securityEvents.set(integrationId, []);
      }
      this.securityEvents.get(integrationId)!.push(securityEntry);

      // Create security alert for high-severity events
      if (securityEntry.severity === 'high' || securityEntry.threatLevel === 'high') {
        await monitoringService.createAlert({
          integrationId,
          type: 'error',
          title: 'Security Event Detected',
          message: securityEntry.message,
          severity: 'high',
          isResolved: false,
          metadata: {
            eventType: 'security',
            securityEvent: securityEntry,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Gets security events for an integration
   */
  async getSecurityEvents(
    integrationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      severity?: string;
      eventType?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    try {
      const securityEntries = this.securityEvents.get(integrationId) || [];

      let filtered = securityEntries;

      // Apply filters
      if (options?.startDate) {
        filtered = filtered.filter((entry) => new Date(entry.timestamp) >= options.startDate!);
      }

      if (options?.endDate) {
        filtered = filtered.filter((entry) => new Date(entry.timestamp) <= options.endDate!);
      }

      if (options?.severity) {
        filtered = filtered.filter((entry) => entry.severity === options.severity);
      }

      if (options?.eventType) {
        filtered = filtered.filter((entry) => entry.eventType === options.eventType);
      }

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply limit
      if (options?.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      return filtered;
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  // ============================================================================
  // LOG BUFFER MANAGEMENT
  // ============================================================================

  /**
   * Adds log entry to buffer
   */
  private addToLogBuffer(integrationId: string, logEntry: IntegrationLog): void {
    if (!this.logBuffer.has(integrationId)) {
      this.logBuffer.set(integrationId, []);
    }
    this.logBuffer.get(integrationId)!.push(logEntry);
  }

  /**
   * Checks if log buffer should be processed
   */
  private shouldProcessLogBuffer(integrationId: string): boolean {
    const buffer = this.logBuffer.get(integrationId);
    return buffer ? buffer.length >= ComprehensiveLoggingService.MAX_LOG_ENTRIES_PER_BATCH : false;
  }

  /**
   * Processes log buffer
   */
  private async processLogBuffer(integrationId: string): Promise<void> {
    try {
      const buffer = this.logBuffer.get(integrationId);
      if (!buffer || buffer.length === 0) {
        return;
      }

      // Process logs in batches
      const batch = buffer.splice(0, ComprehensiveLoggingService.MAX_LOG_ENTRIES_PER_BATCH);

      for (const logEntry of batch) {
        await monitoringService.logEvent(
          integrationId,
          logEntry.level as any,
          logEntry.message,
          logEntry.details
        );
      }
    } catch (error) {
      console.error('Failed to process log buffer:', error);
    }
  }

  // ============================================================================
  // LOG ANALYSIS AND INSIGHTS
  // ============================================================================

  /**
   * Analyzes logs for patterns and insights
   */
  async analyzeLogs(
    integrationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      level?: string;
      operation?: string;
    }
  ): Promise<{
    totalLogs: number;
    logLevelDistribution: Record<string, number>;
    operationDistribution: Record<string, number>;
    errorPatterns: string[];
    performanceInsights: any[];
    recommendations: string[];
  }> {
    try {
      const logs = await monitoringService.getIntegrationLogs(
        integrationId,
        '24h',
        options?.level as any
      );

      const filtered = options ? this.filterLogs(logs, options) : logs;

      // Analyze log levels
      const logLevelDistribution: Record<string, number> = {};
      filtered.forEach((log) => {
        logLevelDistribution[log.level] = (logLevelDistribution[log.level] || 0) + 1;
      });

      // Analyze operations
      const operationDistribution: Record<string, number> = {};
      filtered.forEach((log) => {
        const operation = log.details?.operation || 'unknown';
        operationDistribution[operation] = (operationDistribution[operation] || 0) + 1;
      });

      // Analyze error patterns
      const errorLogs = filtered.filter((log) => log.level === 'error' || log.level === 'fatal');
      const errorPatterns = this.extractErrorPatterns(errorLogs);

      // Analyze performance insights
      const performanceInsights = this.analyzePerformanceInsights(filtered);

      // Generate recommendations
      const recommendations = this.generateLogRecommendations(
        logLevelDistribution,
        operationDistribution,
        errorPatterns,
        performanceInsights
      );

      return {
        totalLogs: filtered.length,
        logLevelDistribution,
        operationDistribution,
        errorPatterns,
        performanceInsights,
        recommendations,
      };
    } catch (error) {
      console.error('Failed to analyze logs:', error);
      return {
        totalLogs: 0,
        logLevelDistribution: {},
        operationDistribution: {},
        errorPatterns: [],
        performanceInsights: [],
        recommendations: [],
      };
    }
  }

  /**
   * Filters logs based on options
   */
  private filterLogs(logs: IntegrationLog[], options: any): IntegrationLog[] {
    let filtered = logs;

    if (options.startDate) {
      filtered = filtered.filter((log) => log.timestamp >= options.startDate);
    }

    if (options.endDate) {
      filtered = filtered.filter((log) => log.timestamp <= options.endDate);
    }

    if (options.level) {
      filtered = filtered.filter((log) => log.level === options.level);
    }

    if (options.operation) {
      filtered = filtered.filter((log) => log.details?.operation === options.operation);
    }

    return filtered;
  }

  /**
   * Extracts error patterns from logs
   */
  private extractErrorPatterns(errorLogs: IntegrationLog[]): string[] {
    const patterns: string[] = [];
    const errorMessages = errorLogs.map((log) => log.message);

    // Simple pattern extraction - in production, use more sophisticated NLP
    const commonPatterns = [
      'authentication failed',
      'rate limit exceeded',
      'connection timeout',
      'invalid credentials',
      'network error',
      'server error',
    ];

    commonPatterns.forEach((pattern) => {
      const count = errorMessages.filter((msg) => msg.toLowerCase().includes(pattern)).length;
      if (count > 0) {
        patterns.push(`${pattern} (${count} occurrences)`);
      }
    });

    return patterns;
  }

  /**
   * Analyzes performance insights from logs
   */
  private analyzePerformanceInsights(logs: IntegrationLog[]): any[] {
    const insights: any[] = [];
    const performanceLogs = logs.filter((log) => log.details?.duration !== undefined);

    if (performanceLogs.length > 0) {
      const durations = performanceLogs.map((log) => log.details.duration);
      const avgDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      insights.push({
        metric: 'average_duration',
        value: avgDuration,
        unit: 'ms',
      });

      insights.push({
        metric: 'max_duration',
        value: maxDuration,
        unit: 'ms',
      });

      insights.push({
        metric: 'min_duration',
        value: minDuration,
        unit: 'ms',
      });
    }

    return insights;
  }

  /**
   * Generates recommendations based on log analysis
   */
  private generateLogRecommendations(
    logLevelDistribution: Record<string, number>,
    operationDistribution: Record<string, number>,
    errorPatterns: string[],
    performanceInsights: any[]
  ): string[] {
    const recommendations: string[] = [];

    // High error rate recommendation
    const totalLogs = Object.values(logLevelDistribution).reduce((sum, count) => sum + count, 0);
    const errorCount = (logLevelDistribution.error || 0) + (logLevelDistribution.fatal || 0);
    const errorRate = totalLogs > 0 ? errorCount / totalLogs : 0;

    if (errorRate > 0.1) {
      recommendations.push(
        'High error rate detected - investigate error patterns and improve error handling'
      );
    }

    // Performance recommendations
    const avgDuration = performanceInsights.find(
      (insight) => insight.metric === 'average_duration'
    )?.value;
    if (avgDuration && avgDuration > 5000) {
      recommendations.push(
        'Average operation duration is high - consider performance optimization'
      );
    }

    // Operation distribution recommendations
    const operations = Object.keys(operationDistribution);
    if (operations.length > 10) {
      recommendations.push(
        'High number of different operations - consider operation consolidation'
      );
    }

    return recommendations;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Checks if operation should create audit trail
   */
  private shouldCreateAuditTrail(level: string, operation?: string): boolean {
    const auditOperations = [
      'create',
      'update',
      'delete',
      'connect',
      'disconnect',
      'sync',
      'authenticate',
      'authorize',
      'configure',
    ];

    return (
      ['warn', 'error', 'fatal'].includes(level) ||
      Boolean(
        operation && auditOperations.some((auditOp) => operation.toLowerCase().includes(auditOp))
      )
    );
  }

  /**
   * Checks if event is security-related
   */
  private isSecurityEvent(level: string, message: string, context?: any): boolean {
    const securityKeywords = [
      'authentication',
      'authorization',
      'credential',
      'token',
      'access',
      'permission',
      'security',
      'breach',
      'attack',
      'unauthorized',
      'forbidden',
      'suspicious',
      'threat',
      'vulnerability',
    ];

    return (
      ['error', 'fatal'].includes(level) &&
      (securityKeywords.some((keyword) => message.toLowerCase().includes(keyword)) ||
        context?.metadata?.eventType === 'security')
    );
  }

  /**
   * Sets log level
   */
  setLogLevel(level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'): void {
    this.currentLogLevel = this.logLevels[level.toUpperCase() as keyof typeof this.logLevels];
  }

  /**
   * Gets current log level
   */
  getLogLevel(): string {
    return (
      Object.keys(this.logLevels).find(
        (key) => this.logLevels[key as keyof typeof this.logLevels] === this.currentLogLevel
      ) || 'info'
    );
  }

  /**
   * Clears all log buffers
   */
  clearBuffers(): void {
    this.logBuffer.clear();
    this.auditTrail.clear();
    this.performanceLogs.clear();
    this.securityEvents.clear();
  }

  /**
   * Gets logging statistics
   */
  getLoggingStats(): {
    totalBufferedLogs: number;
    totalAuditEntries: number;
    totalPerformanceLogs: number;
    totalSecurityEvents: number;
    bufferSizes: Record<string, number>;
  } {
    const stats = {
      totalBufferedLogs: 0,
      totalAuditEntries: 0,
      totalPerformanceLogs: 0,
      totalSecurityEvents: 0,
      bufferSizes: {} as Record<string, number>,
    };

    // Count buffered logs
    for (const [integrationId, buffer] of this.logBuffer.entries()) {
      stats.totalBufferedLogs += buffer.length;
      stats.bufferSizes[`logs_${integrationId}`] = buffer.length;
    }

    // Count audit entries
    for (const [integrationId, entries] of this.auditTrail.entries()) {
      stats.totalAuditEntries += entries.length;
      stats.bufferSizes[`audit_${integrationId}`] = entries.length;
    }

    // Count performance logs
    for (const [integrationId, logs] of this.performanceLogs.entries()) {
      stats.totalPerformanceLogs += logs.length;
      stats.bufferSizes[`performance_${integrationId}`] = logs.length;
    }

    // Count security events
    for (const [integrationId, events] of this.securityEvents.entries()) {
      stats.totalSecurityEvents += events.length;
      stats.bufferSizes[`security_${integrationId}`] = events.length;
    }

    return stats;
  }
}

// Export singleton instance
export const comprehensiveLoggingService = new ComprehensiveLoggingService();
