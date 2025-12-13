import {
  AnalyticsData,
  PerformanceReport,
  ContentInsight,
  OptimizationSuggestion,
  PerformanceTrend,
  Post,
  PlatformMetrics,
  EngagementData,
  TimeSlot,
} from '../types';
import { db } from './databaseService';

/**
 * Analytics Service for tracking engagement, generating performance reports,
 * and providing content optimization insights
 */
export class AnalyticsService {
  /**
   * Track engagement metrics for a specific post and platform
   */
  async trackEngagement(
    postId: string,
    platform: string,
    metrics: {
      likes: number;
      shares: number;
      comments: number;
      clicks: number;
      impressions: number;
      reach: number;
    }
  ): Promise<AnalyticsData> {
    try {
      return await db.insertPostAnalytics({
        post_id: postId,
        platform,
        likes: metrics.likes,
        shares: metrics.shares,
        comments: metrics.comments,
        clicks: metrics.clicks,
        impressions: metrics.impressions,
        reach: metrics.reach,
      });
    } catch (error) {
      console.error('Error tracking engagement:', error);
      throw new Error('Failed to track engagement metrics');
    }
  }

  /**
   * Batch track engagement for multiple posts/platforms
   */
  async batchTrackEngagement(
    engagementData: Array<{
      postId: string;
      platform: string;
      metrics: {
        likes: number;
        shares: number;
        comments: number;
        clicks: number;
        impressions: number;
        reach: number;
      };
    }>
  ): Promise<AnalyticsData[]> {
    try {
      const analyticsArray = engagementData.map((data) => ({
        post_id: data.postId,
        platform: data.platform,
        likes: data.metrics.likes,
        shares: data.metrics.shares,
        comments: data.metrics.comments,
        clicks: data.metrics.clicks,
        impressions: data.metrics.impressions,
        reach: data.metrics.reach,
      }));

      return await db.batchInsertAnalytics(analyticsArray);
    } catch (error) {
      console.error('Error batch tracking engagement:', error);
      throw new Error('Failed to batch track engagement metrics');
    }
  }

  /**
   * Generate comprehensive performance report for a given timeframe
   */
  async generatePerformanceReport(
    timeframe: 'week' | 'month' | 'quarter' | 'year'
  ): Promise<PerformanceReport> {
    try {
      // Get base report from database
      const baseReport = await db.generatePerformanceReport(timeframe);

      // Enhance with additional insights
      const topContent = await this.identifyTopPerformingContent(timeframe);
      const trends = await this.calculatePerformanceTrends(timeframe);
      const recommendations = await this.generateOptimizationRecommendations(timeframe);

      return {
        ...baseReport,
        topContent,
        trends,
        recommendations,
      };
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw new Error('Failed to generate performance report');
    }
  }

  /**
   * Identify top-performing content based on engagement metrics
   */
  async identifyTopPerformingContent(
    timeframe?: 'week' | 'month' | 'quarter' | 'year',
    limit: number = 10
  ): Promise<ContentInsight[]> {
    try {
      const topAnalytics = await db.getTopPerformingContent(limit, timeframe);
      const posts = await db.getPosts();

      const insights: ContentInsight[] = [];

      for (const analytics of topAnalytics) {
        const post = posts.find((p) => p.id === analytics.postId);
        if (!post) continue;

        const engagementScore = this.calculateEngagementScore(analytics);
        const contentInsights = this.analyzeContentCharacteristics(post, analytics);

        // The following block was provided in the instruction but seems misplaced and syntactically incorrect
        // as 'analytics' here is a single AnalyticsData object, not an array, and 'suggestions' is undefined.
        // It also breaks the insights.push object structure.
        // I'm omitting it to maintain syntactical correctness and avoid type errors.
        /*
        const totalPerformance = analytics.reduce((sum, a) => sum + this.calculateEngagementScore(a), 0);
        if (analytics.length > 0) {
            const avgPerformance = totalPerformance / analytics.length;
            const recentPerformance = this.calculateEngagementScore(analytics[0]);
            
            if (recentPerformance < avgPerformance * 0.8) {
                suggestions.push('Recent performance is below average. Try testing new content formats.');
            }
        }
        */
        insights.push({
          postId: analytics.postId,
          title: post.topic,
          platform: analytics.platform,
          engagementScore,
          insights: contentInsights,
          contentType: this.determineContentType(post),
        });
      }

      return insights.sort((a, b) => b.engagementScore - a.engagementScore);
    } catch (error) {
      console.error('Error identifying top content:', error);
      throw new Error('Failed to identify top-performing content');
    }
  }

