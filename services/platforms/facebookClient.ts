import { FacebookCredentials, PostResult, TrendingTopic, PlatformOptimization } from '../../types';

/**
 * Facebook Graph API Client
 * Implements real Facebook API connections for posting and fetching engagement metrics
 */
export class FacebookClient {
  private credentials: FacebookCredentials;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(credentials: FacebookCredentials) {
    this.credentials = credentials;
  }

  /**
   * Test connection to Facebook API
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me?access_token=${this.credentials.accessToken}`,
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
          name: data.name,
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
   * Post content to Facebook Page
   */
  async postToPage(content: string, mediaUrl?: string): Promise<PostResult> {
    try {
      if (!this.credentials.pageId) {
        throw new Error('Page ID is required for posting to Facebook');
      }

      const payload: any = {
        message: content,
        access_token: this.credentials.accessToken,
      };

      if (mediaUrl) {
        payload.url = mediaUrl;
      }

      const endpoint = mediaUrl
        ? `${this.baseUrl}/${this.credentials.pageId}/photos`
        : `${this.baseUrl}/${this.credentials.pageId}/feed`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `Failed to post to Facebook: ${errorData.error?.message || response.statusText}`,
          timestamp: new Date(),
          platform: 'facebook',
        };
      }

      const data = await response.json();
      const postId = data.id || data.post_id;

      return {
        success: true,
        postId,
        url: `https://www.facebook.com/${postId}`,
        timestamp: new Date(),
        platform: 'facebook',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        platform: 'facebook',
      };
    }
  }

  /**
   * Fetch engagement metrics for a Facebook post
   */
  async getPostMetrics(postId: string): Promise<{
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    impressions: number;
    reach: number;
    engagementRate: number;
  }> {
    try {
      const fields =
        'reactions.summary(true),comments.summary(true),shares,insights.metric(post_impressions,post_clicks,post_engaged_users)';
      const response = await fetch(
        `${this.baseUrl}/${postId}?fields=${fields}&access_token=${this.credentials.accessToken}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Facebook metrics: HTTP ${response.status}`);
      }

      const data = await response.json();

      const likes = data.reactions?.summary?.total_count || 0;
      const comments = data.comments?.summary?.total_count || 0;
      const shares = data.shares?.count || 0;

      // Extract insights
      const insights = data.insights?.data || [];
      const impressions =
        insights.find((i: any) => i.name === 'post_impressions')?.values?.[0]?.value || 0;
      const clicks = insights.find((i: any) => i.name === 'post_clicks')?.values?.[0]?.value || 0;
      const engagedUsers =
        insights.find((i: any) => i.name === 'post_engaged_users')?.values?.[0]?.value || 0;

      const totalEngagement = likes + comments + shares;
      const engagementRate = impressions > 0 ? totalEngagement / impressions : 0;

      return {
        likes,
        comments,
        shares,
        clicks,
        impressions,
        reach: engagedUsers,
        engagementRate,
      };
    } catch (error) {
      console.error('Error fetching Facebook post metrics:', error);
      return {
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0,
        impressions: 0,
        reach: 0,
        engagementRate: 0,
      };
    }
  }

  /**
   * Get Page insights
   */
  async getPageInsights(metric: string, period: 'day' | 'week' | 'days_28' = 'day'): Promise<any> {
    try {
      if (!this.credentials.pageId) {
        throw new Error('Page ID is required for page insights');
      }

      const response = await fetch(
        `${this.baseUrl}/${this.credentials.pageId}/insights/${metric}?period=${period}&access_token=${this.credentials.accessToken}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch page insights: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching page insights:', error);
      return [];
    }
  }

  /**
   * Upload photo to Facebook
   */
  async uploadPhoto(photoData: Blob, caption?: string): Promise<string | null> {
    try {
      if (!this.credentials.pageId) {
        throw new Error('Page ID is required for uploading photos');
      }

      const formData = new FormData();
      formData.append('source', photoData);
      formData.append('access_token', this.credentials.accessToken);
      formData.append('published', 'false'); // Upload unpublished for later use

      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch(`${this.baseUrl}/${this.credentials.pageId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Photo upload failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.id || null;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  }


  /**
   * Get trending topics
   */
  async getTrendingTopics(categories?: string[]): Promise<TrendingTopic[]> {
    // Facebook Graph API doesn't expose trending topics directly for public access easily
    return [];
  }

  /**
   * Get platform optimization data
   */
  async getOptimizationData(): Promise<PlatformOptimization> {
    return {
      platform: 'facebook',
      bestPostingTimes: ['13:00', '15:00', '19:00'],
      optimalContentLength: {
        min: 100,
        max: 2000,
      },
      topPerformingContentTypes: ['video', 'image', 'link'],
      recommendedHashtagCount: 3,
      audienceInsights: {
        demographics: { age: '18-65+', gender: 'mixed' },
        interests: ['social', 'entertainment', 'news'],
        activeHours: ['12:00', '20:00'],
      },
    };
  }


}

export default FacebookClient;
