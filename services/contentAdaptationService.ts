/**
 * ContentAdaptationService - Platform-specific content optimization
 *
 * Features:
 * - Platform-specific character limits
 * - Content style adaptation
 * - Hashtag optimization
 * - Link formatting
 * - Platform best practices
 * - Content truncation and expansion
 */

import { Post } from '../types';

export interface PlatformLimits {
  maxCharacters: number;
  maxHashtags: number;
  maxMentions: number;
  maxLinks: number;
  supportsLineBreaks: boolean;
  supportsRichText: boolean;
  supportsMedia: boolean;
  preferredHashtagStyle: 'none' | 'minimal' | 'moderate' | 'heavy';
  preferredMentionStyle: 'formal' | 'casual' | 'minimal';
}

export interface AdaptedContent {
  content: string;
  characterCount: number;
  platform: string;
  adaptations: string[];
  warnings: string[];
  hashtags: string[];
  mentions: string[];
  links: string[];
}

export class ContentAdaptationService {
  private static readonly PLATFORM_LIMITS: Record<string, PlatformLimits> = {
    twitter: {
      maxCharacters: 280,
      maxHashtags: 3,
      maxMentions: 3,
      maxLinks: 2,
      supportsLineBreaks: false,
      supportsRichText: false,
      supportsMedia: true,
      preferredHashtagStyle: 'moderate',
      preferredMentionStyle: 'casual',
    },
    linkedin: {
      maxCharacters: 1300,
      maxHashtags: 5,
      maxMentions: 5,
      maxLinks: 3,
      supportsLineBreaks: true,
      supportsRichText: true,
      supportsMedia: true,
      preferredHashtagStyle: 'minimal',
      preferredMentionStyle: 'formal',
    },
    facebook: {
      maxCharacters: 63206,
      maxHashtags: 10,
      maxMentions: 10,
      maxLinks: 5,
      supportsLineBreaks: true,
      supportsRichText: true,
      supportsMedia: true,
      preferredHashtagStyle: 'minimal',
      preferredMentionStyle: 'casual',
    },
    instagram: {
      maxCharacters: 2200,
      maxHashtags: 30,
      maxMentions: 20,
      maxLinks: 1,
      supportsLineBreaks: true,
      supportsRichText: false,
      supportsMedia: true,
      preferredHashtagStyle: 'heavy',
      preferredMentionStyle: 'casual',
    },
    bluesky: {
      maxCharacters: 300,
      maxHashtags: 3,
      maxMentions: 3,
      maxLinks: 2,
      supportsLineBreaks: false,
      supportsRichText: false,
      supportsMedia: true,
      preferredHashtagStyle: 'minimal',
      preferredMentionStyle: 'casual',
    },
    reddit: {
      maxCharacters: 40000,
      maxHashtags: 0,
      maxMentions: 10,
      maxLinks: 10,
      supportsLineBreaks: true,
      supportsRichText: true,
      supportsMedia: true,
      preferredHashtagStyle: 'none',
      preferredMentionStyle: 'casual',
    },
    pinterest: {
      maxCharacters: 500,
      maxHashtags: 20,
      maxMentions: 5,
      maxLinks: 1,
      supportsLineBreaks: false,
      supportsRichText: false,
      supportsMedia: true,
      preferredHashtagStyle: 'heavy',
      preferredMentionStyle: 'minimal',
    },
    blogger: {
      maxCharacters: 1000000, // Blogger supports very long posts (essentially unlimited)
      maxHashtags: 50, // Blogger uses labels/tags, similar to hashtags
      maxMentions: 0, // Blogger doesn't use @mentions in the same way
      maxLinks: 100, // Blogger posts can have many links
      supportsLineBreaks: true,
      supportsRichText: true,
      supportsMedia: true,
      preferredHashtagStyle: 'minimal', // Blogger uses labels, not hashtags
      preferredMentionStyle: 'formal',
    },
  };

