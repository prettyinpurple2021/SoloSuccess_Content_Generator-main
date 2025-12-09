import { LinkedInCredentials, PostResult, TrendingTopic, PlatformOptimization } from '../../types';

/**
 * LinkedIn API Client
 * Implements real LinkedIn API connections for posting and fetching engagement metrics
 */
export class LinkedInClient {
  private credentials: LinkedInCredentials;
  private baseUrl = 'https://api.linkedin.com/v2';

  constructor(credentials: LinkedInCredentials) {
    this.credentials = credentials;
  }

  /**
   * Test connection to LinkedIn API
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData.message || response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        details: {
          userId: data.id,
          firstName: data.localizedFirstName,
          lastName: data.localizedLastName,
          apiVersion: 'v2',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Post content to LinkedIn
   */
  async postContent(content: string, userId: string, mediaUrls?: string[]): Promise<PostResult> {
    try {
      const payload: any = {
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content,
            },
            shareMediaCategory: mediaUrls && mediaUrls.length > 0 ? 'IMAGE' : 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      if (mediaUrls && mediaUrls.length > 0) {
        payload.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrls.map((url) => ({
          status: 'READY',
          originalUrl: url,
        }));
      }

      const response = await fetch(`${this.baseUrl}/ugcPosts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `Failed to post to LinkedIn: ${errorData.message || response.statusText}`,
          timestamp: new Date(),
          platform: 'linkedin',
        };
      }

      const data = await response.json();
      const postId = data.id;

      return {
        success: true,
        postId,
        url: `https://www.linkedin.com/feed/update/${postId}`,
        timestamp: new Date(),
        platform: 'linkedin',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        platform: 'linkedin',
      };
    }
  }

  /**
   * Fetch engagement metrics for a LinkedIn post
   */
  async getPostMetrics(postId: string): Promise<{
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
    engagementRate: number;
  }> {
    try {
      // LinkedIn Analytics API requires specific permissions and organization context
      const response = await fetch(`${this.baseUrl}/socialActions/${postId}/(likes,comments)`, {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch LinkedIn metrics: HTTP ${response.status}`);
      }

      const data = await response.json();

      const likes = data.likes?.paging?.total || 0;
      const comments = data.comments?.paging?.total || 0;
      const shares = data.shares || 0;
      const impressions = data.impressions || 0;

      const totalEngagement = likes + comments + shares;
      const engagementRate = impressions > 0 ? totalEngagement / impressions : 0;

      return {
        likes,
        comments,
        shares,
        impressions,
        engagementRate,
      };
    } catch (error) {
      console.error('Error fetching LinkedIn post metrics:', error);
      return {
        likes: 0,
        comments: 0,
        shares: 0,
        impressions: 0,
        engagementRate: 0,
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    if (!this.credentials.refreshToken) {
      return null;
    }

    try {
      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.credentials.refreshToken,
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      this.credentials.accessToken = data.access_token;

      if (data.refresh_token) {
        this.credentials.refreshToken = data.refresh_token;
      }

      return data.access_token;
    } catch (error) {
      console.error('Error refreshing LinkedIn access token:', error);
      return null;
    }
  }

  /**
   * Get trending hashtags
   */
  async getTrendingHashtags(topics: string[]): Promise<string[]> {
    try {
      // LinkedIn doesn't have a public trending hashtags API
      // Return hashtags based on provided topics
      return topics.map((topic) => `#${topic.replace(/\s+/g, '')}`);
    } catch (error) {
      console.error('Error fetching LinkedIn trending hashtags:', error);
      return [];
    }
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(categories?: string[]): Promise<TrendingTopic[]> {
    // LinkedIn doesn't have a public trending topics API
    return [];
  }

  /**
   * Get platform optimization data
   */
  async getOptimizationData(): Promise<PlatformOptimization> {
    return {
      platform: 'linkedin',
      bestPostingTimes: ['08:00', '12:00', '17:00'],
      optimalContentLength: {
        min: 150,
        max: 3000,
      },
      topPerformingContentTypes: ['article', 'image', 'document'],
      recommendedHashtagCount: 5,
      audienceInsights: {
        demographics: { age: '25-44', gender: 'mixed' },
        interests: ['business', 'career', 'industry-news'],
        activeHours: ['08:00', '17:00'],
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
    // LinkedIn doesn't provide hashtag metrics in their API
    // Return basic metrics
    return {
      usageCount: 0,
      avgEngagement: 0,
      trendingScore: 0,
    };
  }
}

export default LinkedInClient;
