import type { ApiRequest, ApiResponse } from '../types';
import { z } from 'zod';
import { db } from '../../../services/databaseService';
import { apiErrorHandler } from '../../../services/apiErrorHandler';
import { errorHandler, ErrorContext } from '../../../services/errorHandlingService';

const createSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  theme: z.string().default(''),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  platforms: z.array(z.string()).default([]),
  status: z.enum(['draft', 'active', 'completed', 'paused']).default('draft'),
  performance: z.any().optional(),
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context: ErrorContext = {
    endpoint: '/api/campaigns',
    operation: req.method?.toLowerCase(),
  };

  try {
    const id = req.query.id
      ? z
          .string()
          .min(1)
          .parse(req.query.id as string)
      : undefined;
    if (req.method === 'GET') {
      const userId = z
        .string()
        .min(1)
        .parse(req.query.userId as string);
      const campaigns = await db.getCampaigns(userId);
      return res.status(200).json(campaigns);
    }

    if (req.method === 'POST') {
      const data = createSchema.parse(req.body);
      const created = await db.addCampaign(
        {
          name: data.name,
          description: data.description,
          theme: data.theme,
          start_date: data.start_date,
          end_date: data.end_date,
          platforms: data.platforms,
          status: data.status,
          performance: data.performance || {
            totalPosts: 0,
            totalEngagement: 0,
            avgEngagementRate: 0,
            platformPerformance: {},
          },
        },
        data.userId
      );
      return res.status(201).json(created);
    }

    if (req.method === 'PUT' && id) {
      const updateSchema = createSchema.partial().extend({ userId: z.string().min(1) });
      const data = updateSchema.parse(req.body);
      const updated = await db.updateCampaign(
        id,
        {
          name: data.name,
          description: data.description,
          theme: data.theme,
          start_date: data.start_date,
          end_date: data.end_date,
          platforms: data.platforms,
          status: data.status,
          performance: data.performance,
        },
        data.userId
      );
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE' && id) {
      const { userId } = z.object({ userId: z.string().min(1) }).parse(req.body || {});
      await db.deleteCampaign(id, userId);
      return res.status(204).end();
    }

    return apiErrorHandler.handleMethodNotAllowed(req, res, ['GET', 'POST', 'PUT', 'DELETE']);
  } catch (error: unknown) {
    errorHandler.handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      res
    );
  }
}
