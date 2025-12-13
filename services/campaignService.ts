import {
  Campaign,
  ContentSeries,
  Post,
  CampaignMetrics,
  PlatformMetrics,
  AnalyticsData,
  SeriesPost,
  SchedulingSuggestion,
  TimeSlot,
  AudienceProfile,
  OptimizationSuggestion,
} from '../types';
import { db } from './databaseService';

/**
 * CampaignService - Manages campaigns, content series, and cross-platform coordination
 *
 * Requirements addressed:
 * - 2.1: Content series creation with themes, duration, and posting frequency
 * - 2.2: Series content that builds upon previous posts while maintaining standalone value
 * - 2.3: Campaign coordination across multiple platforms with consistent messaging
 * - 2.4: Automatic post spacing according to optimal engagement times
 * - 2.5: Performance tracking and adjustment suggestions for active series
 */
export class CampaignService {
  // Campaign Management Functions

  /**
   * Creates a new campaign with specified parameters
   * Requirement 2.3: Campaign coordination across multiple platforms
   */
  async createCampaign(campaignData: {
    name: string;
    description: string;
    theme: string;
    startDate: Date;
    endDate: Date;
    platforms: string[];
  }, userId: string): Promise<Campaign> {
    try {
      const campaign = await db.addCampaign({
        name: campaignData.name,
        description: campaignData.description,
        theme: campaignData.theme,
        start_date: campaignData.startDate.toISOString(),
        end_date: campaignData.endDate.toISOString(),
        platforms: campaignData.platforms,
        status: 'draft',
        performance: {
          totalPosts: 0,
          totalEngagement: 0,
          avgEngagementRate: 0,
          platformPerformance: {},
        },
      }, userId);

      return campaign;
    } catch (error) {
      throw new Error(
        `Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Updates an existing campaign
   */
  async updateCampaign(campaignId: string, updates: Partial<Campaign>, userId: string): Promise<Campaign> {
    try {
      const dbUpdates: any = {};

      if (updates.name) dbUpdates.name = updates.name;
      if (updates.description) dbUpdates.description = updates.description;
      if (updates.theme) dbUpdates.theme = updates.theme;
      if (updates.startDate) dbUpdates.start_date = updates.startDate.toISOString();
      if (updates.endDate) dbUpdates.end_date = updates.endDate.toISOString();
      if (updates.platforms) dbUpdates.platforms = updates.platforms;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.performance) dbUpdates.performance = updates.performance;

      return await db.updateCampaign(campaignId, dbUpdates, userId);
    } catch (error) {
      throw new Error(
        `Failed to update campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets all campaigns for the current user
   */
  async getCampaigns(userId: string): Promise<Campaign[]> {
    try {
      return await db.getCampaigns(userId);
    } catch (error) {
      throw new Error(
        `Failed to fetch campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets a specific campaign by ID with associated posts
   */
  async getCampaignById(campaignId: string, userId: string): Promise<Campaign | null> {
    try {
      const campaigns = await db.getCampaigns(userId);
      const campaign = campaigns.find((c) => c.id === campaignId);

      if (!campaign) return null;

      // Get posts associated with this campaign
      const posts = await db.getPosts(userId);
      const campaignPosts = posts.filter((post) => post.campaignId === campaignId);

      return {
        ...campaign,
        posts: campaignPosts.map((post) => post.id),
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Deletes a campaign and optionally its associated content
   */
  async deleteCampaign(
    campaignId: string,
    userId: string,
    deleteAssociatedContent: boolean = false
  ): Promise<void> {
    try {
      if (deleteAssociatedContent) {
        // Delete associated content series
        const series = await db.getContentSeries(userId);
        const campaignSeries = series.filter((s) => s.campaignId === campaignId);

        for (const s of campaignSeries) {
          await this.deleteContentSeries(s.id, userId, true);
        }

        // Remove campaign association from posts
        const posts = await db.getPosts(userId);
        const campaignPosts = posts.filter((post) => post.campaignId === campaignId);

        for (const post of campaignPosts) {
          await db.updatePost(post.id, { campaign_id: undefined }, userId);
        }
      }

      await db.deleteCampaign(campaignId, userId);
    } catch (error) {
      throw new Error(
        `Failed to delete campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Content Series Management Functions

  /**
   * Creates a new content series
   * Requirement 2.1: Content series creation with themes, duration, and posting frequency
   */
  async createContentSeries(seriesData: {
    name: string;
    theme: string;
    totalPosts: number;
    frequency: 'daily' | 'weekly' | 'biweekly';
    campaignId?: string;
  }, userId: string): Promise<ContentSeries> {
    try {
      const series = await db.addContentSeries({
        name: seriesData.name,
        theme: seriesData.theme,
        total_posts: seriesData.totalPosts,
        frequency: seriesData.frequency,
        campaign_id: seriesData.campaignId,
        current_post: 0,
      }, userId);

      return series;
    } catch (error) {
      throw new Error(
        `Failed to create content series: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Updates an existing content series
   */
  async updateContentSeries(
    seriesId: string,
    updates: Partial<ContentSeries>,
    userId: string
  ): Promise<ContentSeries> {
    try {
      const dbUpdates: any = {};

      if (updates.name) dbUpdates.name = updates.name;
      if (updates.theme) dbUpdates.theme = updates.theme;
      if (updates.totalPosts) dbUpdates.total_posts = updates.totalPosts;
      if (updates.frequency) dbUpdates.frequency = updates.frequency;
      if (updates.campaignId) dbUpdates.campaign_id = updates.campaignId;
      if (updates.currentPost !== undefined) dbUpdates.current_post = updates.currentPost;

      return await db.updateContentSeries(seriesId, dbUpdates, userId);
    } catch (error) {
      throw new Error(
        `Failed to update content series: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets all content series for the current user
   */
  async getContentSeries(userId: string): Promise<ContentSeries[]> {
    try {
      const series = await db.getContentSeries(userId);

      // Populate posts for each series
      const posts = await db.getPosts(userId);

      return series.map((s) => ({
        ...s,
        posts: this.getSeriesPostsFromPosts(s.id, posts),
      }));
    } catch (error) {
      throw new Error(
        `Failed to fetch content series: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets a specific content series by ID with associated posts
   */
  async getContentSeriesById(seriesId: string, userId: string): Promise<ContentSeries | null> {
    try {
      const allSeries = await this.getContentSeries(userId);
      return allSeries.find((s) => s.id === seriesId) || null;
    } catch (error) {
      throw new Error(
        `Failed to fetch content series: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Deletes a content series and optionally its associated posts
   */
  async deleteContentSeries(
    seriesId: string,
    userId: string,
    deleteAssociatedPosts: boolean = false
  ): Promise<void> {
    try {
      if (deleteAssociatedPosts) {
        const posts = await db.getPosts(userId);
        const seriesPosts = posts.filter((post) => post.seriesId === seriesId);

        for (const post of seriesPosts) {
          await db.deletePost(post.id, userId);
        }
      } else {
        // Remove series association from posts
        const posts = await db.getPosts(userId);
        const seriesPosts = posts.filter((post) => post.seriesId === seriesId);

        for (const post of seriesPosts) {
          await db.updatePost(post.id, { series_id: undefined }, userId);
        }
      }

      await db.deleteContentSeries(seriesId, userId);
    } catch (error) {
      throw new Error(
        `Failed to delete content series: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Advances a content series to the next post
   * Requirement 2.2: Series content that builds upon previous posts
   */
  async advanceContentSeries(seriesId: string, userId: string): Promise<ContentSeries> {
    try {
      const series = await this.getContentSeriesById(seriesId, userId);
      if (!series) {
        throw new Error('Content series not found');
      }

      if (series.currentPost >= series.totalPosts) {
        throw new Error('Series is already complete');
      }

      return await this.updateContentSeries(seriesId, {
        currentPost: series.currentPost + 1,
      }, userId);
    } catch (error) {
      throw new Error(
        `Failed to advance content series: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Campaign Performance Tracking

  /**
   * Tracks and updates campaign performance metrics
   * Requirement 2.5: Performance tracking for active series
   */
  async updateCampaignPerformance(campaignId: string, userId: string): Promise<CampaignMetrics> {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get all posts in the campaign
      const posts = await db.getPosts(userId);
      const campaignPosts = posts.filter((post) => post.campaignId === campaignId);

      // Get analytics data for campaign posts
      const analyticsPromises = campaignPosts.map((post) => db.getPostAnalytics(post.id));
      const analyticsResults = await Promise.all(analyticsPromises);
      const allAnalytics = analyticsResults.flat();

      // Calculate campaign metrics
      const metrics = this.calculateCampaignMetrics(campaignPosts, allAnalytics);

      // Update campaign with new performance data
      await this.updateCampaign(campaignId, { performance: metrics }, userId);

      return metrics;
    } catch (error) {
      throw new Error(
        `Failed to update campaign performance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets performance metrics for a specific campaign
   */
  async getCampaignPerformance(campaignId: string, userId: string): Promise<CampaignMetrics> {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      return campaign.performance;
    } catch (error) {
      throw new Error(
        `Failed to get campaign performance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets performance comparison across multiple campaigns
   */
  async compareCampaignPerformance(
    campaignIds: string[],
    userId: string
  ): Promise<{ [campaignId: string]: CampaignMetrics }> {
    try {
      const results: { [campaignId: string]: CampaignMetrics } = {};

      for (const campaignId of campaignIds) {
        results[campaignId] = await this.getCampaignPerformance(campaignId, userId);
      }

      return results;
    } catch (error) {
      throw new Error(
        `Failed to compare campaign performance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Cross-Platform Coordination

  /**
   * Coordinates content across multiple platforms with consistent messaging
   * Requirement 2.3: Campaign coordination across multiple platforms
   */
  async coordinateCampaignAcrossPlatforms(
    campaignId: string,
    platforms: string[],
    userId: string,
    audienceProfile?: AudienceProfile
  ): Promise<SchedulingSuggestion[]> {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const posts = await db.getPosts();
      const campaignPosts = posts.filter((post) => post.campaignId === campaignId);

      const suggestions: SchedulingSuggestion[] = [];

      for (const post of campaignPosts) {
        for (const platform of platforms) {
          // Get optimal timing for this platform
          const optimalTimes = await this.getOptimalPostingTimes(platform, audienceProfile);

          if (optimalTimes.length > 0) {
            const bestTime = optimalTimes[0];
            if (bestTime) {
                const suggestedDate = this.calculateNextAvailableSlot(bestTime, post.scheduleDate);

                suggestions.push({
                postId: post.id,
                platform,
                suggestedTime: suggestedDate,
                reason: `Optimal engagement time for ${platform} based on audience patterns`,
                confidence: bestTime.confidence,
                });
            }
          }
        }
      }

      return suggestions;
    } catch (error) {
      throw new Error(
        `Failed to coordinate campaign across platforms: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Ensures consistent messaging across platforms for a campaign
   */
  async ensureConsistentMessaging(campaignId: string, userId: string): Promise<{
    inconsistencies: string[];
    suggestions: string[];
  }> {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const posts = await db.getPosts();
      const campaignPosts = posts.filter((post) => post.campaignId === campaignId);

      const inconsistencies: string[] = [];
      const suggestions: string[] = [];

      // Check for theme consistency
      const campaignTheme = campaign.theme.toLowerCase();

      for (const post of campaignPosts) {
        const postContent = post.content.toLowerCase();
        const postTopic = post.topic.toLowerCase();

        // Check if post aligns with campaign theme
        if (!postContent.includes(campaignTheme) && !postTopic.includes(campaignTheme)) {
          inconsistencies.push(
            `Post "${post.topic}" may not align with campaign theme "${campaign.theme}"`
          );
          suggestions.push(
            `Consider incorporating "${campaign.theme}" theme elements into post "${post.topic}"`
          );
        }

        // Check social media post consistency
        const platforms = Object.keys(post.socialMediaPosts || {});
        if (platforms.length > 1) {
          const messages = Object.values(post.socialMediaPosts || {});
          const uniqueMessages = new Set(
            messages.map((msg) => msg.toLowerCase().replace(/[^\w\s]/g, ''))
          );

          if (uniqueMessages.size > 1) {
            // Messages are different - check if they maintain core message
            const coreKeywords = this.extractKeywords(post.topic);
            const allContainCore = messages.every((msg) =>
              coreKeywords.some((keyword) => msg.toLowerCase().includes(keyword.toLowerCase()))
            );

            if (!allContainCore) {
              inconsistencies.push(
                `Social media posts for "${post.topic}" have inconsistent messaging across platforms`
              );
              suggestions.push(
                `Ensure all platform versions of "${post.topic}" contain core message elements`
              );
            }
          }
        }
      }

      return { inconsistencies, suggestions };
    } catch (error) {
      throw new Error(
        `Failed to check message consistency: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Scheduling Optimization

  /**
   * Automatically spaces posts according to optimal engagement times
   * Requirement 2.4: Automatic post spacing according to optimal engagement times
   */
  async optimizeSeriesScheduling(
    seriesId: string,
    userId: string,
    audienceProfile?: AudienceProfile
  ): Promise<SchedulingSuggestion[]> {
    try {
      const series = await this.getContentSeriesById(seriesId, userId);
      if (!series) {
        throw new Error('Content series not found');
      }

      const posts = await db.getPosts();
      const seriesPosts = posts.filter((post) => post.seriesId === seriesId);

      const suggestions: SchedulingSuggestion[] = [];
      let currentDate = new Date();

      // Calculate frequency interval
      const intervalDays = this.getFrequencyIntervalDays(series.frequency);

      for (let i = 0; i < seriesPosts.length; i++) {
        const post = seriesPosts[i];
        if (!post) continue;

        // Get optimal times for the post's platforms
        const platforms = Object.keys(post.socialMediaPosts || {});

        for (const platform of platforms) {
          const optimalTimes = await this.getOptimalPostingTimes(platform, audienceProfile);

          if (optimalTimes.length > 0) {
            const bestTime = optimalTimes[0];
            if (!bestTime) continue;
            
            const scheduledDate = new Date(currentDate);
            scheduledDate.setDate(scheduledDate.getDate() + i * intervalDays);

            // Adjust to optimal time of day
            const parts = bestTime.time.split(':').map(Number);
            const hours = parts[0] || 0;
            const minutes = parts[1] || 0;
            scheduledDate.setHours(hours, minutes, 0, 0);

            suggestions.push({
              postId: post.id,
              platform,
              suggestedTime: scheduledDate,
              reason: `Optimized for ${series.frequency} series posting with ${platform} engagement patterns`,
              confidence: bestTime.confidence,
            });
          }
        }
      }

      return suggestions;
    } catch (error) {
      throw new Error(
        `Failed to optimize series scheduling: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Suggests adjustments for active series based on performance
   * Requirement 2.5: Performance tracking and adjustment suggestions
   */
  async suggestSeriesAdjustments(seriesId: string, userId: string): Promise<OptimizationSuggestion[]> {
    try {
      const series = await this.getContentSeriesById(seriesId, userId);
      if (!series) {
        throw new Error('Content series not found');
      }

      const posts = await db.getPosts();
      const seriesPosts = posts.filter((post) => post.seriesId === seriesId);

      // Get analytics for series posts
      const analyticsPromises = seriesPosts.map((post) => db.getPostAnalytics(post.id));
      const analyticsResults = await Promise.all(analyticsPromises);
      const allAnalytics = analyticsResults.flat();

      const suggestions: OptimizationSuggestion[] = [];

      // Analyze performance trends
      if (allAnalytics.length > 0) {
        const avgEngagement =
          allAnalytics.reduce(
            (sum, analytics) => sum + analytics.likes + analytics.shares + analytics.comments,
            0
          ) / allAnalytics.length;

        const recentAnalytics = allAnalytics.slice(-3); // Last 3 posts
        const recentAvgEngagement =
          recentAnalytics.reduce(
            (sum, analytics) => sum + analytics.likes + analytics.shares + analytics.comments,
            0
          ) / recentAnalytics.length;

        // Check if engagement is declining
        if (recentAvgEngagement < avgEngagement * 0.8) {
          suggestions.push({
            type: 'content',
            title: 'Engagement Declining',
            description:
              'Recent posts in this series are showing lower engagement. Consider refreshing the content approach or theme.',
            impact: 'high',
            effort: 'medium',
          });
        }

        // Check posting frequency effectiveness
        const frequencyDays = this.getFrequencyIntervalDays(series.frequency);
        if (frequencyDays === 1 && avgEngagement < 50) {
          // Daily posting with low engagement
          suggestions.push({
            type: 'timing',
            title: 'Consider Reducing Frequency',
            description:
              'Daily posting may be overwhelming your audience. Consider switching to weekly posting.',
            impact: 'medium',
            effort: 'low',
          });
        }

        // Platform-specific suggestions
        const platformPerformance: { [platform: string]: number } = {};
        allAnalytics.forEach((analytics) => {
          let perf = platformPerformance[analytics.platform];
          if (!perf) {
            perf = 0;
            platformPerformance[analytics.platform] = perf;
          }
          platformPerformance[analytics.platform] = perf + analytics.likes + analytics.shares + analytics.comments;
        });

        const bestPlatform = Object.entries(platformPerformance).sort(([, a], [, b]) => b - a)[0];

        if (bestPlatform && Object.keys(platformPerformance).length > 1) {
          suggestions.push({
            type: 'format',
            title: `Focus on ${bestPlatform[0]}`,
            description: `${bestPlatform[0]} is showing the best engagement for this series. Consider prioritizing content for this platform.`,
            impact: 'medium',
            effort: 'low',
          });
        }
      }

      // Content variety suggestions
      if (seriesPosts.length > 3) {
        const topics = seriesPosts.map((post) => post.topic.toLowerCase());
        const uniqueTopics = new Set(topics);

        if (uniqueTopics.size / topics.length < 0.7) {
          // Less than 70% unique topics
          suggestions.push({
            type: 'content',
            title: 'Increase Content Variety',
            description:
              'Your series topics are becoming repetitive. Consider exploring different angles or subtopics within your theme.',
            impact: 'medium',
            effort: 'medium',
          });
        }
      }

      return suggestions;
    } catch (error) {
      throw new Error(
        `Failed to generate series adjustment suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Helper Methods

  private getSeriesPostsFromPosts(seriesId: string, posts: Post[]): SeriesPost[] {
    return posts
      .filter((post) => post.seriesId === seriesId)
      .map((post, index) => ({
        id: post.id,
        seriesId: seriesId,
        postId: post.id,
        sequenceNumber: index + 1,
        title: post.topic,
        status: post.status,
        scheduledDate: post.scheduleDate,
      }))
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  private calculateCampaignMetrics(posts: Post[], analytics: AnalyticsData[]): CampaignMetrics {
    const totalPosts = posts.length;
    const totalEngagement = analytics.reduce(
      (sum, data) => sum + data.likes + data.shares + data.comments + data.clicks,
      0
    );
    const totalImpressions = analytics.reduce((sum, data) => sum + data.impressions, 0);
    const avgEngagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

    // Find top performing post
    const postEngagement: { [postId: string]: number } = {};
    analytics.forEach((data) => {
      let engagement = postEngagement[data.postId];
      if (!engagement) {
        engagement = 0;
        postEngagement[data.postId] = engagement;
      }
      postEngagement[data.postId] = engagement + data.likes + data.shares + data.comments + data.clicks;
    });

    const topPerformingPost = Object.entries(postEngagement).sort(([, a], [, b]) => b - a)[0]?.[0];

    // Calculate platform performance
    const platformPerformance: { [platform: string]: PlatformMetrics } = {};

    analytics.forEach((data) => {
      let perf = platformPerformance[data.platform];
      if (!perf) {
        perf = {
          posts: 0,
          totalLikes: 0,
          totalShares: 0,
          totalComments: 0,
          avgEngagementRate: 0,
        };
        platformPerformance[data.platform] = perf;
      }

      perf.totalLikes += data.likes;
      perf.totalShares += data.shares;
      perf.totalComments += data.comments;
    });

    // Count posts per platform and calculate engagement rates
    posts.forEach((post) => {
      Object.keys(post.socialMediaPosts || {}).forEach((platform) => {
        const metrics = platformPerformance[platform];
        if (metrics) {
          metrics.posts += 1;
        }
      });
    });

    Object.keys(platformPerformance).forEach((platform) => {
      const platformAnalytics = analytics.filter((data) => data.platform === platform);
      const platformImpressions = platformAnalytics.reduce(
        (sum, data) => sum + data.impressions,
        0
      );
      const platformEngagement = platformAnalytics.reduce(
        (sum, data) => sum + data.likes + data.shares + data.comments + data.clicks,
        0
      );

      const perf = platformPerformance[platform];
      if (perf) {
        perf.avgEngagementRate =
          platformImpressions > 0 ? (platformEngagement / platformImpressions) * 100 : 0;
      }
    });

    return {
      totalPosts,
      totalEngagement,
      avgEngagementRate,
      topPerformingPost,
      platformPerformance,
    };
  }

  private async getOptimalPostingTimes(
    platform: string,
    audienceProfile?: AudienceProfile
  ): Promise<TimeSlot[]> {
    // Default optimal times by platform (based on general best practices)
    const defaultOptimalTimes: { [platform: string]: TimeSlot[] } = {
      twitter: [
        { time: '09:00', dayOfWeek: 2, engagementScore: 85, confidence: 0.8 }, // Tuesday 9 AM
        { time: '15:00', dayOfWeek: 3, engagementScore: 82, confidence: 0.75 }, // Wednesday 3 PM
      ],
      linkedin: [
        { time: '08:00', dayOfWeek: 2, engagementScore: 88, confidence: 0.85 }, // Tuesday 8 AM
        { time: '12:00', dayOfWeek: 4, engagementScore: 85, confidence: 0.8 }, // Thursday 12 PM
      ],
      facebook: [
        { time: '13:00', dayOfWeek: 3, engagementScore: 80, confidence: 0.7 }, // Wednesday 1 PM
        { time: '15:00', dayOfWeek: 5, engagementScore: 78, confidence: 0.68 }, // Friday 3 PM
      ],
      instagram: [
        { time: '11:00', dayOfWeek: 2, engagementScore: 83, confidence: 0.75 }, // Tuesday 11 AM
        { time: '14:00', dayOfWeek: 5, engagementScore: 81, confidence: 0.73 }, // Friday 2 PM
      ],
    };

    // If audience profile is provided, adjust times based on engagement patterns
    if (audienceProfile && audienceProfile.engagementPatterns && audienceProfile.engagementPatterns[platform]) {
      const patterns = audienceProfile.engagementPatterns[platform];
      if (patterns) {
        return patterns.bestPostingTimes || defaultOptimalTimes[platform] || [];
      }
    }

    return defaultOptimalTimes[platform] || [];
  }

  private calculateNextAvailableSlot(timeSlot: TimeSlot, preferredDate?: Date): Date {
    const now = new Date();
    const targetDate = preferredDate || now;

    // Find the next occurrence of the optimal day/time
    const daysUntilTarget = (timeSlot.dayOfWeek - targetDate.getDay() + 7) % 7;
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + daysUntilTarget);

    // Set the optimal time
    const parts = timeSlot.time.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    nextDate.setHours(hours, minutes, 0, 0);

    // If the calculated time is in the past, move to next week
    if (nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 7);
    }

    return nextDate;
  }

  private getFrequencyIntervalDays(frequency: 'daily' | 'weekly' | 'biweekly'): number {
    switch (frequency) {
      case 'daily':
        return 1;
      case 'weekly':
        return 7;
      case 'biweekly':
        return 14;
      default:
        return 7;
    }
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - split by spaces and filter out common words
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !commonWords.has(word))
      .slice(0, 5); // Return top 5 keywords
  }
}

// Export singleton instance
export const campaignService = new CampaignService();
