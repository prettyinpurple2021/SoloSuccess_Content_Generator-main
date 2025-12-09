import { InstagramCredentials, PostResult, TrendingTopic, PlatformOptimization } from '../../types';

/**
 * Instagram Graph API Client
 * Implements real Instagram API connections for posting and fetching engagement metrics
 */
export class InstagramClient {
  private credentials: InstagramCredentials;
  private baseUrl = 'https://graph.instagram.com';
  private graphBaseUrl = 'https://graph.facebook.com/v18.0';

  constructor(credentials: InstagramCredentials) {
    this.credentials = credentials;
  }

  /**
   * Test connection to Instagram API
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me?fields=id,username&access_token=${this.credentials.accessToken}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData.error?.message || response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        details: {
          userId: data.id,
          username: data.username,
          apiVersion: 'v18.0',
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
   * Create media container for posting
   */
  private async createMediaContainer(imageUrl: string, caption: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.graphBaseUrl}/${this.credentials.userId}/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: this.credentials.accessToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create media container: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.id || null;
    } catch (error) {
      console.error('Error creating media container:', error);
      return null;
    }
  }

  /**
   * Publish media container
   */
  private async publishMediaContainer(creationId: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.graphBaseUrl}/${this.credentials.userId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: this.credentials.accessToken,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to publish media: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.id || null;
    } catch (error) {
      console.error('Error publishing media:', error);
      return null;
    }
  }

  /**
   * Post content to Instagram
   */
  async postContent(caption: string, imageUrl: string): Promise<PostResult> {
    try {
      // Step 1: Create media container
      const creationId = await this.createMediaContainer(imageUrl, caption);

      if (!creationId) {
        throw new Error('Failed to create media container');
      }

      // Wait a moment for container to be ready
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 2: Publish the media
      const mediaId = await this.publishMediaContainer(creationId);

      if (!mediaId) {
        throw new Error('Failed to publish media');
      }

      return {
        success: true,
        postId: mediaId,
        url: `https://www.instagram.com/p/${mediaId}`,
        timestamp: new Date(),
        platform: 'instagram',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        platform: 'instagram',
      };
    }
  }

  /**
   * Fetch engagement metrics for an Instagram post
   */
  async getPostMetrics(mediaId: string): Promise<{
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    impressions: number;
    reach: number;
    engagementRate: number;
  }> {
    try {
      const fields = 'like_count,comments_count,shares_count,saved,impressions,reach,engagement';
      const response = await fetch(
        `${this.graphBaseUrl}/${mediaId}/insights?metric=${fields}&access_token=${this.credentials.accessToken}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Instagram metrics: HTTP ${response.status}`);
      }

      const data = await response.json();
      const insights = data.data || [];

      const getValue = (metricName: string) => {
        const metric = insights.find((i: any) => i.name === metricName);
        return metric?.values?.[0]?.value || 0;
      };

      const likes = getValue('like_count');
      const comments = getValue('comments_count');
      const shares = getValue('shares_count');
      const saves = getValue('saved');
      const impressions = getValue('impressions');
      const reach = getValue('reach');
      const engagement = getValue('engagement');

      const engagementRate = impressions > 0 ? engagement / impressions : 0;

      return {
        likes,
        comments,
        shares,
        saves,
        impressions,
        reach,
        engagementRate,
      };
    } catch (error) {
      console.error('Error fetching Instagram post metrics:', error);
      return {
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        impressions: 0,
        reach: 0,
        engagementRate: 0,
      };
    }
  }

  /**
   * Get user insights
   */
  async getUserInsights(metric: string, period: 'day' | 'week' | 'days_28' = 'day'): Promise<any> {
    try {
      const response = await fetch(
        `${this.graphBaseUrl}/${this.credentials.userId}/insights?metric=${metric}&period=${period}&access_token=${this.credentials.accessToken}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user insights: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching user insights:', error);
      return [];
    }
  }

  /**
   * Get user media
   */
  async getUserMedia(limit: number = 25): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.graphBaseUrl}/${this.credentials.userId}/media?fields=id,caption,media_type,media_url,permalink,timestamp&limit=${limit}&access_token=${this.credentials.accessToken}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user media: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching user media:', error);
      return [];
    }
  }


  /**
   * Get trending topics
   */
  async getTrendingTopics(categories?: string[]): Promise<TrendingTopic[]> {
    // Instagram Graph API doesn't expose trending topics
    return [];
  }

  /**
   * Get platform optimization data
   */
  async getOptimizationData(): Promise<PlatformOptimization> {
    return {
      platform: 'instagram',
      bestPostingTimes: ['11:00', '13:00', '19:00'],
      optimalContentLength: {
        min: 100,
        max: 2200,
      },
      topPerformingContentTypes: ['reel', 'carousel', 'image'],
      recommendedHashtagCount: 10,
      audienceInsights: {
        demographics: { age: '18-34', gender: 'mixed' },
        interests: ['lifestyle', 'visual-arts', 'fashion'],
        activeHours: ['11:00', '21:00'],
      },
    };
  }


}

export default InstagramClient;