  /**
   * Adapts content for a specific platform
   */
  async adaptContentForPlatform(
    originalContent: string,
    platform: string,
    options?: {
      includeHashtags?: boolean;
      includeMentions?: boolean;
      includeLinks?: boolean;
      targetAudience?: string;
      tone?: 'professional' | 'casual' | 'friendly' | 'authoritative';
      includeCallToAction?: boolean;
    }
  ): Promise<AdaptedContent> {
    const platformLimits = ContentAdaptationService.PLATFORM_LIMITS[platform];
    if (!platformLimits) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const adaptations: string[] = [];
    const warnings: string[] = [];
    let adaptedContent = originalContent;

    // Extract elements from original content
    const hashtags = this.extractHashtags(originalContent);
    const mentions = this.extractMentions(originalContent);
    const links = this.extractLinks(originalContent);

    // Clean the base content
    adaptedContent = this.cleanContent(adaptedContent);

    // Apply platform-specific adaptations
    adaptedContent = await this.applyPlatformStyle(adaptedContent, platform, options);

    // Handle hashtags based on platform preferences
    const adaptedHashtags = this.adaptHashtags(hashtags, platform, platformLimits);
    adaptations.push(`Applied ${platformLimits.preferredHashtagStyle} hashtag style`);

    // Handle mentions based on platform preferences
    const adaptedMentions = this.adaptMentions(mentions, platform, platformLimits);
    adaptations.push(`Applied ${platformLimits.preferredMentionStyle} mention style`);

    // Handle links
    const adaptedLinks = this.adaptLinks(links, platform, platformLimits);
    adaptations.push(`Optimized ${adaptedLinks.length} links for ${platform}`);

    // Combine content with adapted elements
    adaptedContent = this.combineContentElements(
      adaptedContent,
      adaptedHashtags,
      adaptedMentions,
      adaptedLinks,
      platform,
      platformLimits
    );

    // Ensure character limit compliance
    if (adaptedContent.length > platformLimits.maxCharacters) {
      adaptedContent = this.truncateContent(adaptedContent, platform, platformLimits);
      adaptations.push(`Truncated content to ${platformLimits.maxCharacters} characters`);
    }

    // Add platform-specific enhancements
    adaptedContent = this.addPlatformEnhancements(adaptedContent, platform, options);

    // Final validation
    const finalCharacterCount = adaptedContent.length;
    if (finalCharacterCount > platformLimits.maxCharacters) {
      warnings.push(
        `Content exceeds platform limit by ${finalCharacterCount - platformLimits.maxCharacters} characters`
      );
    }

    return {
      content: adaptedContent,
      characterCount: finalCharacterCount,
      platform,
      adaptations,
      warnings,
      hashtags: adaptedHashtags,
      mentions: adaptedMentions,
      links: adaptedLinks,
    };
  }

