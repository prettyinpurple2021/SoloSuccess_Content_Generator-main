/**
 * Reliable Image Generation Service
 *
 * Production-quality solution for handling image generation reliability
 * with multiple providers, fallback mechanisms, and quality assurance.
 */

interface ImageProvider {
  id: string;
  name: string;
  priority: number;
  reliability: number; // 0-1 score
  costPerImage: number;
  maxResolution: string;
  supportedFormats: string[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  features: {
    styleConsistency: boolean;
    brandAssets: boolean;
    backgroundRemoval: boolean;
    upscaling: boolean;
  };
}

interface ImageGenerationRequest {
  id: string;
  prompt: string;
  style?: string;
  dimensions?: string;
  quality?: 'draft' | 'standard' | 'high';
  userId: string;
  retryCount: number;
  maxRetries: number;
  fallbackOptions: {
    allowStockImages: boolean;
    allowPlaceholders: boolean;
    allowTextOnly: boolean;
  };
}

interface ImageGenerationResult {
  success: boolean;
  images: string[];
  provider: string;
  quality: string;
  processingTime: number;
  cost: number;
  metadata: {
    originalPrompt: string;
    adaptedPrompt?: string;
    style?: string;
    dimensions: string;
    format: string;
  };
  fallbackUsed?: {
    type: 'stock' | 'placeholder' | 'text_only';
    reason: string;
  };
  error?: string;
}

interface StockImageSource {
  id: string;
  name: string;
  apiUrl: string;
  searchEndpoint: string;
  downloadEndpoint: string;
  attribution: boolean;
  license: 'free' | 'premium' | 'royalty_free';
}

class ReliableImageGenerationService {
  private providers: Map<string, ImageProvider> = new Map();
  private stockSources: Map<string, StockImageSource> = new Map();
  private providerHealth: Map<string, { lastCheck: Date; isHealthy: boolean; errorCount: number }> =
    new Map();
  private requestHistory: ImageGenerationRequest[] = [];
  private cache = new Map<string, { images: string[]; timestamp: Date; ttl: number }>();

  constructor() {
    this.initializeProviders();
    this.initializeStockSources();
    this.startHealthMonitoring();
  }

  /**
   * Initialize AI image generation providers
   */
  private initializeProviders(): void {
    const providers: ImageProvider[] = [
      {
        id: 'gemini_imagen',
        name: 'Google Imagen (via Gemini)',
        priority: 1,
        reliability: 0.92,
        costPerImage: 0.02,
        maxResolution: '1024x1024',
        supportedFormats: ['png', 'jpg'],
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
        },
        features: {
          styleConsistency: true,
          brandAssets: false,
          backgroundRemoval: false,
          upscaling: false,
        },
      },
      {
        id: 'openai_dalle',
        name: 'OpenAI DALL-E 3',
        priority: 2,
        reliability: 0.95,
        costPerImage: 0.04,
        maxResolution: '1024x1024',
        supportedFormats: ['png'],
        rateLimits: {
          requestsPerMinute: 50,
          requestsPerHour: 500,
        },
        features: {
          styleConsistency: true,
          brandAssets: false,
          backgroundRemoval: false,
          upscaling: false,
        },
      },
      {
        id: 'stability_ai',
        name: 'Stability AI SDXL',
        priority: 3,
        reliability: 0.88,
        costPerImage: 0.03,
        maxResolution: '1024x1024',
        supportedFormats: ['png', 'jpg', 'webp'],
        rateLimits: {
          requestsPerMinute: 150,
          requestsPerHour: 2000,
        },
        features: {
          styleConsistency: true,
          brandAssets: true,
          backgroundRemoval: true,
          upscaling: true,
        },
      },
    ];

    providers.forEach((provider) => {
      this.providers.set(provider.id, provider);
      this.providerHealth.set(provider.id, {
        lastCheck: new Date(),
        isHealthy: true,
        errorCount: 0,
      });
    });
  }

