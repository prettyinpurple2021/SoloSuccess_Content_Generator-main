/**
 * Integration Orchestrator Service
 *
 * Production-quality solution for managing complex social media integrations
 * with automated setup, health monitoring, and intelligent fallbacks.
 */

import { Integration, IntegrationStatus, PostResult, ConnectionTestResult } from '../types';

interface PlatformConfig {
  name: string;
  displayName: string;
  authType: 'oauth2' | 'oauth1' | 'api_key' | 'bearer_token';
  setupComplexity: 'simple' | 'moderate' | 'complex';
  requiredCredentials: string[];
  optionalCredentials: string[];
  rateLimits: {
    postsPerHour: number;
    postsPerDay: number;
    requestsPerMinute: number;
  };
  features: {
    textPosts: boolean;
    imagePosts: boolean;
    videoPosts: boolean;
    scheduling: boolean;
    analytics: boolean;
  };
  contentLimits: {
    maxTextLength: number;
    maxImageSize: number;
    maxVideoSize: number;
    supportedImageFormats: string[];
    supportedVideoFormats: string[];
  };
}

interface SetupGuide {
  platform: string;
  steps: SetupStep[];
  estimatedTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'action' | 'verification' | 'credential';
  required: boolean;
  estimatedTime: string;
  instructions: string[];
  links?: { text: string; url: string }[];
  troubleshooting?: string[];
}

interface IntegrationHealth {
  platform: string;
  status: IntegrationStatus;
  lastCheck: Date;
  responseTime: number;
  successRate: number;
  rateLimitStatus: {
    remaining: number;
    resetTime: Date;
    percentage: number;
  };
  issues: string[];
  recommendations: string[];
}

