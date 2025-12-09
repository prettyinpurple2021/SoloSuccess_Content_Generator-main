import { z } from 'zod';
import type { ApiRequest, ApiResponse } from '../types';
import { db } from '../../../services/databaseService';
import { enhancedDb } from '../../../services/enhancedDatabaseService';
import { integrationService } from '../../../services/integrationService';
import { apiErrorHandler, commonSchemas } from '../../../services/apiErrorHandler';
import { errorHandler } from '../../../services/errorHandlingService';
import { databaseErrorHandler } from '../../../services/databaseErrorHandler';

const createIntegrationSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['social_media', 'analytics', 'ai_service', 'crm', 'email', 'storage']),
  platform: z.string().min(1),
  credentials: z.record(z.any()),
  configuration: z.record(z.any()).optional(),
  syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly', 'manual']).optional(),
});

const updateIntegrationSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).optional(),
  configuration: z.record(z.any()).optional(),
  syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly', 'manual']).optional(),
  isActive: z.boolean().optional(),
});

async function integrationsHandler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context = {
    endpoint: '/api/integrations',
    operation: req.method?.toLowerCase(),
    userId: req.query.userId as string,
  };

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate and sanitize query parameters
  const id = req.query.id
    ? apiErrorHandler.validateQuery(
        { id: req.query.id },
        z.object({ id: commonSchemas.id }),
        context
      ).id
    : undefined;

  if (req.method === 'GET') {
    const { userId } = apiErrorHandler.validateQuery(
      req.query,
      z.object({ userId: commonSchemas.userId }),
      context
    );

    try {
      if (id) {
        // Get single integration
        const integrations = await db.getIntegrations(userId);
        const integration = integrations.find((i) => i.id === id);
        if (!integration || integration.userId !== userId) {
          return res.status(404).json({ error: 'Integration not found' });
        }
        return res.status(200).json(integration);
      } else {
        // Get all integrations for user
        const integrations = await db.getIntegrations(userId);
        return res.status(200).json(integrations);
      }
    } catch (error) {
      const healthStatus = await enhancedDb.getHealthStatus();
      if (!healthStatus.isHealthy) {
        return res.status(503).json({
          error: 'Database temporarily unavailable',
          details: 'Service degraded',
        });
      }
      errorHandler.logError(
        'Failed to fetch integrations',
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      return res.status(500).json({ error: 'Failed to fetch integrations' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const validated = createIntegrationSchema.parse(body);

      const service = integrationService;
      const integration = await service.createIntegration(
        {
          name: validated.name,
          type: validated.type,
          platform: validated.platform,
          credentials: validated.credentials,
          configuration: validated.configuration,
          syncFrequency: validated.syncFrequency,
        },
        validated.userId
      );

      return res.status(201).json(integration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      errorHandler.logError(
        'Failed to create integration',
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      return res.status(500).json({ error: 'Failed to create integration' });
    }
  }

  if (req.method === 'PUT') {
    if (!id) {
      return res.status(400).json({ error: 'Integration ID is required' });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const validated = updateIntegrationSchema.parse(body);

      const service = integrationService;
      const integration = await service.updateIntegration(
        id,
        {
          name: validated.name,
          configuration: validated.configuration,
          syncFrequency: validated.syncFrequency,
          isActive: validated.isActive,
        },
        validated.userId
      );

      return res.status(200).json(integration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      errorHandler.logError(
        'Failed to update integration',
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      return res.status(500).json({ error: 'Failed to update integration' });
    }
  }

  if (req.method === 'DELETE') {
    if (!id) {
      return res.status(400).json({ error: 'Integration ID is required' });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { userId } = apiErrorHandler.validateQuery(
        { userId: body.userId || req.query.userId },
        z.object({ userId: commonSchemas.userId }),
        context
      );

      const service = integrationService;
      await service.deleteIntegration(id, userId);

      return res.status(200).json({ success: true });
    } catch (error) {
      errorHandler.logError(
        'Failed to delete integration',
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      return res.status(500).json({ error: 'Failed to delete integration' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default integrationsHandler;
