import { z } from 'zod';
import type { ApiRequest, ApiResponse } from '../types';
import { db } from '../../../services/databaseService';
import { enhancedDb } from '../../../services/enhancedDatabaseService';
import { apiErrorHandler, commonSchemas } from '../../../services/apiErrorHandler';
import { errorHandler } from '../../../services/errorHandlingService';
import { databaseErrorHandler } from '../../../services/databaseErrorHandler';

// Minimal API Request/Response types to avoid external deps

const createPostSchema = z.object({
  userId: z.string().min(1),
  content: z.string().min(1),
  // Align with DatabasePost: use schedule_date (ISO string) if provided
  schedule_date: z.string().optional(),
  // Optional mapped fields from our types
  topic: z.string().optional(),
  idea: z.string().optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string().optional(),
  headlines: z.array(z.string()).optional(),
  social_media_posts: z.record(z.any()).optional(),
  social_media_tones: z.record(z.any()).optional(),
  social_media_audiences: z.record(z.any()).optional(),
  selected_image: z.string().optional(),
  brand_voice_id: z.string().optional(),
  audience_profile_id: z.string().optional(),
  campaign_id: z.string().optional(),
  series_id: z.string().optional(),
  template_id: z.string().optional(),
  performance_score: z.number().optional(),
  optimization_suggestions: z.array(z.any()).optional(),
  image_style_id: z.string().optional(),
});

async function postsHandler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context = {
    endpoint: '/api/posts',
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
      const posts = await db.getPosts(userId);
      return res.status(200).json(posts);
    } catch (error) {
      // Enhanced error handling with graceful degradation
      const healthStatus = await enhancedDb.getHealthStatus();

      if (!healthStatus.isHealthy) {
        errorHandler.logError(
          'Database unhealthy during posts retrieval, attempting graceful degradation',
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
    const data = apiErrorHandler.validateBody(req.body, createPostSchema, context);

    // Sanitize input data
    const sanitizedData = apiErrorHandler.sanitizeInput(data);

    try {
      const created = await db.addPost(
        {
          topic: sanitizedData.topic || null,
          idea: sanitizedData.idea || null,
          content: sanitizedData.content,
          status: (sanitizedData.status as any) || null,
          tags: sanitizedData.tags || null,
          summary: sanitizedData.summary || null,
          headlines: sanitizedData.headlines || null,
          social_media_posts: (sanitizedData.social_media_posts as any) || null,
          social_media_tones: (sanitizedData.social_media_tones as any) || null,
          social_media_audiences: (sanitizedData.social_media_audiences as any) || null,
          selected_image: sanitizedData.selected_image || null,
          schedule_date: sanitizedData.schedule_date || null,
          brand_voice_id: sanitizedData.brand_voice_id || null,
          audience_profile_id: sanitizedData.audience_profile_id || null,
          campaign_id: sanitizedData.campaign_id || null,
          series_id: sanitizedData.series_id || null,
          template_id: sanitizedData.template_id || null,
          performance_score: sanitizedData.performance_score || null,
          optimization_suggestions: (sanitizedData.optimization_suggestions as any) || null,
          image_style_id: sanitizedData.image_style_id || null,
        } as any,
        sanitizedData.userId
      );

      return res.status(201).json(created);
    } catch (error) {
      // Enhanced error handling for post creation
      if (error instanceof Error && error.message.includes('validation')) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid post data provided',
          details: error.message,
          timestamp: new Date(),
        });
      }

      if (error instanceof Error && error.message.includes('constraint')) {
        return res.status(409).json({
          error: 'Constraint Violation',
          message: 'Post data violates database constraints',
          details: error.message,
          timestamp: new Date(),
        });
      }

      throw error;
    }
  }

  if (req.method === 'PUT' && id) {
    const updatePostSchema = createPostSchema.partial().extend({ userId: commonSchemas.userId });
    const data = apiErrorHandler.validateBody(req.body, updatePostSchema, context);

    // Sanitize input data
    const sanitizedData = apiErrorHandler.sanitizeInput(data);

    try {
      const updated = await db.updatePost(
        id,
        {
          topic: sanitizedData.topic,
          idea: sanitizedData.idea,
          content: sanitizedData.content,
          status: sanitizedData.status as any,
          tags: sanitizedData.tags,
          summary: sanitizedData.summary,
          headlines: sanitizedData.headlines,
          social_media_posts: sanitizedData.social_media_posts as any,
          social_media_tones: sanitizedData.social_media_tones as any,
          social_media_audiences: sanitizedData.social_media_audiences as any,
          selected_image: sanitizedData.selected_image,
          schedule_date: sanitizedData.schedule_date ?? null,
          brand_voice_id: sanitizedData.brand_voice_id,
          audience_profile_id: sanitizedData.audience_profile_id,
          campaign_id: sanitizedData.campaign_id,
          series_id: sanitizedData.series_id,
          template_id: sanitizedData.template_id,
          performance_score: sanitizedData.performance_score,
          optimization_suggestions: sanitizedData.optimization_suggestions as any,
          image_style_id: sanitizedData.image_style_id,
        } as any,
        sanitizedData.userId
      );

      return res.status(200).json(updated);
    } catch (error) {
      // Enhanced error handling for post updates
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Post not found or access denied',
          timestamp: new Date(),
        });
      }

      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to update this post',
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
      await db.deletePost(id, userId);
      return res.status(204).end();
    } catch (error) {
      // Enhanced error handling for post deletion
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Post not found or access denied',
          timestamp: new Date(),
        });
      }

      if (error instanceof Error && error.message.includes('constraint')) {
        return res.status(409).json({
          error: 'Constraint Violation',
          message: 'Cannot delete post due to existing references',
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
export default apiErrorHandler.wrapHandler(postsHandler, '/api/posts');
