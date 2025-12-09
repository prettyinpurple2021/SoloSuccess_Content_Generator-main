// services/platforms/pinterestClient.ts
import { PinterestCredentials } from '../../types';
import { db } from '../databaseService';

export class PinterestClient {
  private credentials: PinterestCredentials;
  private baseUrl: string = 'https://api.pinterest.com/v5';
  private accessToken: string | null = null;

  constructor(credentials: PinterestCredentials) {
    this.credentials = credentials;
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      if (!this.credentials.appId || !this.credentials.appSecret) {
        return { success: false, error: 'Missing Pinterest API credentials' };
      }

      // Test connection by getting user info
      const response = await fetch(`${this.baseUrl}/user_account`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { success: true, details: { message: 'Pinterest API connection successful' } };
      } else {
        return { success: false, error: 'Failed to connect to Pinterest API' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to connect to Pinterest' };
    }
  }

  async createPin(
    boardId: string,
    title: string,
    description: string,
    imageUrl: string,
    link?: string
  ): Promise<{ success: boolean; pinId?: string; url?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/pins`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_id: boardId,
          title: title,
          description: description,
          media_source: {
            source_type: 'image_url',
            url: imageUrl,
          },
          ...(link && { link }),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          pinId: data.id,
          url: `https://pinterest.com/pin/${data.id}/`,
        };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Failed to create Pinterest pin' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create Pinterest pin' };
    }
  }

  async getPinMetrics(pinId: string): Promise<{
    likes: number;
    shares: number;
    comments: number;
    impressions: number;
    engagementRate: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/pins/${pinId}/analytics`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const metrics = data.daily_metrics?.[0] || {};

        return {
          likes: metrics.pin_promoter_metrics?.impressions || 0,
          shares: metrics.pin_promoter_metrics?.saves || 0,
          comments: 0, // Pinterest doesn't have comments in basic API
          impressions: metrics.pin_promoter_metrics?.impressions || 0,
          engagementRate: metrics.pin_promoter_metrics?.engagement_rate || 0,
        };
      }

      return { likes: 0, shares: 0, comments: 0, impressions: 0, engagementRate: 0 };
    } catch (error) {
      console.error('Error fetching Pinterest pin metrics:', error);
      return { likes: 0, shares: 0, comments: 0, impressions: 0, engagementRate: 0 };
    }
  }

  async getTrendingTopics(categories?: string[]): Promise<any[]> {
    try {
      // Get trending pins from popular boards
      const response = await fetch(`${this.baseUrl}/boards/${this.credentials.userId}/pins`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const pins = data.items || [];

        return pins.slice(0, 10).map((pin: any) => ({
          topic: pin.title,
          platform: 'pinterest',
          volume: pin.save_count || 0,
          sentiment: 'positive' as const,
          relatedHashtags: [],
          category: 'visual',
          trendingScore: pin.save_count || 0,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching Pinterest trending topics:', error);
      return [];
    }
  }

  async getTrendingHashtags(topics: string[]): Promise<string[]> {
    try {
      // Pinterest doesn't have a direct hashtag trending API
      // Return topic-based hashtags
      return topics.map((topic) => `#${topic.replace(/\s+/g, '')}`);
    } catch (error) {
      console.error('Error fetching Pinterest trending hashtags:', error);
      return [];
    }
  }

  async getHashtagMetrics(hashtag: string): Promise<{
    usageCount: number;
    avgEngagement: number;
    trendingScore: number;
  }> {
    // Pinterest doesn't provide hashtag metrics in their API
    return {
      usageCount: 0,
      avgEngagement: 0,
      trendingScore: 0,
    };
  }

  async getOptimizationData(): Promise<any> {
    return {
      platform: 'pinterest',
      bestPostingTimes: ['8:00', '11:00', '15:00', '19:00'],
      optimalContentLength: 200,
      topPerformingContentTypes: ['image', 'video', 'carousel'],
      recommendedHashtagCount: 3,
      audienceInsights: {
        demographics: { age: '25-54', gender: 'female', location: 'global' },
        interests: ['lifestyle', 'home', 'fashion', 'food', 'travel'],
        activeHours: ['8:00', '11:00', '15:00', '19:00'],
      },
    };
  }

  async getBoards(): Promise<{ id: string; name: string; description: string }[]> {
    try {
      const response = await fetch(`${this.baseUrl}/boards`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return (
          data.items?.map((board: any) => ({
            id: board.id,
            name: board.name,
            description: board.description || '',
          })) || []
        );
      }

      return [];
    } catch (error) {
      console.error('Error fetching Pinterest boards:', error);
      return [];
    }
  }
}

export default PinterestClient;