class IntegrationOrchestrator {
  private platformConfigs: Map<string, PlatformConfig> = new Map();
  private setupGuides: Map<string, SetupGuide> = new Map();
  private healthStatus: Map<string, IntegrationHealth> = new Map();
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.initializePlatformConfigs();
    this.initializeSetupGuides();
    this.startHealthMonitoring();
  }

  /**
   * Initialize platform configurations
   */
  private initializePlatformConfigs(): void {
    const configs: PlatformConfig[] = [
      {
        name: 'twitter',
        displayName: 'Twitter/X',
        authType: 'oauth2',
        setupComplexity: 'moderate',
        requiredCredentials: ['client_id', 'client_secret', 'access_token', 'access_token_secret'],
        optionalCredentials: ['bearer_token'],
        rateLimits: {
          postsPerHour: 300,
          postsPerDay: 2400,
          requestsPerMinute: 100,
        },
        features: {
          textPosts: true,
          imagePosts: true,
          videoPosts: true,
          scheduling: false, // Twitter API v2 limitation
          analytics: true,
        },
        contentLimits: {
          maxTextLength: 280,
          maxImageSize: 5 * 1024 * 1024, // 5MB
          maxVideoSize: 512 * 1024 * 1024, // 512MB
          supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          supportedVideoFormats: ['mp4', 'mov'],
        },
      },
      {
        name: 'linkedin',
        displayName: 'LinkedIn',
        authType: 'oauth2',
        setupComplexity: 'complex',
        requiredCredentials: ['client_id', 'client_secret', 'access_token'],
        optionalCredentials: ['refresh_token'],
        rateLimits: {
          postsPerHour: 100,
          postsPerDay: 500,
          requestsPerMinute: 60,
        },
        features: {
          textPosts: true,
          imagePosts: true,
          videoPosts: true,
          scheduling: true,
          analytics: true,
        },
        contentLimits: {
          maxTextLength: 3000,
          maxImageSize: 100 * 1024 * 1024, // 100MB
          maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
          supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif'],
          supportedVideoFormats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
        },
      },
      {
        name: 'facebook',
        displayName: 'Facebook',
        authType: 'oauth2',
        setupComplexity: 'complex',
        requiredCredentials: ['app_id', 'app_secret', 'access_token', 'page_id'],
        optionalCredentials: ['page_access_token'],
        rateLimits: {
          postsPerHour: 200,
          postsPerDay: 1000,
          requestsPerMinute: 200,
        },
        features: {
          textPosts: true,
          imagePosts: true,
          videoPosts: true,
          scheduling: true,
          analytics: true,
        },
        contentLimits: {
          maxTextLength: 63206,
          maxImageSize: 100 * 1024 * 1024, // 100MB
          maxVideoSize: 10 * 1024 * 1024 * 1024, // 10GB
          supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
          supportedVideoFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', '3gp'],
        },
      },
      {
        name: 'instagram',
        displayName: 'Instagram',
        authType: 'oauth2',
        setupComplexity: 'complex',
        requiredCredentials: ['client_id', 'client_secret', 'access_token', 'user_id'],
        optionalCredentials: [],
        rateLimits: {
          postsPerHour: 25,
          postsPerDay: 200,
          requestsPerMinute: 60,
        },
        features: {
          textPosts: false, // Instagram requires media
          imagePosts: true,
          videoPosts: true,
          scheduling: true,
          analytics: true,
        },
        contentLimits: {
          maxTextLength: 2200,
          maxImageSize: 100 * 1024 * 1024, // 100MB
          maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
          supportedImageFormats: ['jpg', 'jpeg', 'png'],
          supportedVideoFormats: ['mp4', 'mov'],
        },
      },
      {
        name: 'threads',
        displayName: 'Threads',
        authType: 'oauth2',
        setupComplexity: 'moderate',
        requiredCredentials: ['access_token', 'user_id'],
        optionalCredentials: [],
        rateLimits: {
          postsPerHour: 250,
          postsPerDay: 1000,
          requestsPerMinute: 100,
        },
        features: {
          textPosts: true,
          imagePosts: true,
          videoPosts: true,
          scheduling: false,
          analytics: false,
        },
        contentLimits: {
          maxTextLength: 500,
          maxImageSize: 100 * 1024 * 1024, // 100MB
          maxVideoSize: 100 * 1024 * 1024, // 100MB
          supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif'],
          supportedVideoFormats: ['mp4', 'mov'],
        },
      },
      {
        name: 'bluesky',
        displayName: 'Bluesky',
        authType: 'bearer_token',
        setupComplexity: 'simple',
        requiredCredentials: ['handle', 'app_password'],
        optionalCredentials: ['did'],
        rateLimits: {
          postsPerHour: 300,
          postsPerDay: 5000,
          requestsPerMinute: 3000,
        },
        features: {
          textPosts: true,
          imagePosts: true,
          videoPosts: false,
          scheduling: false,
          analytics: false,
        },
        contentLimits: {
          maxTextLength: 300,
          maxImageSize: 1 * 1024 * 1024, // 1MB
          maxVideoSize: 0,
          supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          supportedVideoFormats: [],
        },
      },
    ];

    configs.forEach((config) => {
      this.platformConfigs.set(config.name, config);
    });
  }

  /**
   * Initialize setup guides for each platform
   */
  private initializeSetupGuides(): void {
    // Twitter/X Setup Guide
    this.setupGuides.set('twitter', {
      platform: 'twitter',
      steps: [
        {
          id: 'twitter_1',
          title: 'Create Twitter Developer Account',
          description: 'Sign up for a Twitter Developer account to access the API',
          type: 'action',
          required: true,
          estimatedTime: '10 minutes',
          instructions: [
            'Go to https://developer.twitter.com',
            'Click "Sign up" and log in with your Twitter account',
            'Complete the developer application form',
            'Verify your email address',
            'Wait for approval (usually instant for basic access)',
          ],
          links: [{ text: 'Twitter Developer Portal', url: 'https://developer.twitter.com' }],
          troubleshooting: [
            'If application is rejected, ensure you provide clear use case description',
            'Make sure your Twitter account is verified with phone number',
          ],
        },
        {
          id: 'twitter_2',
          title: 'Create Twitter App',
          description: 'Create a new app in the Twitter Developer Portal',
          type: 'action',
          required: true,
          estimatedTime: '5 minutes',
          instructions: [
            'In the Developer Portal, click "Create App"',
            'Enter app name and description',
            'Set app permissions to "Read and Write"',
            'Add callback URL: https://your-domain.com/auth/twitter/callback',
            'Save the app configuration',
          ],
        },
        {
          id: 'twitter_3',
          title: 'Get API Credentials',
          description: 'Obtain your API keys and tokens',
          type: 'credential',
          required: true,
          estimatedTime: '2 minutes',
          instructions: [
            'Go to your app settings',
            'Navigate to "Keys and Tokens" tab',
            'Copy the API Key (Client ID)',
            'Copy the API Secret Key (Client Secret)',
            'Generate Access Token and Access Token Secret',
            'Copy both access tokens',
          ],
        },
        {
          id: 'twitter_4',
          title: 'Test Connection',
          description: 'Verify your credentials work correctly',
          type: 'verification',
          required: true,
          estimatedTime: '1 minute',
          instructions: [
            'Enter your credentials in the integration form',
            'Click "Test Connection"',
            'Verify you can post a test message',
          ],
        },
      ],
      estimatedTime: '20 minutes',
      difficulty: 'intermediate',
      prerequisites: [
        'Active Twitter account',
        'Verified phone number on Twitter account',
        'Clear use case for API access',
      ],
    });

    // LinkedIn Setup Guide
    this.setupGuides.set('linkedin', {
      platform: 'linkedin',
      steps: [
        {
          id: 'linkedin_1',
          title: 'Create LinkedIn Developer App',
          description: 'Set up a LinkedIn app for API access',
          type: 'action',
          required: true,
          estimatedTime: '15 minutes',
          instructions: [
            'Go to https://www.linkedin.com/developers/',
            'Click "Create App"',
            'Fill in app details (name, description, logo)',
            'Associate with a LinkedIn Company Page',
            'Submit for review',
          ],
          links: [{ text: 'LinkedIn Developers', url: 'https://www.linkedin.com/developers/' }],
          troubleshooting: [
            'You must have a LinkedIn Company Page to create an app',
            'App review can take 1-7 business days',
          ],
        },
        {
          id: 'linkedin_2',
          title: 'Request API Products',
          description: 'Request access to required API products',
          type: 'action',
          required: true,
          estimatedTime: '5 minutes',
          instructions: [
            'In your app dashboard, go to "Products" tab',
            'Request "Share on LinkedIn" product',
            'Request "Marketing Developer Platform" if needed',
            'Wait for approval',
          ],
        },
        {
          id: 'linkedin_3',
          title: 'Configure OAuth Settings',
          description: 'Set up OAuth redirect URLs',
          type: 'action',
          required: true,
          estimatedTime: '3 minutes',
          instructions: [
            'Go to "Auth" tab in your app',
            'Add redirect URL: https://your-domain.com/auth/linkedin/callback',
            'Note down Client ID and Client Secret',
          ],
        },
        {
          id: 'linkedin_4',
          title: 'Generate Access Token',
          description: 'Obtain user access token through OAuth flow',
          type: 'credential',
          required: true,
          estimatedTime: '5 minutes',
          instructions: [
            'Use OAuth 2.0 flow to get user authorization',
            'Exchange authorization code for access token',
            'Store access token securely',
          ],
        },
      ],
      estimatedTime: '30 minutes + review time',
      difficulty: 'advanced',
      prerequisites: [
        'LinkedIn Company Page (required)',
        'Business use case for API access',
        'Understanding of OAuth 2.0 flow',
      ],
    });

    // Add more setup guides for other platforms...
    // (Facebook, Instagram, Threads, Bluesky)
  }

  /**
   * Get platform configuration
   */
  getPlatformConfig(platform: string): PlatformConfig | null {
    return this.platformConfigs.get(platform) || null;
  }

  /**
   * Get setup guide for platform
   */
  getSetupGuide(platform: string): SetupGuide | null {
    return this.setupGuides.get(platform) || null;
  }

  /**
   * Get all available platforms
   */
  getAvailablePlatforms(): PlatformConfig[] {
    return Array.from(this.platformConfigs.values());
  }

  /**
   * Validate content for platform
   */
  validateContent(
    platform: string,
    content: {
      text?: string;
      imageUrl?: string;
      videoUrl?: string;
    }
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const config = this.platformConfigs.get(platform);
    if (!config) {
      return { valid: false, errors: ['Unknown platform'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate text content
    if (content.text) {
      if (content.text.length > config.contentLimits.maxTextLength) {
        errors.push(
          `Text too long: ${content.text.length}/${config.contentLimits.maxTextLength} characters`
        );
      }

      if (content.text.length > config.contentLimits.maxTextLength * 0.9) {
        warnings.push('Text is close to character limit');
      }
    }

    // Validate media requirements
    if (platform === 'instagram' && !content.imageUrl && !content.videoUrl) {
      errors.push('Instagram requires at least one image or video');
    }

    // Check feature support
    if (content.imageUrl && !config.features.imagePosts) {
      errors.push('Platform does not support image posts');
    }

    if (content.videoUrl && !config.features.videoPosts) {
      errors.push('Platform does not support video posts');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Adapt content for platform
   */
  adaptContentForPlatform(
    platform: string,
    content: {
      text: string;
      imageUrl?: string;
      videoUrl?: string;
    }
  ): {
    adaptedContent: typeof content;
    adaptations: string[];
  } {
    const config = this.platformConfigs.get(platform);
    if (!config) {
      return { adaptedContent: content, adaptations: ['Unknown platform'] };
    }

    const adaptations: string[] = [];
    let adaptedText = content.text;

    // Truncate text if too long
    if (adaptedText.length > config.contentLimits.maxTextLength) {
      const maxLength = config.contentLimits.maxTextLength - 3; // Account for "..."
      adaptedText = adaptedText.substring(0, maxLength) + '...';
      adaptations.push(`Text truncated to ${config.contentLimits.maxTextLength} characters`);
    }

    // Platform-specific adaptations
    switch (platform) {
      case 'twitter':
        // Add hashtags at the end for better engagement
        if (!adaptedText.includes('#')) {
          const remainingChars = config.contentLimits.maxTextLength - adaptedText.length;
          if (remainingChars > 20) {
            adaptedText += ' #productivity #tips';
            adaptations.push('Added relevant hashtags');
          }
        }
        break;

      case 'linkedin':
        // LinkedIn prefers professional tone
        if (!adaptedText.includes('professional') && !adaptedText.includes('business')) {
          adaptations.push('Consider adding professional context for LinkedIn audience');
        }
        break;

      case 'instagram':
        // Instagram requires media
        if (!content.imageUrl && !content.videoUrl) {
          adaptations.push(
            'Instagram post requires an image or video - consider adding visual content'
          );
        }
        break;

      case 'bluesky':
        // Bluesky has shorter character limit
        if (adaptedText.length > 250) {
          adaptedText = adaptedText.substring(0, 247) + '...';
          adaptations.push('Text shortened for Bluesky character limit');
        }
        break;
    }

    return {
      adaptedContent: {
        ...content,
        text: adaptedText,
      },
      adaptations,
    };
  }

  /**
   * Test integration connection
   */
  async testConnection(integration: Integration): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      // Import the appropriate service based on platform
      const service = await this.getIntegrationService(integration.platform);

      if (!service || !service.testConnection) {
        throw new Error(`No test connection method available for ${integration.platform}`);
      }

      const result = await service.testConnection(integration.credentials);

      return {
        success: true,
        responseTime: Date.now() - startTime,
        details: result,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Post content to platform with intelligent retry
   */
  async postToPlatform(
    integration: Integration,
    content: {
      text: string;
      imageUrl?: string;
      videoUrl?: string;
    }
  ): Promise<PostResult> {
    const startTime = Date.now();

    try {
      // Validate content first
      const validation = this.validateContent(integration.platform, content);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }

      // Adapt content for platform
      const { adaptedContent, adaptations } = this.adaptContentForPlatform(
        integration.platform,
        content
      );

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(integration.platform);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds`);
      }

      // Get integration service
      const service = await this.getIntegrationService(integration.platform);
      if (!service || !service.post) {
        throw new Error(`No posting service available for ${integration.platform}`);
      }

      // Attempt to post
      const result = await service.post(integration.credentials, adaptedContent);

      // Update health status
      this.updateHealthStatus(integration.platform, true, Date.now() - startTime);

      return {
        success: true,
        postId: result.id,
        url: result.url,
        timestamp: new Date(),
        platform: integration.platform,
        adaptations,
        warnings: validation.warnings,
      };
    } catch (error) {
      // Update health status
      this.updateHealthStatus(integration.platform, false, Date.now() - startTime, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        platform: integration.platform,
      };
    }
  }

  /**
   * Get integration service for platform
   */
  private async getIntegrationService(platform: string): Promise<any> {
    try {
      switch (platform) {
        case 'twitter':
          return await import('./platforms/twitterClient.js');
        case 'linkedin':
          return await import('./platforms/linkedInClient.js');
        case 'facebook':
          return await import('./platforms/facebookClient.js');
        case 'instagram':
          return await import('./platforms/instagramClient.js');
        case 'threads':
          // Threads not yet implemented, return null for graceful degradation
          return null;
        case 'bluesky':
          return await import('./platforms/blueSkyClient.js');
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to load service for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Check rate limits for platform
   */
  private async checkRateLimit(platform: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter: number;
  }> {
    // This would typically check against stored rate limit data
    // For now, return a simple implementation
    return {
      allowed: true,
      remaining: 100,
      resetTime: Date.now() + 3600000, // 1 hour
      retryAfter: 0,
    };
  }

  /**
   * Update health status for platform
   */
  private updateHealthStatus(
    platform: string,
    success: boolean,
    responseTime: number,
    error?: unknown
  ): void {
    const existing = this.healthStatus.get(platform);
    const now = new Date();

    if (!existing) {
      this.healthStatus.set(platform, {
        platform,
        status: success ? 'connected' : 'error',
        lastCheck: now,
        responseTime,
        successRate: success ? 1 : 0,
        rateLimitStatus: {
          remaining: 100,
          resetTime: new Date(Date.now() + 3600000),
          percentage: 100,
        },
        issues: success ? [] : [error instanceof Error ? error.message : 'Unknown error'],
        recommendations: [],
      });
    } else {
      // Update existing health status
      const totalRequests = existing.successRate * 100; // Simplified calculation
      const successfulRequests = success ? totalRequests + 1 : totalRequests;
      const newTotal = totalRequests + 1;

      existing.status = success ? 'connected' : 'error';
      existing.lastCheck = now;
      existing.responseTime = responseTime;
      existing.successRate = successfulRequests / newTotal;

      if (!success && error) {
        existing.issues.push(error instanceof Error ? error.message : 'Unknown error');
        existing.issues = existing.issues.slice(-5); // Keep last 5 issues
      }
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Check health every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, 300000);
  }

  /**
   * Perform health checks on all integrations
   */
  private async performHealthChecks(): Promise<void> {
    // This would check all active integrations
    // Implementation depends on how integrations are stored
    console.log('🔍 Performing integration health checks...');
  }

  /**
   * Get health status for all platforms
   */
  getHealthStatus(): IntegrationHealth[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Get health status for specific platform
   */
  getPlatformHealth(platform: string): IntegrationHealth | null {
    return this.healthStatus.get(platform) || null;
  }

  /**
   * Get setup progress for platform
   */
  getSetupProgress(
    platform: string,
    completedSteps: string[]
  ): {
    totalSteps: number;
    completedSteps: number;
    nextStep: SetupStep | null;
    progress: number;
  } {
    const guide = this.setupGuides.get(platform);
    if (!guide) {
      return { totalSteps: 0, completedSteps: 0, nextStep: null, progress: 0 };
    }

    const totalSteps = guide.steps.length;
    const completed = completedSteps.length;
    const progress = (completed / totalSteps) * 100;

    const nextStep = guide.steps.find((step) => !completedSteps.includes(step.id)) || null;

    return {
      totalSteps,
      completedSteps: completed,
      nextStep,
      progress,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

// Create singleton instance
const integrationOrchestrator = new IntegrationOrchestrator();

export { IntegrationOrchestrator, integrationOrchestrator };
export type { PlatformConfig, SetupGuide, SetupStep, IntegrationHealth };
