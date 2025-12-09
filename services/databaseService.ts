import postgres from 'postgres';
import {
  DatabasePost,
  Post,
  BrandVoice,
  DatabaseBrandVoice,
  AudienceProfile,
  DatabaseAudienceProfile,
  Campaign,
  DatabaseCampaign,
  ContentSeries,
  DatabaseContentSeries,
  ContentTemplate,
  DatabaseContentTemplate,
  ImageStyle,
  DatabaseImageStyle,
  AnalyticsData,
  DatabaseAnalyticsData,
  PerformanceReport,
  EngagementData,
  Integration,
  DatabaseIntegration,
  IntegrationLog,
  DatabaseIntegrationLog,
  IntegrationAlert,
  DatabaseIntegrationAlert,
  IntegrationMetrics,
  WebhookConfig,
} from '../types';
import { contentCache, paginationCache, PaginationCache } from './cachingService';

// Neon database configuration
const connectionString = process.env.DATABASE_URL;

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
    // This will be handled by Stack Auth on the frontend
    // The user context will be passed down from the Stack Auth provider
    return null; // Placeholder - actual implementation depends on Stack Auth integration
  },

  // Image Styles
  getImageStyles: async (userId?: string): Promise<ImageStyle[]> => {
    try {
      const result = await pool`
        SELECT * FROM image_styles
        ${userId ? pool`WHERE user_id = ${userId}` : pool``}
        ORDER BY created_at DESC
      `;
      return result.map(
        (row: any) =>
          ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            stylePrompt: row.style_prompt,
            colorPalette: row.color_palette,
            visualElements: row.visual_elements,
            brandAssets: row.brand_assets,
            createdAt: new Date(row.created_at),
          }) as ImageStyle
      );
    } catch (error) {
      console.error('Error fetching image styles:', error);
      throw error;
    }
  },

  // Content Templates (read-only for client)
  getContentTemplates: async (userId?: string): Promise<ContentTemplate[]> => {
    try {
      const result = await pool`
        SELECT * FROM content_templates
        ${userId ? pool`WHERE user_id = ${userId} OR is_public = true` : pool``}
        ORDER BY created_at DESC
      `;
      return result.map(
        (row: any) =>
          ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            category: row.category,
            industry: row.industry,
            contentType: row.content_type,
            structure: row.structure,
            customizableFields: row.customizable_fields,
            usageCount: row.usage_count,
            rating: row.rating,
            isPublic: row.is_public,
            createdAt: new Date(row.created_at),
          }) as ContentTemplate
      );
    } catch (error) {
      console.error('Error fetching content templates:', error);
      throw error;
    }
  },

  // Content Series (read-only for client)
  getContentSeries: async (userId: string): Promise<ContentSeries[]> => {
    try {
      const result = await pool`
        SELECT * FROM content_series
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      return result.map(
        (row: any) =>
          ({
            id: row.id,
            userId: row.user_id,
            campaignId: row.campaign_id,
            name: row.name,
            theme: row.theme,
            totalPosts: row.total_posts,
            frequency: row.frequency,
            currentPost: row.current_post,
            posts: [],
            createdAt: new Date(row.created_at),
          }) as ContentSeries
      );
    } catch (error) {
      console.error('Error fetching content series:', error);
      throw error;
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (user: any) => void) => {
    // This will be handled by Stack Auth on the frontend
    return () => {}; // Placeholder
  },

  // Sign out
  signOut: async () => {
    // This will be handled by Stack Auth on the frontend
    return { error: null };
  },
};

// Database functions
export const db = {
  // Get all posts for current user with caching
  getPosts: async (userId?: string): Promise<Post[]> => {
    if (!userId) throw new Error('User ID is required');

    return await contentCache.cacheUserPosts(userId, async () => {
      try {
        const result = await pool`
          SELECT * FROM posts 
          WHERE user_id = ${userId} 
          ORDER BY created_at DESC
        `;

        return result.map((row: any) => transformDatabasePostToPost(row as DatabasePost));
      } catch (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }
    });
  },

  // Get all scheduled posts across all users (for global scheduler)
  getAllScheduledPosts: async (): Promise<Post[]> => {
    try {
      const result = await pool`
        SELECT * FROM posts 
        WHERE status = 'scheduled' 
        AND schedule_date IS NOT NULL
        ORDER BY schedule_date ASC
      `;

      return result.map((row: any) => transformDatabasePostToPost(row as DatabasePost));
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      throw error;
    }
  },

  // Get paginated posts for better performance with large datasets
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
    const cacheKey = PaginationCache.generateKey(`posts:${userId}`, filters);

    // Try to get from pagination cache first
    const cached = paginationCache.get(cacheKey, page, pageSize);
    if (cached !== null) {
      return {
        posts: cached.data,
        totalCount: cached.totalCount,
        hasMore: page * pageSize < cached.totalCount,
      };
    }

    try {
      // For now, use a simplified approach without dynamic query building
      // This can be enhanced later with proper postgres library dynamic queries

      // Get total count
      const countResult = await pool`
        SELECT COUNT(*) FROM posts WHERE user_id = ${userId}
      `;
      const totalCount = parseInt(countResult[0].count);

      // Get paginated results
      const offset = (page - 1) * pageSize;
      const result = await pool`
        SELECT * FROM posts 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const posts = result.map((row: any) => transformDatabasePostToPost(row as DatabasePost));

      // Cache optimization: Only cache a reasonable batch size on first page load
      // Rationale for 100 records:
      // - Covers 5 pages of data (at 20 items per page)
      // - Balances memory usage vs cache hit rate
      // - Typical users browse 2-3 pages, rarely more than 5
      // - Reduces initial load from 1000 to 100 (90% reduction)
      // - Adjust this value based on production analytics if users commonly navigate beyond 5 pages
      if (page === 1 && totalCount > pageSize) {
        const cacheLimit = Math.min(100, totalCount);
        const fullData = await pool`
          SELECT * FROM posts 
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT ${cacheLimit}
        `;

        const fullPosts = fullData.map((row: any) =>
          transformDatabasePostToPost(row as DatabasePost)
        );
        paginationCache.set(cacheKey, fullPosts, totalCount);
      }

      return {
        posts,
        totalCount,
        hasMore: page * pageSize < totalCount,
      };
    } catch (error) {
      console.error('Error fetching paginated posts:', error);
      throw error;
    }
  },

  // Content Series (read-only for client)
  getContentSeries: async (userId: string): Promise<ContentSeries[]> => {
    try {
      const result = await pool`
      SELECT * FROM content_series
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

      return result.map(
        (row: any) =>
          ({
            id: row.id,
            userId: row.user_id,
            campaignId: row.campaign_id,
            name: row.name,
            theme: row.theme,
            totalPosts: row.total_posts,
            frequency: row.frequency,
            currentPost: row.current_post,
            posts: [],
            createdAt: new Date(row.created_at),
          }) as ContentSeries
      );
    } catch (error) {
      console.error('Error fetching content series:', error);
      throw error;
    }
  },

  // Add new post
  addPost: async (
    post: Omit<DatabasePost, 'id' | 'user_id' | 'created_at'>,
    userId: string
  ): Promise<Post> => {
    try {
      // Pre-stringify JSON fields to avoid template literal issues
      const socialMediaPostsJson = JSON.stringify(post.social_media_posts);
      const socialMediaTonesJson = JSON.stringify(post.social_media_tones);
      const socialMediaAudiencesJson = JSON.stringify(post.social_media_audiences);
      const optimizationSuggestionsJson = JSON.stringify(post.optimization_suggestions);

      const result = await pool`
        INSERT INTO posts (
          user_id, topic, idea, content, status, tags, summary, headlines,
          social_media_posts, social_media_tones, social_media_audiences,
          selected_image, schedule_date, brand_voice_id, audience_profile_id,
          campaign_id, series_id, template_id, performance_score,
          optimization_suggestions, image_style_id
        ) VALUES (
          ${userId}, ${post.topic || null}, ${post.idea || null}, ${post.content || null}, ${post.status || null},
          ${post.tags || null}, ${post.summary || null}, ${post.headlines || null},
          ${socialMediaPostsJson || null}, ${socialMediaTonesJson || null},
          ${socialMediaAudiencesJson || null}, ${post.selected_image || null}, ${post.schedule_date || null},
          ${post.brand_voice_id || null}, ${post.audience_profile_id || null}, ${post.campaign_id || null},
          ${post.series_id || null}, ${post.template_id || null}, ${post.performance_score || null},
          ${optimizationSuggestionsJson || null}, ${post.image_style_id || null}
        ) RETURNING *
      `;

      // Invalidate user cache after adding post
      contentCache.invalidateUserCache(userId);

      return transformDatabasePostToPost(result[0] as DatabasePost);
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

      // Invalidate related caches
      contentCache.invalidateUserCache(userId);
      contentCache.invalidatePostCache(id);

      return transformDatabasePostToPost(result[0] as DatabasePost);
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

      // Invalidate related caches
      contentCache.invalidateUserCache(userId);
      contentCache.invalidatePostCache(id);
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  // Brand Voices CRUD operations
  getBrandVoices: async (userId: string): Promise<BrandVoice[]> => {
    return await contentCache.cacheBrandVoices(userId, async () => {
      try {
        const result = await pool`
          SELECT * FROM brand_voices 
          WHERE user_id = ${userId} 
          ORDER BY created_at DESC
        `;

        return result.map((row: any) =>
          transformDatabaseBrandVoiceToBrandVoice(row as DatabaseBrandVoice)
        );
      } catch (error) {
        console.error('Error fetching brand voices:', error);
        throw error;
      }
    });
  },

  addBrandVoice: async (
    brandVoice: Omit<DatabaseBrandVoice, 'id' | 'user_id' | 'created_at'>,
    userId: string
  ): Promise<BrandVoice> => {
    try {
      const result = await pool`
        INSERT INTO brand_voices (
          user_id, name, tone, vocabulary, writing_style, target_audience, sample_content
        ) VALUES (
          ${userId}, ${brandVoice.name}, ${brandVoice.tone},
          ${JSON.stringify(brandVoice.vocabulary)}, ${brandVoice.writing_style},
          ${brandVoice.target_audience}, ${JSON.stringify(brandVoice.sample_content)}
        ) RETURNING *
      `;

      return transformDatabaseBrandVoiceToBrandVoice(result[0] as DatabaseBrandVoice);
    } catch (error) {
      console.error('Error adding brand voice:', error);
      throw error;
    }
  },

  updateBrandVoice: async (
    id: string,
    updates: Partial<Omit<DatabaseBrandVoice, 'id' | 'user_id'>>,
    userId: string
  ): Promise<BrandVoice> => {
    try {
      const vocabularyJson = updates.vocabulary ? JSON.stringify(updates.vocabulary) : null;
      const sampleContentJson = updates.sample_content
        ? JSON.stringify(updates.sample_content)
        : null;

      const result = await pool`
        UPDATE brand_voices 
        SET
          name = COALESCE(${updates.name || null}, name),
          tone = COALESCE(${updates.tone || null}, tone),
          vocabulary = COALESCE(${vocabularyJson}, vocabulary),
          writing_style = COALESCE(${updates.writing_style || null}, writing_style),
          target_audience = COALESCE(${updates.target_audience || null}, target_audience),
          sample_content = COALESCE(${sampleContentJson}, sample_content)
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('Brand voice not found or access denied');
      }

      return transformDatabaseBrandVoiceToBrandVoice(result[0] as DatabaseBrandVoice);
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

  // Audience Profiles CRUD operations
  getAudienceProfiles: async (userId: string): Promise<AudienceProfile[]> => {
    try {
      const result = await pool`
        SELECT * FROM audience_profiles 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `;

      return result.map((row: any) =>
        transformDatabaseAudienceProfileToAudienceProfile(row as DatabaseAudienceProfile)
      );
    } catch (error) {
      console.error('Error fetching audience profiles:', error);
      throw error;
    }
  },

  addAudienceProfile: async (
    profile: Omit<DatabaseAudienceProfile, 'id' | 'user_id' | 'created_at'>,
    userId: string
  ): Promise<AudienceProfile> => {
    try {
      const interestsJson = JSON.stringify(profile.interests);
      const painPointsJson = JSON.stringify(profile.pain_points);
      const preferredContentTypesJson = JSON.stringify(profile.preferred_content_types);
      const engagementPatternsJson = JSON.stringify(profile.engagement_patterns);

      const result = await pool`
        INSERT INTO audience_profiles (
          user_id, name, age_range, industry, interests, pain_points, 
          preferred_content_types, engagement_patterns
        ) VALUES (
          ${userId}, ${profile.name}, ${profile.age_range}, ${profile.industry},
          ${interestsJson}, ${painPointsJson}, ${preferredContentTypesJson}, ${engagementPatternsJson}
        ) RETURNING *
      `;

      return transformDatabaseAudienceProfileToAudienceProfile(
        result[0] as DatabaseAudienceProfile
      );
    } catch (error) {
      console.error('Error adding audience profile:', error);
      throw error;
    }
  },

  updateAudienceProfile: async (
    id: string,
    updates: Partial<Omit<DatabaseAudienceProfile, 'id' | 'user_id'>>,
    userId: string
  ): Promise<AudienceProfile> => {
    try {
      const interestsJson = updates.interests ? JSON.stringify(updates.interests) : null;
      const painPointsJson = updates.pain_points ? JSON.stringify(updates.pain_points) : null;
      const preferredContentTypesJson = updates.preferred_content_types
        ? JSON.stringify(updates.preferred_content_types)
        : null;
      const engagementPatternsJson = updates.engagement_patterns
        ? JSON.stringify(updates.engagement_patterns)
        : null;

      const result = await pool`
        UPDATE audience_profiles 
        SET
          name = COALESCE(${updates.name || null}, name),
          age_range = COALESCE(${updates.age_range || null}, age_range),
          industry = COALESCE(${updates.industry || null}, industry),
          interests = COALESCE(${interestsJson}, interests),
          pain_points = COALESCE(${painPointsJson}, pain_points),
          preferred_content_types = COALESCE(${preferredContentTypesJson}, preferred_content_types),
          engagement_patterns = COALESCE(${engagementPatternsJson}, engagement_patterns)
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('Audience profile not found or access denied');
      }

      return transformDatabaseAudienceProfileToAudienceProfile(
        result[0] as DatabaseAudienceProfile
      );
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

  // Content Templates (read-only for client)
  getContentTemplates: async (userId?: string): Promise<ContentTemplate[]> => {
    try {
      const result = await pool`
        SELECT * FROM content_templates
        ${userId ? pool`WHERE user_id = ${userId} OR is_public = true` : pool``}
        ORDER BY created_at DESC
      `;

      return result.map(
        (row: any) =>
          ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            category: row.category,
            industry: row.industry,
            contentType: row.content_type,
            structure: row.structure,
            customizableFields: row.customizable_fields,
            usageCount: row.usage_count,
            rating: row.rating,
            isPublic: row.is_public,
            createdAt: new Date(row.created_at),
          }) as ContentTemplate
      );
    } catch (error) {
      console.error('Error fetching content templates:', error);
      throw error;
    }
  },

  // Campaigns CRUD operations
  getCampaigns: async (userId: string): Promise<Campaign[]> => {
    try {
      const result = await pool`
        SELECT * FROM campaigns 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `;

      return result.map((row: any) => transformDatabaseCampaignToCampaign(row as DatabaseCampaign));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  },

  addCampaign: async (
    campaign: Omit<DatabaseCampaign, 'id' | 'user_id' | 'created_at'>,
    userId: string
  ): Promise<Campaign> => {
    try {
      const performanceJson = JSON.stringify(campaign.performance);

      const result = await pool`
        INSERT INTO campaigns (
          user_id, name, description, theme, start_date, end_date, platforms, status, performance
        ) VALUES (
          ${userId}, ${campaign.name}, ${campaign.description}, ${campaign.theme},
          ${campaign.start_date}, ${campaign.end_date}, ${campaign.platforms},
          ${campaign.status}, ${performanceJson}
        ) RETURNING *
      `;

      return transformDatabaseCampaignToCampaign(result[0] as DatabaseCampaign);
    } catch (error) {
      console.error('Error adding campaign:', error);
      throw error;
    }
  },

  updateCampaign: async (
    id: string,
    updates: Partial<Omit<DatabaseCampaign, 'id' | 'user_id'>>,
    userId: string
  ): Promise<Campaign> => {
    try {
      const performanceJson = updates.performance ? JSON.stringify(updates.performance) : null;

      const result = await pool`
        UPDATE campaigns 
        SET
          name = COALESCE(${updates.name ?? null}, name),
          description = COALESCE(${updates.description ?? null}, description),
          theme = COALESCE(${updates.theme ?? null}, theme),
          start_date = COALESCE(${updates.start_date ?? null}, start_date),
          end_date = COALESCE(${updates.end_date ?? null}, end_date),
          platforms = COALESCE(${updates.platforms ?? null}, platforms),
          status = COALESCE(${updates.status ?? null}, status),
          performance = COALESCE(${performanceJson}, performance)
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('Campaign not found or access denied');
      }

      return transformDatabaseCampaignToCampaign(result[0] as DatabaseCampaign);
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  },

  deleteCampaign: async (id: string, userId: string): Promise<void> => {
    try {
      const result = await pool`
        DELETE FROM campaigns 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (result.length === 0) {
        throw new Error('Campaign not found or access denied');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  },

  // Integration Alerts Operations
  getIntegrationAlerts: async (
    integrationId: string,
    includeResolved: boolean = false
  ): Promise<IntegrationAlert[]> => {
    try {
      let result;
      if (!includeResolved) {
        result = await pool`
        SELECT * FROM integration_alerts 
          WHERE integration_id = ${integrationId} AND is_resolved = false
          ORDER BY created_at DESC
        `;
      } else {
        result = await pool`
          SELECT * FROM integration_alerts 
          WHERE integration_id = ${integrationId}
          ORDER BY created_at DESC
        `;
      }
      return result.map((row: any) =>
        transformDatabaseIntegrationAlertToIntegrationAlert(row as DatabaseIntegrationAlert)
      );
    } catch (error) {
      console.error('Error fetching integration alerts:', error);
      throw error;
    }
  },

  // Integration Logs Operations
  getIntegrationLogs: async (
    integrationId: string,
    limit: number = 100
  ): Promise<IntegrationLog[]> => {
    try {
      const result = await pool`
        SELECT * FROM integration_logs 
        WHERE integration_id = ${integrationId}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      return result.map((row: any) =>
        transformDatabaseIntegrationLogToIntegrationLog(row as DatabaseIntegrationLog)
      );
    } catch (error) {
      console.error('Error fetching integration logs:', error);
      throw error;
    }
  },

  // Analytics Data Operations
  insertPostAnalytics: async (
    analytics: Omit<DatabaseAnalyticsData, 'id' | 'recorded_at'>
  ): Promise<AnalyticsData> => {
    try {
      const result = await pool`
        INSERT INTO post_analytics (
          post_id, platform, likes, shares, comments, clicks, impressions, reach
        ) VALUES (
          ${analytics.post_id}, ${analytics.platform}, ${analytics.likes},
          ${analytics.shares}, ${analytics.comments}, ${analytics.clicks},
          ${analytics.impressions}, ${analytics.reach}
        ) RETURNING *
      `;

      return transformDatabaseAnalyticsDataToAnalyticsData(result[0] as DatabaseAnalyticsData);
    } catch (error) {
      console.error('Error inserting post analytics:', error);
      throw error;
    }
  },

  getPostAnalytics: async (postId: string): Promise<AnalyticsData[]> => {
    try {
      const result = await pool`
        SELECT * FROM post_analytics 
        WHERE post_id = ${postId} 
        ORDER BY recorded_at DESC
      `;

      return result.map((row: any) =>
        transformDatabaseAnalyticsDataToAnalyticsData(row as DatabaseAnalyticsData)
      );
    } catch (error) {
      console.error('Error fetching post analytics:', error);
      throw error;
    }
  },

  // Get analytics between dates
  getAnalyticsByTimeframe: async (startDate: Date, endDate: Date): Promise<AnalyticsData[]> => {
    try {
      const result = await pool`
        SELECT * FROM post_analytics
        WHERE recorded_at >= ${startDate.toISOString()} AND recorded_at <= ${endDate.toISOString()}
        ORDER BY recorded_at DESC
      `;

      return result.map((row: any) =>
        transformDatabaseAnalyticsDataToAnalyticsData(row as DatabaseAnalyticsData)
      );
    } catch (error) {
      console.error('Error fetching analytics by timeframe:', error);
      throw error;
    }
  },

  // Integration Management Operations
  getIntegrations: async (userId: string): Promise<Integration[]> => {
    try {
      const result = await pool`
        SELECT * FROM integrations 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `;

      return result.map((row: any) =>
        transformDatabaseIntegrationToIntegration(row as DatabaseIntegration)
      );
    } catch (error) {
      console.error('Error fetching integrations:', error);
      throw error;
    }
  },

  addIntegration: async (
    integration: Omit<DatabaseIntegration, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<Integration> => {
    try {
      const credentialsJson = JSON.stringify(integration.credentials);
      const configurationJson = JSON.stringify(integration.configuration);

      const result = await pool`
        INSERT INTO integrations (
          user_id, name, type, platform, status, credentials, configuration,
          last_sync, sync_frequency, is_active
        ) VALUES (
          ${userId}, ${integration.name}, ${integration.type}, ${integration.platform},
          ${integration.status}, ${credentialsJson}, ${configurationJson},
          ${integration.last_sync || null}, ${integration.sync_frequency}, ${integration.is_active}
        ) RETURNING *
      `;

      return transformDatabaseIntegrationToIntegration(result[0] as DatabaseIntegration);
    } catch (error) {
      console.error('Error adding integration:', error);
      throw error;
    }
  },

  updateIntegration: async (
    id: string,
    updates: Partial<Omit<DatabaseIntegration, 'id' | 'user_id' | 'created_at'>>,
    userId: string
  ): Promise<Integration> => {
    try {
      const credentialsJson = updates.credentials ? JSON.stringify(updates.credentials) : null;
      const configurationJson = updates.configuration
        ? JSON.stringify(updates.configuration)
        : null;

      const result = await pool`
        UPDATE integrations 
        SET
          name = COALESCE(${updates.name ?? null}, name),
          type = COALESCE(${updates.type ?? null}, type),
          platform = COALESCE(${updates.platform ?? null}, platform),
          status = COALESCE(${updates.status ?? null}, status),
          credentials = COALESCE(${credentialsJson}, credentials),
          configuration = COALESCE(${configurationJson}, configuration),
          last_sync = COALESCE(${updates.last_sync ?? null}, last_sync),
          sync_frequency = COALESCE(${updates.sync_frequency ?? null}, sync_frequency),
          is_active = COALESCE(${updates.is_active ?? null}, is_active),
          updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('Integration not found or access denied');
      }

      return transformDatabaseIntegrationToIntegration(result[0] as DatabaseIntegration);
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

  // Image Styles (read-only for client)
  getImageStyles: async (userId?: string): Promise<ImageStyle[]> => {
    try {
      const result = await pool`
        SELECT * FROM image_styles
        ${userId ? pool`WHERE user_id = ${userId}` : pool``}
        ORDER BY created_at DESC
      `;

      return result.map(
        (row: any) =>
          ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            stylePrompt: row.style_prompt,
            colorPalette: row.color_palette,
            visualElements: row.visual_elements,
            brandAssets: row.brand_assets,
            createdAt: new Date(row.created_at),
          }) as ImageStyle
      );
    } catch (error) {
      console.error('Error fetching image styles:', error);
      throw error;
    }
  },

  // Test connection
  testConnection: async (): Promise<boolean> => {
    try {
      const result = await pool`SELECT NOW()`;
      return result.length > 0;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  },
};

// Helper function to safely parse JSON fields
function safeJsonParse<T>(value: string | T | null | undefined, defaultValue: T): T {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn('Failed to parse JSON, returning default value:', e);
      return defaultValue;
    }
  }
  return value as T;
}

// Helper function to transform database post to app post format
function transformDatabasePostToPost(dbPost: DatabasePost): Post {
  return {
    id: dbPost.id,
    userId: dbPost.user_id,
    topic: dbPost.topic,
    idea: dbPost.idea,
    content: dbPost.content,
    status: dbPost.status,
    tags: dbPost.tags || [],
    socialMediaPosts: safeJsonParse(dbPost.social_media_posts, {}),
    socialMediaTones: safeJsonParse(dbPost.social_media_tones, {}),
    socialMediaAudiences: safeJsonParse(dbPost.social_media_audiences, {}),
    scheduleDate: dbPost.schedule_date ? new Date(dbPost.schedule_date) : undefined,
    createdAt: dbPost.created_at ? new Date(dbPost.created_at) : undefined,
    postedAt: dbPost.posted_at ? new Date(dbPost.posted_at) : undefined,
    selectedImage: dbPost.selected_image,
    summary: dbPost.summary,
    headlines: dbPost.headlines || [],
    brandVoiceId: dbPost.brand_voice_id,
    audienceProfileId: dbPost.audience_profile_id,
    campaignId: dbPost.campaign_id,
    seriesId: dbPost.series_id,
    templateId: dbPost.template_id,
    performanceScore: dbPost.performance_score
      ? parseFloat(dbPost.performance_score.toString())
      : undefined,
    optimizationSuggestions: safeJsonParse(dbPost.optimization_suggestions, []),
    imageStyleId: dbPost.image_style_id,
  };
}

// Helper functions for Brand Voice transformations
function transformDatabaseBrandVoiceToBrandVoice(dbBrandVoice: DatabaseBrandVoice): BrandVoice {
  return {
    id: dbBrandVoice.id,
    userId: dbBrandVoice.user_id,
    name: dbBrandVoice.name,
    tone: dbBrandVoice.tone,
    vocabulary: safeJsonParse(dbBrandVoice.vocabulary, []),
    writingStyle: dbBrandVoice.writing_style,
    targetAudience: dbBrandVoice.target_audience,
    sampleContent: safeJsonParse(dbBrandVoice.sample_content, []),
    createdAt: new Date(dbBrandVoice.created_at),
  };
}

// Helper functions for Audience Profile transformations
function transformDatabaseAudienceProfileToAudienceProfile(
  dbProfile: DatabaseAudienceProfile
): AudienceProfile {
  return {
    id: dbProfile.id,
    userId: dbProfile.user_id,
    name: dbProfile.name,
    ageRange: dbProfile.age_range,
    industry: dbProfile.industry,
    interests: safeJsonParse(dbProfile.interests, []),
    painPoints: safeJsonParse(dbProfile.pain_points, []),
    preferredContentTypes: safeJsonParse(dbProfile.preferred_content_types, []),
    engagementPatterns: safeJsonParse(dbProfile.engagement_patterns, {}),
    createdAt: new Date(dbProfile.created_at),
  };
}

// Helper function to safely parse array fields that might already be arrays
function safeJsonParseArray<T>(value: string | T[] | null | undefined, defaultValue: T[]): T[] {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch (e) {
      console.warn('Failed to parse JSON array, returning default value:', e);
      return defaultValue;
    }
  }
  return defaultValue;
}

// Helper functions for Campaign transformations
function transformDatabaseCampaignToCampaign(dbCampaign: DatabaseCampaign): Campaign {
  // Default CampaignMetrics structure if none exists
  const defaultPerformance = {
    totalPosts: 0,
    totalEngagement: 0,
    avgEngagementRate: 0,
    platformPerformance: {},
  };

  return {
    id: dbCampaign.id,
    userId: dbCampaign.user_id,
    name: dbCampaign.name,
    description: dbCampaign.description,
    theme: dbCampaign.theme,
    startDate: new Date(dbCampaign.start_date),
    endDate: new Date(dbCampaign.end_date),
    posts: [], // Will be populated by joining with posts table
    platforms: safeJsonParseArray(dbCampaign.platforms, []),
    status: dbCampaign.status,
    performance: safeJsonParse(dbCampaign.performance, defaultPerformance),
    createdAt: new Date(dbCampaign.created_at),
  };
}

// Helper functions for Integration transformations
function transformDatabaseIntegrationToIntegration(
  dbIntegration: DatabaseIntegration
): Integration {
  return {
    id: dbIntegration.id,
    userId: dbIntegration.user_id,
    name: dbIntegration.name,
    type: dbIntegration.type,
    platform: dbIntegration.platform,
    status: dbIntegration.status,
    credentials: dbIntegration.credentials,
    configuration: dbIntegration.configuration,
    lastSync: dbIntegration.last_sync ? new Date(dbIntegration.last_sync) : undefined,
    syncFrequency: dbIntegration.sync_frequency,
    isActive: dbIntegration.is_active,
    createdAt: new Date(dbIntegration.created_at),
    updatedAt: new Date(dbIntegration.updated_at),
  };
}

// Helper functions for Analytics Data transformations
function transformDatabaseAnalyticsDataToAnalyticsData(
  dbAnalytics: DatabaseAnalyticsData
): AnalyticsData {
  return {
    id: dbAnalytics.id,
    postId: dbAnalytics.post_id,
    platform: dbAnalytics.platform,
    likes: dbAnalytics.likes,
    shares: dbAnalytics.shares,
    comments: dbAnalytics.comments,
    clicks: dbAnalytics.clicks,
    impressions: dbAnalytics.impressions,
    reach: dbAnalytics.reach,
    recordedAt: new Date(dbAnalytics.recorded_at),
  };
}

// Helper functions for Integration Alert transformations
function transformDatabaseIntegrationAlertToIntegrationAlert(
  dbAlert: DatabaseIntegrationAlert
): IntegrationAlert {
  return {
    id: dbAlert.id,
    integrationId: dbAlert.integration_id,
    type: dbAlert.type,
    title: dbAlert.title,
    message: dbAlert.message,
    severity: dbAlert.severity,
    isResolved: dbAlert.is_resolved,
    resolvedAt: dbAlert.resolved_at ? new Date(dbAlert.resolved_at) : undefined,
    createdAt: new Date(dbAlert.created_at),
    metadata: dbAlert.metadata,
  };
}

// Helper functions for Integration Log transformations
function transformDatabaseIntegrationLogToIntegrationLog(
  dbLog: DatabaseIntegrationLog
): IntegrationLog {
  return {
    id: dbLog.id,
    integrationId: dbLog.integration_id,
    level: dbLog.level,
    message: dbLog.message,
    metadata: dbLog.metadata,
    timestamp: new Date(dbLog.timestamp),
    userId: dbLog.user_id,
  };
}

// Export for compatibility
export const databaseService = db;

// Export the raw postgres connection for direct SQL queries
export const query = async (sql: string, params: any[] = []) => {
  try {
    // Note: This function uses raw SQL strings which is less safe than template literals
    // Consider refactoring callers to use the postgres template literal syntax instead
    const result = await pool.unsafe(sql, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error; // Re-throw the error so it can be handled by the caller
  }
};
