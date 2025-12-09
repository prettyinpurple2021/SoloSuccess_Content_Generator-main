// services/platforms/claudeClient.ts
import { ClaudeCredentials } from '../../types';
import { db } from '../databaseService';

export class ClaudeClient {
  private credentials: ClaudeCredentials;
  private baseUrl: string = 'https://api.anthropic.com/v1';

  constructor(credentials: ClaudeCredentials) {
    this.credentials = credentials;
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      if (!this.credentials.apiKey) {
        return { success: false, error: 'Missing Claude API key' };
      }

      // Test connection by making a simple request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.credentials.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      if (response.ok) {
        return { success: true, details: { message: 'Claude API connection successful' } };
      } else {
        return { success: false, error: 'Failed to connect to Claude API' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to connect to Claude' };
    }
  }

  async generateContent(
    prompt: string,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemMessage?: string;
    }
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.credentials.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: options?.model || 'claude-3-sonnet-20240229',
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7,
          system: options?.systemMessage || 'You are a helpful AI assistant.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.content?.[0]?.text;

        if (content) {
          return { success: true, content };
        } else {
          return { success: false, error: 'No content generated' };
        }
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error?.message || 'Failed to generate content' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to generate content' };
    }
  }

  async generateSocialMediaPost(
    topic: string,
    platform: string,
    tone: string,
    length: number
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    const systemMessage = `You are a social media content creator. Create engaging posts that match the specified platform, tone, and length requirements.`;

    const prompt = `Create a ${tone} social media post for ${platform} about "${topic}". 
    The post should be approximately ${length} characters long.
    Make it engaging, relevant, and platform-appropriate.
    Include relevant hashtags if appropriate for the platform.`;

    return this.generateContent(prompt, {
      systemMessage,
      model: 'claude-3-sonnet-20240229',
      maxTokens: Math.min(length * 2, 500),
      temperature: 0.8,
    });
  }

  async generateContentIdeas(
    topic: string,
    count: number = 5
  ): Promise<{ success: boolean; ideas?: string[]; error?: string }> {
    const systemMessage = `You are a creative content strategist. Generate unique, engaging content ideas that are relevant and timely.`;

    const prompt = `Generate ${count} creative content ideas about "${topic}". 
    Each idea should be:
    - Unique and engaging
    - Relevant to current trends
    - Suitable for social media
    - Actionable and specific
    
    Format each idea as a brief title with a short description.`;

    const result = await this.generateContent(prompt, {
      systemMessage,
      model: 'claude-3-sonnet-20240229',
      maxTokens: 800,
      temperature: 0.9,
    });

    if (result.success && result.content) {
      const ideas = result.content
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .slice(0, count);

      return { success: true, ideas };
    }

    return result;
  }

  async optimizeContent(
    content: string,
    platform: string,
    targetAudience: string
  ): Promise<{
    success: boolean;
    optimizedContent?: string;
    suggestions?: string[];
    error?: string;
  }> {
    const systemMessage = `You are a social media optimization expert. Analyze content and provide specific, actionable improvements.`;

    const prompt = `Optimize this ${platform} content for ${targetAudience}:

"${content}"

Provide:
1. An optimized version of the content
2. 3-5 specific suggestions for improvement
3. Explanation of why each change improves engagement

Focus on:
- Platform-specific best practices
- Audience engagement
- Clarity and impact
- Call-to-action effectiveness`;

    const result = await this.generateContent(prompt, {
      systemMessage,
      model: 'claude-3-sonnet-20240229',
      maxTokens: 1000,
      temperature: 0.7,
    });

    if (result.success && result.content) {
      // Parse the response to extract optimized content and suggestions
      const lines = result.content.split('\n').filter((line) => line.trim().length > 0);
      const optimizedContent =
        lines
          .find((line) => line.includes('Optimized:') || line.includes('Version:'))
          ?.replace(/.*?:/, '')
          .trim() || content;

      const suggestions = lines
        .filter((line) => line.match(/^\d+\./) || line.includes('•') || line.includes('-'))
        .map((line) =>
          line
            .replace(/^\d+\.\s*/, '')
            .replace(/^[•-]\s*/, '')
            .trim()
        )
        .filter((suggestion) => suggestion.length > 0);

      return { success: true, optimizedContent, suggestions };
    }

    return result;
  }

  async analyzeSentiment(
    content: string
  ): Promise<{ success: boolean; sentiment?: string; confidence?: number; error?: string }> {
    const systemMessage = `You are a sentiment analysis expert. Analyze text and provide sentiment classification with confidence scores.`;

    const prompt = `Analyze the sentiment of this content and provide:
1. Sentiment classification (positive, negative, neutral)
2. Confidence score (0-1)
3. Brief explanation

Content: "${content}"`;

    const result = await this.generateContent(prompt, {
      systemMessage,
      model: 'claude-3-sonnet-20240229',
      maxTokens: 200,
      temperature: 0.3,
    });

    if (result.success && result.content) {
      // Parse sentiment from response
      const sentimentMatch = result.content.match(/sentiment[:\s]+(positive|negative|neutral)/i);
      const confidenceMatch = result.content.match(/confidence[:\s]+([0-9.]+)/i);

      return {
        success: true,
        sentiment: sentimentMatch?.[1]?.toLowerCase() || 'neutral',
        confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
      };
    }

    return result;
  }

  async generateHashtags(
    content: string,
    platform: string,
    count: number = 5
  ): Promise<{ success: boolean; hashtags?: string[]; error?: string }> {
    const systemMessage = `You are a social media hashtag expert. Generate relevant, trending hashtags for different platforms.`;

    const prompt = `Generate ${count} relevant hashtags for this ${platform} content:

"${content}"

Requirements:
- Platform-appropriate (${platform} style)
- Relevant to the content
- Mix of popular and niche hashtags
- Include trending topics if relevant
- Format as #hashtag (without spaces)

Return only the hashtags, one per line.`;

    const result = await this.generateContent(prompt, {
      systemMessage,
      model: 'claude-3-sonnet-20240229',
      maxTokens: 200,
      temperature: 0.8,
    });

    if (result.success && result.content) {
      const hashtags = result.content
        .split('\n')
        .filter((line) => line.trim().startsWith('#'))
        .map((line) => line.trim())
        .slice(0, count);

      return { success: true, hashtags };
    }

    return result;
  }

  async generateLongFormContent(
    topic: string,
    type: 'blog' | 'article' | 'guide',
    length: 'short' | 'medium' | 'long'
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    const systemMessage = `You are a professional content writer. Create high-quality, engaging long-form content.`;

    const lengthMap = {
      short: '500-800 words',
      medium: '1000-1500 words',
      long: '2000-3000 words',
    };

    const prompt = `Write a ${type} about "${topic}" that is ${lengthMap[length]}.

Requirements:
- Well-structured with clear headings
- Engaging and informative
- SEO-friendly
- Include actionable insights
- Professional tone
- Include a compelling introduction and conclusion`;

    return this.generateContent(prompt, {
      systemMessage,
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4000,
      temperature: 0.7,
    });
  }

  async summarizeContent(
    content: string,
    maxLength: number = 200
  ): Promise<{ success: boolean; summary?: string; error?: string }> {
    const systemMessage = `You are a content summarization expert. Create concise, accurate summaries.`;

    const prompt = `Summarize this content in ${maxLength} characters or less:

"${content}"

Requirements:
- Capture the main points
- Maintain the original tone
- Be concise but comprehensive
- Include key takeaways`;

    return this.generateContent(prompt, {
      systemMessage,
      model: 'claude-3-sonnet-20240229',
      maxTokens: 300,
      temperature: 0.5,
    });
  }
}

export default ClaudeClient;
