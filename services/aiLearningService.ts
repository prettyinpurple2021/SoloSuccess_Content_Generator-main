/**
 * AI Learning Service - Learns from user interactions to provide better suggestions
 */

interface UserInteraction {
  id: string;
  userId: string;
  type:
    | 'content_generated'
    | 'idea_selected'
    | 'template_used'
    | 'tone_chosen'
    | 'platform_posted'
    | 'engagement_received';
  data: {
    topic?: string;
    selectedOption?: string;
    rejectedOptions?: string[];
    tone?: string;
    platform?: string;
    templateId?: string;
    engagementScore?: number;
    timestamp: Date;
    context?: Record<string, any>;
  };
}

interface UserPreferences {
  userId: string;
  preferredTopics: { topic: string; score: number }[];
  preferredTones: { tone: string; score: number }[];
  preferredPlatforms: { platform: string; score: number }[];
  preferredTemplates: { templateId: string; score: number }[];
  contentPatterns: {
    timeOfDay: { hour: number; score: number }[];
    dayOfWeek: { day: number; score: number }[];
    contentLength: { range: string; score: number }[];
    hashtagCount: { count: number; score: number }[];
  };
  lastUpdated: Date;
}

interface ContentSuggestion {
  type: 'topic' | 'tone' | 'template' | 'timing' | 'platform';
  suggestion: string;
  confidence: number;
  reasoning: string;
  metadata?: Record<string, any>;
}

