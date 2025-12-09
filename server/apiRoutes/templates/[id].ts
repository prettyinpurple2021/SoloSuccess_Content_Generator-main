import type { ApiRequest, ApiResponse } from '../types';
import { z } from 'zod';
import { query } from '../../../services/databaseService';
import { apiErrorHandler } from '../../../services/apiErrorHandler';
import { errorHandler, ErrorContext } from '../../../services/errorHandlingService';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Add security headers
  apiErrorHandler.addSecurityHeaders(res);

  const context: ErrorContext = {
    endpoint: '/api/templates/:id',
    operation: req.method?.toLowerCase(),
  };

  try {
    const id = z
      .string()
      .min(1)
      .parse(req.query.id as string);

    if (req.method === 'PUT') {
      const body = z
        .object({
          userId: z.string().min(1),
          name: z.string().optional(),
          category: z.string().optional(),
          industry: z.string().optional(),
          content_type: z.string().optional(),
          structure: z.array(z.any()).optional(),
          customizable_fields: z.array(z.any()).optional(),
          is_public: z.boolean().optional(),
        })
        .parse(req.body || {});

      const result = await query(
        `UPDATE content_templates SET
           name = COALESCE($1, name),
           category = COALESCE($2, category),
           industry = COALESCE($3, industry),
           content_type = COALESCE($4, content_type),
           structure = COALESCE($5, structure),
           customizable_fields = COALESCE($6, customizable_fields),
           is_public = COALESCE($7, is_public)
         WHERE id = $8 AND user_id = $9
         RETURNING *`,
        [
          body.name ?? null,
          body.category ?? null,
          body.industry ?? null,
          body.content_type ?? null,
          body.structure ? JSON.stringify(body.structure) : null,
          body.customizable_fields ? JSON.stringify(body.customizable_fields) : null,
          typeof body.is_public === 'boolean' ? body.is_public : null,
          id,
          body.userId,
        ]
      );
      if (!result[0]) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(result[0]);
    }

    if (req.method === 'DELETE') {
      const body = z.object({ userId: z.string().min(1) }).parse(req.body || {});
      const result = await query(
        `DELETE FROM content_templates WHERE id = $1 AND user_id = $2 RETURNING id`,
        [id, body.userId]
      );
      if (!result[0]) return res.status(404).json({ error: 'Not found' });
      return res.status(204).end();
    }

    return apiErrorHandler.handleMethodNotAllowed(req, res, ['PUT', 'DELETE']);
  } catch (error) {
    errorHandler.handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      res
    );
  }
}
