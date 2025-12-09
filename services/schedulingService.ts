import {
  Post,
  TimeSlot,
  SchedulingSuggestion,
  ConflictAnalysis,
  ContentConflict,
  AnalyticsData,
  EngagementData,
  AudienceProfile,
} from '../types';
import { db } from './databaseService';
import { analyticsService } from './analyticsService';

/**
 * Enhanced Scheduling Service for optimal timing analysis, timezone adjustments,
 * and content conflict prevention
 */
export class SchedulingService {
  /**
   * Analyze optimal posting times based on historical engagement data
   * Requirement 3.1: Analyze historical engagement data to suggest optimal posting times
   */
  async analyzeOptimalTimes(
    platform?: string,
    audienceProfile?: AudienceProfile
  ): Promise<TimeSlot[]> {
    try {
      // Get base optimal times from analytics service
      const baseTimeSlots = await analyticsService.calculateOptimalPostingTimes(platform);

      // If audience profile is provided, adjust for their engagement patterns
      if (audienceProfile && audienceProfile.engagementPatterns[platform || 'general']) {
        const audiencePattern = audienceProfile.engagementPatterns[platform || 'general'];
        return this.adjustTimeSlotsForAudience(baseTimeSlots, audiencePattern);
      }

      return baseTimeSlots;
    } catch (error) {
      console.error('Error analyzing optimal times:', error);
      throw new Error('Failed to analyze optimal posting times');
    }
  }

  /**
   * Adjust posting times for target audience locations and timezones
   * Requirement 3.2: Automatically adjust posting times for target audience locations
   */
  adjustForTimezones(
    baseTime: Date,
    targetTimezones: string[],
    primaryTimezone: string = 'UTC'
  ): { timezone: string; adjustedTime: Date }[] {
    try {
      const adjustedTimes: { timezone: string; adjustedTime: Date }[] = [];

      for (const timezone of targetTimezones) {
        // Create a new date object for each timezone
        const adjustedTime = new Date(baseTime);

        // Calculate timezone offset difference
        const baseOffset = this.getTimezoneOffset(primaryTimezone);
        const targetOffset = this.getTimezoneOffset(timezone);
        const offsetDifference = targetOffset - baseOffset;

        // Adjust the time
        adjustedTime.setHours(adjustedTime.getHours() + offsetDifference);

        adjustedTimes.push({
          timezone,
          adjustedTime,
        });
      }

      return adjustedTimes;
    } catch (error) {
      console.error('Error adjusting for timezones:', error);
      throw new Error('Failed to adjust posting times for timezones');
    }
  }

  /**
   * Prevent content conflicts and suggest optimal spacing between posts
   * Requirement 3.3: Prevent content conflicts and suggest optimal spacing
   */
  async analyzeContentConflicts(posts: Post[]): Promise<ConflictAnalysis> {
    try {
      const conflicts: ContentConflict[] = [];
      const suggestions: string[] = [];

      // Sort posts by schedule date
      const scheduledPosts = posts
        .filter((post) => post.scheduleDate && post.status === 'scheduled')
        .sort((a, b) => a.scheduleDate!.getTime() - b.scheduleDate!.getTime());

      // Check for timing conflicts
      for (let i = 0; i < scheduledPosts.length - 1; i++) {
        const currentPost = scheduledPosts[i];
        const nextPost = scheduledPosts[i + 1];

        if (!currentPost.scheduleDate || !nextPost.scheduleDate) continue;

        const timeDifference = nextPost.scheduleDate.getTime() - currentPost.scheduleDate.getTime();
        const hoursDifference = timeDifference / (1000 * 60 * 60);

        // Check for timing conflicts (posts too close together)
        if (hoursDifference < 2) {
          conflicts.push({
            postId1: currentPost.id,
            postId2: nextPost.id,
            platform: this.getCommonPlatforms(currentPost, nextPost)[0] || 'multiple',
            conflictType: 'timing',
            severity: 'high',
            resolution: `Space posts at least 2 hours apart. Consider rescheduling one of the posts.`,
          });
        }

        // Check for topic conflicts (similar content too close together)
        if (this.areTopicsSimilar(currentPost.topic, nextPost.topic) && hoursDifference < 24) {
          conflicts.push({
            postId1: currentPost.id,
            postId2: nextPost.id,
            platform: this.getCommonPlatforms(currentPost, nextPost)[0] || 'multiple',
            conflictType: 'topic',
            severity: 'medium',
            resolution: `Similar topics detected. Consider spacing similar content at least 24 hours apart.`,
          });
        }

        // Check for audience conflicts (same target audience too frequently)
        if (this.haveSameAudience(currentPost, nextPost) && hoursDifference < 12) {
          conflicts.push({
            postId1: currentPost.id,
            postId2: nextPost.id,
            platform: this.getCommonPlatforms(currentPost, nextPost)[0] || 'multiple',
            conflictType: 'audience',
            severity: 'low',
            resolution: `Posts targeting same audience. Consider varying content or spacing posts further apart.`,
          });
        }
      }

      // Generate suggestions based on conflicts
      if (conflicts.length === 0) {
        suggestions.push(
          'No scheduling conflicts detected. Your content schedule looks well-spaced.'
        );
      } else {
        suggestions.push(
          `Found ${conflicts.length} potential conflicts. Review the suggestions below to optimize your schedule.`
        );

        if (conflicts.some((c) => c.conflictType === 'timing')) {
          suggestions.push(
            'Consider using bulk scheduling with automatic spacing to prevent timing conflicts.'
          );
        }

        if (conflicts.some((c) => c.conflictType === 'topic')) {
          suggestions.push(
            'Diversify your content topics or create themed content series with proper spacing.'
          );
        }
      }

      return { conflicts, suggestions };
    } catch (error) {
      console.error('Error analyzing content conflicts:', error);
      throw new Error('Failed to analyze content conflicts');
    }
  }