  /**
   * Initialize stock image sources for fallback
   */
  private initializeStockSources(): void {
    const sources: StockImageSource[] = [
      {
        id: 'unsplash',
        name: 'Unsplash',
        apiUrl: 'https://api.unsplash.com',
        searchEndpoint: '/search/photos',
        downloadEndpoint: '/photos/{id}/download',
        attribution: true,
        license: 'free',
      },
      {
        id: 'pexels',
        name: 'Pexels',
        apiUrl: 'https://api.pexels.com/v1',
        searchEndpoint: '/search',
        downloadEndpoint: '/photos/{id}',
        attribution: true,
        license: 'free',
      },
      {
        id: 'pixabay',
        name: 'Pixabay',
        apiUrl: 'https://pixabay.com/api',
        searchEndpoint: '/',
        downloadEndpoint: '/',
        attribution: false,
        license: 'free',
      },
    ];

    sources.forEach((source) => {
      this.stockSources.set(source.id, source);
    });
  }

  /**
   * Generate images with comprehensive fallback strategy
   */
  async generateImages(
    prompt: string,
    options: {
      style?: string;
      dimensions?: string;
      quality?: 'draft' | 'standard' | 'high';
      userId: string;
      count?: number;
      fallbackOptions?: {
        allowStockImages?: boolean;
        allowPlaceholders?: boolean;
        allowTextOnly?: boolean;
      };
    }
  ): Promise<ImageGenerationResult> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    console.log(`🎨 Starting image generation (${requestId}): "${prompt}"`);

