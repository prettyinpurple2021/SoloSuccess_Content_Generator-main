/**
 * Enhanced Gemini AI Service with Production-Grade Error Handling and Retry Logic
 *
 * This service wraps the original geminiService with:
 * - Exponential backoff retry mechanisms
 * - Rate limiting and usage monitoring
 * - Comprehensive error handling
 * - Fallback content generation
 * - Performance monitoring
 */

import { GoogleGenAI, Type } from '@google/genai';
import * as originalGeminiService from './geminiService';

// Types for enhanced error handling
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: Date;
  rateLimitHits: number;
}

interface AIServiceError extends Error {
  code: string;
  retryable: boolean;
  rateLimited: boolean;
  originalError?: Error;
}

class EnhancedGeminiService {
  private ai: GoogleGenAI;
  private retryConfig: RetryConfig;
  private rateLimitConfig: RateLimitConfig;
  private usageMetrics: UsageMetrics;
  private requestQueue: Array<{ timestamp: number; type: string }> = [];

  constructor() {
    if (!process.env.API_KEY && !process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY environment variable not set.');
    }

    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    this.ai = new GoogleGenAI({ apiKey: apiKey! });

    // Default retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
    };

    // Default rate limiting configuration
    this.rateLimitConfig = {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
    };

    // Initialize usage metrics
    this.usageMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date(),
      rateLimitHits: 0,
    };

    this.loadMetricsFromStorage();
  }

  /**
   * Enhanced wrapper for AI API calls with retry logic and error handling
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationType: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...retryConfig };
    const startTime = Date.now();

    // Check rate limits before making request
    await this.checkRateLimit(operationType);

    let lastError: AIServiceError | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        this.usageMetrics.totalRequests++;

        const result = await operation();

        // Update success metrics
        this.usageMetrics.successfulRequests++;
        this.updateResponseTime(Date.now() - startTime);
        this.saveMetricsToStorage();

        return result;
      } catch (error) {
        lastError = this.createAIServiceError(error, operationType);
        this.usageMetrics.failedRequests++;

        // Don't retry if it's not a retryable error
        if (!lastError.retryable || attempt === config.maxRetries) {
          this.saveMetricsToStorage();
          throw lastError;
        }

        // Calculate delay for exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        console.warn(
          `AI service attempt ${attempt + 1} failed for ${operationType}, retrying in ${delay}ms:`,
          lastError.message
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Check rate limits before making API calls
   */
  private async checkRateLimit(operationType: string): Promise<void> {
    const now = Date.now();

    // Clean old requests from queue
    this.requestQueue = this.requestQueue.filter((req) => now - req.timestamp < 60000); // Keep last minute

    // Check per-minute rate limit
    const recentRequests = this.requestQueue.filter((req) => now - req.timestamp < 60000);
    if (recentRequests.length >= this.rateLimitConfig.requestsPerMinute) {
      this.usageMetrics.rateLimitHits++;
      const waitTime = 60000 - (now - recentRequests[0].timestamp);

      console.warn(`Rate limit reached for ${operationType}, waiting ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    // Add current request to queue
    this.requestQueue.push({ timestamp: now, type: operationType });
  }

  /**
   * Create standardized AI service error
   */
  private createAIServiceError(error: unknown, operationType: string): AIServiceError {
    const baseError = error instanceof Error ? error : new Error(String(error));

    const aiError = new Error(baseError.message) as AIServiceError;
    aiError.name = 'AIServiceError';
    aiError.code = this.getErrorCode(baseError);
    aiError.retryable = this.isRetryableError(baseError);
    aiError.rateLimited = this.isRateLimitError(baseError);
    aiError.originalError = baseError;

    return aiError;
  }

  /**
   * Determine error code from error message/type
   */
  private getErrorCode(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit') || message.includes('quota')) {
      return 'RATE_LIMIT_EXCEEDED';
    }
    if (message.includes('timeout') || message.includes('network')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('unauthorized') || message.includes('api key')) {
      return 'AUTHENTICATION_ERROR';
    }
    if (message.includes('invalid') || message.includes('bad request')) {
      return 'INVALID_REQUEST';
    }
    if (message.includes('server error') || message.includes('internal error')) {
      return 'SERVER_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const code = this.getErrorCode(error);
    const retryableCodes = ['RATE_LIMIT_EXCEEDED', 'NETWORK_ERROR', 'SERVER_ERROR'];
    return retryableCodes.includes(code);
  }

  /**
   * Determine if error is rate limit related
   */
  private isRateLimitError(error: Error): boolean {
    return this.getErrorCode(error) === 'RATE_LIMIT_EXCEEDED';
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update average response time metric
   */
  private updateResponseTime(responseTime: number): void {
    const totalRequests = this.usageMetrics.successfulRequests;
    const currentAverage = this.usageMetrics.averageResponseTime;

    this.usageMetrics.averageResponseTime =
      (currentAverage * (totalRequests - 1) + responseTime) / totalRequests;
    this.usageMetrics.lastRequestTime = new Date();
  }

  /**
   * Save metrics to localStorage for persistence
   */
  private saveMetricsToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gemini_usage_metrics', JSON.stringify(this.usageMetrics));
      }
    } catch (error) {
      console.warn('Failed to save AI service metrics:', error);
    }
  }

  /**
   * Load metrics from localStorage
   */
  private loadMetricsFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('gemini_usage_metrics');
        if (stored) {
          const metrics = JSON.parse(stored);
          this.usageMetrics = { ...this.usageMetrics, ...metrics };
          this.usageMetrics.lastRequestTime = new Date(this.usageMetrics.lastRequestTime);
        }
      }
    } catch (error) {
      console.warn('Failed to load AI service metrics:', error);
    }
  }

  /**
   * Get current usage metrics
   */
  public getUsageMetrics(): UsageMetrics {
    return { ...this.usageMetrics };
  }

  /**
   * Get service health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    successRate: number;
    averageResponseTime: number;
    rateLimitHits: number;
    lastError?: string;
  } {
    const successRate =
      this.usageMetrics.totalRequests > 0
        ? (this.usageMetrics.successfulRequests / this.usageMetrics.totalRequests) * 100
        : 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (successRate < 50 || this.usageMetrics.averageResponseTime > 10000) {
      status = 'unhealthy';
    } else if (successRate < 80 || this.usageMetrics.averageResponseTime > 5000) {
      status = 'degraded';
    }

    return {
      status,
      successRate,
      averageResponseTime: this.usageMetrics.averageResponseTime,
      rateLimitHits: this.usageMetrics.rateLimitHits,
    };
  }

  /**
   * Generate fallback content when AI service is unavailable
   */
  private generateFallbackContent(type: string, input?: string): any {
    const fallbacks = {
      topic: 'Productivity Tips for Solo Entrepreneurs',
      ideas: [
        'How to Manage Your Time Effectively',
        'Building a Strong Personal Brand',
        'Leveraging Technology for Business Growth',
        'Creating Multiple Revenue Streams',
        'Networking Strategies for Introverts',
      ],
      blogPost: `# ${input || 'Business Growth Strategies'}

Building a successful business requires dedication, strategy, and continuous learning. Here are some key principles to keep in mind:

## Focus on Your Core Strengths

Identify what you do best and double down on those skills. This will help you stand out in a competitive market.

## Build Strong Relationships

Networking and relationship building are crucial for long-term success. Focus on providing value to others.

## Stay Adaptable

The business landscape is constantly changing. Stay flexible and be ready to pivot when necessary.

## Call to Action

What strategies have worked best for your business? Share your experiences in the comments below!`,
      tags: ['business', 'entrepreneurship', 'productivity', 'growth', 'strategy'],
      headlines: [
        'Essential Strategies for Business Success',
        'How to Build a Thriving Solo Business',
        "The Entrepreneur's Guide to Sustainable Growth",
        'Proven Methods for Business Development',
        'Building Your Business the Right Way',
      ],
      summary:
        'This article covers essential strategies for building and growing a successful business, focusing on core strengths, relationship building, and adaptability.',
      socialPost:
        'Building a successful business takes time and strategy. Focus on your strengths, build relationships, and stay adaptable! 💪 #entrepreneurship #business #growth',
    };

    return (
      fallbacks[type as keyof typeof fallbacks] ||
      'Content temporarily unavailable. Please try again later.'
    );
  }

  // Enhanced wrapper methods for all original service functions

  /**
   * Enhanced generateTopic with retry logic and fallback
   */
  public async generateTopic(): Promise<string> {
    try {
      return await this.executeWithRetry(
        () => originalGeminiService.generateTopic(),
        'generateTopic'
      );
    } catch (error) {
      console.error('Failed to generate topic after retries, using fallback:', error);
      return this.generateFallbackContent('topic') as string;
    }
  }

  /**
   * Enhanced generateIdeas with retry logic and fallback
   */
  public async generateIdeas(topic: string): Promise<string[]> {
    try {
      return await this.executeWithRetry(
        () => originalGeminiService.generateIdeas(topic),
        'generateIdeas'
      );
    } catch (error) {
      console.error('Failed to generate ideas after retries, using fallback:', error);
      return this.generateFallbackContent('ideas') as string[];
    }
  }

  /**
   * Enhanced generateBlogPost with retry logic and fallback
   */
  public async generateBlogPost(idea: string): Promise<string> {
    try {
      return await this.executeWithRetry(
        () => originalGeminiService.generateBlogPost(idea),
        'generateBlogPost'
      );
    } catch (error) {
      console.error('Failed to generate blog post after retries, using fallback:', error);
      return this.generateFallbackContent('blogPost', idea) as string;
    }
  }

  /**
   * Enhanced generatePersonalizedContent with retry logic and fallback
   */
  public async generatePersonalizedContent(
    idea: string,
    brandVoice?: {
      tone: string;
      writingStyle: string;
      vocabulary: string[];
      targetAudience: string;
    },
    audienceProfile?: {
      ageRange: string;
      industry: string;
      interests: string[];
      painPoints: string[];
    }
  ): Promise<string> {
    try {
      return await this.executeWithRetry(
        () => originalGeminiService.generatePersonalizedContent(idea, brandVoice, audienceProfile),
        'generatePersonalizedContent'
      );
    } catch (error) {
      console.error(
        'Failed to generate personalized content after retries, using fallback:',
        error
      );
      return this.generateFallbackContent('blogPost', idea) as string;
    }
  }

  /**
   * Enhanced generateTags with retry logic and fallback
   */
  public async generateTags(blogPost: string): Promise<string[]> {
    try {
      return await this.executeWithRetry(
        () => originalGeminiService.generateTags(blogPost),
        'generateTags'
      );
    } catch (error) {
      console.error('Failed to generate tags after retries, using fallback:', error);
      return this.generateFallbackContent('tags') as string[];
    }
  }

  /**
   * Enhanced generateHeadlines with retry logic and fallback
   */
  public async generateHeadlines(blogPost: string): Promise<string[]> {
    try {
      return await this.executeWithRetry(
        () => originalGeminiService.generateHeadlines(blogPost),
        'generateHeadlines'
      );
    } catch (error) {
      console.error('Failed to generate headlines after retries, using fallback:', error);
      return this.generateFallbackContent('headlines') as string[];
    }
  }

  /**
   * Enhanced generateSummary with retry logic and fallback
   */
  public async generateSummary(blogPost: string): Promise<string> {
    try {
      return await this.executeWithRetry(
        () => originalGeminiService.generateSummary(blogPost),
        'generateSummary'
      );
    } catch (error) {
      console.error('Failed to generate summary after retries, using fallback:', error);
      return this.generateFallbackContent('summary') as string;
    }
  }

  /**
   * Enhanced generateSocialMediaPost with retry logic and fallback
   */
  public async generateSocialMediaPost(
    platform: string,
    blogPost: string,
    tone: string,
    audience: string
  ): Promise<string> {
    try {
      return await this.executeWithRetry(
        () => originalGeminiService.generateSocialMediaPost(platform, blogPost, tone, audience),
        'generateSocialMediaPost'
      );
    } catch (error) {
      console.error('Failed to generate social media post after retries, using fallback:', error);
      return this.generateFallbackContent('socialPost') as string;
    }
  }

  /**
   * Enhanced generateImage with retry logic and error handling
   */
  public async generateImage(
    prompt: string,
    options?: {
      imageStyle?: {
        stylePrompt: string;
        colorPalette: string[];
        visualElements: string[];
        brandAssets: Array<{ type: string; data: string; usage: string }>;
      };
      platform?: string;
      aspectRatio?: string;
      numberOfImages?: number;
    }
  ): Promise<string[]> {
    try {
      return await this.executeWithRetry(
        () => originalGeminiService.generateImage(prompt, options),
        'generateImage',
        { maxRetries: 2 } // Fewer retries for image generation due to higher cost
      );
    } catch (error) {
      console.error('Failed to generate images after retries:', error);
      // For images, we can't provide meaningful fallbacks, so we throw the error
      throw new Error(
        `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Enhanced generateImagePrompts with retry logic and fallback
   */
  public async generateImagePrompts(blogPost: string): Promise<string[]> {
    try {
      return await this.executeWithRetry(
        () => originalGeminiService.generateImagePrompts(blogPost),
        'generateImagePrompts'
      );
    } catch (error) {
      console.error('Failed to generate image prompts after retries, using fallback:', error);
      return [
        'A professional workspace with modern technology and productivity tools',
        'An entrepreneur working on a laptop in a bright, organized office',
        'A clean, minimalist desk setup with business planning materials',
      ];
    }
  }

  /**
   * Reset usage metrics (useful for testing or periodic resets)
   */
  public resetMetrics(): void {
    this.usageMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date(),
      rateLimitHits: 0,
    };
    this.saveMetricsToStorage();
  }

  /**
   * Update rate limit configuration
   */
  public updateRateLimits(config: Partial<RateLimitConfig>): void {
    this.rateLimitConfig = { ...this.rateLimitConfig, ...config };
  }

  /**
   * Update retry configuration
   */
  public updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }
}

