import {
  Integration,
  CreateIntegrationData,
  UpdateIntegrationData,
  IntegrationMetrics,
  WebhookConfig,
  ConnectionTestResult,
  SyncResult,
  HealthCheckResult,
  RateLimitResult,
  SyncFrequency,
} from '../types';
import { db } from './neonService';
import { credentialEncryption } from './credentialEncryption';

/**
 * IntegrationService - Production-quality integration management service
 *
 * Features:
 * - Complete CRUD operations for integrations
 * - Secure credential encryption/decryption
 * - Connection testing and validation
 * - Health monitoring and metrics
 * - Webhook management
 * - Rate limiting and error handling
 * - Real-time status updates
 * - Comprehensive logging and alerting
 */
export class IntegrationService {
  private static instance: IntegrationService;
  private syncJobs: Map<string, ReturnType<typeof setInterval>> = new Map();
  private rateLimitTrackers: Map<string, RateLimitTracker> = new Map();
  private appSecret: string;

  constructor() {
    // In production, this should come from environment variables
    this.appSecret =
      globalThis.process?.env?.INTEGRATION_APP_SECRET || 'default-app-secret-change-in-production';
  }

  static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  // ============================================================================
  // CORE CRUD OPERATIONS
  // ============================================================================

  /**
   * Creates a new integration with encrypted credentials
   */
  async createIntegration(data: CreateIntegrationData, userId: string): Promise<Integration> {
    try {
      // Validate input data
      this.validateCreateIntegrationData(data);

      // Encrypt credentials
      const userKey = credentialEncryption.generateUserKey(data.name, this.appSecret);
      const encryptedCredentials = await credentialEncryption.encrypt(data.credentials, userKey);

      // Create integration record
      const integration = await db.addIntegration(
        {
          name: data.name,
          type: data.type,
          platform: data.platform,
          status: 'disconnected',
          credentials: encryptedCredentials,
          configuration: {
            syncSettings: {
              autoSync: true,
              syncInterval: 60,
              batchSize: 100,
              retryAttempts: 3,
              timeoutMs: 30000,
              syncOnStartup: true,
              syncOnSchedule: true,
            },
            rateLimits: {
              requestsPerMinute: 100,
              requestsPerHour: 1000,
              requestsPerDay: 10000,
              burstLimit: 20,
            },
            errorHandling: {
              maxRetries: 3,
              retryDelay: 1000,
              exponentialBackoff: true,
              deadLetterQueue: true,
              alertOnFailure: true,
            },
            notifications: {
              emailNotifications: true,
              webhookNotifications: false,
              slackNotifications: false,
              notificationLevels: ['error', 'warn'],
            },
            ...data.configuration,
          },
          syncFrequency: data.syncFrequency || 'hourly',
          isActive: true,
        },
        userId
      );

      // Log integration creation
      await this.logIntegrationActivity(
        integration.id,
        'info',
        'Integration created successfully',
        {
          type: data.type,
          platform: data.platform,
        }
      );

      return integration;
    } catch (error) {
      throw new Error(
        `Failed to create integration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Updates an existing integration
   */
  async updateIntegration(
    id: string,
    updates: UpdateIntegrationData,
    userId: string
  ): Promise<Integration> {
    try {
      const existingIntegration = await db.getIntegrationById(id);
      if (!existingIntegration) {
        throw new Error('Integration not found');
      }

      // Update integration
      const updatedIntegration = await db.updateIntegration(
        id,
        {
          name: updates.name,
          configuration: updates.configuration,
          syncFrequency: updates.syncFrequency,
          isActive: updates.isActive,
        },
        userId
      );

      // Log update
      await this.logIntegrationActivity(id, 'info', 'Integration updated', {
        updatedFields: Object.keys(updates),
      });

      return updatedIntegration;
    } catch (error) {
      throw new Error(
        `Failed to update integration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Deletes an integration and cleans up associated data
   */
  async deleteIntegration(id: string, userId: string): Promise<void> {
    try {
      const integration = await db.getIntegrationById(id);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Stop any running sync jobs
      this.stopSync(id);

      // Delete integration (cascade will handle related records)
      await db.deleteIntegration(id, userId);

      // Log deletion
      await this.logIntegrationActivity(id, 'info', 'Integration deleted', {
        platform: integration.platform,
        type: integration.type,
      });
    } catch (error) {
      throw new Error(
        `Failed to delete integration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets all integrations for the current user
   */
  async getIntegrations(userId: string): Promise<Integration[]> {
    try {
      return await db.getIntegrations(userId);
    } catch (error) {
      throw new Error(
        `Failed to fetch integrations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets all integrations across all users (system-wide, for orchestration)
   */
  async getAllIntegrations(): Promise<Integration[]> {
    // This would require a database method that gets all integrations
    // For now, return empty array as a safe default
    // TODO: Implement db.getAllIntegrations() in neonService
    return [];
  }

  /**
   * Gets a specific integration by ID
   */
  async getIntegrationById(id: string): Promise<Integration | null> {
    try {
      return await db.getIntegrationById(id);
    } catch (error) {
      throw new Error(
        `Failed to fetch integration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Tests the connection to an integration
   */
  async testConnection(id: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      const integration = await db.getIntegrationById(id);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Decrypt credentials
      const userKey = credentialEncryption.generateUserKey(integration.name, this.appSecret);
      const credentials = await credentialEncryption.decrypt(integration.credentials, userKey);

      // Test connection based on platform
      const testResult = await this.performConnectionTest(integration.platform, credentials);

      const responseTime = Date.now() - startTime;

      // Log test result
      await this.logIntegrationActivity(
        id,
        testResult.success ? 'info' : 'error',
        `Connection test ${testResult.success ? 'passed' : 'failed'}`,
        {
          responseTime,
          details: testResult.details,
        }
      );

      return {
        success: testResult.success,
        error: testResult.error,
        responseTime,
        details: testResult.details,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      await this.logIntegrationActivity(id, 'error', 'Connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Connects an integration (sets status to connected)
   */
  async connectIntegration(id: string, userId: string): Promise<boolean> {
    try {
      const testResult = await this.testConnection(id);

      if (testResult.success) {
        await db.updateIntegration(id, { status: 'connected' }, userId);
        await this.logIntegrationActivity(id, 'info', 'Integration connected successfully');
        return true;
      } else {
        await db.updateIntegration(id, { status: 'error' }, userId);
        await this.logIntegrationActivity(id, 'error', 'Integration connection failed', {
          error: testResult.error,
        });
        return false;
      }
    } catch (error) {
      await db.updateIntegration(id, { status: 'error' }, userId);
      await this.logIntegrationActivity(id, 'error', 'Integration connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Disconnects an integration
   */
  async disconnectIntegration(id: string, userId: string): Promise<void> {
    try {
      // Stop sync jobs
      this.stopSync(id);

      // Update status
      await db.updateIntegration(id, { status: 'disconnected' }, userId);

      // Log disconnection
      await this.logIntegrationActivity(id, 'info', 'Integration disconnected');
    } catch (error) {
      throw new Error(
        `Failed to disconnect integration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // SYNC MANAGEMENT
  // ============================================================================

  /**
   * Starts automatic syncing for an integration
   */
  async startSync(id: string, userId: string): Promise<void> {
    try {
      const integration = await db.getIntegrationById(id);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Stop existing sync job if running
      this.stopSync(id);

      // Start new sync job
      const syncInterval = this.getSyncInterval(integration.syncFrequency);
      const syncJob = globalThis.setInterval(async () => {
        try {
          await this.performSync(id);
        } catch (error) {
          console.error(`Sync job failed for integration ${id}:`, error);
        }
      }, syncInterval);

      this.syncJobs.set(id, syncJob);

      // Update status
      await db.updateIntegration(id, { status: 'connected' }, userId);

      // Log sync start
      await this.logIntegrationActivity(id, 'info', 'Automatic sync started', {
        frequency: integration.syncFrequency,
        interval: syncInterval,
      });
    } catch (error) {
      throw new Error(
        `Failed to start sync: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stops automatic syncing for an integration
   */
  async stopSync(id: string): Promise<void> {
    const syncJob = this.syncJobs.get(id);
    if (syncJob) {
      clearInterval(syncJob);
      this.syncJobs.delete(id);

      await this.logIntegrationActivity(id, 'info', 'Automatic sync stopped');
    }
  }

  /**
   * Stops all sync jobs - useful for cleanup
   */
  async stopAllSyncs(): Promise<void> {
    for (const [id, syncJob] of this.syncJobs.entries()) {
      clearInterval(syncJob);
      await this.logIntegrationActivity(id, 'info', 'Automatic sync stopped during cleanup');
    }
    this.syncJobs.clear();
  }

  /**
   * Performs a manual sync for an integration
   */
  async syncIntegration(id: string): Promise<SyncResult> {
    return await this.performSync(id);
  }

  /**
   * Syncs all active integrations for a user
   */
  async syncAll(userId: string): Promise<SyncResult[]> {
    try {
      const integrations = await db.getIntegrations(userId);
      const activeIntegrations = integrations.filter((i) => i.isActive && i.status === 'connected');

      const results = await Promise.allSettled(
        activeIntegrations.map((integration) => this.performSync(integration.id))
      );

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            integrationId: activeIntegrations[index].id,
            success: false,
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0,
            errors: [result.reason instanceof Error ? result.reason.message : 'Unknown error'],
            duration: 0,
            timestamp: new Date(),
          };
        }
      });
    } catch (error) {
      throw new Error(
        `Failed to sync all integrations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  /**
   * Performs a comprehensive health check for an integration
   */
  async checkIntegrationHealth(id: string): Promise<HealthCheckResult> {
    try {
      const integration = await db.getIntegrationById(id);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const checks: any[] = [];

      // Test connection
      const connectionTest = await this.testConnection(id);
      checks.push({
        check: 'connection',
        success: connectionTest.success,
        error: connectionTest.error,
        responseTime: connectionTest.responseTime,
        details: connectionTest.details,
      });

      // Check recent logs for errors
      const recentLogs = await db.getIntegrationLogs(id, 50);
      const recentErrors = recentLogs.filter(
        (log) => log.level === 'error' && log.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      checks.push({
        check: 'error_rate',
        success: recentErrors.length < 5,
        error:
          recentErrors.length >= 5 ? `Too many recent errors: ${recentErrors.length}` : undefined,
        details: { errorCount: recentErrors.length },
      });

      // Check sync status
      const lastSync = integration.lastSync;
      const syncCheck = {
        check: 'sync_status',
        success: lastSync ? Date.now() - lastSync.getTime() < 2 * 60 * 60 * 1000 : false,
        error: !lastSync ? 'No recent sync' : 'Sync is overdue',
        details: { lastSync: lastSync?.toISOString() },
      };
      checks.push(syncCheck);

      // Calculate health score
      const successfulChecks = checks.filter((check) => check.success).length;
      const healthScore = Math.round((successfulChecks / checks.length) * 100);

      // Generate recommendations
      const recommendations = this.generateHealthRecommendations(checks);

      return {
        integrationId: id,
        healthScore,
        checks,
        timestamp: new Date(),
        recommendations,
      };
    } catch (error) {
      throw new Error(
        `Failed to check integration health: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets metrics for an integration
   */
  async getIntegrationMetrics(
    id: string,
    timeframe: string = '24h'
  ): Promise<IntegrationMetrics[]> {
    try {
      return await db.getIntegrationMetrics(id, timeframe);
    } catch (error) {
      throw new Error(
        `Failed to fetch integration metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // WEBHOOK MANAGEMENT
  // ============================================================================

  /**
   * Gets webhooks for an integration
   */
  async getWebhooks(integrationId: string): Promise<WebhookConfig[]> {
    try {
      return await db.getIntegrationWebhooks(integrationId);
    } catch (error) {
      throw new Error(
        `Failed to fetch webhooks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Adds a webhook to an integration
   */
  async addWebhook(integrationId: string, webhook: Omit<WebhookConfig, 'id'>): Promise<void> {
    try {
      await db.addIntegrationWebhook({
        integration_id: integrationId,
        ...webhook,
      });
    } catch (error) {
      throw new Error(
        `Failed to add webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Updates a webhook
   */
  async updateWebhook(webhookId: string, updates: Partial<WebhookConfig>): Promise<void> {
    try {
      await db.updateIntegrationWebhook(webhookId, updates);
    } catch (error) {
      throw new Error(
        `Failed to update webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Deletes a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await db.deleteIntegrationWebhook(webhookId);
    } catch (error) {
      throw new Error(
        `Failed to delete webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  /**
   * Checks if an operation is allowed under rate limits
   */
  async checkRateLimit(integrationId: string, operation: string): Promise<RateLimitResult> {
    const key = `${integrationId}:${operation}`;
    const tracker = this.rateLimitTrackers.get(key) || new RateLimitTracker();

    const now = Date.now();
    const windowStart = now - 60 * 1000; // 1 minute window

    // Clean old requests
    tracker.requests = tracker.requests.filter((timestamp) => timestamp > windowStart);

    const limit = this.getRateLimit(operation);
    const remaining = Math.max(0, limit - tracker.requests.length);

    if (tracker.requests.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: tracker.requests[0] + 60 * 1000,
        retryAfter: Math.ceil((tracker.requests[0] + 60 * 1000 - now) / 1000),
      };
    }

    tracker.requests.push(now);
    this.rateLimitTrackers.set(key, tracker);

    return {
      allowed: true,
      remaining: remaining - 1,
      resetTime: now + 60 * 1000,
      retryAfter: 0,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private validateCreateIntegrationData(data: CreateIntegrationData): void {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new Error('Integration name is required');
    }
    if (
      !data.type ||
      !['social_media', 'analytics', 'crm', 'email', 'storage', 'ai_service'].includes(data.type)
    ) {
      throw new Error('Invalid integration type');
    }
    if (!data.platform || typeof data.platform !== 'string' || data.platform.trim().length === 0) {
      throw new Error('Platform is required');
    }
    if (!data.credentials || typeof data.credentials !== 'object') {
      throw new Error('Credentials are required');
    }
  }

  private async performConnectionTest(
    platform: string,
    credentials: any
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      // Import platform-specific integrations
      const { SocialMediaIntegrations } = await import('./integrations/socialMediaIntegrations');
      const { AnalyticsIntegrations } = await import('./integrations/analyticsIntegrations');
      const { AIServiceIntegrations } = await import('./integrations/aiServiceIntegrations');

      switch (platform) {
        case 'twitter': {
          const twitterResult = await SocialMediaIntegrations.testTwitterConnection(credentials);
          return {
            success: twitterResult.success,
            error: twitterResult.error,
            details: twitterResult.details,
          };
        }

        case 'linkedin': {
          const linkedinResult = await SocialMediaIntegrations.testLinkedInConnection(credentials);
          return {
            success: linkedinResult.success,
            error: linkedinResult.error,
            details: linkedinResult.details,
          };
        }

        case 'facebook': {
          const facebookResult = await SocialMediaIntegrations.testFacebookConnection(credentials);
          return {
            success: facebookResult.success,
            error: facebookResult.error,
            details: facebookResult.details,
          };
        }

        case 'instagram': {
          const instagramResult =
            await SocialMediaIntegrations.testInstagramConnection(credentials);
          return {
            success: instagramResult.success,
            error: instagramResult.error,
            details: instagramResult.details,
          };
        }

        case 'google_analytics': {
          const gaResult = await AnalyticsIntegrations.testGoogleAnalyticsConnection(credentials);
          return { success: gaResult.success, error: gaResult.error, details: gaResult.details };
        }

        case 'facebook_analytics': {
          const fbAnalyticsResult =
            await AnalyticsIntegrations.testFacebookAnalyticsConnection(credentials);
          return {
            success: fbAnalyticsResult.success,
            error: fbAnalyticsResult.error,
            details: fbAnalyticsResult.details,
          };
        }

        case 'twitter_analytics': {
          const twitterAnalyticsResult =
            await AnalyticsIntegrations.testTwitterAnalyticsConnection(credentials);
          return {
            success: twitterAnalyticsResult.success,
            error: twitterAnalyticsResult.error,
            details: twitterAnalyticsResult.details,
          };
        }

        case 'openai': {
          const openaiResult = await AIServiceIntegrations.testOpenAIConnection(credentials);
          return {
            success: openaiResult.success,
            error: openaiResult.error,
            details: openaiResult.details,
          };
        }

        case 'claude': {
          const claudeResult = await AIServiceIntegrations.testClaudeConnection(credentials);
          return {
            success: claudeResult.success,
            error: claudeResult.error,
            details: claudeResult.details,
          };
        }

        default:
          return { success: false, error: 'Unsupported platform' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async testTwitterConnection(
    credentials: any
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const { default: TwitterClient } = await import('./platforms/twitterClient');
      const client = new TwitterClient(credentials);
      const result = await client.testConnection();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to test Twitter connection' };
    }
  }

  private async testLinkedInConnection(
    credentials: any
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const { default: LinkedInClient } = await import('./platforms/linkedInClient');
      const client = new LinkedInClient(credentials);
      const result = await client.testConnection();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to test LinkedIn connection' };
    }
  }

  private async testFacebookConnection(
    credentials: any
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const { default: FacebookClient } = await import('./platforms/facebookClient');
      const client = new FacebookClient(credentials);
      const result = await client.testConnection();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to test Facebook connection' };
    }
  }

  private async testInstagramConnection(
    credentials: any
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const { default: InstagramClient } = await import('./platforms/instagramClient');
      const client = new InstagramClient(credentials);
      const result = await client.testConnection();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to test Instagram connection' };
    }
  }

  private async testGoogleAnalyticsConnection(
    credentials: any
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      // For Google Analytics, we'll implement a basic validation
      if (!credentials.clientId || !credentials.clientSecret) {
        return { success: false, error: 'Missing client credentials' };
      }

      // In a real implementation, this would test the GA4 Data API
      // For now, we'll validate the credentials format
      if (credentials.clientId.length < 10 || credentials.clientSecret.length < 10) {
        return { success: false, error: 'Invalid credential format' };
      }

      return { success: true, details: { apiVersion: 'v1', service: 'Google Analytics Data API' } };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to test Google Analytics connection',
      };
    }
  }

  private async performSync(id: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const integration = await db.getIntegrationById(id);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Update status to syncing
      await db.updateIntegration(id, { status: 'syncing' }, integration.userId);

      // Perform platform-specific sync
      const syncResult = await this.performPlatformSync(integration);

      // Update last sync time
      await db.updateIntegration(
        id,
        {
          status: 'connected',
          lastSync: new Date(),
        },
        integration.userId
      );

      // Log sync result
      await this.logIntegrationActivity(id, 'info', 'Sync completed successfully', {
        recordsProcessed: syncResult.recordsProcessed,
        duration: Date.now() - startTime,
      });

      return {
        ...syncResult,
        integrationId: id,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      // Update status to error
      await db.updateIntegration(
        id,
        { status: 'error' },
        (await db.getIntegrationById(id))?.userId || ''
      );

      // Log sync error
      await this.logIntegrationActivity(id, 'error', 'Sync failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });

      return {
        integrationId: id,
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  private async performPlatformSync(
    integration: Integration
  ): Promise<Omit<SyncResult, 'integrationId' | 'duration' | 'timestamp'>> {
    try {
      // Decrypt credentials
      const userKey = credentialEncryption.generateUserKey(integration.name, this.appSecret);
      const credentials = await credentialEncryption.decrypt(integration.credentials, userKey);

      // Import platform-specific integrations
      const { SocialMediaIntegrations } = await import('./integrations/socialMediaIntegrations');
      const { AnalyticsIntegrations } = await import('./integrations/analyticsIntegrations');
      const { AIServiceIntegrations } = await import('./integrations/aiServiceIntegrations');

      switch (integration.platform) {
        case 'twitter': {
          const twitterResult = await SocialMediaIntegrations.syncTwitterData(
            integration.id,
            credentials
          );
          return {
            success: twitterResult.success,
            recordsProcessed: twitterResult.recordsProcessed,
            recordsCreated: twitterResult.recordsCreated,
            recordsUpdated: twitterResult.recordsUpdated,
            recordsDeleted: twitterResult.recordsDeleted,
            errors: twitterResult.errors,
          };
        }

        case 'linkedin': {
          const linkedinResult = await SocialMediaIntegrations.syncLinkedInData(
            integration.id,
            credentials
          );
          return {
            success: linkedinResult.success,
            recordsProcessed: linkedinResult.recordsProcessed,
            recordsCreated: linkedinResult.recordsCreated,
            recordsUpdated: linkedinResult.recordsUpdated,
            recordsDeleted: linkedinResult.recordsDeleted,
            errors: linkedinResult.errors,
          };
        }

        case 'facebook': {
          const facebookResult = await SocialMediaIntegrations.syncFacebookData(
            integration.id,
            credentials
          );
          return {
            success: facebookResult.success,
            recordsProcessed: facebookResult.recordsProcessed,
            recordsCreated: facebookResult.recordsCreated,
            recordsUpdated: facebookResult.recordsUpdated,
            recordsDeleted: facebookResult.recordsDeleted,
            errors: facebookResult.errors,
          };
        }

        case 'instagram': {
          const instagramResult = await SocialMediaIntegrations.syncInstagramData(
            integration.id,
            credentials
          );
          return {
            success: instagramResult.success,
            recordsProcessed: instagramResult.recordsProcessed,
            recordsCreated: instagramResult.recordsCreated,
            recordsUpdated: instagramResult.recordsUpdated,
            recordsDeleted: instagramResult.recordsDeleted,
            errors: instagramResult.errors,
          };
        }

        case 'google_analytics': {
          const gaResult = await AnalyticsIntegrations.syncGoogleAnalyticsData(
            integration.id,
            credentials
          );
          return {
            success: gaResult.success,
            recordsProcessed: gaResult.recordsProcessed,
            recordsCreated: gaResult.recordsCreated,
            recordsUpdated: gaResult.recordsUpdated,
            recordsDeleted: gaResult.recordsDeleted,
            errors: gaResult.errors,
          };
        }

        case 'facebook_analytics': {
          const fbAnalyticsResult = await AnalyticsIntegrations.syncFacebookAnalyticsData(
            integration.id,
            credentials
          );
          return {
            success: fbAnalyticsResult.success,
            recordsProcessed: fbAnalyticsResult.recordsProcessed,
            recordsCreated: fbAnalyticsResult.recordsCreated,
            recordsUpdated: fbAnalyticsResult.recordsUpdated,
            recordsDeleted: fbAnalyticsResult.recordsDeleted,
            errors: fbAnalyticsResult.errors,
          };
        }

        case 'twitter_analytics': {
          const twitterAnalyticsResult = await AnalyticsIntegrations.syncTwitterAnalyticsData(
            integration.id,
            credentials
          );
          return {
            success: twitterAnalyticsResult.success,
            recordsProcessed: twitterAnalyticsResult.recordsProcessed,
            recordsCreated: twitterAnalyticsResult.recordsCreated,
            recordsUpdated: twitterAnalyticsResult.recordsUpdated,
            recordsDeleted: twitterAnalyticsResult.recordsDeleted,
            errors: twitterAnalyticsResult.errors,
          };
        }

        case 'openai': {
          const openaiResult = await AIServiceIntegrations.syncOpenAIData(
            integration.id,
            credentials
          );
          return {
            success: openaiResult.success,
            recordsProcessed: openaiResult.recordsProcessed,
            recordsCreated: openaiResult.recordsCreated,
            recordsUpdated: openaiResult.recordsUpdated,
            recordsDeleted: openaiResult.recordsDeleted,
            errors: openaiResult.errors,
          };
        }

        case 'claude': {
          const claudeResult = await AIServiceIntegrations.syncClaudeData(
            integration.id,
            credentials
          );
          return {
            success: claudeResult.success,
            recordsProcessed: claudeResult.recordsProcessed,
            recordsCreated: claudeResult.recordsCreated,
            recordsUpdated: claudeResult.recordsUpdated,
            recordsDeleted: claudeResult.recordsDeleted,
            errors: claudeResult.errors,
          };
        }

        default:
          return {
            success: false,
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0,
            errors: ['Unsupported platform'],
          };
      }
    } catch (error) {
      return {
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private getSyncInterval(frequency: SyncFrequency): number {
    switch (frequency) {
      case 'realtime':
        return 30 * 1000; // 30 seconds
      case 'hourly':
        return 60 * 60 * 1000; // 1 hour
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'manual':
        return Infinity; // Never auto-sync
      default:
        return 60 * 60 * 1000; // Default to hourly
    }
  }

  private getRateLimit(operation: string): number {
    const limits = {
      api_call: 100,
      data_sync: 10,
      webhook: 1000,
      test_connection: 5,
    };

    return limits[operation as keyof typeof limits] || 50;
  }

  private generateHealthRecommendations(checks: any[]): string[] {
    const recommendations: string[] = [];

    const failedChecks = checks.filter((check) => !check.success);

    if (failedChecks.some((check) => check.check === 'connection')) {
      recommendations.push('Check your API credentials and network connectivity');
    }

    if (failedChecks.some((check) => check.check === 'error_rate')) {
      recommendations.push('Review recent error logs and consider adjusting retry settings');
    }

    if (failedChecks.some((check) => check.check === 'sync_status')) {
      recommendations.push('Enable automatic syncing or perform a manual sync');
    }

    if (recommendations.length === 0) {
      recommendations.push('Integration is healthy - no action required');
    }

    return recommendations;
  }

  private async logIntegrationActivity(
    integrationId: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await db.addIntegrationLog({
        integration_id: integrationId,
        level,
        message,
        metadata,
      });
    } catch (error) {
      console.error('Failed to log integration activity:', error);
    }
  }
}

// Rate limit tracker class
class RateLimitTracker {
  requests: number[] = [];
}

// Export singleton instance
export const integrationService = IntegrationService.getInstance();