    const request: ImageGenerationRequest = {
      id: requestId,
      prompt,
      style: options.style,
      dimensions: options.dimensions || '1024x1024',
      quality: options.quality || 'standard',
      userId: options.userId,
      retryCount: 0,
      maxRetries: 3,
      fallbackOptions: {
        allowStockImages: options.fallbackOptions?.allowStockImages ?? true,
        allowPlaceholders: options.fallbackOptions?.allowPlaceholders ?? true,
        allowTextOnly: options.fallbackOptions?.allowTextOnly ?? true,
      },
    };

    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit for image generation: ${requestId}`);
      return {
        success: true,
        images: cached.images,
        provider: 'cache',
        quality: options.quality || 'standard',
        processingTime: Date.now() - startTime,
        cost: 0,
        metadata: {
          originalPrompt: prompt,
          dimensions: options.dimensions || '1024x1024',
          format: 'png',
        },
      };
    }

    // Try AI providers in order of priority and health
    const healthyProviders = this.getHealthyProviders();

    for (const provider of healthyProviders) {
      try {
        console.log(`🔄 Trying provider: ${provider.name}`);

        const result = await this.generateWithProvider(provider, request);

        if (result.success && result.images.length > 0) {
          // Cache successful result
          this.addToCache(cacheKey, result.images, 3600000); // 1 hour TTL

          // Update provider health
          this.updateProviderHealth(provider.id, true);

          console.log(`✅ Image generation successful with ${provider.name} (${requestId})`);

          return {
            ...result,
            processingTime: Date.now() - startTime,
          };
        }
      } catch (error) {
        console.error(`❌ Provider ${provider.name} failed:`, error);
        this.updateProviderHealth(provider.id, false);

        request.retryCount++;
        if (request.retryCount >= request.maxRetries) {
          break;
        }

        // Wait before trying next provider
        await this.sleep(1000);
      }
    }

    // All AI providers failed, try fallback strategies
    console.log(`🔄 All AI providers failed, trying fallback strategies (${requestId})`);

    const fallbackResult = await this.tryFallbackStrategies(request);

    return {
      ...fallbackResult,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Generate images with a specific provider
   */
  private async generateWithProvider(
    provider: ImageProvider,
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResult> {
    const adaptedPrompt = await this.adaptPromptForProvider(request.prompt, provider);

    let images: string[] = [];

    switch (provider.id) {
      case 'gemini_imagen':
        images = await this.generateWithGemini(adaptedPrompt, request);
        break;
      case 'openai_dalle':
        images = await this.generateWithOpenAI(adaptedPrompt, request);
        break;
      case 'stability_ai':
        images = await this.generateWithStabilityAI(adaptedPrompt, request);
        break;
      default:
        throw new Error(`Unknown provider: ${provider.id}`);
    }

    return {
      success: true,
      images,
      provider: provider.name,
      quality: request.quality || 'standard',
      processingTime: 0, // Will be set by caller
      cost: provider.costPerImage * images.length,
      metadata: {
        originalPrompt: request.prompt,
        adaptedPrompt,
        style: request.style,
        dimensions: request.dimensions || '1024x1024',
        format: 'png',
      },
    };
  }

  /**
   * Provider-specific generation methods
   */
  private async generateWithGemini(
    prompt: string,
    request: ImageGenerationRequest
  ): Promise<string[]> {
    try {
      const geminiService = await import('./geminiService.js');
      const result = await geminiService.generateImage(prompt, {
        style: request.style,
        dimensions: request.dimensions,
      });

      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error('Gemini image generation failed:', error);
      throw error;
    }
  }

  private async generateWithOpenAI(
    prompt: string,
    request: ImageGenerationRequest
  ): Promise<string[]> {
    // Placeholder for OpenAI DALL-E integration
    // This would require OpenAI API key and implementation
    throw new Error('OpenAI DALL-E integration not implemented');
  }

  private async generateWithStabilityAI(
    prompt: string,
    request: ImageGenerationRequest
  ): Promise<string[]> {
    // Placeholder for Stability AI integration
    // This would require Stability AI API key and implementation
    throw new Error('Stability AI integration not implemented');
  }

  /**
   * Try fallback strategies when AI generation fails
   */
  private async tryFallbackStrategies(
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResult> {
    const fallbackOptions = request.fallbackOptions;

    // Strategy 1: Stock images
    if (fallbackOptions.allowStockImages) {
      console.log(`🔄 Trying stock images fallback`);

      try {
        const stockImages = await this.searchStockImages(request.prompt);
        if (stockImages.length > 0) {
          return {
            success: true,
            images: stockImages.slice(0, 1), // Return first result
            provider: 'stock_images',
            quality: 'standard',
            processingTime: 0,
            cost: 0,
            metadata: {
              originalPrompt: request.prompt,
              dimensions: request.dimensions || '1024x1024',
              format: 'jpg',
            },
            fallbackUsed: {
              type: 'stock',
              reason: 'AI image generation failed, using stock images',
            },
          };
        }
      } catch (error) {
        console.error('Stock image search failed:', error);
      }
    }

    // Strategy 2: Placeholder images
    if (fallbackOptions.allowPlaceholders) {
      console.log(`🔄 Generating placeholder image`);

      const placeholderImage = await this.generatePlaceholderImage(request);

      return {
        success: true,
        images: [placeholderImage],
        provider: 'placeholder',
        quality: 'draft',
        processingTime: 0,
        cost: 0,
        metadata: {
          originalPrompt: request.prompt,
          dimensions: request.dimensions || '1024x1024',
          format: 'svg',
        },
        fallbackUsed: {
          type: 'placeholder',
          reason: 'AI and stock images failed, using placeholder',
        },
      };
    }

    // Strategy 3: Text-only content (no image)
    if (fallbackOptions.allowTextOnly) {
      console.log(`🔄 Falling back to text-only content`);

      return {
        success: true,
        images: [],
        provider: 'text_only',
        quality: 'draft',
        processingTime: 0,
        cost: 0,
        metadata: {
          originalPrompt: request.prompt,
          dimensions: '0x0',
          format: 'none',
        },
        fallbackUsed: {
          type: 'text_only',
          reason: 'All image generation methods failed, proceeding without image',
        },
      };
    }

    // All fallback strategies disabled or failed
    return {
      success: false,
      images: [],
      provider: 'none',
      quality: 'draft',
      processingTime: 0,
      cost: 0,
      metadata: {
        originalPrompt: request.prompt,
        dimensions: request.dimensions || '1024x1024',
        format: 'none',
      },
      error: 'All image generation and fallback strategies failed',
    };
  }

  /**
   * Search stock images as fallback
   */
  private async searchStockImages(query: string): Promise<string[]> {
    const searchTerms = this.extractSearchTerms(query);
    const images: string[] = [];

    for (const [sourceId, source] of this.stockSources) {
      try {
        const apiKey = this.getStockSourceApiKey(sourceId);
        if (!apiKey) {
          console.warn(`Skipping ${source.name} search – missing API key environment variable.`);
          continue;
        }

        const results = await this.fetchStockImageResults(source, searchTerms, apiKey);
        images.push(...results);

        if (images.length >= 3) break; // Limit results
      } catch (error) {
        console.error(`Stock image search failed for ${source.name}:`, error);
      }
    }

    return images;
  }

  /**
   * Generate placeholder image
   */
  private async generatePlaceholderImage(request: ImageGenerationRequest): Promise<string> {
    const [width, height] = (request.dimensions || '1024x1024').split('x').map(Number);
    const text = this.extractKeywords(request.prompt).slice(0, 3).join(' • ');

    // Generate SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <rect x="10%" y="10%" width="80%" height="80%" fill="#e0e0e0" stroke="#d0d0d0" stroke-width="2"/>
        <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#666">
          🎨 Image Placeholder
        </text>
        <text x="50%" y="55%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#888">
          ${text}
        </text>
        <text x="50%" y="65%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#aaa">
          ${width} × ${height}
        </text>
      </svg>
    `;

