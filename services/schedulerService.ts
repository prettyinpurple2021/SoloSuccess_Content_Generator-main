import { z } from 'zod';

export const schedulePayloadSchema = z.object({
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

export type SchedulePayload = z.infer<typeof schedulePayloadSchema>;

/**
 * Create one job per platform, content adapted strictly to platform limits.
 * This is now a client-side function that calls the API.
 */
export const schedulePost = async (payload: SchedulePayload): Promise<void> => {
  const parsed = schedulePayloadSchema.parse(payload);

  if (!parsed.userId) {
    throw new Error('User ID is required');
  }

  const response = await fetch('/api/scheduled-posts/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to schedule posts' }));
    throw new Error(error.error || 'Failed to schedule posts');
  }

  const result = await response.json();
  console.log(`✅ ${result.message}`);

  // If posts need immediate processing, trigger it (non-blocking)
  if (result.processImmediately) {
    fetch('/api/scheduled-posts/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch((err) => {
      console.error('Failed to trigger immediate post processing:', err);
      // Don't throw - this is a background operation
    });
  }
};
