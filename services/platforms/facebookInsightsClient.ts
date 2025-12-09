// services/platforms/facebookInsightsClient.ts
import { FacebookCredentials } from '../../types';
import { db } from '../databaseService';

export class FacebookInsightsClient {
  private credentials: FacebookCredentials;
  private baseUrl: string = 'https://graph.facebook.com/v18.0';

  constructor(credentials: FacebookCredentials) {
    this.credentials = credentials;
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      if (!this.credentials.appId || !this.credentials.appSecret || !this.credentials.accessToken) {
        return { success: false, error: 'Missing Facebook API credentials' };
      }

      // Test connection by getting page info
      const response = await fetch(`${this.baseUrl}/me/accounts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { success: true, details: { message: 'Facebook Insights connection successful' } };
      } else {
        return { success: false, error: 'Failed to connect to Facebook Insights' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to connect to Facebook Insights' };
    }
  }

  async getPageInsights(
    pageId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    pageViews: number;
    pageLikes: number;
    postEngagements: number;
    reach: number;
    impressions: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${pageId}/insights`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: new URLSearchParams({
          metric: 'page_views,page_fans,post_engagements,page_reach,page_impressions',
          since: startDate,
          until: endDate,
          period: 'day',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const insights = data.data || [];

        const result = {
          pageViews: 0,
          pageLikes: 0,
          postEngagements: 0,
          reach: 0,
          impressions: 0,
        };

        insights.forEach((insight: any) => {
          const values = insight.values || [];
          const total = values.reduce((sum: number, val: any) => sum + (val.value || 0), 0);

          switch (insight.name) {
            case 'page_views':
              result.pageViews = total;
              break;
            case 'page_fans':
              result.pageLikes = total;
              break;
            case 'post_engagements':
              result.postEngagements = total;
              break;
            case 'page_reach':
              result.reach = total;
              break;
            case 'page_impressions':
              result.impressions = total;
              break;
          }
        });

        return result;
      }

      return { pageViews: 0, pageLikes: 0, postEngagements: 0, reach: 0, impressions: 0 };
    } catch (error) {
      console.error('Error fetching Facebook page insights:', error);
      return { pageViews: 0, pageLikes: 0, postEngagements: 0, reach: 0, impressions: 0 };
    }
  }

  async getPostInsights(
    pageId: string,
    postId: string
  ): Promise<{
    likes: number;
    comments: number;
    shares: number;
    reactions: number;
    reach: number;
    impressions: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${postId}/insights`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: new URLSearchParams({
          metric:
            'post_impressions,post_engaged_users,post_reactions_by_type_total,post_impressions_unique',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const insights = data.data || [];

        const result = {
          likes: 0,
          comments: 0,
          shares: 0,
          reactions: 0,
          reach: 0,
          impressions: 0,
        };

        insights.forEach((insight: any) => {
          const values = insight.values || [];
          const total = values.reduce((sum: number, val: any) => sum + (val.value || 0), 0);

          switch (insight.name) {
            case 'post_impressions':
              result.impressions = total;
              break;
            case 'post_impressions_unique':
              result.reach = total;
              break;
            case 'post_engaged_users':
              result.reactions = total;
              break;
          }
        });

        return result;
      }

      return { likes: 0, comments: 0, shares: 0, reactions: 0, reach: 0, impressions: 0 };
    } catch (error) {
      console.error('Error fetching Facebook post insights:', error);
      return { likes: 0, comments: 0, shares: 0, reactions: 0, reach: 0, impressions: 0 };
    }
  }

  async getAudienceInsights(pageId: string): Promise<{
    demographics: {
      ageGroups: { age: string; percentage: number }[];
      genders: { gender: string; percentage: number }[];
      countries: { country: string; percentage: number }[];
    };
    interests: { interest: string; percentage: number }[];
    activeHours: { hour: number; engagement: number }[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${pageId}/insights`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: new URLSearchParams({
          metric:
            'page_fans_gender_age,page_fans_country,page_fans_locale,page_impressions_by_story_type',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const insights = data.data || [];

        const demographics = {
          ageGroups: [] as { age: string; percentage: number }[],
          genders: [] as { gender: string; percentage: number }[],
          countries: [] as { country: string; percentage: number }[],
        };

        insights.forEach((insight: any) => {
          const values = insight.values || [];

          switch (insight.name) {
            case 'page_fans_gender_age':
              values.forEach((val: any) => {
                const [gender, age] = val.value.split('.');
                demographics.genders.push({ gender, percentage: val.value });
                demographics.ageGroups.push({ age, percentage: val.value });
              });
              break;
            case 'page_fans_country':
              values.forEach((val: any) => {
                demographics.countries.push({ country: val.value, percentage: val.value });
              });
              break;
          }
        });

        return {
          demographics,
          interests: [], // Would need additional API calls
          activeHours: [], // Would need additional API calls
        };
      }

      return {
        demographics: { ageGroups: [], genders: [], countries: [] },
        interests: [],
        activeHours: [],
      };
    } catch (error) {
      console.error('Error fetching Facebook audience insights:', error);
      return {
        demographics: { ageGroups: [], genders: [], countries: [] },
        interests: [],
        activeHours: [],
      };
    }
  }

  async getContentPerformance(
    pageId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    topPosts: { postId: string; engagement: number; reach: number }[];
    contentTypes: { type: string; performance: number }[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${pageId}/posts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: new URLSearchParams({
          fields: 'id,message,created_time,insights.metric(post_impressions,post_engaged_users)',
          since: startDate,
          until: endDate,
          limit: '25',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const posts = data.data || [];

        const topPosts = posts
          .map((post: any) => ({
            postId: post.id,
            engagement: post.insights?.data?.[0]?.values?.[0]?.value || 0,
            reach: post.insights?.data?.[1]?.values?.[0]?.value || 0,
          }))
          .sort((a: any, b: any) => b.engagement - a.engagement);

        return {
          topPosts: topPosts.slice(0, 10),
          contentTypes: [], // Would need additional analysis
        };
      }

      return { topPosts: [], contentTypes: [] };
    } catch (error) {
      console.error('Error fetching Facebook content performance:', error);
      return { topPosts: [], contentTypes: [] };
    }
  }
}

export default FacebookInsightsClient;
