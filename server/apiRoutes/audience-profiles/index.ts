import type { ApiRequest, ApiResponse } from '../types';
import { z } from 'zod';
import { db } from '../../../services/databaseService';
import { apiErrorHandler } from '../../../services/apiErrorHandler';
import { errorHandler, ErrorContext } from '../../../services/errorHandlingService';

// Shape must match DatabaseAudienceProfile (see types.ts)
const createSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  age_range: z.string().default(''),
  industry: z.string().default(''),
  interests: z.array(z.string()).default([]),
  pain_points: z.array(z.string()).default([]),
  preferred_content_types: z.array(z.string()).default([]),
  engagement_patterns: z.record(z.any()).default({}),
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context: ErrorContext = {
    endpoint: '/api/audience-profiles',
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
      const items = await db.getAudienceProfiles(userId);
      return res.status(200).json(items);
    }

    if (req.method === 'POST') {
      const data = createSchema.parse(req.body);
      const created = await db.addAudienceProfile(
        {
          name: data.name,
          age_range: data.age_range,
          industry: data.industry,
          interests: data.interests,
          pain_points: data.pain_points,
          preferred_content_types: data.preferred_content_types,
          engagement_patterns: data.engagement_patterns,
        },
        data.userId
      );
      return res.status(201).json(created);
    }

    if (req.method === 'PUT' && id) {
      const updateSchema = createSchema.partial().extend({ userId: z.string().min(1) });
      const data = updateSchema.parse(req.body);
      const updated = await db.updateAudienceProfile(
        id,
        {
          name: data.name,
          age_range: data.age_range,
          industry: data.industry,
          interests: data.interests,
          pain_points: data.pain_points,
          preferred_content_types: data.preferred_content_types,
          engagement_patterns: data.engagement_patterns,
        },
        data.userId
      );
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE' && id) {
      const { userId } = z.object({ userId: z.string().min(1) }).parse(req.body || {});
      await db.deleteAudienceProfile(id, userId);
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
