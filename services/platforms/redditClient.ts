// services/platforms/redditClient.ts
import { RedditCredentials } from '../../types';
import { db } from '../databaseService';

export class RedditClient {
  private credentials: RedditCredentials;
  private baseUrl: string = 'https://oauth.reddit.com';
  private accessToken: string | null = null;

  constructor(credentials: RedditCredentials) {
    this.credentials = credentials;
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      if (!this.credentials.clientId || !this.credentials.clientSecret) {
        return { success: false, error: 'Missing Reddit API credentials' };
      }

      // Get access token
      await this.getAccessToken();

      if (!this.accessToken) {
        return { success: false, error: 'Failed to obtain Reddit access token' };
      }

      // Test connection by getting user info
      const response = await fetch(`${this.baseUrl}/api/v1/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'User-Agent': this.credentials.userAgent,
        },
      });

      if (response.ok) {
        return { success: true, details: { message: 'Reddit API connection successful' } };
      } else {
        return { success: false, error: 'Failed to connect to Reddit API' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to connect to Reddit' };
    }
  }

  private async getAccessToken(): Promise<void> {
    try {
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${this.credentials.clientId}:${this.credentials.clientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.credentials.userAgent,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.accessToken = data.access_token;
      }
    } catch (error) {
      console.error('Error getting Reddit access token:', error);
    }
  }

  async postToSubreddit(
    subreddit: string,
    title: string,
    text: string,
    kind: 'text' | 'link' = 'text'
  ): Promise<{ success: boolean; postId?: string; url?: string; error?: string }> {
    try {
      if (!this.accessToken) {
        await this.getAccessToken();
      }

      if (!this.accessToken) {
        return { success: false, error: 'No access token available' };
      }

      const response = await fetch(`${this.baseUrl}/api/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.credentials.userAgent,
        },
        body: new URLSearchParams({
          sr: subreddit,
          kind: kind,
          title: title,
          text: text,
          api_type: 'json',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.json?.data?.name) {
          const postId = data.json.data.name;
          return {
            success: true,
            postId,
            url: `https://reddit.com/r/${subreddit}/comments/${postId.split('_')[1]}/`,
          };
        }
      }

      return { success: false, error: 'Failed to post to Reddit' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to post to Reddit' };
    }
  }

  async getPostMetrics(postId: string): Promise<{
    likes: number;
    shares: number;
    comments: number;
    impressions: number;
    engagementRate: number;
  }> {
    try {
      if (!this.accessToken) {
        await this.getAccessToken();
      }

      if (!this.accessToken) {
        return { likes: 0, shares: 0, comments: 0, impressions: 0, engagementRate: 0 };
      }

      // Get post details
      const response = await fetch(`${this.baseUrl}/api/info`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'User-Agent': this.credentials.userAgent,
        },
        body: new URLSearchParams({
          id: postId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const post = data.data?.children?.[0]?.data;

        if (post) {
          const totalEngagement = post.ups + post.num_comments;
          const engagementRate = post.ups > 0 ? totalEngagement / post.ups : 0;

          return {
            likes: post.ups || 0,
            shares: 0, // Reddit doesn't have shares
            comments: post.num_comments || 0,
            impressions: 0, // Not available in Reddit API
            engagementRate: Math.min(engagementRate, 1),
          };
        }
      }

      return { likes: 0, shares: 0, comments: 0, impressions: 0, engagementRate: 0 };
    } catch (error) {
      console.error('Error fetching Reddit post metrics:', error);
      return { likes: 0, shares: 0, comments: 0, impressions: 0, engagementRate: 0 };
    }
  }

  async getTrendingTopics(categories?: string[]): Promise<any[]> {
    try {
      if (!this.accessToken) {
        await this.getAccessToken();
      }

      if (!this.accessToken) {
        return [];
      }

      // Get trending posts from popular subreddits
      const subreddits = categories?.length
        ? categories
        : ['popular', 'all', 'technology', 'business'];
      const allTopics: any[] = [];

      for (const subreddit of subreddits) {
        const response = await fetch(`${this.baseUrl}/r/${subreddit}/hot`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'User-Agent': this.credentials.userAgent,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const posts = data.data?.children || [];

          posts.slice(0, 5).forEach((post: any) => {
            allTopics.push({
              topic: post.data.title,
              platform: 'reddit',
              volume: post.data.ups || 0,
              sentiment: 'neutral' as const,
              relatedHashtags: [],
              category: subreddit,
              trendingScore: post.data.ups || 0,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });
          });
        }
      }

      return allTopics;
    } catch (error) {
      console.error('Error fetching Reddit trending topics:', error);
      return [];
    }
  }

  async getTrendingHashtags(topics: string[]): Promise<string[]> {
    try {
      // Reddit doesn't use hashtags in the same way as other platforms
      // Return topic-based tags
      return topics.map((topic) => `r/${topic.replace(/\s+/g, '')}`);
    } catch (error) {
      console.error('Error fetching Reddit trending hashtags:', error);
      return [];
    }
  }

  async getHashtagMetrics(hashtag: string): Promise<{
    usageCount: number;
    avgEngagement: number;
    trendingScore: number;
  }> {
    // Reddit doesn't provide hashtag metrics
    return {
      usageCount: 0,
      avgEngagement: 0,
      trendingScore: 0,
    };
  }

  async getOptimizationData(): Promise<any> {
    return {
      platform: 'reddit',
      bestPostingTimes: ['9:00', '12:00', '15:00', '18:00', '21:00'],
      optimalContentLength: 500,
      topPerformingContentTypes: ['text', 'link', 'image'],
      recommendedHashtagCount: 0, // Reddit doesn't use hashtags
      audienceInsights: {
        demographics: { age: '18-45', gender: 'mixed', location: 'global' },
        interests: ['technology', 'gaming', 'news', 'memes'],
        activeHours: ['9:00', '12:00', '15:00', '18:00', '21:00'],
      },
    };
  }
}

export default RedditClient;
