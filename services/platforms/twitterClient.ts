import { TwitterCredentials, PostResult, TrendingTopic, PlatformOptimization } from '../../types';
import ApiErrorHandler from '../utils/apiErrorHandler';
import RateLimiter from '../utils/rateLimiter';
import MonitoringService from '../utils/monitoringService';

/**
 * Twitter API v2 Client
 * Implements real Twitter API v2 connections for posting and fetching engagement metrics
 */
export class TwitterClient {
  private credentials: TwitterCredentials;
  private baseUrl = 'https://api.twitter.com/2';

  constructor(credentials: TwitterCredentials) {
    this.credentials = credentials;
  }

  /**
   * Test connection to Twitter API
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    const startTime = Date.now();

    try {
      const result = await ApiErrorHandler.executeWithRetry(() =>
        RateLimiter.executeWithRateLimit('twitter', async () => {
          const response = await ApiErrorHandler.withTimeout(
            () =>
              fetch(`${this.baseUrl}/users/me`, {
                headers: {
                  Authorization: `Bearer ${this.credentials.bearerToken || this.credentials.accessToken}`,
                  'Content-Type': 'application/json',
                },
              }),
            10000
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.detail || response.statusText}`);
          }

          return response;
        })
      );

      const data = await result.json();
      const duration = Date.now() - startTime;

      // Record successful metrics
      await MonitoringService.recordMetrics({
        service: 'twitter',
        operation: 'testConnection',
        timestamp: new Date(),
        duration,
        success: true,
        statusCode: 200,
      });

      return {
        success: true,
        details: {
          userId: data.data?.id,
          username: data.data?.username,
          apiVersion: '2.0',
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failed metrics
      await MonitoringService.recordMetrics({
        service: 'twitter',
        operation: 'testConnection',
        timestamp: new Date(),
        duration,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Post a tweet to Twitter
   */
  async postTweet(content: string, mediaIds?: string[]): Promise<PostResult> {
    try {
      const payload: any = { text: content };

      if (mediaIds && mediaIds.length > 0) {
        payload.media = { media_ids: mediaIds };
      }

      const response = await fetch(`${this.baseUrl}/tweets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.bearerToken || this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `Failed to post tweet: ${errorData.detail || response.statusText}`,
          timestamp: new Date(),
          platform: 'twitter',
        };
      }

      const data = await response.json();
      return {
        success: true,
        postId: data.data?.id,
        url: `https://twitter.com/i/web/status/${data.data?.id}`,
        timestamp: new Date(),
        platform: 'twitter',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        platform: 'twitter',
      };
    }
  }

  /**
   * Fetch engagement metrics for a tweet
   */
  async getTweetMetrics(tweetId: string): Promise<{
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
    engagementRate: number;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/tweets/${tweetId}?tweet.fields=public_metrics,non_public_metrics,organic_metrics`,
        {
          headers: {
            Authorization: `Bearer ${this.credentials.bearerToken || this.credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch tweet metrics: HTTP ${response.status}`);
      }

      const data = await response.json();
      const metrics = data.data?.public_metrics || {};
      const organicMetrics = data.data?.organic_metrics || {};

      const likes = metrics.like_count || 0;
      const retweets = metrics.retweet_count || 0;
      const replies = metrics.reply_count || 0;
      const impressions = organicMetrics.impression_count || metrics.impression_count || 0;

      const totalEngagement = likes + retweets + replies;
      const engagementRate = impressions > 0 ? totalEngagement / impressions : 0;

      return {
        likes,
        retweets,
        replies,
        impressions,
        engagementRate,
      };
    } catch (error) {
      console.error('Error fetching tweet metrics:', error);
      return {
        likes: 0,
        retweets: 0,
        replies: 0,
        impressions: 0,
        engagementRate: 0,
      };
    }
  }

  /**
   * Fetch multiple tweets' metrics
   */
  async getMultipleTweetMetrics(tweetIds: string[]): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/tweets?ids=${tweetIds.join(',')}&tweet.fields=public_metrics,non_public_metrics,organic_metrics`,
        {
          headers: {
            Authorization: `Bearer ${this.credentials.bearerToken || this.credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch tweets metrics: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching multiple tweet metrics:', error);
      return [];
    }
  }

  /**
   * Search for trending hashtags
   */
  async getTrendingHashtags(locationOrTopics?: string | string[]): Promise<string[]> {
    // Note: Twitter API v2 doesn't have a direct trending endpoint in the free tier
    // This would require elevated or premium access
    // For now, return empty array - implement when credentials support it
    console.warn('Trending hashtags require elevated Twitter API access');
    return [];
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(categories?: string[]): Promise<TrendingTopic[]> {
    // Twitter v2 trending topics require elevated access
    // For now, return mock data or empty array
    return [];
  }

  /**
   * Get platform optimization data
   */
  async getOptimizationData(): Promise<PlatformOptimization> {
    return {
      platform: 'twitter',
      bestPostingTimes: ['09:00', '12:00', '15:00', '18:00', '21:00'],
      optimalContentLength: {
        min: 100,
        max: 280,
      },
      topPerformingContentTypes: ['text', 'image', 'thread', 'poll'],
      recommendedHashtagCount: 3,
      audienceInsights: {
        demographics: { age: '25-34', gender: 'mixed' },
        interests: ['technology', 'news', 'entertainment'],
        activeHours: ['09:00', '12:00', '18:00'],
      },
    };
  }

  /**
   * Get hashtag metrics
   */
  async getHashtagMetrics(hashtag: string): Promise<{
    usageCount: number;
    avgEngagement: number;
    trendingScore: number;
  }> {
    try {
      // Search for tweets with the hashtag
      const response = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(hashtag)}&max_results=100`,
        {
          headers: {
            Authorization: `Bearer ${this.credentials.bearerToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Hashtag search failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      const tweets = data.data || [];

      // Calculate basic metrics
      const totalEngagement = tweets.reduce((sum: number, tweet: any) => {
        return (
          sum +
          (tweet.public_metrics?.like_count || 0) +
          (tweet.public_metrics?.retweet_count || 0) +
          (tweet.public_metrics?.reply_count || 0)
        );
      }, 0);

      const avgEngagement = tweets.length > 0 ? totalEngagement / tweets.length : 0;
      const trendingScore = Math.min(100, tweets.length * 10 + avgEngagement * 2);

      return {
        usageCount: tweets.length,
        avgEngagement,
        trendingScore,
      };
    } catch (error) {
      console.error('Error fetching hashtag metrics:', error);
      return {
        usageCount: 0,
        avgEngagement: 0,
        trendingScore: 0,
      };
    }
  }

  /**
   * Upload media to Twitter
   */
  async uploadMedia(mediaData: Blob, mediaType: 'image' | 'video' | 'gif'): Promise<string | null> {
    try {
      // Twitter media upload uses v1.1 API
      const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';

      const formData = new FormData();
      formData.append('media', mediaData);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.bearerToken || this.credentials.accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Media upload failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.media_id_string || null;
    } catch (error) {
      console.error('Error uploading media:', error);
      return null;
    }
  }
}

export default TwitterClient;