// Export singleton instance
export const enhancedGeminiService = new EnhancedGeminiService();

// Export all original functions through the enhanced service for backward compatibility
export const generateTopic = () => enhancedGeminiService.generateTopic();
export const generateIdeas = (topic: string) => enhancedGeminiService.generateIdeas(topic);
export const generateBlogPost = (idea: string) => enhancedGeminiService.generateBlogPost(idea);
export const generatePersonalizedContent = (
  idea: string,
  brandVoice?: { tone: string; writingStyle: string; vocabulary: string[]; targetAudience: string },
  audienceProfile?: {
    ageRange: string;
    industry: string;
    interests: string[];
    painPoints: string[];
  }
) => enhancedGeminiService.generatePersonalizedContent(idea, brandVoice, audienceProfile);
export const generateTags = (blogPost: string) => enhancedGeminiService.generateTags(blogPost);
export const generateHeadlines = (blogPost: string) =>
  enhancedGeminiService.generateHeadlines(blogPost);
export const generateSummary = (blogPost: string) =>
  enhancedGeminiService.generateSummary(blogPost);
export const generateSocialMediaPost = (
  platform: string,
  blogPost: string,
  tone: string,
  audience: string
) => enhancedGeminiService.generateSocialMediaPost(platform, blogPost, tone, audience);
export const generateImage = (prompt: string, options?: any) =>
  enhancedGeminiService.generateImage(prompt, options);
export const generateImagePrompts = (blogPost: string) =>
  enhancedGeminiService.generateImagePrompts(blogPost);

// Export additional utility functions
export const getAIServiceMetrics = () => enhancedGeminiService.getUsageMetrics();
export const getAIServiceHealth = () => enhancedGeminiService.getHealthStatus();
export const resetAIServiceMetrics = () => enhancedGeminiService.resetMetrics();

// Re-export all other functions from original service that don't need enhancement
export * from './geminiService';