export class AILearningService {
  private interactions: UserInteraction[] = [];
  private userPreferences: Map<string, UserPreferences> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Record a user interaction for learning
   */
  recordInteraction(interaction: Omit<UserInteraction, 'id'>): void {
    const fullInteraction: UserInteraction = {
      ...interaction,
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.interactions.push(fullInteraction);
    this.updateUserPreferences(fullInteraction);
    this.saveToStorage();
  }

  /**
   * Get personalized content suggestions based on user's learning data
   */
  getPersonalizedSuggestions(
    userId: string,
    context?: {
      currentTopic?: string;
      targetPlatform?: string;
      timeOfDay?: number;
      dayOfWeek?: number;
    }
  ): ContentSuggestion[] {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) {
      return this.getDefaultSuggestions();
    }

    const suggestions: ContentSuggestion[] = [];

    // Topic suggestions based on user's preferred topics and current context
    if (context?.currentTopic) {
      const relatedTopics = this.findRelatedTopics(context.currentTopic, preferences);
      suggestions.push(
        ...relatedTopics.map((topic) => ({
          type: 'topic' as const,
          suggestion: topic.topic,
          confidence: topic.score,
          reasoning: `Based on your interest in similar topics like "${context.currentTopic}"`,
        }))
      );
    } else {
      // Suggest top preferred topics
      const topTopics = preferences.preferredTopics.sort((a, b) => b.score - a.score).slice(0, 3);

      suggestions.push(
        ...topTopics.map((topic) => ({
          type: 'topic' as const,
          suggestion: topic.topic,
          confidence: topic.score,
          reasoning: `You've shown strong engagement with this topic in the past`,
        }))
      );
    }

    // Tone suggestions
    const bestTone = preferences.preferredTones.sort((a, b) => b.score - a.score)[0];

    if (bestTone) {
      suggestions.push({
        type: 'tone',
        suggestion: bestTone.tone,
        confidence: bestTone.score,
        reasoning: `Your ${bestTone.tone} content typically performs well`,
      });
    }

    // Platform suggestions
    if (context?.targetPlatform) {
      const platformScore =
        preferences.preferredPlatforms.find((p) => p.platform === context.targetPlatform)?.score ||
        0.5;

      suggestions.push({
        type: 'platform',
        suggestion: context.targetPlatform,
        confidence: platformScore,
        reasoning:
          platformScore > 0.7
            ? `${context.targetPlatform} is one of your best-performing platforms`
            : `Consider trying ${context.targetPlatform} - it might work well for you`,
      });
    }

    // Timing suggestions
    if (context?.timeOfDay !== undefined) {
      const timeScore =
        preferences.contentPatterns.timeOfDay.find((t) => t.hour === context.timeOfDay)?.score ||
        0.5;

      if (timeScore > 0.7) {
        suggestions.push({
          type: 'timing',
          suggestion: `${context.timeOfDay}:00`,
          confidence: timeScore,
          reasoning: `Your content posted around ${context.timeOfDay}:00 typically gets great engagement`,
        });
      }
    }

    // Template suggestions
    const topTemplate = preferences.preferredTemplates.sort((a, b) => b.score - a.score)[0];

    if (topTemplate) {
      suggestions.push({
        type: 'template',
        suggestion: topTemplate.templateId,
        confidence: topTemplate.score,
        reasoning: `This template structure has worked well for your content style`,
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get content optimization suggestions based on past performance
   */
  getOptimizationSuggestions(
    userId: string,
    currentContent: {
      topic: string;
      tone: string;
      platform: string;
      length: number;
      hashtagCount: number;
    }
  ): ContentSuggestion[] {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) return [];

    const suggestions: ContentSuggestion[] = [];

    // Analyze content length
    const optimalLength = this.findOptimalContentLength(preferences);
    if (optimalLength && Math.abs(currentContent.length - optimalLength.target) > 100) {
      suggestions.push({
        type: 'topic',
        suggestion: `Adjust content length to ~${optimalLength.target} characters`,
        confidence: optimalLength.confidence,
        reasoning: `Your content around ${optimalLength.target} characters typically performs ${optimalLength.performance}% better`,
      });
    }

    // Analyze hashtag usage
    const optimalHashtags = this.findOptimalHashtagCount(preferences);
    if (optimalHashtags && currentContent.hashtagCount !== optimalHashtags.count) {
      suggestions.push({
        type: 'topic',
        suggestion: `Use ${optimalHashtags.count} hashtags`,
        confidence: optimalHashtags.confidence,
        reasoning: `Posts with ${optimalHashtags.count} hashtags get ${optimalHashtags.improvement}% more engagement for you`,
      });
    }

    return suggestions;
  }

  /**
   * Learn from engagement data to improve future suggestions
   */
  recordEngagement(
    userId: string,
    contentId: string,
    engagementData: {
      likes: number;
      shares: number;
      comments: number;
      clicks: number;
      impressions: number;
      topic: string;
      tone: string;
      platform: string;
    }
  ): void {
    const engagementScore = this.calculateEngagementScore(engagementData);

    this.recordInteraction({
      userId,
      type: 'engagement_received',
      data: {
        topic: engagementData.topic,
        tone: engagementData.tone,
        platform: engagementData.platform,
        engagementScore,
        timestamp: new Date(),
        context: {
          contentId,
          metrics: engagementData,
        },
      },
    });
  }

  /**
   * Get trending topics based on user's network and preferences
   */
  async getTrendingTopicsForUser(
    userId: string,
    userInterests: string[] = []
  ): Promise<{ topic: string; trendScore: number; personalRelevance: number }[]> {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) return [];

    // This would integrate with external trend APIs in a real implementation
    const globalTrends = [
      'AI productivity tools',
      'Remote work tips',
      'Social media marketing',
      'Personal branding',
      'Content creation',
      'Digital wellness',
      'Sustainable business',
      'Creator economy',
    ];

    const trendPromises = globalTrends.map(async (trend) => {
      const personalRelevance = this.calculateTopicRelevance(trend, preferences.preferredTopics);
      // Calculate real trend score based on social media engagement
      const trendScore = await this.calculateTrendScore(trend, userInterests);

      return {
        topic: trend,
        trendScore,
        personalRelevance,
      };
    });

    const trends = await Promise.all(trendPromises);
    return trends.sort(
      (a, b) => b.trendScore * b.personalRelevance - a.trendScore * a.personalRelevance
    );
  }

  /**
   * Predict content performance before posting
   */
  predictContentPerformance(
    userId: string,
    content: {
      topic: string;
      tone: string;
      platform: string;
      length: number;
      timeOfDay: number;
      dayOfWeek: number;
    }
  ): {
    predictedScore: number;
    confidence: number;
    factors: { factor: string; impact: number; reasoning: string }[];
  } {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) {
      return {
        predictedScore: 0.5,
        confidence: 0.3,
        factors: [
          { factor: 'Insufficient data', impact: 0, reasoning: 'Need more interaction history' },
        ],
      };
    }

    const factors = [];
    let totalScore = 0;
    let factorCount = 0;

    // Topic factor
    const topicScore =
      preferences.preferredTopics.find((t) => t.topic === content.topic)?.score || 0.5;
    factors.push({
      factor: 'Topic',
      impact: topicScore,
      reasoning:
        topicScore > 0.7
          ? 'Strong topic match'
          : topicScore < 0.3
            ? 'Topic may not resonate'
            : 'Moderate topic match',
    });
    totalScore += topicScore;
    factorCount++;

    // Tone factor
    const toneScore = preferences.preferredTones.find((t) => t.tone === content.tone)?.score || 0.5;
    factors.push({
      factor: 'Tone',
      impact: toneScore,
      reasoning: toneScore > 0.7 ? 'Tone aligns with your style' : 'Consider adjusting tone',
    });
    totalScore += toneScore;
    factorCount++;

    // Platform factor
    const platformScore =
      preferences.preferredPlatforms.find((p) => p.platform === content.platform)?.score || 0.5;
    factors.push({
      factor: 'Platform',
      impact: platformScore,
      reasoning: platformScore > 0.7 ? 'Great platform choice' : 'Platform may need optimization',
    });
    totalScore += platformScore;
    factorCount++;

    // Timing factor
    const timeScore =
      preferences.contentPatterns.timeOfDay.find((t) => t.hour === content.timeOfDay)?.score || 0.5;
    factors.push({
      factor: 'Timing',
      impact: timeScore,
      reasoning: timeScore > 0.7 ? 'Optimal posting time' : 'Consider posting at a different time',
    });
    totalScore += timeScore;
    factorCount++;

    const predictedScore = totalScore / factorCount;
    const confidence = Math.min(
      this.interactions.filter((i) => i.userId === userId).length / 50,
      1
    );

    return {
      predictedScore,
      confidence,
      factors: factors.sort((a, b) => b.impact - a.impact),
    };
  }

  // Private helper methods

  private updateUserPreferences(interaction: UserInteraction): void {
    const userId = interaction.userId;
    let preferences = this.userPreferences.get(userId);

    if (!preferences) {
      preferences = {
        userId,
        preferredTopics: [],
        preferredTones: [],
        preferredPlatforms: [],
        preferredTemplates: [],
        contentPatterns: {
          timeOfDay: [],
          dayOfWeek: [],
          contentLength: [],
          hashtagCount: [],
        },
        lastUpdated: new Date(),
      };
    }

    // Update preferences based on interaction type
    switch (interaction.type) {
      case 'idea_selected':
        if (interaction.data.topic) {
          this.updateTopicPreference(preferences, interaction.data.topic, 0.1);
        }
        break;

      case 'tone_chosen':
        if (interaction.data.tone) {
          this.updateTonePreference(preferences, interaction.data.tone, 0.1);
        }
        break;

      case 'platform_posted':
        if (interaction.data.platform) {
          this.updatePlatformPreference(preferences, interaction.data.platform, 0.1);
        }
        break;

      case 'engagement_received':
        if (
          interaction.data.engagementScore &&
          interaction.data.topic &&
          interaction.data.tone &&
          interaction.data.platform
        ) {
          const weight = interaction.data.engagementScore;
          this.updateTopicPreference(preferences, interaction.data.topic, weight);
          this.updateTonePreference(preferences, interaction.data.tone, weight);
          this.updatePlatformPreference(preferences, interaction.data.platform, weight);
        }
        break;
    }

    preferences.lastUpdated = new Date();
    this.userPreferences.set(userId, preferences);
  }

  private updateTopicPreference(preferences: UserPreferences, topic: string, weight: number): void {
    const existing = preferences.preferredTopics.find((t) => t.topic === topic);
    if (existing) {
      existing.score = Math.min(1, existing.score + weight);
    } else {
      preferences.preferredTopics.push({ topic, score: Math.max(0.5, weight) });
    }

    // Keep only top 20 topics
    preferences.preferredTopics.sort((a, b) => b.score - a.score);
    preferences.preferredTopics = preferences.preferredTopics.slice(0, 20);
  }

  private updateTonePreference(preferences: UserPreferences, tone: string, weight: number): void {
    const existing = preferences.preferredTones.find((t) => t.tone === tone);
    if (existing) {
      existing.score = Math.min(1, existing.score + weight);
    } else {
      preferences.preferredTones.push({ tone, score: Math.max(0.5, weight) });
    }
  }

  private updatePlatformPreference(
    preferences: UserPreferences,
    platform: string,
    weight: number
  ): void {
    const existing = preferences.preferredPlatforms.find((p) => p.platform === platform);
    if (existing) {
      existing.score = Math.min(1, existing.score + weight);
    } else {
      preferences.preferredPlatforms.push({ platform, score: Math.max(0.5, weight) });
    }
  }

  private findRelatedTopics(
    currentTopic: string,
    preferences: UserPreferences
  ): { topic: string; score: number }[] {
    // Simple keyword matching - in a real implementation, this would use NLP/embeddings
    const keywords = currentTopic.toLowerCase().split(' ');

    return preferences.preferredTopics.filter((topic) => {
      const topicKeywords = topic.topic.toLowerCase().split(' ');
      return keywords.some((keyword) =>
        topicKeywords.some((tk) => tk.includes(keyword) || keyword.includes(tk))
      );
    });
  }

  private calculateEngagementScore(data: {
    likes: number;
    shares: number;
    comments: number;
    clicks: number;
    impressions: number;
  }): number {
    const totalEngagement = data.likes + data.shares * 3 + data.comments * 2 + data.clicks;
    const engagementRate = data.impressions > 0 ? totalEngagement / data.impressions : 0;
    return Math.min(1, engagementRate * 10); // Normalize to 0-1 scale
  }

  private calculateTopicRelevance(topic: string, preferredTopics: { topic: string; score: number }[]): number {
    const matchingTopic = preferredTopics.find(
      (t) =>
        t.topic.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(t.topic.toLowerCase())
    );
    return matchingTopic?.score || 0.3;
  }

  private async calculateTrendScore(topic: string, userInterests: string[]): Promise<number> {
    try {
      // Import social platform service to get real engagement data
      const { socialPlatformService } = await import('./socialPlatformService');

      // Get trending topics from connected platforms
      const connectedPlatforms = socialPlatformService.getConnectedPlatforms();

      if (connectedPlatforms.length === 0) {
        // No platforms connected, return base score
        return 0.3;
      }

      // Fetch trending topics from all connected platforms
      const trendingTopics = await socialPlatformService.fetchTrendingTopics(connectedPlatforms);

      // Find if our topic is trending
      const topicInTrends = trendingTopics.find(
        (t) =>
          t.topic.toLowerCase().includes(topic.toLowerCase()) ||
          topic.toLowerCase().includes(t.topic.toLowerCase())
      );

      if (topicInTrends) {
        // Topic is trending, calculate score based on engagement
        const engagementScore = (topicInTrends as any).engagementRate || 0;
        
        // Formatted interests for relevance calculation
        const formattedInterests = userInterests.map(interest => ({
          topic: interest,
          score: 1.0
        }));

        const relevanceScore = this.calculateTopicRelevance(topic, formattedInterests);

        // Combine trending status with user relevance
        return Math.min(engagementScore * 0.7 + relevanceScore * 0.3, 1.0);
      }

      // Topic not trending, return lower score
      return 0.2;
    } catch (error) {
      console.error('Error calculating trend score:', error);
      // Fallback to base score on error
      return 0.3;
    }
  }

  private findOptimalContentLength(
    preferences: UserPreferences
  ): { target: number; confidence: number; performance: number } | null {
    const lengths = preferences.contentPatterns.contentLength;
    if (lengths.length === 0) return null;

    const best = lengths.sort((a, b) => b.score - a.score)[0];
    if (!best) return null;
    
    const [min, max] = best.range.split('-').map(Number);
    if (min === undefined || max === undefined) return null;

    return {
      target: (min + max) / 2,
      confidence: best.score,
      performance: Math.round((best.score - 0.5) * 200),
    };
  }

  private findOptimalHashtagCount(
    preferences: UserPreferences
  ): { count: number; confidence: number; improvement: number } | null {
    const hashtags = preferences.contentPatterns.hashtagCount;
    if (hashtags.length === 0) return null;

    const best = hashtags.sort((a, b) => b.score - a.score)[0];
    if (!best) return null;

    return {
      count: best.count,
      confidence: best.score,
      improvement: Math.round((best.score - 0.5) * 200),
    };
  }

  private getDefaultSuggestions(): ContentSuggestion[] {
    return [
      {
        type: 'topic',
        suggestion: 'productivity tips',
        confidence: 0.7,
        reasoning: 'Popular topic for solo entrepreneurs',
      },
      {
        type: 'tone',
        suggestion: 'professional',
        confidence: 0.6,
        reasoning: 'Generally performs well for business content',
      },
      {
        type: 'timing',
        suggestion: '9:00',
        confidence: 0.5,
        reasoning: 'Common optimal posting time',
      },
    ];
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        'ai_learning_interactions',
        JSON.stringify(this.interactions.slice(-1000))
      ); // Keep last 1000
      localStorage.setItem(
        'ai_learning_preferences',
        JSON.stringify(Array.from(this.userPreferences.entries()))
      );
    } catch (error) {
      console.warn('Failed to save AI learning data:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const interactions = localStorage.getItem('ai_learning_interactions');
      if (interactions) {
        this.interactions = JSON.parse(interactions);
      }

      const preferences = localStorage.getItem('ai_learning_preferences');
      if (preferences) {
        const prefArray = JSON.parse(preferences);
        this.userPreferences = new Map(prefArray);
      }
    } catch (error) {
      console.warn('Failed to load AI learning data:', error);
    }
  }
}

// Export singleton instance
export const aiLearningService = new AILearningService();
