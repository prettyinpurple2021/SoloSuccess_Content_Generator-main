import { z } from 'zod';
import type { ApiRequest, ApiResponse } from '../types';
import { db } from '../../../services/databaseService';
import { enhancedDb } from '../../../services/enhancedDatabaseService';
import { apiErrorHandler, commonSchemas } from '../../../services/apiErrorHandler';
import { errorHandler } from '../../../services/errorHandlingService';

// DatabaseBrandVoice shape
const createSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  tone: z.string().default(''),
  vocabulary: z.array(z.string()).default([]),
  writing_style: z.string().default(''),
  target_audience: z.string().default(''),
  sample_content: z.array(z.string()).default([]),
});

async function brandVoicesHandler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context = {
    endpoint: '/api/brand-voices',
    operation: req.method?.toLowerCase(),
    userId: req.query.userId as string,
  };

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
      const items = await db.getBrandVoices(userId);
      return res.status(200).json(items);
    } catch (error) {
      // Enhanced error handling with graceful degradation
      const healthStatus = await enhancedDb.getHealthStatus();

      if (!healthStatus.isHealthy) {
        errorHandler.logError(
          'Database unhealthy during brand voices retrieval, attempting graceful degradation',
          error instanceof Error ? error : new Error(String(error)),
          { ...context, healthStatus },
          'warn'
        );

        // Return empty array with warning header for graceful degradation
        res.setHeader('X-Service-Degraded', 'true');
        res.setHeader('X-Degradation-Reason', 'database-unavailable');
        return res.status(200).json([]);
      }

      throw error;
    }
  }

  if (req.method === 'POST') {
    const data = apiErrorHandler.validateBody(req.body, createSchema, context);

    // Sanitize input data
    const sanitizedData = apiErrorHandler.sanitizeInput(data);

    try {
      const created = await db.addBrandVoice(
        {
          name: sanitizedData.name,
          tone: sanitizedData.tone,
          vocabulary: sanitizedData.vocabulary,
          writing_style: sanitizedData.writing_style,
          target_audience: sanitizedData.target_audience,
          sample_content: sanitizedData.sample_content,
        },
        sanitizedData.userId
      );

      return res.status(201).json(created);
    } catch (error) {
      // Enhanced error handling for brand voice creation
      if (error instanceof Error && error.message.includes('name is required')) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Brand voice name is required',
          timestamp: new Date(),
        });
      }

      if (error instanceof Error && error.message.includes('maximum length')) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Brand voice name exceeds maximum length',
          timestamp: new Date(),
        });
      }

      throw error;
    }
  }

  if (req.method === 'PUT' && id) {
    const updateSchema = createSchema.partial().extend({ userId: commonSchemas.userId });
    const data = apiErrorHandler.validateBody(req.body, updateSchema, context);

    // Sanitize input data
    const sanitizedData = apiErrorHandler.sanitizeInput(data);

    try {
      const updated = await db.updateBrandVoice(
        id,
        {
          name: sanitizedData.name,
          tone: sanitizedData.tone,
          vocabulary: sanitizedData.vocabulary,
          writing_style: sanitizedData.writing_style,
          target_audience: sanitizedData.target_audience,
          sample_content: sanitizedData.sample_content,
        },
        sanitizedData.userId
      );

      return res.status(200).json(updated);
    } catch (error) {
      // Enhanced error handling for brand voice updates
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Brand voice not found or access denied',
          timestamp: new Date(),
        });
      }

      throw error;
    }
  }

  if (req.method === 'DELETE' && id) {
    const { userId } = apiErrorHandler.validateBody(
      req.body || {},
      z.object({ userId: commonSchemas.userId }),
      context
    );

    try {
      await db.deleteBrandVoice(id, userId);
      return res.status(204).end();
    } catch (error) {
      // Enhanced error handling for brand voice deletion
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Brand voice not found or access denied',
          timestamp: new Date(),
        });
      }

      if (error instanceof Error && error.message.includes('constraint')) {
        return res.status(409).json({
          error: 'Constraint Violation',
          message: 'Cannot delete brand voice due to existing references',
          details: error.message,
          timestamp: new Date(),
        });
      }

      throw error;
    }
  }

  // Handle method not allowed
  apiErrorHandler.handleMethodNotAllowed(req, res, ['GET', 'POST', 'PUT', 'DELETE']);
}

// Export wrapped handler
export default apiErrorHandler.wrapHandler(brandVoicesHandler, '/api/brand-voices');