    // Convert SVG to data URL
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return dataUrl;
  }

  /**
   * Utility methods
   */
  private adaptPromptForProvider(prompt: string, provider: ImageProvider): Promise<string> {
    // Adapt prompt based on provider capabilities and best practices
    let adapted = prompt;

    switch (provider.id) {
      case 'gemini_imagen':
        // Gemini works well with descriptive prompts
        adapted = `High quality, professional ${prompt}`;
        break;
      case 'openai_dalle':
        // DALL-E prefers specific, detailed descriptions
        adapted = `Detailed, photorealistic ${prompt}`;
        break;
      case 'stability_ai':
        // Stability AI works well with artistic styles
        adapted = `Artistic, high resolution ${prompt}`;
        break;
    }

    return Promise.resolve(adapted);
  }

  private extractSearchTerms(prompt: string): string[] {
    // Extract meaningful search terms from the prompt
    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);

    // Remove common words
    const stopWords = [
      'the',
      'and',
      'for',
      'are',
      'but',
      'not',
      'you',
      'all',
      'can',
      'had',
      'her',
      'was',
      'one',
      'our',
      'out',
      'day',
      'get',
      'has',
      'him',
      'his',
      'how',
      'man',
      'new',
      'now',
      'old',
      'see',
      'two',
      'way',
      'who',
      'boy',
      'did',
      'its',
      'let',
      'put',
      'say',
      'she',
      'too',
      'use',
    ];

    return words.filter((word) => !stopWords.includes(word)).slice(0, 5);
  }

  private extractKeywords(prompt: string): string[] {
    return this.extractSearchTerms(prompt).slice(0, 3);
  }

  private async fetchStockImageResults(
    source: StockImageSource,
    terms: string[],
    apiKey: string
  ): Promise<string[]> {
    const query = encodeURIComponent(terms.join(' '));

    if (source.id === 'unsplash') {
      const url = `${source.apiUrl}${source.searchEndpoint}?query=${query}&per_page=5&orientation=landscape`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Unsplash request failed with status ${response.status}`);
      }
      const data = await response.json();
      return (data.results || [])
        .map((item: any) => item?.urls?.regular || item?.urls?.full)
        .filter(Boolean)
        .slice(0, 3);
    }

    if (source.id === 'pexels') {
      const url = `${source.apiUrl}${source.searchEndpoint}?query=${query}&per_page=5`;
      const response = await fetch(url, {
        headers: {
          Authorization: apiKey,
        },
      });
      if (!response.ok) {
        throw new Error(`Pexels request failed with status ${response.status}`);
      }
      const data = await response.json();
      return (data.photos || [])
        .map((item: any) => item?.src?.large2x || item?.src?.large || item?.src?.medium)
        .filter(Boolean)
        .slice(0, 3);
    }

    if (source.id === 'pixabay') {
      const url = `${source.apiUrl}?key=${apiKey}&q=${query}&image_type=photo&per_page=5`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Pixabay request failed with status ${response.status}`);
      }
      const data = await response.json();
      return (data.hits || [])
        .map((item: any) => item?.largeImageURL || item?.webformatURL)
        .filter(Boolean)
        .slice(0, 3);
    }

    throw new Error(`Unsupported stock image source: ${source.id}`);
  }

  private getStockSourceApiKey(sourceId: string): string | undefined {
    switch (sourceId) {
      case 'unsplash':
        return process.env.UNSPLASH_ACCESS_KEY;
      case 'pexels':
        return process.env.PEXELS_API_KEY;
      case 'pixabay':
        return process.env.PIXABAY_API_KEY;
      default:
        return undefined;
    }
  }

  private getHealthyProviders(): ImageProvider[] {
    return Array.from(this.providers.values())
      .filter((provider) => {
        const health = this.providerHealth.get(provider.id);
        return health?.isHealthy !== false;
      })
      .sort((a, b) => {
        // Sort by priority (lower number = higher priority) and reliability
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return b.reliability - a.reliability;
      });
  }

  private updateProviderHealth(providerId: string, success: boolean): void {
    const health = this.providerHealth.get(providerId);
    if (!health) return;

    if (success) {
      health.errorCount = Math.max(0, health.errorCount - 1);
      health.isHealthy = true;
    } else {
      health.errorCount++;
      health.isHealthy = health.errorCount < 5; // Mark unhealthy after 5 consecutive errors
    }

    health.lastCheck = new Date();
  }

  private startHealthMonitoring(): void {
    // Check provider health every 5 minutes
    setInterval(() => {
      this.checkProviderHealth();
    }, 300000);
  }

  private async checkProviderHealth(): Promise<void> {
    console.log('🏥 Checking provider health...');

    for (const [providerId, provider] of this.providers) {
      try {
        // Simple health check - try to generate a small test image
        await this.generateWithProvider(provider, {
          id: 'health-check',
          prompt: 'simple test',
          userId: 'system',
          retryCount: 0,
          maxRetries: 1,
          fallbackOptions: {
            allowStockImages: false,
            allowPlaceholders: false,
            allowTextOnly: false,
          },
        });

        this.updateProviderHealth(providerId, true);
      } catch (error) {
        this.updateProviderHealth(providerId, false);
      }
    }
  }

  /**
   * Caching methods
   */
  private generateCacheKey(prompt: string, options: any): string {
    const key = `${prompt}:${options.style || ''}:${options.dimensions || ''}:${options.quality || ''}`;
    return this.hashString(key);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): { images: string[] } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return { images: entry.images };
  }

  private addToCache(key: string, images: string[], ttl: number): void {
    this.cache.set(key, {
      images,
      timestamp: new Date(),
      ttl,
    });
  }

  private generateRequestId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Public methods for monitoring and management
   */
  getProviderStatus(): Array<{
    id: string;
    name: string;
    isHealthy: boolean;
    errorCount: number;
    lastCheck: Date;
  }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => {
      const health = this.providerHealth.get(id)!;
      return {
        id,
        name: provider.name,
        isHealthy: health.isHealthy,
        errorCount: health.errorCount,
        lastCheck: health.lastCheck,
      };
    });
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Image generation cache cleared');
  }

  resetProviderHealth(): void {
    for (const [providerId] of this.providers) {
      this.providerHealth.set(providerId, {
        lastCheck: new Date(),
        isHealthy: true,
        errorCount: 0,
      });
    }
    console.log('🔄 Provider health reset');
  }
}

// Create singleton instance
const reliableImageGenerationService = new ReliableImageGenerationService();

export { ReliableImageGenerationService, reliableImageGenerationService };
export type { ImageProvider, ImageGenerationRequest, ImageGenerationResult };