  /**
   * Update timing recommendations when engagement patterns change
   * Requirement 3.4: Update timing recommendations automatically when patterns change
   */
  async updateTimingRecommendations(platform?: string): Promise<TimeSlot[]> {
    try {
      // Get fresh analytics data
      const recentAnalytics = await this.getRecentAnalytics(30); // Last 30 days

      if (recentAnalytics.length < 10) {
        console.warn('Insufficient data for timing recommendations update');
        return await this.analyzeOptimalTimes(platform);
      }

      // Calculate new optimal times based on recent data
      const updatedTimeSlots = await this.calculateOptimalTimesFromAnalytics(
        recentAnalytics,
        platform
      );

      // Compare with previous recommendations to detect significant changes
      const previousTimeSlots = await this.analyzeOptimalTimes(platform);
      const hasSignificantChange = this.detectSignificantTimingChanges(
        previousTimeSlots,
        updatedTimeSlots
      );

      if (hasSignificantChange) {
        console.log('Significant timing pattern changes detected, updating recommendations');
        // In a real implementation, you might want to notify users or update stored preferences
      }

      return updatedTimeSlots;
    } catch (error) {
      console.error('Error updating timing recommendations:', error);
      throw new Error('Failed to update timing recommendations');
    }
  }

  /**
   * Provide bulk scheduling options for multiple posts across platforms
   * Requirement 3.5: Provide bulk scheduling options for multiple posts across platforms
   */
  async bulkSchedulePosts(
    posts: Omit<Post, 'scheduleDate'>[],
    options: {
      startDate: Date;
      endDate: Date;
      platforms: string[];
      spacing: 'optimal' | 'even' | 'custom';
      customSpacingHours?: number;
      respectOptimalTimes?: boolean;
      avoidWeekends?: boolean;
      targetTimezones?: string[];
    }
  ): Promise<SchedulingSuggestion[]> {
    try {
      const suggestions: SchedulingSuggestion[] = [];
      const {
        startDate,
        endDate,
        platforms,
        spacing,
        customSpacingHours,
        respectOptimalTimes,
        avoidWeekends,
        targetTimezones,
      } = options;

      // Get optimal times for each platform if requested
      const optimalTimesByPlatform: { [platform: string]: TimeSlot[] } = {};
      if (respectOptimalTimes) {
        for (const platform of platforms) {
          optimalTimesByPlatform[platform] = await this.analyzeOptimalTimes(platform);
        }
      }

      // Calculate time slots between start and end date
      const availableSlots = this.generateAvailableTimeSlots(startDate, endDate, avoidWeekends);

      // Distribute posts across available slots
      let currentSlotIndex = 0;

      for (const post of posts) {
        for (const platform of platforms) {
          let suggestedTime: Date;
          let reason: string;
          let confidence: number = 0.8;

          if (spacing === 'optimal' && respectOptimalTimes && optimalTimesByPlatform[platform]) {
            // Use optimal times
            const optimalSlot = this.findNextOptimalSlot(
              availableSlots,
              currentSlotIndex,
              optimalTimesByPlatform[platform]
            );
            suggestedTime = optimalSlot.time;
            reason = `Scheduled at optimal time (${optimalSlot.slot.time}) for maximum engagement on ${platform}`;
            confidence = optimalSlot.slot.confidence;
            currentSlotIndex = optimalSlot.index + 1;
          } else if (spacing === 'even') {
            // Even distribution
            const slotIndex = Math.min(currentSlotIndex, availableSlots.length - 1);
            suggestedTime = availableSlots[slotIndex];
            reason = `Evenly distributed across the selected time period`;
            currentSlotIndex++;
          } else if (spacing === 'custom' && customSpacingHours) {
            // Custom spacing
            const lastSuggestion = suggestions[suggestions.length - 1];
            const baseTime = lastSuggestion ? lastSuggestion.suggestedTime : startDate;
            suggestedTime = new Date(baseTime.getTime() + customSpacingHours * 60 * 60 * 1000);
            reason = `Scheduled with ${customSpacingHours} hour spacing as requested`;
          } else {
            // Default to even spacing
            const slotIndex = Math.min(currentSlotIndex, availableSlots.length - 1);
            suggestedTime = availableSlots[slotIndex];
            reason = `Scheduled with default spacing`;
            currentSlotIndex++;
          }

          // Adjust for timezones if specified
          if (targetTimezones && targetTimezones.length > 0) {
            const timezoneAdjustments = this.adjustForTimezones(suggestedTime, targetTimezones);
            // Use the first timezone adjustment as the primary suggestion
            if (timezoneAdjustments.length > 0) {
              suggestedTime = timezoneAdjustments[0].adjustedTime;
              reason += ` (adjusted for ${targetTimezones[0]} timezone)`;
            }
          }

          suggestions.push({
            postId: post.id,
            platform,
            suggestedTime,
            reason,
            confidence,
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error bulk scheduling posts:', error);
      throw new Error('Failed to generate bulk scheduling suggestions');
    }
  }

  /**
   * Get scheduling suggestions for a single post
   */
  async getSchedulingSuggestions(
    post: Post,
    platforms: string[],
    audienceProfile?: AudienceProfile
  ): Promise<SchedulingSuggestion[]> {
    try {
      const suggestions: SchedulingSuggestion[] = [];

      for (const platform of platforms) {
        const optimalTimes = await this.analyzeOptimalTimes(platform, audienceProfile);

        if (optimalTimes.length > 0) {
          const bestTime = optimalTimes[0];
          const suggestedTime = this.getNextOccurrenceOfTimeSlot(bestTime);

          suggestions.push({
            postId: post.id,
            platform,
            suggestedTime,
            reason: `Optimal time based on historical engagement data for ${platform}`,
            confidence: bestTime.confidence,
          });
        } else {
          // Fallback to general best practices
          const fallbackTime = this.getFallbackOptimalTime();
          suggestions.push({
            postId: post.id,
            platform,
            suggestedTime: fallbackTime,
            reason: `General best practice timing for ${platform} (insufficient historical data)`,
            confidence: 0.5,
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting scheduling suggestions:', error);
      throw new Error('Failed to get scheduling suggestions');
    }
  }

  // Private helper methods

  private adjustTimeSlotsForAudience(timeSlots: TimeSlot[], audiencePattern: any): TimeSlot[] {
    // Adjust time slots based on audience engagement patterns
    return timeSlots
      .map((slot) => ({
        ...slot,
        engagementScore: slot.engagementScore * (audiencePattern.engagementRate || 1),
        confidence: Math.min(slot.confidence * 1.1, 1), // Slight confidence boost for audience-specific data
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore);
  }

  private getTimezoneOffset(timezone: string): number {
    // Simplified timezone offset calculation
    // In a real implementation, you'd use a proper timezone library like date-fns-tz
    const timezoneOffsets: { [key: string]: number } = {
      UTC: 0,
      EST: -5,
      PST: -8,
      GMT: 0,
      CET: 1,
      JST: 9,
      AEST: 10,
    };

    return timezoneOffsets[timezone] || 0;
  }

  private getCommonPlatforms(post1: Post, post2: Post): string[] {
    const platforms1 = Object.keys(post1.socialMediaPosts || {});
    const platforms2 = Object.keys(post2.socialMediaPosts || {});
    return platforms1.filter((platform) => platforms2.includes(platform));
  }

  private areTopicsSimilar(topic1: string, topic2: string): boolean {
    // Simple similarity check - in a real implementation, you might use NLP
    const words1 = topic1.toLowerCase().split(' ');
    const words2 = topic2.toLowerCase().split(' ');

    const commonWords = words1.filter(
      (word) => words2.includes(word) && word.length > 3 // Ignore short words
    );

    return commonWords.length >= 2 || topic1.toLowerCase() === topic2.toLowerCase();
  }

  private haveSameAudience(post1: Post, post2: Post): boolean {
    // Check if posts target the same audience profile
    return (
      post1.audienceProfileId === post2.audienceProfileId && post1.audienceProfileId !== undefined
    );
  }

  private async getRecentAnalytics(days: number): Promise<AnalyticsData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return await db.getAnalyticsByTimeframe(startDate, endDate);
  }

  private async calculateOptimalTimesFromAnalytics(
    analytics: AnalyticsData[],
    platform?: string
  ): Promise<TimeSlot[]> {
    const filteredAnalytics = platform
      ? analytics.filter((data) => data.platform === platform)
      : analytics;

    const timeSlotMap: { [key: string]: { engagement: number; count: number } } = {};

    filteredAnalytics.forEach((data) => {
      const hour = data.recordedAt.getHours();
      const dayOfWeek = data.recordedAt.getDay();
      const key = `${dayOfWeek}-${hour}`;

      const engagement = data.likes + data.shares + data.comments + data.clicks;

      if (!timeSlotMap[key]) {
        timeSlotMap[key] = { engagement: 0, count: 0 };
      }

      timeSlotMap[key].engagement += engagement;
      timeSlotMap[key].count += 1;
    });

    return Object.entries(timeSlotMap)
      .map(([key, data]) => {
        const [dayOfWeek, hour] = key.split('-').map(Number);
        return {
          time: `${hour.toString().padStart(2, '0')}:00`,
          dayOfWeek,
          engagementScore: data.engagement / data.count,
          confidence: Math.min(data.count / 10, 1),
        };
      })
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10);
  }

  private detectSignificantTimingChanges(previousSlots: TimeSlot[], newSlots: TimeSlot[]): boolean {
    if (previousSlots.length === 0 || newSlots.length === 0) return false;

    // Check if the top 3 time slots have changed significantly
    const topPrevious = previousSlots.slice(0, 3);
    const topNew = newSlots.slice(0, 3);

    const commonSlots = topPrevious.filter((prevSlot) =>
      topNew.some(
        (newSlot) => newSlot.dayOfWeek === prevSlot.dayOfWeek && newSlot.time === prevSlot.time
      )
    );

    // Consider it significant if less than 50% of top slots remain the same
    return commonSlots.length < Math.ceil(topPrevious.length * 0.5);
  }

  private generateAvailableTimeSlots(
    startDate: Date,
    endDate: Date,
    avoidWeekends?: boolean
  ): Date[] {
    const slots: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      // Skip weekends if requested
      if (avoidWeekends && (current.getDay() === 0 || current.getDay() === 6)) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      // Add time slots throughout the day (every 2 hours during business hours)
      for (let hour = 9; hour <= 17; hour += 2) {
        const slot = new Date(current);
        slot.setHours(hour, 0, 0, 0);

        if (slot >= startDate && slot <= endDate) {
          slots.push(new Date(slot));
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  private findNextOptimalSlot(
    availableSlots: Date[],
    startIndex: number,
    optimalTimes: TimeSlot[]
  ): { time: Date; slot: TimeSlot; index: number } {
    // Find the next available slot that matches an optimal time
    for (let i = startIndex; i < availableSlots.length; i++) {
      const slot = availableSlots[i];
      const slotHour = slot.getHours();
      const slotDay = slot.getDay();

      const matchingOptimalTime = optimalTimes.find(
        (optimal) =>
          optimal.dayOfWeek === slotDay && parseInt(optimal.time.split(':')[0]) === slotHour
      );

      if (matchingOptimalTime) {
        return { time: slot, slot: matchingOptimalTime, index: i };
      }
    }

    // Fallback to next available slot with best optimal time
    const nextSlot = availableSlots[Math.min(startIndex, availableSlots.length - 1)];
    return {
      time: nextSlot,
      slot: optimalTimes[0] || { time: '12:00', dayOfWeek: 1, engagementScore: 0, confidence: 0.5 },
      index: startIndex,
    };
  }

  private getNextOccurrenceOfTimeSlot(timeSlot: TimeSlot): Date {
    const now = new Date();
    const targetDay = timeSlot.dayOfWeek;
    const targetHour = parseInt(timeSlot.time.split(':')[0]);

    // Find next occurrence of this day and time
    const daysUntilTarget = (targetDay - now.getDay() + 7) % 7;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
    targetDate.setHours(targetHour, 0, 0, 0);

    // If the time has already passed today and it's the same day, schedule for next week
    if (daysUntilTarget === 0 && targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 7);
    }

    return targetDate;
  }

  private getFallbackOptimalTime(): Date {
    // General best practice: Tuesday-Thursday, 10 AM
    const now = new Date();
    const targetDate = new Date(now);

    // Find next Tuesday (day 2)
    const daysUntilTuesday = (2 - now.getDay() + 7) % 7;
    targetDate.setDate(now.getDate() + (daysUntilTuesday === 0 ? 7 : daysUntilTuesday));
    targetDate.setHours(10, 0, 0, 0);

    return targetDate;
  }
}

// Export singleton instance
export const schedulingService = new SchedulingService();
