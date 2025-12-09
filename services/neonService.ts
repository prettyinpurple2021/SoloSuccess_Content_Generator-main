import postgres from 'postgres';
import {
  DatabasePost,
  Post,
  BrandVoice,
  AudienceProfile,
  Campaign,
  ContentSeries,
  ContentTemplate,
  ImageStyle,
  Integration,
  OptimizationSuggestion,
  SocialMediaPosts,
} from '../types';

// Get database connection string from environment
const connectionString = import.meta.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable. Please check your .env.local file.');
}

// Create connection pool
const pool = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  max: 20,
  idle_timeout: 30,
  connect_timeout: 2,
});

// Auth functions (using Stack Auth)
export const auth = {
  // Get current user from Stack Auth
  getUser: async (): Promise<any> => {
    // This would be implemented with Stack Auth
    // For now, return null to indicate no user
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    const user = await auth.getUser();
    return user !== null;
  },
};

// Database functions
export const db = {
  // Get all posts for current user
  getPosts: async (userId?: string): Promise<Post[]> => {
    if (!userId) throw new Error('User ID is required');

    try {
      const result = await pool`
        SELECT * FROM posts 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `;

      return result.map(transformDatabasePostToPost);
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  },

  // Get paginated posts for better performance
  getPostsPaginated: async (
    userId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      status?: string;
      campaignId?: string;
      seriesId?: string;
    }
  ): Promise<{ posts: Post[]; totalCount: number; hasMore: boolean }> => {
    try {
      // Build dynamic query with filters
      let whereConditions = ['user_id = $1'];
      const params: any[] = [userId];
      let paramIndex = 2;

      if (filters?.status) {
        whereConditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }
      if (filters?.campaignId) {
        whereConditions.push(`campaign_id = $${paramIndex}`);
        params.push(filters.campaignId);
        paramIndex++;
      }
      if (filters?.seriesId) {
        whereConditions.push(`series_id = $${paramIndex}`);
        params.push(filters.seriesId);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await pool`
        SELECT COUNT(*) FROM posts WHERE ${whereClause}
      `;
      const totalCount = countResult[0] ? parseInt(countResult[0].count) : 0;

      // Get paginated results
      const offset = (page - 1) * pageSize;
      const result = await pool`
        SELECT * FROM posts 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const posts = result.map(transformDatabasePostToPost);
      const hasMore = offset + posts.length < totalCount;

      return { posts, totalCount, hasMore };
    } catch (error) {
      console.error('Error fetching paginated posts:', error);
      throw error;
    }
  },

  // Add new post
  addPost: async (
    post: Omit<DatabasePost, 'id' | 'user_id' | 'created_at'>,
    userId: string
  ): Promise<Post> => {
    try {
      const result = await pool`
        INSERT INTO posts (
          user_id, topic, idea, content, status, tags, summary, headlines,
          social_media_posts, social_media_tones, social_media_audiences,
          selected_image, schedule_date, brand_voice_id, audience_profile_id,
          campaign_id, series_id, template_id, performance_score,
          optimization_suggestions, image_style_id
        ) VALUES (
          ${userId}, 
          ${post.topic || null}, 
          ${post.idea || null}, 
          ${post.content || null}, 
          ${post.status || null}, 
          ${post.tags || null}, 
          ${post.summary || null}, 
          ${post.headlines || null},
          ${JSON.stringify(post.social_media_posts) || null}, 
          ${JSON.stringify(post.social_media_tones) || null}, 
          ${JSON.stringify(post.social_media_audiences) || null}, 
          ${post.selected_image || null}, 
          ${post.schedule_date || null}, 
          ${post.brand_voice_id || null}, 
          ${post.audience_profile_id || null}, 
          ${post.campaign_id || null}, 
          ${post.series_id || null}, 
          ${post.template_id || null}, 
          ${post.performance_score || null},
          ${JSON.stringify(post.optimization_suggestions) || null}, 
          ${post.image_style_id || null}
        ) RETURNING *
      `;

      return transformDatabasePostToPost(result[0]);
    } catch (error) {
      console.error('Error adding post:', error);
      throw error;
    }
  },

  // Update post
  updatePost: async (
    id: string,
    updates: Partial<Omit<DatabasePost, 'id' | 'user_id'>>,
    userId: string
  ): Promise<Post> => {
    try {
      // Build dynamic update query
      const updateEntries = Object.entries(updates).filter(([_, value]) => value !== undefined);

      if (updateEntries.length === 0) {
        throw new Error('No updates provided');
      }

      // For now, let's use a simple approach with known fields
      // This is a simplified version - in production you'd want more sophisticated dynamic updates
      const result = await pool`
        UPDATE posts 
        SET 
          topic = COALESCE(${updates.topic || null}, topic),
          idea = COALESCE(${updates.idea || null}, idea),
          content = COALESCE(${updates.content || null}, content),
          status = COALESCE(${updates.status || null}, status),
          tags = COALESCE(${updates.tags || null}, tags),
          summary = COALESCE(${updates.summary || null}, summary),
          headlines = COALESCE(${updates.headlines || null}, headlines),
          social_media_posts = COALESCE(${JSON.stringify(updates.social_media_posts) || null}, social_media_posts),
          social_media_tones = COALESCE(${JSON.stringify(updates.social_media_tones) || null}, social_media_tones),
          social_media_audiences = COALESCE(${JSON.stringify(updates.social_media_audiences) || null}, social_media_audiences),
          selected_image = COALESCE(${updates.selected_image || null}, selected_image),
          schedule_date = COALESCE(${updates.schedule_date || null}, schedule_date),
          brand_voice_id = COALESCE(${updates.brand_voice_id || null}, brand_voice_id),
          audience_profile_id = COALESCE(${updates.audience_profile_id || null}, audience_profile_id),
          campaign_id = COALESCE(${updates.campaign_id || null}, campaign_id),
          series_id = COALESCE(${updates.series_id || null}, series_id),
          template_id = COALESCE(${updates.template_id || null}, template_id),
          performance_score = COALESCE(${updates.performance_score || null}, performance_score),
          optimization_suggestions = COALESCE(${JSON.stringify(updates.optimization_suggestions) || null}, optimization_suggestions),
          image_style_id = COALESCE(${updates.image_style_id || null}, image_style_id),
          updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('Post not found or access denied');
      }

      return transformDatabasePostToPost(result[0]);
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  // Delete post
  deletePost: async (id: string, userId: string): Promise<void> => {
    try {
      const result = await pool`
        DELETE FROM posts 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (result.length === 0) {
        throw new Error('Post not found or access denied');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  // Brand Voice functions
  getBrandVoices: async (userId: string): Promise<BrandVoice[]> => {
    try {
      const result = await pool`
        SELECT * FROM brand_voices 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `;

      return result.map(transformDatabaseBrandVoiceToBrandVoice);
    } catch (error) {
      console.error('Error fetching brand voices:', error);
      throw error;
    }
  },

  addBrandVoice: async (
    brandVoice: Omit<BrandVoice, 'id' | 'user_id' | 'created_at'>,
    userId: string
  ): Promise<BrandVoice> => {
    try {
      const result = await pool`
        INSERT INTO brand_voices (
          user_id, name, tone, vocabulary, writing_style, 
          target_audience, sample_content
        ) VALUES (
          ${userId}, ${brandVoice.name}, ${brandVoice.tone}, 
          ${JSON.stringify(brandVoice.vocabulary)}, ${brandVoice.writingStyle}, 
          ${brandVoice.targetAudience}, ${JSON.stringify(brandVoice.sampleContent)}
        ) RETURNING *
      `;

      return transformDatabaseBrandVoiceToBrandVoice(result[0]);
    } catch (error) {
      console.error('Error adding brand voice:', error);
      throw error;
    }
  },

  updateBrandVoice: async (
    id: string,
    updates: Partial<Omit<BrandVoice, 'id' | 'user_id'>>,
    userId: string
  ): Promise<BrandVoice> => {
    try {
      const result = await pool`
        UPDATE brand_voices 
        SET 
          name = COALESCE(${updates.name || null}, name),
          tone = COALESCE(${updates.tone || null}, tone),
          vocabulary = COALESCE(${JSON.stringify(updates.vocabulary) || null}, vocabulary),
          writing_style = COALESCE(${updates.writingStyle || null}, writing_style),
          target_audience = COALESCE(${updates.targetAudience || null}, target_audience),
          sample_content = COALESCE(${JSON.stringify(updates.sampleContent) || null}, sample_content),
          updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('Brand voice not found or access denied');
      }

      return transformDatabaseBrandVoiceToBrandVoice(result[0]);
    } catch (error) {
      console.error('Error updating brand voice:', error);
      throw error;
    }
  },

  deleteBrandVoice: async (id: string, userId: string): Promise<void> => {
    try {
      const result = await pool`
        DELETE FROM brand_voices 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (result.length === 0) {
        throw new Error('Brand voice not found or access denied');
      }
    } catch (error) {
      console.error('Error deleting brand voice:', error);
      throw error;
    }
  },

  // Audience Profile functions
  getAudienceProfiles: async (userId: string): Promise<AudienceProfile[]> => {
    try {
      const result = await pool`
        SELECT * FROM audience_profiles 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `;

      return result.map(transformDatabaseAudienceProfileToAudienceProfile);
    } catch (error) {
      console.error('Error fetching audience profiles:', error);
      throw error;
    }
  },

  addAudienceProfile: async (
    audienceProfile: Omit<AudienceProfile, 'id' | 'user_id' | 'created_at'>,
    userId: string
  ): Promise<AudienceProfile> => {
    try {
      const result = await pool`
        INSERT INTO audience_profiles (
          user_id, name, age_range, industry, interests, 
          pain_points, preferred_content_types, engagement_patterns
        ) VALUES (
          ${userId}, ${audienceProfile.name}, ${audienceProfile.ageRange}, 
          ${audienceProfile.industry}, ${JSON.stringify(audienceProfile.interests)}, 
          ${JSON.stringify(audienceProfile.painPoints)}, ${JSON.stringify(audienceProfile.preferredContentTypes)}, 
          ${JSON.stringify(audienceProfile.engagementPatterns)}
        ) RETURNING *
      `;

      return transformDatabaseAudienceProfileToAudienceProfile(result[0]);
    } catch (error) {
      console.error('Error adding audience profile:', error);
      throw error;
    }
  },

  updateAudienceProfile: async (
    id: string,
    updates: Partial<Omit<AudienceProfile, 'id' | 'user_id'>>,
    userId: string
  ): Promise<AudienceProfile> => {
    try {
      const result = await pool`
        UPDATE audience_profiles 
        SET 
          name = COALESCE(${updates.name || null}, name),
          age_range = COALESCE(${updates.ageRange || null}, age_range),
          industry = COALESCE(${updates.industry || null}, industry),
          interests = COALESCE(${JSON.stringify(updates.interests) || null}, interests),
          pain_points = COALESCE(${JSON.stringify(updates.painPoints) || null}, pain_points),
          preferred_content_types = COALESCE(${JSON.stringify(updates.preferredContentTypes) || null}, preferred_content_types),
          engagement_patterns = COALESCE(${JSON.stringify(updates.engagementPatterns) || null}, engagement_patterns),
          updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('Audience profile not found or access denied');
      }

      return transformDatabaseAudienceProfileToAudienceProfile(result[0]);
    } catch (error) {
      console.error('Error updating audience profile:', error);
      throw error;
    }
  },

  deleteAudienceProfile: async (id: string, userId: string): Promise<void> => {
    try {
      const result = await pool`
        DELETE FROM audience_profiles 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (result.length === 0) {
        throw new Error('Audience profile not found or access denied');
      }
    } catch (error) {
      console.error('Error deleting audience profile:', error);
      throw error;
    }
  },

  // Integration functions
  getIntegrations: async (userId: string): Promise<Integration[]> => {
    try {
      const result = await pool`
        SELECT * FROM integrations 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `;

      return result.map(transformDatabaseIntegrationToIntegration);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      throw error;
    }
  },

  getIntegrationById: async (id: string): Promise<Integration | null> => {
    try {
      const result = await pool`
        SELECT * FROM integrations 
        WHERE id = ${id}
      `;

      if (result.length === 0) {
        return null;
      }

      return transformDatabaseIntegrationToIntegration(result[0]);
    } catch (error) {
      console.error('Error fetching integration by ID:', error);
      throw error;
    }
  },

  addIntegration: async (
    integration: Omit<Integration, 'id' | 'user_id' | 'created_at'>,
    userId: string
  ): Promise<Integration> => {
    try {
      const result = await pool`
               INSERT INTO integrations (
                 user_id, name, type, platform, credentials, configuration, is_active,
                 last_sync, sync_frequency, status
               ) VALUES (
                 ${userId}, ${integration.name}, ${integration.type}, ${integration.platform},
                 ${JSON.stringify(integration.credentials)}, ${JSON.stringify(integration.configuration)},
                 ${integration.isActive},
                 ${integration.lastSync || null}, ${integration.syncFrequency},
                 ${integration.status}
               ) RETURNING *
             `;

      return transformDatabaseIntegrationToIntegration(result[0]);
    } catch (error) {
      console.error('Error adding integration:', error);
      throw error;
    }
  },

  updateIntegration: async (
    id: string,
    updates: Partial<Omit<Integration, 'id' | 'user_id'>>,
    userId: string
  ): Promise<Integration> => {
    try {
      const result = await pool`
               UPDATE integrations
               SET
                 name = COALESCE(${updates.name || null}, name),
                 type = COALESCE(${updates.type || null}, type),
                 platform = COALESCE(${updates.platform || null}, platform),
                 credentials = COALESCE(${JSON.stringify(updates.credentials) || null}, credentials),
                 configuration = COALESCE(${JSON.stringify(updates.configuration) || null}, configuration),
                 is_active = COALESCE(${updates.isActive || null}, is_active),
                 last_sync = COALESCE(${updates.lastSync || null}, last_sync),
                 sync_frequency = COALESCE(${updates.syncFrequency || null}, sync_frequency),
                 status = COALESCE(${updates.status || null}, status),
                 updated_at = NOW()
               WHERE id = ${id} AND user_id = ${userId}
               RETURNING *
             `;

      if (result.length === 0) {
        throw new Error('Integration not found or access denied');
      }

      return transformDatabaseIntegrationToIntegration(result[0]);
    } catch (error) {
      console.error('Error updating integration:', error);
      throw error;
    }
  },

  deleteIntegration: async (id: string, userId: string): Promise<void> => {
    try {
      const result = await pool`
        DELETE FROM integrations 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (result.length === 0) {
        throw new Error('Integration not found or access denied');
      }
    } catch (error) {
      console.error('Error deleting integration:', error);
      throw error;
    }
  },

  // Integration logs
  getIntegrationLogs: async (integrationId: string, limit: number = 50): Promise<any[]> => {
    try {
      const result = await pool`
        SELECT * FROM integration_logs 
        WHERE integration_id = ${integrationId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return result;
    } catch (error) {
      console.error('Error fetching integration logs:', error);
      throw error;
    }
  },

  addIntegrationLog: async (log: any): Promise<void> => {
    try {
      await pool`
        INSERT INTO integration_logs (
          integration_id, level, message, details, created_at
        ) VALUES (
          ${log.integrationId}, ${log.level}, ${log.message}, 
          ${JSON.stringify(log.details)}, NOW()
        )
      `;
    } catch (error) {
      console.error('Error adding integration log:', error);
      throw error;
    }
  },

  // Integration metrics
  getIntegrationMetrics: async (integrationId: string, timeframe?: string): Promise<any> => {
    try {
      const result = await pool`
        SELECT * FROM integration_metrics 
        WHERE integration_id = ${integrationId}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      return result[0] || null;
    } catch (error) {
      console.error('Error fetching integration metrics:', error);
      throw error;
    }
  },

  updateIntegrationMetrics: async (integrationId: string, metrics: any): Promise<void> => {
    try {
      await pool`
        INSERT INTO integration_metrics (
          integration_id, metrics_data, created_at
        ) VALUES (
          ${integrationId}, ${JSON.stringify(metrics)}, NOW()
        )
        ON CONFLICT (integration_id) 
        DO UPDATE SET 
          metrics_data = ${JSON.stringify(metrics)},
          created_at = NOW()
      `;
    } catch (error) {
      console.error('Error updating integration metrics:', error);
      throw error;
    }
  },

  // Integration webhooks
  getIntegrationWebhooks: async (integrationId: string): Promise<any[]> => {
    try {
      const result = await pool`
        SELECT * FROM integration_webhooks 
        WHERE integration_id = ${integrationId}
        ORDER BY created_at DESC
      `;

      return result;
    } catch (error) {
      console.error('Error fetching integration webhooks:', error);
      throw error;
    }
  },

  addIntegrationWebhook: async (webhook: any): Promise<void> => {
    try {
      await pool`
        INSERT INTO integration_webhooks (
          integration_id, url, events, is_active, created_at
        ) VALUES (
          ${webhook.integrationId}, ${webhook.url}, 
          ${JSON.stringify(webhook.events)}, ${webhook.isActive}, NOW()
        )
      `;
    } catch (error) {
      console.error('Error adding integration webhook:', error);
      throw error;
    }
  },

  updateIntegrationWebhook: async (webhookId: string, updates: any): Promise<void> => {
    try {
      const result = await pool`
        UPDATE integration_webhooks 
        SET 
          url = COALESCE(${updates.url || null}, url),
          events = COALESCE(${JSON.stringify(updates.events) || null}, events),
          is_active = COALESCE(${updates.isActive || null}, is_active),
          updated_at = NOW()
        WHERE id = ${webhookId}
      `;
    } catch (error) {
      console.error('Error updating integration webhook:', error);
      throw error;
    }
  },

  deleteIntegrationWebhook: async (webhookId: string): Promise<void> => {
    try {
      await pool`
        DELETE FROM integration_webhooks 
        WHERE id = ${webhookId}
      `;
    } catch (error) {
      console.error('Error deleting integration webhook:', error);
      throw error;
    }
  },

  // Integration alerts
  getIntegrationAlerts: async (integrationId: string, status?: string): Promise<any[]> => {
    try {
      let query = 'SELECT * FROM integration_alerts WHERE integration_id = $1';
      const params: any[] = [integrationId];

      if (status) {
        query += ' AND status = $2';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool`
        SELECT * FROM integration_alerts 
        WHERE integration_id = ${integrationId}
        ORDER BY created_at DESC
      `;

      return result;
    } catch (error) {
      console.error('Error fetching integration alerts:', error);
      throw error;
    }
  },

  addIntegrationAlert: async (alert: any): Promise<void> => {
    try {
      await pool`
        INSERT INTO integration_alerts (
          integration_id, level, message, status, created_at
        ) VALUES (
          ${alert.integrationId}, ${alert.level}, ${alert.message}, 
          ${alert.status || 'active'}, NOW()
        )
      `;
    } catch (error) {
      console.error('Error adding integration alert:', error);
      throw error;
    }
  },

  resolveIntegrationAlert: async (alertId: string): Promise<void> => {
    try {
      await pool`
        UPDATE integration_alerts 
        SET status = 'resolved', updated_at = NOW()
        WHERE id = ${alertId}
      `;
    } catch (error) {
      console.error('Error resolving integration alert:', error);
      throw error;
    }
  },
};

// Transform functions
function transformDatabasePostToPost(dbPost: any): Post {
  return {
    id: dbPost.id,
    userId: dbPost.user_id,
    topic: dbPost.topic,
    idea: dbPost.idea,
    content: dbPost.content,
    status: dbPost.status,
    tags: dbPost.tags || [],
    summary: dbPost.summary,
    headlines: dbPost.headlines || [],
    socialMediaPosts: dbPost.social_media_posts ? JSON.parse(dbPost.social_media_posts) : {},
    socialMediaTones: dbPost.social_media_tones ? JSON.parse(dbPost.social_media_tones) : {},
    socialMediaAudiences: dbPost.social_media_audiences
      ? JSON.parse(dbPost.social_media_audiences)
      : {},
    selectedImage: dbPost.selected_image,
    scheduleDate: dbPost.schedule_date,
    brandVoiceId: dbPost.brand_voice_id,
    audienceProfileId: dbPost.audience_profile_id,
    campaignId: dbPost.campaign_id,
    seriesId: dbPost.series_id,
    templateId: dbPost.template_id,
    performanceScore: dbPost.performance_score,
    optimizationSuggestions: dbPost.optimization_suggestions
      ? JSON.parse(dbPost.optimization_suggestions)
      : [],
    imageStyleId: dbPost.image_style_id,
    createdAt: dbPost.created_at,
  };
}

function transformDatabaseBrandVoiceToBrandVoice(dbBrandVoice: any): BrandVoice {
  return {
    id: dbBrandVoice.id,
    userId: dbBrandVoice.user_id,
    name: dbBrandVoice.name,
    tone: dbBrandVoice.tone,
    vocabulary: dbBrandVoice.vocabulary ? JSON.parse(dbBrandVoice.vocabulary) : [],
    writingStyle: dbBrandVoice.writing_style,
    targetAudience: dbBrandVoice.target_audience,
    sampleContent: dbBrandVoice.sample_content ? JSON.parse(dbBrandVoice.sample_content) : [],
    createdAt: dbBrandVoice.created_at,
  };
}

function transformDatabaseAudienceProfileToAudienceProfile(
  dbAudienceProfile: any
): AudienceProfile {
  return {
    id: dbAudienceProfile.id,
    userId: dbAudienceProfile.user_id,
    name: dbAudienceProfile.name,
    ageRange: dbAudienceProfile.age_range,
    industry: dbAudienceProfile.industry,
    interests: dbAudienceProfile.interests ? JSON.parse(dbAudienceProfile.interests) : [],
    painPoints: dbAudienceProfile.pain_points ? JSON.parse(dbAudienceProfile.pain_points) : [],
    preferredContentTypes: dbAudienceProfile.preferred_content_types
      ? JSON.parse(dbAudienceProfile.preferred_content_types)
      : [],
    engagementPatterns: dbAudienceProfile.engagement_patterns
      ? JSON.parse(dbAudienceProfile.engagement_patterns)
      : {},
    createdAt: dbAudienceProfile.created_at,
  };
}

function transformDatabaseIntegrationToIntegration(dbIntegration: any): Integration {
  return {
    id: dbIntegration.id,
    userId: dbIntegration.user_id,
    name: dbIntegration.name,
    type: dbIntegration.type,
    platform: dbIntegration.platform,
    credentials: dbIntegration.credentials ? JSON.parse(dbIntegration.credentials) : {},
    configuration: dbIntegration.configuration ? JSON.parse(dbIntegration.configuration) : {},
    isActive: dbIntegration.is_active,
    lastSync: dbIntegration.last_sync,
    syncFrequency: dbIntegration.sync_frequency,
    status: dbIntegration.status,
    createdAt: dbIntegration.created_at,
    updatedAt: dbIntegration.updated_at,
  };
}

// Test database connection for health checks
export const testConnection = async (): Promise<boolean> => {
  try {
    // Simple query to test connection
    await pool`SELECT 1 as test`;
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

export default db;
