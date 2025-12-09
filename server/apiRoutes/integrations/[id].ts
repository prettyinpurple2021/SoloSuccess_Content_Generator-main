import { z } from 'zod';
import type { ApiRequest, ApiResponse } from '../types';
import { integrationService } from '../../../services/integrationService';
import { apiErrorHandler, commonSchemas } from '../../../services/apiErrorHandler';
import { errorHandler } from '../../../services/errorHandlingService';

async function integrationDetailHandler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const context = {
    endpoint: '/api/integrations/:id',
    operation: req.method?.toLowerCase(),
  };

  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: 'Integration ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const service = integrationService;
      const integration = await service.getIntegrationById(id);
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      return res.status(200).json(integration);
    } catch (error) {
      errorHandler.logError(
        'Failed to fetch integration',
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      return res.status(500).json({ error: 'Failed to fetch integration' });
    }
  }

  if (req.method === 'POST') {
    // Handle test connection, sync, connect, disconnect, etc.
    const action = req.query.action as string;
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { userId } = apiErrorHandler.validateQuery(
      { userId: body.userId || req.query.userId },
      z.object({ userId: commonSchemas.userId }),
      context
    );

    try {
      const service = integrationService;

      if (action === 'test') {
        const result = await service.testConnection(id);
        return res.status(200).json(result);
      }

      if (action === 'sync') {
        const result = await service.syncIntegration(id);
        return res.status(200).json(result);
      }

      if (action === 'connect') {
        const success = await service.connectIntegration(id, userId);
        return res.status(200).json({ success });
      }

      if (action === 'disconnect') {
        await service.disconnectIntegration(id, userId);
        return res.status(200).json({ success: true });
      }

      if (action === 'health') {
        const result = await service.checkIntegrationHealth(id);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      errorHandler.logError(
        'Failed to process integration action',
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      return res.status(500).json({ error: 'Failed to process action' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default integrationDetailHandler;
