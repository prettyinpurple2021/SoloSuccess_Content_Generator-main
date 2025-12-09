import { WebhookConfig, IntegrationWebhook, WebhookEvent, WebhookDelivery } from '../types';
import { db } from './neonService';
import { query } from './databaseService';
import crypto from 'crypto';

export class WebhookService {
  private webhooks: Map<string, IntegrationWebhook> = new Map();

  /**
   * Create a new webhook for an integration
   */
  async createWebhook(
    integrationId: string,
    webhookConfig: WebhookConfig
  ): Promise<IntegrationWebhook> {
    try {
      // Validate webhook configuration
      this.validateWebhookConfig(webhookConfig);

      // Generate webhook secret if not provided
      const secret = webhookConfig.secret || this.generateSecret();

      const webhook: IntegrationWebhook = {
        id: crypto.randomUUID(),
        integrationId,
        url: webhookConfig.url,
        secret,
        events: webhookConfig.events || [],
        isActive: webhookConfig.isActive !== false,
        retryPolicy: {
          maxRetries: webhookConfig.retryPolicy?.maxRetries || 3,
          retryDelay: webhookConfig.retryPolicy?.retryDelay,
          backoffMultiplier: webhookConfig.retryPolicy?.backoffMultiplier || 2,
          initialDelay: webhookConfig.retryPolicy?.initialDelay || 1000,
          maxDelay: webhookConfig.retryPolicy?.maxDelay || 30000,
        },
        headers: webhookConfig.headers || {},
        timeout: webhookConfig.timeout || 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      await db.addIntegrationWebhook(webhook);

      // Store in memory for quick access
      this.webhooks.set(webhook.id, webhook);

      return webhook;
    } catch (error) {
      console.error('Error creating webhook:', error);
      throw new Error(
        `Failed to create webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook(
    webhookId: string,
    updates: Partial<WebhookConfig>
  ): Promise<IntegrationWebhook> {
    try {
      const existingWebhook = this.webhooks.get(webhookId);
      if (!existingWebhook) {
        throw new Error('Webhook not found');
      }

      // Validate updated configuration
      const updatedConfig = { ...existingWebhook, ...updates };
      this.validateWebhookConfig(updatedConfig);

      const updatedWebhook: IntegrationWebhook = {
        ...existingWebhook,
        ...updates,
        updatedAt: new Date(),
      };

      // Update in database
      await db.updateIntegrationWebhook(webhookId, updatedWebhook);

      // Update in memory
      this.webhooks.set(webhookId, updatedWebhook);

      return updatedWebhook;
    } catch (error) {
      console.error('Error updating webhook:', error);
      throw new Error(
        `Failed to update webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      // Remove from database
      await db.deleteIntegrationWebhook(webhookId);

      // Remove from memory
      this.webhooks.delete(webhookId);
    } catch (error) {
      console.error('Error deleting webhook:', error);
      throw new Error(
        `Failed to delete webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all webhooks for an integration
   */
  async getWebhooksForIntegration(integrationId: string): Promise<IntegrationWebhook[]> {
    try {
      const webhooks = await db.getIntegrationWebhooks(integrationId);

      // Update memory cache
      webhooks.forEach((webhook) => {
        this.webhooks.set(webhook.id, webhook);
      });

      return webhooks;
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      throw new Error(
        `Failed to fetch webhooks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Deliver a webhook event
   */
  async deliverWebhook(
    webhookId: string,
    event: WebhookEvent,
    payload: any
  ): Promise<WebhookDelivery> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || !webhook.isActive) {
      throw new Error('Webhook not found or inactive');
    }

    const delivery: WebhookDelivery = {
      id: crypto.randomUUID(),
      webhookId,
      event,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: webhook.retryPolicy.maxRetries,
      nextRetryAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Attempt delivery
    return await this.attemptDelivery(webhook, delivery);
  }

  /**
   * Attempt to deliver a webhook
   */
  private async attemptDelivery(
    webhook: IntegrationWebhook,
    delivery: WebhookDelivery
  ): Promise<WebhookDelivery> {
    try {
      delivery.attempts += 1;
      delivery.status = 'delivering';
      delivery.updatedAt = new Date();

      // Create signature
      const signature = this.createSignature(webhook.secret, delivery.payload);

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': delivery.event,
        'X-Webhook-Signature': signature,
        'X-Webhook-Delivery-ID': delivery.id,
        'X-Webhook-Timestamp': delivery.createdAt.getTime().toString(),
        ...webhook.headers,
      };

      // Make HTTP request
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(delivery.payload),
        signal: AbortSignal.timeout(webhook.timeout || 30000),
      });

      if (response.ok) {
        delivery.status = 'delivered';
        delivery.responseStatus = response.status;
        delivery.responseHeaders = Object.fromEntries(response.headers.entries());
        delivery.deliveredAt = new Date();
      } else {
        delivery.status = 'failed';
        delivery.responseStatus = response.status;
        delivery.responseHeaders = Object.fromEntries(response.headers.entries());
        delivery.error = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      delivery.status = 'failed';
      delivery.error = error instanceof Error ? error.message : 'Unknown error';
    }

    delivery.updatedAt = new Date();

    // Schedule retry if needed
    if (delivery.status === 'failed' && delivery.attempts < delivery.maxAttempts) {
      const retryDelay =
        (webhook.retryPolicy.retryDelay ?? webhook.retryPolicy.initialDelay) *
        Math.pow(webhook.retryPolicy.backoffMultiplier, delivery.attempts - 1);
      delivery.nextRetryAt = new Date(Date.now() + retryDelay);
      delivery.status = 'pending';
    }

    // Save delivery attempt
    await this.saveDeliveryAttempt(delivery);

    return delivery;
  }

  /**
   * Process pending webhook deliveries
   */
  async processPendingDeliveries(): Promise<void> {
    try {
      const pendingDeliveries = await this.getPendingDeliveries();

      for (const delivery of pendingDeliveries) {
        if (new Date() >= delivery.nextRetryAt) {
          const webhook = this.webhooks.get(delivery.webhookId);
          if (webhook) {
            await this.attemptDelivery(webhook, delivery);
          }
        }
      }
    } catch (error) {
      console.error('Error processing pending deliveries:', error);
    }
  }

  /**
   * Create webhook signature for verification
   */
  private createSignature(secret: string, payload: any): string {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(secret: string, payload: any, signature: string): boolean {
    const expectedSignature = this.createSignature(secret, payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate a secure random secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate webhook configuration
   */
  private validateWebhookConfig(config: WebhookConfig): void {
    if (!config.url) {
      throw new Error('Webhook URL is required');
    }

    try {
      new URL(config.url);
    } catch {
      throw new Error('Invalid webhook URL');
    }

    if (config.events && !Array.isArray(config.events)) {
      throw new Error('Events must be an array');
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      throw new Error('Timeout must be between 1 and 300 seconds');
    }
  }

  /**
   * Get pending webhook deliveries
   */
  private async getPendingDeliveries(): Promise<WebhookDelivery[]> {
    try {
      // Query database for pending deliveries
      const result = await query(
        `
        SELECT * FROM webhook_deliveries 
        WHERE status = 'pending' 
        AND next_retry_at < NOW()
        ORDER BY created_at ASC
      `
      );

      return result.map(this.transformDatabaseDeliveryToDelivery);
    } catch (error) {
      console.error('Error fetching pending deliveries:', error);
      return [];
    }
  }

  /**
   * Save webhook delivery attempt
   */
  private async saveDeliveryAttempt(delivery: WebhookDelivery): Promise<void> {
    try {
      const deliveryData = {
        id: delivery.id,
        webhook_id: delivery.webhookId,
        event: delivery.event,
        payload: delivery.payload,
        status: delivery.status,
        attempts: delivery.attempts,
        max_attempts: delivery.maxAttempts,
        next_retry_at: delivery.nextRetryAt.toISOString(),
        delivered_at: delivery.deliveredAt?.toISOString(),
        response_status: delivery.responseStatus,
        response_headers: delivery.responseHeaders,
        error: delivery.error,
        created_at: delivery.createdAt.toISOString(),
        updated_at: delivery.updatedAt.toISOString(),
      };

      await query(
        `
        INSERT INTO webhook_deliveries (
          id, webhook_id, event, payload, response_headers, status, 
          response_status, error, attempts, max_attempts,
          next_retry_at, delivered_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          response_status = EXCLUDED.response_status,
          error = EXCLUDED.error,
          attempts = EXCLUDED.attempts,
          next_retry_at = EXCLUDED.next_retry_at,
          delivered_at = EXCLUDED.delivered_at,
          updated_at = EXCLUDED.updated_at
      `,
        [
          deliveryData.id,
          deliveryData.webhook_id,
          deliveryData.event,
          JSON.stringify(deliveryData.payload),
          JSON.stringify(deliveryData.response_headers),
          deliveryData.status,
          deliveryData.response_status,
          deliveryData.error,
          deliveryData.attempts,
          deliveryData.max_attempts,
          deliveryData.next_retry_at,
          deliveryData.delivered_at,
          deliveryData.created_at,
          deliveryData.updated_at,
        ]
      );
    } catch (error) {
      console.error('Error saving delivery attempt:', error);
    }
  }

  /**
   * Transform database delivery to WebhookDelivery
   */
  private transformDatabaseDeliveryToDelivery(data: any): WebhookDelivery {
    return {
      id: data.id,
      webhookId: data.webhook_id,
      event: data.event,
      payload: data.payload,
      status: data.status,
      attempts: data.attempts,
      maxAttempts: data.max_attempts,
      nextRetryAt: new Date(data.next_retry_at),
      deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
      responseStatus: data.response_status,
      responseHeaders: data.response_headers,
      error: data.error,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const webhook = this.webhooks.get(webhookId);
      if (!webhook) {
        throw new Error('Webhook not found');
      }

      const testPayload = {
        event: 'post_created',
        timestamp: new Date().toISOString(),
        message: 'This is a test webhook delivery',
      };

      const delivery = await this.deliverWebhook(webhookId, 'post_created', testPayload);

      return {
        success: delivery.status === 'delivered',
        error: delivery.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get webhook delivery statistics
   */
  async getWebhookStats(
    webhookId: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageResponseTime: number;
    successRate: number;
  }> {
    try {
      // Calculate time range in milliseconds
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };

      const startTime = new Date(Date.now() - timeRanges[timeRange]);

      // Query actual webhook deliveries from database
      const result = await query(
        `
        SELECT * FROM webhook_deliveries 
        WHERE webhook_id = $1 
        AND created_at >= $2
      `,
        [webhookId, startTime.toISOString()]
      );

      const deliveries = result || [];
      const totalDeliveries = deliveries.length;
      const successfulDeliveries = deliveries.filter((d) => d.status === 'delivered').length;
      const failedDeliveries = deliveries.filter((d) => d.status === 'failed').length;

      // Calculate average response time from successful deliveries
      const responseTimes = deliveries
        .filter((d) => d.status === 'delivered' && d.delivered_at && d.created_at)
        .map((d) => new Date(d.delivered_at!).getTime() - new Date(d.created_at).getTime());

      const averageResponseTime =
        responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0;

      const successRate =
        totalDeliveries > 0 ? Math.round((successfulDeliveries / totalDeliveries) * 100) : 0;

      return {
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        averageResponseTime,
        successRate,
      };
    } catch (error) {
      console.error('Error calculating webhook stats:', error);
      // Return zeros on error instead of mock data
      return {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        averageResponseTime: 0,
        successRate: 0,
      };
    }
  }
}

export const webhookService = new WebhookService();
