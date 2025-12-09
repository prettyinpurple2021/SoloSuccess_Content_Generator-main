// services/platforms/googleAnalyticsClient.ts
import { GoogleAnalyticsCredentials } from '../../types';
import { db } from '../databaseService';

export class GoogleAnalyticsClient {
  private credentials: GoogleAnalyticsCredentials;
  private baseUrl: string = 'https://analyticsdata.googleapis.com/v1beta';
  private accessToken: string | null = null;

  constructor(credentials: GoogleAnalyticsCredentials) {
    this.credentials = credentials;
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      if (!this.credentials.clientId || !this.credentials.clientSecret) {
        return { success: false, error: 'Missing Google Analytics credentials' };
      }

      // Test connection by getting property info
      const response = await fetch(
        `${this.baseUrl}/properties/${this.credentials.propertyId}/metadata`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        return { success: true, details: { message: 'Google Analytics connection successful' } };
      } else {
        return { success: false, error: 'Failed to connect to Google Analytics' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to connect to Google Analytics' };
    }
  }

  async getPageViews(
    startDate: string,
    endDate: string
  ): Promise<{
    totalViews: number;
    uniqueViews: number;
    averageTimeOnPage: number;
    bounceRate: number;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/properties/${this.credentials.propertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [
              {
                startDate,
                endDate,
              },
            ],
            metrics: [
              { name: 'screenPageViews' },
              { name: 'activeUsers' },
              { name: 'averageSessionDuration' },
              { name: 'bounceRate' },
            ],
            dimensions: [{ name: 'pagePath' }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rows = data.rows || [];

        const totalViews = rows.reduce(
          (sum: number, row: any) => sum + parseInt(row.metricValues?.[0]?.value || '0'),
          0
        );
        const uniqueViews = rows.reduce(
          (sum: number, row: any) => sum + parseInt(row.metricValues?.[1]?.value || '0'),
          0
        );
        const avgTime =
          rows.reduce(
            (sum: number, row: any) => sum + parseFloat(row.metricValues?.[2]?.value || '0'),
            0
          ) / rows.length;
        const bounceRate =
          rows.reduce(
            (sum: number, row: any) => sum + parseFloat(row.metricValues?.[3]?.value || '0'),
            0
          ) / rows.length;

        return {
          totalViews,
          uniqueViews,
          averageTimeOnPage: avgTime,
          bounceRate: bounceRate / 100, // Convert percentage to decimal
        };
      }

      return { totalViews: 0, uniqueViews: 0, averageTimeOnPage: 0, bounceRate: 0 };
    } catch (error) {
      console.error('Error fetching Google Analytics page views:', error);
      return { totalViews: 0, uniqueViews: 0, averageTimeOnPage: 0, bounceRate: 0 };
    }
  }

  async getTrafficSources(
    startDate: string,
    endDate: string
  ): Promise<{
    organic: number;
    direct: number;
    social: number;
    referral: number;
    paid: number;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/properties/${this.credentials.propertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [
              {
                startDate,
                endDate,
              },
            ],
            metrics: [{ name: 'sessions' }],
            dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rows = data.rows || [];

        const sources = {
          organic: 0,
          direct: 0,
          social: 0,
          referral: 0,
          paid: 0,
        };

        rows.forEach((row: any) => {
          const channel = row.dimensionValues?.[0]?.value || '';
          const sessions = parseInt(row.metricValues?.[0]?.value || '0');

          switch (channel.toLowerCase()) {
            case 'organic search':
              sources.organic += sessions;
              break;
            case 'direct':
              sources.direct += sessions;
              break;
            case 'social':
              sources.social += sessions;
              break;
            case 'referral':
              sources.referral += sessions;
              break;
            case 'paid search':
            case 'paid social':
              sources.paid += sessions;
              break;
          }
        });

        return sources;
      }

      return { organic: 0, direct: 0, social: 0, referral: 0, paid: 0 };
    } catch (error) {
      console.error('Error fetching Google Analytics traffic sources:', error);
      return { organic: 0, direct: 0, social: 0, referral: 0, paid: 0 };
    }
  }

  async getAudienceDemographics(
    startDate: string,
    endDate: string
  ): Promise<{
    ageGroups: { age: string; percentage: number }[];
    genders: { gender: string; percentage: number }[];
    countries: { country: string; percentage: number }[];
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/properties/${this.credentials.propertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [
              {
                startDate,
                endDate,
              },
            ],
            metrics: [{ name: 'activeUsers' }],
            dimensions: [{ name: 'age' }, { name: 'gender' }, { name: 'country' }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rows = data.rows || [];

        const ageGroups: { [key: string]: number } = {};
        const genders: { [key: string]: number } = {};
        const countries: { [key: string]: number } = {};
        let totalUsers = 0;

        rows.forEach((row: any) => {
          const age = row.dimensionValues?.[0]?.value || '';
          const gender = row.dimensionValues?.[1]?.value || '';
          const country = row.dimensionValues?.[2]?.value || '';
          const users = parseInt(row.metricValues?.[0]?.value || '0');

          ageGroups[age] = (ageGroups[age] || 0) + users;
          genders[gender] = (genders[gender] || 0) + users;
          countries[country] = (countries[country] || 0) + users;
          totalUsers += users;
        });

        return {
          ageGroups: Object.entries(ageGroups).map(([age, count]) => ({
            age,
            percentage: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
          })),
          genders: Object.entries(genders).map(([gender, count]) => ({
            gender,
            percentage: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
          })),
          countries: Object.entries(countries).map(([country, count]) => ({
            country,
            percentage: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
          })),
        };
      }

      return { ageGroups: [], genders: [], countries: [] };
    } catch (error) {
      console.error('Error fetching Google Analytics demographics:', error);
      return { ageGroups: [], genders: [], countries: [] };
    }
  }

  async getContentPerformance(
    startDate: string,
    endDate: string
  ): Promise<{
    topPages: { page: string; views: number; engagement: number }[];
    topContent: { content: string; views: number; engagement: number }[];
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/properties/${this.credentials.propertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [
              {
                startDate,
                endDate,
              },
            ],
            metrics: [{ name: 'screenPageViews' }, { name: 'engagementRate' }],
            dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
            orderBys: [
              {
                metric: { metricName: 'screenPageViews' },
                desc: true,
              },
            ],
            limit: 10,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rows = data.rows || [];

        const topPages = rows.map((row: any) => ({
          page: row.dimensionValues?.[0]?.value || '',
          views: parseInt(row.metricValues?.[0]?.value || '0'),
          engagement: parseFloat(row.metricValues?.[1]?.value || '0'),
        }));

        const topContent = rows.map((row: any) => ({
          content: row.dimensionValues?.[1]?.value || '',
          views: parseInt(row.metricValues?.[0]?.value || '0'),
          engagement: parseFloat(row.metricValues?.[1]?.value || '0'),
        }));

        return { topPages, topContent };
      }

      return { topPages: [], topContent: [] };
    } catch (error) {
      console.error('Error fetching Google Analytics content performance:', error);
      return { topPages: [], topContent: [] };
    }
  }
}

export default GoogleAnalyticsClient;
