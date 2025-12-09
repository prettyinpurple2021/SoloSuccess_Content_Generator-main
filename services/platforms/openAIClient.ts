// services/platforms/openAIClient.ts
import { OpenAICredentials } from '../../types';
import { db } from '../databaseService';

export class OpenAIClient {
  private credentials: OpenAICredentials;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(credentials: OpenAICredentials) {
    this.credentials = credentials;
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      if (!this.credentials.apiKey) {
        return { success: false, error: 'Missing OpenAI API key' };
      }

      // Test connection by making a simple request
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { success: true, details: { message: 'OpenAI API connection successful' } };
      } else {
        return { success: false, error: 'Failed to connect to OpenAI API' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to connect to OpenAI' };
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
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'gpt-4',
          messages: [
            ...(options?.systemMessage ? [{ role: 'system', content: options.systemMessage }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

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
      model: 'gpt-4',
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
      model: 'gpt-4',
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
      model: 'gpt-4',
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
      model: 'gpt-4',
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
      model: 'gpt-4',
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
}

export default OpenAIClient;
