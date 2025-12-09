import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';
import { db } from '../../services/neonService';
import { integrationService } from '../../services/integrationService';
import { integrationOrchestrator } from '../../services/integrationOrchestrator';

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

interface PostJob {
  id: string;
  user_id: string;
  post_id: string | null;
  platform: string;
  run_at: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  idempotency_key: string;
  content: string;
  media_urls: string[];
  payload: Record<string, any>;
  error: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // This endpoint is now on-demand only (no cron)
  // It can be called from the client when needed
  // Optional: Add a simple check to prevent abuse (e.g., rate limiting)

  try {
    const now = new Date().toISOString();

    // Get all pending jobs that are due
    const dueJobs = await pool<PostJob[]>`
      SELECT * FROM post_jobs 
      WHERE status = 'pending' 
      AND run_at <= ${now}
      AND attempts < max_attempts
      ORDER BY run_at ASC
      LIMIT 50
    `;

    if (dueJobs.length === 0) {
      return res.status(200).json({
        message: 'No jobs to process',
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each job
    for (const job of dueJobs) {
      try {
        // Mark as processing
        await pool`
          UPDATE post_jobs 
          SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
          WHERE id = ${job.id}
        `;

        // Get user's integration for this platform
        const integrations = await db.getIntegrations(job.user_id);
        const integration = integrations.find(
          (i) => i.platform === job.platform && i.status === 'connected'
        );

        if (!integration) {
          throw new Error(`No connected integration found for platform: ${job.platform}`);
        }

        // Post to platform using integration orchestrator
        const postResult = await integrationOrchestrator.postToPlatform(integration, {
          text: job.content,
          imageUrl: job.media_urls?.[0],
          videoUrl: job.media_urls?.find((url) => url.match(/\.(mp4|mov|avi)$/i)),
        });

        if (postResult.success) {
          // Mark as succeeded
          await pool`
            UPDATE post_jobs 
            SET status = 'succeeded', updated_at = NOW()
            WHERE id = ${job.id}
          `;

          // Update post status if post_id exists
          if (job.post_id) {
            await pool`
              UPDATE posts 
              SET status = 'posted', posted_at = NOW(), updated_at = NOW()
              WHERE id = ${job.post_id} AND user_id = ${job.user_id}
            `;
          }

          results.succeeded++;
          results.processed++;
        } else {
          throw new Error(postResult.error || 'Posting failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if we've exceeded max attempts
        if (job.attempts + 1 >= job.max_attempts) {
          await pool`
            UPDATE post_jobs 
            SET status = 'failed', error = ${errorMessage}, updated_at = NOW()
            WHERE id = ${job.id}
          `;
        } else {
          // Retry later
          await pool`
            UPDATE post_jobs 
            SET status = 'pending', error = ${errorMessage}, updated_at = NOW()
            WHERE id = ${job.id}
          `;
        }

        results.failed++;
        results.processed++;
        results.errors.push(`Job ${job.id}: ${errorMessage}`);
      }
    }

    return res.status(200).json({
      message: 'Processing completed',
      ...results,
    });
  } catch (error) {
    console.error('Error processing scheduled posts:', error);
    return res.status(500).json({
      error: 'Failed to process scheduled posts',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
