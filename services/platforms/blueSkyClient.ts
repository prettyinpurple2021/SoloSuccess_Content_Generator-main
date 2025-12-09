// services/platforms/blueSkyClient.ts
import { BlueSkyCredentials } from '../../types';
import { db } from '../databaseService';

export class BlueSkyClient {
  private credentials: BlueSkyCredentials;
  private baseUrl: string = 'https://bsky.social';

  constructor(credentials: BlueSkyCredentials) {
    this.credentials = credentials;
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      if (!this.credentials.handle || !this.credentials.password) {
        return { success: false, error: 'Missing BlueSky credentials' };
      }

      // Test connection by getting user profile
      const response = await fetch(`${this.baseUrl}/xrpc/com.atproto.identity.resolveHandle`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handle: this.credentials.handle,
        }),
      });

      if (response.ok) {
        return { success: true, details: { message: 'BlueSky connection successful' } };
      } else {
        return { success: false, error: 'Failed to connect to BlueSky' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to connect to BlueSky' };
    }
  }

  async postText(
    text: string,
    replyTo?: string
  ): Promise<{ success: boolean; postId?: string; url?: string; error?: string }> {
    try {
      // Create a post using AT Protocol
      const response = await fetch(`${this.baseUrl}/xrpc/com.atproto.repo.createRecord`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
        body: JSON.stringify({
          repo: this.credentials.did,
          collection: 'app.bsky.feed.post',
          record: {
            text: text,
            createdAt: new Date().toISOString(),
            ...(replyTo && { reply: { root: replyTo, parent: replyTo } }),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const postId = data.uri.split('/').pop();
        return {
          success: true,
          postId,
          url: `https://bsky.app/profile/${this.credentials.handle}/post/${postId}`,
        };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Failed to post to BlueSky' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to post to BlueSky' };
    }
  }

  async getPostMetrics(postId: string): Promise<{
    likes: number;
    reposts: number;
    replies: number;
    impressions: number;
    engagementRate: number;
  }> {
    try {
      // Get post engagement metrics
      const response = await fetch(`${this.baseUrl}/xrpc/app.bsky.feed.getPostThread`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uri: `at://${this.credentials.did}/app.bsky.feed.post/${postId}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const post = data.thread?.post;

        return {
          likes: post?.likeCount || 0,
          reposts: post?.repostCount || 0,
          replies: post?.replyCount || 0,
          impressions: 0, // Not available in basic API
          engagementRate: 0, // Would need to calculate from available metrics
        };
      }

      return {
        likes: 0,
        reposts: 0,
        replies: 0,
        impressions: 0,
        engagementRate: 0,
      };
    } catch (error) {
      console.error('Error fetching BlueSky post metrics:', error);
      return {
        likes: 0,
        reposts: 0,
        replies: 0,
        impressions: 0,
        engagementRate: 0,
      };
    }
  }

  async getTrendingTopics(categories?: string[]): Promise<any[]> {
    try {
      // Get trending topics from BlueSky
      const response = await fetch(
        `${this.baseUrl}/xrpc/app.bsky.unspecced.getPopularFeedGenerators`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return (
          data.feeds?.map((feed: any) => ({
            topic: feed.displayName,
            platform: 'bluesky',
            volume: feed.likeCount || 0,
            sentiment: 'neutral' as const,
            relatedHashtags: [],
            category: 'general',
            trendingScore: feed.likeCount || 0,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })) || []
        );
      }

      return [];
    } catch (error) {
      console.error('Error fetching BlueSky trending topics:', error);
      return [];
    }
  }

  async getTrendingHashtags(topics: string[]): Promise<string[]> {
    try {
      // BlueSky doesn't have a direct hashtag trending API
      // Return topic-based hashtags
      return topics.map((topic) => `#${topic.replace(/\s+/g, '')}`);
    } catch (error) {
      console.error('Error fetching BlueSky trending hashtags:', error);
      return [];
    }
  }

  async getHashtagMetrics(hashtag: string): Promise<{
    usageCount: number;
    avgEngagement: number;
    trendingScore: number;
  }> {
    // BlueSky doesn't provide hashtag metrics in their API
    // Return basic metrics
    return {
      usageCount: 0,
      avgEngagement: 0,
      trendingScore: 0,
    };
  }

  async getOptimizationData(): Promise<any> {
    // Return BlueSky-specific optimization recommendations
    return {
      platform: 'bluesky',
      bestPostingTimes: ['9:00', '12:00', '15:00', '18:00'],
      optimalContentLength: 300,
      topPerformingContentTypes: ['text', 'link'],
      recommendedHashtagCount: 2,
      audienceInsights: {
        demographics: { age: '25-44', gender: 'mixed', location: 'global' },
        interests: ['technology', 'open-source', 'decentralization'],
        activeHours: ['9:00', '12:00', '15:00', '18:00'],
      },
    };
  }
}

export default BlueSkyClient;