  /**
   * Adapts content for multiple platforms simultaneously
   */
  async adaptContentForMultiplePlatforms(
    originalContent: string,
    platforms: string[],
    options?: any
  ): Promise<Record<string, AdaptedContent>> {
    const results: Record<string, AdaptedContent> = {};

    for (const platform of platforms) {
      try {
        const adapted = await this.adaptContentForPlatform(originalContent, platform, options);
        // For large-limit platforms, try to expand to near-max if significantly under
        const limits = ContentAdaptationService.PLATFORM_LIMITS[platform];
        if (limits) {
          const targetMin = Math.floor(limits.maxCharacters * 0.85);
          if (adapted.characterCount < targetMin) {
            const expanded = await this.expandToTargetLength(
              adapted.content,
              limits.maxCharacters,
              platform,
              options
            );
            results[platform] = {
              ...adapted,
              content: expanded,
              characterCount: expanded.length,
              adaptations: [...adapted.adaptations, 'Expanded to target near max length'],
            };
          } else {
            results[platform] = adapted;
          }
        } else {
          // No limits defined for this platform, use adapted content as-is
          results[platform] = adapted;
        }
      } catch (error) {
        results[platform] = {
          content: originalContent,
          characterCount: originalContent.length,
          platform,
          adaptations: [],
          warnings: [
            `Error adapting content: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ],
          hashtags: [],
          mentions: [],
          links: [],
        };
      }
    }

    return results;
  }

  /**
   * Expand content toward target length without exceeding the hard limit.
   * Uses simple heuristics; can be swapped to AI rewrite service later.
   */
  private async expandToTargetLength(
    content: string,
    max: number,
    platform: string,
    options?: any
  ): Promise<string> {
    // Lightweight expansion: add clarifying detail and a gentle CTA while respecting limit
    const addendum = options?.includeCallToAction ? ' Learn more and share your thoughts.' : '';
    let expanded = content;
    // Repeat expansion until close to 92% of max or we hit limit
    while (expanded.length < Math.floor(max * 0.92)) {
      const chunk = ' ' + this.platformExpansionPhrase(platform);
      if (expanded.length + chunk.length + addendum.length >= max) break;
      expanded += chunk;
      if (addendum && expanded.length + addendum.length < max) {
        expanded += addendum;
      }
      if (expanded.length > max) break;
    }
    if (expanded.length > max) {
      expanded = expanded.slice(0, max);
    }
    return expanded.trim();
  }

  private platformExpansionPhrase(platform: string): string {
    switch (platform) {
      case 'linkedin':
        return 'Here are a few practical takeaways to consider.';
      case 'facebook':
        return "Let's break this down with a quick example for clarity.";
      case 'reddit':
        return 'Adding context can help the discussion stay constructive.';
      case 'pinterest':
        return 'Save this for later and apply it step by step.';
      case 'blogger':
        return 'Let me elaborate on this point with more detail and examples.';
      default:
        return 'Here is an extra detail that adds helpful context.';
    }
  }

  /**
   * Validates content against platform limits
   */
  validateContentForPlatform(
    content: string,
    platform: string
  ): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const platformLimits = ContentAdaptationService.PLATFORM_LIMITS[platform];
    if (!platformLimits) {
      return {
        isValid: false,
        issues: [`Unsupported platform: ${platform}`],
        suggestions: [],
      };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check character limit
    if (content.length > platformLimits.maxCharacters) {
      issues.push(
        `Content exceeds ${platformLimits.maxCharacters} character limit by ${content.length - platformLimits.maxCharacters} characters`
      );
      suggestions.push(
        `Reduce content by ${content.length - platformLimits.maxCharacters} characters`
      );
    }

    // Check hashtag limit
    const hashtags = this.extractHashtags(content);
    if (hashtags.length > platformLimits.maxHashtags) {
      issues.push(`Too many hashtags: ${hashtags.length}/${platformLimits.maxHashtags}`);
      suggestions.push(`Remove ${hashtags.length - platformLimits.maxHashtags} hashtags`);
    }

    // Check mention limit
    const mentions = this.extractMentions(content);
    if (mentions.length > platformLimits.maxMentions) {
      issues.push(`Too many mentions: ${mentions.length}/${platformLimits.maxMentions}`);
      suggestions.push(`Remove ${mentions.length - platformLimits.maxMentions} mentions`);
    }

    // Check link limit
    const links = this.extractLinks(content);
    if (links.length > platformLimits.maxLinks) {
      issues.push(`Too many links: ${links.length}/${platformLimits.maxLinks}`);
      suggestions.push(`Remove ${links.length - platformLimits.maxLinks} links`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Gets platform limits for a specific platform
   */
  getPlatformLimits(platform: string): PlatformLimits | null {
    return ContentAdaptationService.PLATFORM_LIMITS[platform] || null;
  }

  /**
   * Gets all supported platforms
   */
  getSupportedPlatforms(): string[] {
    return Object.keys(ContentAdaptationService.PLATFORM_LIMITS);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    return content.match(hashtagRegex) || [];
  }

  private extractMentions(content: string): string[] {
    const mentionRegex = /@[\w\u0590-\u05ff]+/g;
    return content.match(mentionRegex) || [];
  }

  private extractLinks(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.match(urlRegex) || [];
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }

  private async applyPlatformStyle(
    content: string,
    platform: string,
    options?: any
  ): Promise<string> {
    switch (platform) {
      case 'twitter':
        return this.applyTwitterStyle(content, options);
      case 'linkedin':
        return this.applyLinkedInStyle(content, options);
      case 'facebook':
        return this.applyFacebookStyle(content, options);
      case 'instagram':
        return this.applyInstagramStyle(content, options);
      case 'bluesky':
        return this.applyBlueSkyStyle(content, options);
      case 'reddit':
        return this.applyRedditStyle(content, options);
      case 'pinterest':
        return this.applyPinterestStyle(content, options);
      case 'blogger':
        return this.applyBloggerStyle(content, options);
      default:
        return content;
    }
  }

  private applyTwitterStyle(content: string, options?: any): string {
    // Twitter: Concise, punchy, use of abbreviations
    let adapted = content;

    // Make it more conversational and direct
    adapted = adapted.replace(/\bI am\b/g, "I'm");
    adapted = adapted.replace(/\bwe are\b/g, "we're");
    adapted = adapted.replace(/\bdo not\b/g, "don't");
    adapted = adapted.replace(/\bwill not\b/g, "won't");

    // Add engagement hooks
    if (options?.includeCallToAction && !adapted.includes('?')) {
      adapted += ' What do you think?';
    }

    return adapted;
  }

  private applyLinkedInStyle(content: string, options?: any): string {
    // LinkedIn: Professional, informative, industry-focused
    let adapted = content;

    // Ensure professional tone
    adapted = adapted.replace(/\bawesome\b/g, 'excellent');
    adapted = adapted.replace(/\bcool\b/g, 'impressive');
    adapted = adapted.replace(/\bamazing\b/g, 'outstanding');

    // Add professional elements if needed
    if (options?.tone === 'professional' && !adapted.includes('.')) {
      adapted += '.';
    }

    return adapted;
  }

  private applyFacebookStyle(content: string, options?: any): string {
    // Facebook: Conversational, community-focused
    let adapted = content;

    // Make it more casual and engaging
    if (!adapted.includes('!') && options?.includeCallToAction) {
      adapted += '!';
    }

    return adapted;
  }

  private applyInstagramStyle(content: string, options?: any): string {
    // Instagram: Visual-focused, emoji-friendly, hashtag-heavy
    let adapted = content;

    // Add emojis if none present
    if (
      !adapted.match(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
      )
    ) {
      adapted += ' ✨';
    }

    return adapted;
  }

  private applyBlueSkyStyle(content: string, options?: any): string {
    // BlueSky: Decentralized, tech-savvy, community-focused
    let adapted = content;

    // Keep it concise and clear
    adapted = adapted.replace(/\bhowever\b/g, 'but');
    adapted = adapted.replace(/\btherefore\b/g, 'so');

    return adapted;
  }

  private applyRedditStyle(content: string, options?: any): string {
    // Reddit: Community-focused, detailed, discussion-oriented
    let adapted = content;

    // Add discussion prompts
    if (options?.includeCallToAction && !adapted.includes('?')) {
      adapted += '\n\nWhat are your thoughts?';
    }

    return adapted;
  }

  private applyPinterestStyle(content: string, options?: any): string {
    // Pinterest: SEO-optimized, keyword-rich, inspirational
    let adapted = content;

    // Make it more descriptive and keyword-rich
    adapted = adapted.replace(/\bgood\b/g, 'amazing');
    adapted = adapted.replace(/\bnice\b/g, 'beautiful');

    return adapted;
  }

  private applyBloggerStyle(content: string, options?: any): string {
    // Blogger: Long-form content, well-structured, formal or casual depending on tone
    let adapted = content;

    // Ensure proper paragraph structure (double line breaks for blog posts)
    if (!adapted.includes('\n\n')) {
      // Add paragraph breaks where there are single line breaks
      adapted = adapted.replace(/\n/g, '\n\n');
    }

    // Format based on tone
    if (options?.tone === 'professional' || options?.tone === 'authoritative') {
      // Ensure professional language
      adapted = adapted.replace(/\bawesome\b/g, 'exceptional');
      adapted = adapted.replace(/\bcool\b/g, 'impressive');
      adapted = adapted.replace(/\bamazing\b/g, 'outstanding');
    }

    // Add call to action if requested
    if (
      options?.includeCallToAction &&
      !adapted.toLowerCase().includes('share') &&
      !adapted.toLowerCase().includes('comment')
    ) {
      adapted += '\n\nWhat are your thoughts? Feel free to share in the comments below!';
    }

    return adapted;
  }

  private adaptHashtags(hashtags: string[], platform: string, limits: PlatformLimits): string[] {
    let adapted = [...hashtags];

    // Limit hashtags based on platform preferences
    if (limits.preferredHashtagStyle === 'none') {
      adapted = [];
    } else if (limits.preferredHashtagStyle === 'minimal') {
      adapted = adapted.slice(0, Math.min(3, limits.maxHashtags));
    } else if (limits.preferredHashtagStyle === 'moderate') {
      adapted = adapted.slice(0, Math.min(5, limits.maxHashtags));
    } else if (limits.preferredHashtagStyle === 'heavy') {
      adapted = adapted.slice(0, limits.maxHashtags);
    }

    // Remove duplicates and ensure proper formatting
    adapted = [...new Set(adapted)].map((tag) =>
      tag.startsWith('#') ? tag : `#${tag.replace('#', '')}`
    );

    return adapted;
  }

  private adaptMentions(mentions: string[], platform: string, limits: PlatformLimits): string[] {
    let adapted = [...mentions];

    // Limit mentions based on platform
    adapted = adapted.slice(0, limits.maxMentions);

    // Ensure proper formatting
    adapted = adapted.map((mention) =>
      mention.startsWith('@') ? mention : `@${mention.replace('@', '')}`
    );

    return adapted;
  }

  private adaptLinks(links: string[], platform: string, limits: PlatformLimits): string[] {
    let adapted = [...links];

    // Limit links based on platform
    adapted = adapted.slice(0, limits.maxLinks);

    return adapted;
  }

  private combineContentElements(
    content: string,
    hashtags: string[],
    mentions: string[],
    links: string[],
    platform: string,
    limits: PlatformLimits
  ): string {
    let result = content;

    // Add mentions at the beginning for some platforms
    if (mentions.length > 0 && (platform === 'twitter' || platform === 'bluesky')) {
      result = `${mentions.join(' ')} ${result}`;
    }

    // Add hashtags based on platform preferences
    if (hashtags.length > 0) {
      if (platform === 'instagram' || platform === 'pinterest') {
        // Add hashtags at the end
        result = `${result}\n\n${hashtags.join(' ')}`;
      } else {
        // Integrate hashtags naturally
        result = `${result} ${hashtags.join(' ')}`;
      }
    }

    // Ensure line breaks are handled properly
    if (!limits.supportsLineBreaks) {
      result = result.replace(/\n/g, ' ');
    }

    return result.trim();
  }

  private truncateContent(content: string, platform: string, limits: PlatformLimits): string {
    // Smart truncation that preserves important elements
    const hashtags = this.extractHashtags(content);
    const mentions = this.extractMentions(content);
    const links = this.extractLinks(content);

    // Calculate space needed for essential elements
    const hashtagSpace = hashtags.join(' ').length;
    const mentionSpace = mentions.join(' ').length;
    const linkSpace = links.join(' ').length;
    const essentialSpace = hashtagSpace + mentionSpace + linkSpace + 10; // 10 for spacing

    // Calculate available space for main content
    const availableSpace = limits.maxCharacters - essentialSpace;

    if (availableSpace < 50) {
      // If not enough space, just truncate and add essential elements
      let truncated = content.substring(0, limits.maxCharacters - essentialSpace - 3);
      truncated = truncated.substring(0, truncated.lastIndexOf(' ')) + '...';

      if (hashtags.length > 0) {
        truncated += ` ${hashtags.slice(0, limits.maxHashtags).join(' ')}`;
      }

      return truncated;
    } else {
      // Truncate main content intelligently
      let truncated = content.substring(0, availableSpace);
      truncated = truncated.substring(0, truncated.lastIndexOf(' ')) + '...';

      // Add essential elements
      if (mentions.length > 0) {
        truncated = `${mentions.slice(0, limits.maxMentions).join(' ')} ${truncated}`;
      }

      if (hashtags.length > 0) {
        truncated += ` ${hashtags.slice(0, limits.maxHashtags).join(' ')}`;
      }

      return truncated;
    }
  }

  private addPlatformEnhancements(content: string, platform: string, options?: any): string {
    let enhanced = content;

    // Add platform-specific enhancements
    switch (platform) {
      case 'twitter':
        if (options?.includeCallToAction && !enhanced.includes('?')) {
          enhanced += ' Thoughts?';
        }
        break;
      case 'linkedin':
        if (options?.tone === 'professional' && !enhanced.endsWith('.')) {
          enhanced += '.';
        }
        break;
      case 'instagram':
        if (!enhanced.includes('✨') && !enhanced.includes('🌟')) {
          enhanced += ' ✨';
        }
        break;
      case 'pinterest':
        // Pinterest loves descriptive, keyword-rich content
        enhanced = enhanced.replace(/\bamazing\b/g, 'absolutely stunning');
        break;
      case 'blogger':
        // Blogger posts benefit from structured, well-formatted content
        if (options?.includeCallToAction && !enhanced.toLowerCase().includes('comment')) {
          enhanced += '\n\nWhat are your thoughts on this topic?';
        }
        break;
    }

    return enhanced;
  }
}

// Export singleton instance
export const contentAdaptationService = new ContentAdaptationService();