  /**
   * Calculate performance trends over time
   */
  async calculatePerformanceTrends(
    timeframe: 'week' | 'month' | 'quarter' | 'year'
  ): Promise<PerformanceTrend[]> {
    try {
      const currentPeriod = await this.getAnalyticsForPeriod(timeframe, 0);
      const previousPeriod = await this.getAnalyticsForPeriod(timeframe, 1);

      const trends: PerformanceTrend[] = [];

      // Calculate engagement trend
      const currentEngagement = this.calculateTotalEngagement(currentPeriod);
      const previousEngagement = this.calculateTotalEngagement(previousPeriod);
      const engagementChange = this.calculatePercentageChange(
        currentEngagement,
        previousEngagement
      );

      trends.push({
        metric: 'Total Engagement',
        direction: engagementChange > 0 ? 'up' : engagementChange < 0 ? 'down' : 'stable',
        percentage: Math.abs(engagementChange),
        timeframe,
      });

      // Calculate reach trend
      const currentReach = currentPeriod.reduce((sum, data) => sum + data.reach, 0);
      const previousReach = previousPeriod.reduce((sum, data) => sum + data.reach, 0);
      const reachChange = this.calculatePercentageChange(currentReach, previousReach);

      trends.push({
        metric: 'Total Reach',
        direction: reachChange > 0 ? 'up' : reachChange < 0 ? 'down' : 'stable',
        percentage: Math.abs(reachChange),
        timeframe,
      });

      // Calculate engagement rate trend
      const currentRate = this.calculateAverageEngagementRate(currentPeriod);
      const previousRate = this.calculateAverageEngagementRate(previousPeriod);
      const rateChange = this.calculatePercentageChange(currentRate, previousRate);

      trends.push({
        metric: 'Engagement Rate',
        direction: rateChange > 0 ? 'up' : rateChange < 0 ? 'down' : 'stable',
        percentage: Math.abs(rateChange),
        timeframe,
      });

      return trends;
    } catch (error) {
      console.error('Error calculating performance trends:', error);
      throw new Error('Failed to calculate performance trends');
    }
  }

  /**
   * Generate optimization suggestions based on performance data
   */
  async generateOptimizationRecommendations(timeframe?: string): Promise<OptimizationSuggestion[]> {
    try {
      const recommendations: OptimizationSuggestion[] = [];

      // Get analytics data for analysis
      const analyticsData = timeframe
        ? await this.getAnalyticsForPeriod(timeframe as any, 0)
        : await this.getAllAnalytics();

      // Analyze posting times
      const timingRecommendation = this.analyzeOptimalTiming(analyticsData);
      if (timingRecommendation) {
        recommendations.push(timingRecommendation);
      }

      // Analyze content performance
      const contentRecommendations = await this.analyzeContentPerformance(analyticsData);
      recommendations.push(...contentRecommendations);

      // Analyze platform performance
      const platformRecommendations = this.analyzePlatformPerformance(analyticsData);
      recommendations.push(...platformRecommendations);

      // Analyze hashtag performance (if data available)
      const hashtagRecommendations = await this.analyzeHashtagPerformance();
      recommendations.push(...hashtagRecommendations);

      return recommendations.sort((a, b) => {
        const impactScore = { high: 3, medium: 2, low: 1 };
        const effortScore = { low: 3, medium: 2, high: 1 };

        const aScore = impactScore[a.impact] + effortScore[a.effort];
        const bScore = impactScore[b.impact] + effortScore[b.effort];

        return bScore - aScore;
      });
    } catch (error) {
      console.error('Error generating optimization recommendations:', error);
      throw new Error('Failed to generate optimization recommendations');
    }
  }

