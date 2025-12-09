// Frontend API service that uses Neon database directly
import { db } from './databaseService';

export const apiService = {
  // Posts
  async getPosts(userId: string) {
    try {
      return await db.getPosts(userId);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      throw new Error('Failed to fetch posts');
    }
  },

  async addPost(userId: string, post: any) {
    try {
      return await db.addPost(post, userId);
    } catch (error) {
      console.error('Failed to create post:', error);
      throw new Error('Failed to create post');
    }
  },

  // Brand Voices
  async getBrandVoices(userId: string) {
    try {
      return await db.getBrandVoices(userId);
    } catch (error) {
      console.error('Failed to fetch brand voices:', error);
      throw new Error('Failed to fetch brand voices');
    }
  },

  async addBrandVoice(userId: string, brandVoice: any) {
    try {
      return await db.addBrandVoice(brandVoice, userId);
    } catch (error) {
      console.error('Failed to create brand voice:', error);
      throw new Error('Failed to create brand voice');
    }
  },

  // Audience Profiles
  async getAudienceProfiles(userId: string) {
    try {
      return await db.getAudienceProfiles(userId);
    } catch (error) {
      console.error('Failed to fetch audience profiles:', error);
      throw new Error('Failed to fetch audience profiles');
    }
  },

  async addAudienceProfile(userId: string, audienceProfile: any) {
    try {
      return await db.addAudienceProfile(audienceProfile, userId);
    } catch (error) {
      console.error('Failed to create audience profile:', error);
      throw new Error('Failed to create audience profile');
    }
  },

  // Campaigns
  async getCampaigns(userId: string) {
    try {
      return await db.getCampaigns(userId);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      throw new Error('Failed to fetch campaigns');
    }
  },

  async addCampaign(userId: string, campaign: any) {
    try {
      return await db.addCampaign(campaign, userId);
    } catch (error) {
      console.error('Failed to create campaign:', error);
      throw new Error('Failed to create campaign');
    }
  },
};
