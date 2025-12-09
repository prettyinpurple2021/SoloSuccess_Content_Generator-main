import { Campaign, ContentSeries, CampaignMetrics, DatabaseCampaign } from '../types';
import { apiService } from './clientApiService';

export class CampaignService {
  async createCampaign(
    userId: string,
    campaignData: {
      name: string;
      description: string;
      theme: string;
      startDate: Date;
      endDate: Date;
      platforms: string[];
    }
  ): Promise<Campaign> {
    const created = await apiService.addCampaign(userId, {
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
      } as CampaignMetrics,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return this.transformDatabaseCampaignToCampaign(created as DatabaseCampaign);
  }

  async getCampaigns(userId: string): Promise<Campaign[]> {
    const rows = await apiService.getCampaigns(userId);
    return rows.map((r: DatabaseCampaign) => this.transformDatabaseCampaignToCampaign(r));
  }

  async updateCampaign(
    userId: string,
    campaignId: string,
    updates: Partial<Campaign>
  ): Promise<Campaign> {
    const updated = await apiService.updateCampaign(userId, campaignId, {
      name: updates.name,
      description: updates.description,
      theme: updates.theme,
      start_date: updates.startDate ? updates.startDate.toISOString() : undefined,
      end_date: updates.endDate ? updates.endDate.toISOString() : undefined,
      platforms: updates.platforms,
      status: updates.status,
      performance: updates.performance,
      updated_at: new Date().toISOString(),
    } as any);
    return this.transformDatabaseCampaignToCampaign(updated as DatabaseCampaign);
  }

  async deleteCampaign(userId: string, campaignId: string): Promise<void> {
    await apiService.deleteCampaign(userId, campaignId);
  }

  async createContentSeries(
    userId: string,
    campaignId: string,
    seriesData: { title: string; theme: string; postingFrequency: number }
  ): Promise<ContentSeries> {
    const frequency: 'daily' | 'weekly' | 'biweekly' =
      seriesData.postingFrequency >= 7
        ? 'daily'
        : seriesData.postingFrequency >= 1
          ? 'weekly'
          : 'biweekly';
    return {
      id: `series_${Date.now()}`,
      campaignId,
      name: seriesData.title,
      theme: seriesData.theme,
      totalPosts: 0,
      frequency,
      currentPost: 0,
      posts: [],
      createdAt: new Date(),
    };
  }

  async getCampaignMetrics(): Promise<CampaignMetrics> {
    return {
      totalPosts: 0,
      totalEngagement: 0,
      avgEngagementRate: 0,
      platformPerformance: {},
    };
  }

  private transformDatabaseCampaignToCampaign(dbCampaign: DatabaseCampaign): Campaign {
    return {
      id: dbCampaign.id,
      name: dbCampaign.name,
      description: dbCampaign.description,
      theme: dbCampaign.theme,
      startDate: new Date(dbCampaign.start_date),
      endDate: new Date(dbCampaign.end_date),
      posts: [],
      platforms: dbCampaign.platforms || [],
      status: dbCampaign.status,
      performance: dbCampaign.performance || {
        totalPosts: 0,
        totalEngagement: 0,
        avgEngagementRate: 0,
        platformPerformance: {},
      },
      createdAt: new Date(dbCampaign.created_at),
    };
  }
}

export const campaignService = new CampaignService();