  /**
   * Get engagement insights for a specific post
   */
  async getPostInsights(postId: string): Promise<{
    analytics: AnalyticsData[];
    insights: string[];
    recommendations: OptimizationSuggestion[];
  }> {
    try {
      const analytics = await db.getPostAnalytics(postId);
      const posts = await db.getPosts();
      const post = posts.find((p) => p.id === postId);

      if (!post) {
        throw new Error('Post not found');
      }

      // analyzeContentCharacteristics expects a single AnalyticsData object, not an array.
      // Assuming it should analyze based on the most recent or first available analytics.
      const insights = this.analyzeContentCharacteristics(post, analytics[0]);
      const recommendations = await this.generatePostSpecificRecommendations(post, analytics);

      return {
        analytics,
        insights,
        recommendations,
      };
    } catch (error) {
      console.error('Error getting post insights:', error);
      throw new Error('Failed to get post insights');
    }
  }

  /**
   * Calculate optimal posting times based on engagement data
   */
  async calculateOptimalPostingTimes(platform?: string): Promise<TimeSlot[]> {
    try {
      const analyticsData = await this.getAllAnalytics();
      const filteredData = platform
        ? analyticsData.filter((data) => data.platform === platform)
        : analyticsData;

      const timeSlots: { [key: string]: { engagement: number; count: number } } = {};

      filteredData.forEach((data) => {
        const hour = data.recordedAt.getHours();
        const dayOfWeek = data.recordedAt.getDay();
        const key = `${dayOfWeek}-${hour}`;

        const engagement = data.likes + data.shares + data.comments + data.clicks;

        if (!timeSlots[key]) {
          timeSlots[key] = { engagement: 0, count: 0 };
        }

        const slot = timeSlots[key];
        if (slot) {
          slot.engagement += engagement;
          slot.count += 1;
        }
      });

      const slots: TimeSlot[] = Object.entries(timeSlots).map(([key, data]) => {
        const parts = key.split('-').map(Number);
        const dayOfWeek = parts[0] !== undefined ? parts[0] : 0;
        const hour = parts[1] !== undefined ? parts[1] : 0;
        const avgEngagement = data.engagement / data.count;

        return {
          time: `${hour.toString().padStart(2, '0')}:00`,
          dayOfWeek,
          engagementScore: avgEngagement,
          confidence: Math.min(data.count / 10, 1), // Confidence based on sample size
        };
      });

      return slots.sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 10); // Return top 10 time slots
    } catch (error) {
      console.error('Error calculating optimal posting times:', error);
      throw new Error('Failed to calculate optimal posting times');
    }
  }

  // Private helper methods

  private calculateEngagementScore(analytics: AnalyticsData): number {
    const { likes, shares, comments, clicks, impressions } = analytics;
    const totalEngagement = likes + shares + comments + clicks;

    // Weight different engagement types
    const weightedEngagement = likes * 1 + shares * 3 + comments * 2 + clicks * 1.5;

    // Calculate engagement rate
    const engagementRate = impressions > 0 ? (totalEngagement / impressions) * 100 : 0;

    // Combine weighted engagement and rate for final score
    return weightedEngagement * 0.7 + engagementRate * 0.3;
  }

  private analyzeContentCharacteristics(post: Post, analytics?: AnalyticsData): string[] {
    const insights: string[] = [];

    // Analyze content length
    const contentLength = post.content.length;
    if (contentLength > 2000) {
      insights.push('Long-form content tends to perform well for this topic');
    } else if (contentLength < 500) {
      insights.push('Short, concise content resonates with your audience');
    }

    // The following block was provided in the instruction but seems misplaced and syntactically incorrect.
    // 'analytics' here is a single AnalyticsData object or undefined, not an array.
    // Also, content length cannot be derived from AnalyticsData directly.
    /*
      if (analytics && analytics.length > 0) {
        // Average length
        const avgLength = analytics.reduce((sum, a) => {
           // We don't have post content here directly without join, so this is an estimate or requires fetching post
           // Assuming we can't get length without post, skipping unless we change logic
           return sum; 
        }, 0) / (analytics.length || 1);
        
        // This logic seems flawed because analytics data doesn't have content length
        // We need to rely on the passed 'post' object if we want to analyze that specific post
      }
    */

    // Analyze tags
    if (post.tags.length > 5) {
      insights.push('Posts with multiple relevant tags show higher discoverability');
    }

    // Analyze engagement if available
    if (analytics) {
      const engagementRate =
        analytics.impressions > 0
          ? ((analytics.likes + analytics.shares + analytics.comments) / analytics.impressions) *
            100
          : 0;

      if (engagementRate > 5) {
        insights.push('High engagement rate indicates strong audience resonance');
      }

      if (analytics.shares > analytics.likes * 0.1) {
        insights.push('High share rate suggests valuable, shareable content');
      }
    }

    return insights;
  }

  private determineContentType(post: Post): string {
    const content = post.content.toLowerCase();

    if (content.includes('how to') || content.includes('tutorial')) {
      return 'Educational';
    } else if (content.includes('tip') || content.includes('advice')) {
      return 'Tips & Advice';
    } else if (content.includes('news') || content.includes('update')) {
      return 'News & Updates';
    } else if (content.includes('story') || content.includes('experience')) {
      return 'Storytelling';
    } else {
      return 'General';
    }
  }

  private async getAnalyticsForPeriod(
    timeframe: string,
    periodsBack: number
  ): Promise<AnalyticsData[]> {
    const endDate = new Date();
    const startDate = new Date();

    // Calculate the period
    switch (timeframe) {
      case 'week':
        endDate.setDate(endDate.getDate() - 7 * periodsBack);
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        endDate.setMonth(endDate.getMonth() - periodsBack);
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        endDate.setMonth(endDate.getMonth() - 3 * periodsBack);
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        endDate.setFullYear(endDate.getFullYear() - periodsBack);
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    return await db.getAnalyticsByTimeframe(startDate, endDate);
  }

  private calculateTotalEngagement(analyticsData: AnalyticsData[]): number {
    return analyticsData.reduce(
      (sum, data) => sum + data.likes + data.shares + data.comments + data.clicks,
      0
    );
  }

  private calculateAverageEngagementRate(analyticsData: AnalyticsData[]): number {
    if (analyticsData.length === 0) return 0;

    const totalEngagement = this.calculateTotalEngagement(analyticsData);
    const totalImpressions = analyticsData.reduce((sum, data) => sum + data.impressions, 0);

    return totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private async getAllAnalytics(): Promise<AnalyticsData[]> {
    // Get analytics for the last year
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);

    return await db.getAnalyticsByTimeframe(startDate, endDate);
  }

  private analyzeOptimalTiming(analyticsData: AnalyticsData[]): OptimizationSuggestion | null {
    if (analyticsData.length < 10) return null;

    const hourlyEngagement: { [hour: number]: number[] } = {};

    analyticsData.forEach((data) => {
      const hour = data.recordedAt.getHours();
      const engagement = data.likes + data.shares + data.comments + data.clicks;

      if (!hourlyEngagement[hour]) {
        hourlyEngagement[hour] = [];
      }
      hourlyEngagement[hour].push(engagement);
    });

    const avgHourlyEngagement = Object.entries(hourlyEngagement).map(([hour, engagements]) => ({
      hour: parseInt(hour),
      avgEngagement: engagements.reduce((sum, eng) => sum + eng, 0) / engagements.length,
    }));

    const bestHour = avgHourlyEngagement.sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

    if (!bestHour) {
      return null;
    }

    return {
      type: 'timing',
      title: 'Optimize Posting Time',
      description: `Your content performs best when posted around ${bestHour.hour}:00. Consider scheduling more posts during this time.`,
      impact: 'medium',
      effort: 'low',
    };
  }

  private async analyzeContentPerformance(
    analyticsData: AnalyticsData[]
  ): Promise<OptimizationSuggestion[]> {
    const recommendations: OptimizationSuggestion[] = [];

    // Analyze platform performance
    const platformPerformance: { [platform: string]: number } = {};
    analyticsData.forEach((data) => {
      const engagement = data.likes + data.shares + data.comments + data.clicks;
      platformPerformance[data.platform] = (platformPerformance[data.platform] || 0) + engagement;
    });

    const sortedPlatforms = Object.entries(platformPerformance).sort(([, a], [, b]) => b - a);

    if (sortedPlatforms.length > 1) {
      const topEntry = sortedPlatforms[0];
      const topPlatform = topEntry ? topEntry[0] : 'Unknown';
      recommendations.push({
        type: 'content',
        title: 'Focus on Top-Performing Platform',
        description: `${topPlatform} shows the highest engagement. Consider creating more content specifically for this platform.`,
        impact: 'high',
        effort: 'medium',
      });
    }

    return recommendations;
  }

  private analyzePlatformPerformance(analyticsData: AnalyticsData[]): OptimizationSuggestion[] {
    const recommendations: OptimizationSuggestion[] = [];

    const platformStats: {
      [platform: string]: { engagement: number; impressions: number; count: number };
    } = {};

    analyticsData.forEach((data) => {
      let stats = platformStats[data.platform];
      if (!stats) {
        stats = { engagement: 0, impressions: 0, count: 0 };
        platformStats[data.platform] = stats;
      }

      stats.engagement += data.likes + data.shares + data.comments + data.clicks;
      stats.impressions += data.impressions;
      stats.count += 1;
    });

    Object.entries(platformStats).forEach(([platform, stats]) => {
      const avgEngagementRate =
        stats.impressions > 0 ? (stats.engagement / stats.impressions) * 100 : 0;

      if (avgEngagementRate < 1 && stats.count > 5) {
        recommendations.push({
          type: 'content',
          title: `Improve ${platform} Performance`,
          description: `${platform} shows low engagement rates. Consider adjusting content format or posting strategy for this platform.`,
          impact: 'medium',
          effort: 'medium',
        });
      }
    });

    return recommendations;
  }

  private async analyzeHashtagPerformance(): Promise<OptimizationSuggestion[]> {
    // This would analyze hashtag performance if we had hashtag tracking
    // For now, return general hashtag recommendations
    return [
      {
        type: 'hashtags',
        title: 'Optimize Hashtag Strategy',
        description:
          'Research and use trending hashtags relevant to your content to increase discoverability.',
        impact: 'medium',
        effort: 'low',
      },
    ];
  }

  private async generatePostSpecificRecommendations(
    post: Post,
    analytics: AnalyticsData[]
  ): Promise<OptimizationSuggestion[]> {
    const recommendations: OptimizationSuggestion[] = [];

    if (analytics.length === 0) {
      recommendations.push({
        type: 'content',
        title: 'Track Performance',
        description:
          'Start tracking engagement metrics for this post to get personalized recommendations.',
        impact: 'low',
        effort: 'low',
      });
      return recommendations;
    }

    const latestAnalytics = analytics[0];
    if (!latestAnalytics) {
      return recommendations;
    }
    const engagementRate =
      latestAnalytics.impressions > 0
        ? ((latestAnalytics.likes + latestAnalytics.shares + latestAnalytics.comments) /
            latestAnalytics.impressions) *
          100
        : 0;

    if (engagementRate < 2) {
      recommendations.push({
        type: 'content',
        title: 'Improve Content Engagement',
        description:
          'This post has low engagement. Consider adding more interactive elements or calls-to-action.',
        impact: 'high',
        effort: 'medium',
      });
    }

    if (latestAnalytics.shares < latestAnalytics.likes * 0.05) {
      recommendations.push({
        type: 'content',
        title: 'Increase Shareability',
        description:
          'Add more shareable elements like quotes, statistics, or actionable tips to encourage sharing.',
        impact: 'medium',
        effort: 'low',
      });
    }

    return recommendations;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
