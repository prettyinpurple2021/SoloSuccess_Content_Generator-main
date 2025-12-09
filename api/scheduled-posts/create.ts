import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';
import { contentAdaptationService } from '../../services/contentAdaptationService';
import { z } from 'zod';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable');
}

const pool = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  max: 20,
  idle_timeout: 30,
  connect_timeout: 2,
});

const schedulePayloadSchema = z.object({
  userId: z.string().min(1),
  postId: z.string().uuid().optional(),
  content: z.string().min(1),
  platforms: z
    .array(
      z.enum([
        'twitter',
        'linkedin',
        'facebook',
        'instagram',
        'bluesky',
        'reddit',
        'pinterest',
        'blogger',
      ])
    )
    .min(1),
  scheduleDate: z.string(), // ISO 8601
  mediaUrls: z.array(z.string()).optional(),
  options: z
    .object({
      tone: z.enum(['professional', 'casual', 'friendly', 'authoritative']).optional(),
      includeCallToAction: z.boolean().optional(),
      targetAudience: z.string().optional(),
    })
    .optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const parsed = schedulePayloadSchema.parse(body);

    // Adapt content per platform
    const adaptations = await contentAdaptationService.adaptContentForMultiplePlatforms(
      parsed.content,
      parsed.platforms,
      {
        tone: parsed.options?.tone,
        includeCallToAction: parsed.options?.includeCallToAction,
        targetAudience: parsed.options?.targetAudience,
      }
    );

    const idempotencyBase = `${parsed.userId}:${parsed.postId || 'ad-hoc'}:${parsed.scheduleDate}`;
    const now = new Date().toISOString();
    const jobsToProcessNow: string[] = [];

    // Create jobs
    for (const platform of parsed.platforms) {
      const job = {
        user_id: parsed.userId,
        post_id: parsed.postId || null,
        platform,
        run_at: parsed.scheduleDate,
        status: 'pending' as const,
        attempts: 0,
        max_attempts: 5,
        idempotency_key: `${idempotencyBase}:${platform}`,
        content: adaptations[platform]?.content || parsed.content,
        media_urls: parsed.mediaUrls || [],
        payload: {},
      };

      await pool`
        INSERT INTO post_jobs (
          user_id, post_id, platform, run_at, status, attempts, max_attempts,
          idempotency_key, content, media_urls, payload
        ) VALUES (
          ${job.user_id}, ${job.post_id}, ${job.platform}, ${job.run_at}, ${job.status},
          ${job.attempts}, ${job.max_attempts}, ${job.idempotency_key}, ${job.content},
          ${job.media_urls}, ${JSON.stringify(job.payload)}
        )
        ON CONFLICT (idempotency_key) DO NOTHING
      `;

      // If scheduled for now or in the past, process immediately
      if (job.run_at <= now) {
        jobsToProcessNow.push(job.idempotency_key);
      }
    }

    // Process jobs that are due now immediately (non-blocking)
    // Note: We'll let the client-side check handle this, or you can call the process endpoint directly
    // For now, we'll just return a flag indicating immediate processing is needed

    return res.status(200).json({
      success: true,
      message: `Scheduled ${parsed.platforms.length} post jobs`,
      processImmediately: jobsToProcessNow.length > 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error creating scheduled posts:', error);
    return res.status(500).json({
      error: 'Failed to schedule posts',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  // Note: Do NOT call pool.end() in serverless environments
  // The connection pool should be reused across invocations
  // Vercel will manage the lifecycle automatically
}
