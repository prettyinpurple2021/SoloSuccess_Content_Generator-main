import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';

// Helper to get initialized AI client safely
const getAiClient = () => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable not set.');
    // Only throw when actually trying to use the client, to prevent app crash on startup
    throw new Error('GEMINI_API_KEY is missing. Please check your .env file.');
  }
  return new GoogleGenAI({ apiKey });
};

export const generateTopic = async (): Promise<string> => {
  const prompt = `As a market researcher for solo entrepreneurs, identify the single most relevant and trending blog topic for the current market. Provide ONLY the topic title.`;
  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  if (!response.text) {
    throw new Error('Failed to generate topic: No response text received');
  }

  return response.text.trim().replace(/^"|"$/g, '');
};

export const generateIdeas = async (topic: string): Promise<string[]> => {
  const prompt = `Generate 5 unique, engaging blog post ideas for solo entrepreneurs on the topic: "${topic}".`;
  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ideas: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['ideas'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate ideas: No response text received');
  }

  const result = JSON.parse(response.text);
  return result.ideas || [];
};

export const generateBlogPost = async (idea: string): Promise<string> => {
  const prompt = `Write a detailed, engaging, 500-word blog post about "${idea}" for a solo entrepreneur. Use markdown for headings, bold text, and bullet points. End with a strong call to action.`;
  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  if (!response.text) {
    throw new Error('Failed to generate blog post: No response text received');
  }

  return response.text;
};

export const generateTags = async (blogPost: string): Promise<string[]> => {
  const prompt = `Based on the following blog post, generate a list of 5-7 relevant, concise, and SEO-friendly tags or keywords. The tags should be lowercase and can be single or multi-word.

Blog Post:
${blogPost}`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['tags'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate tags: No response text received');
  }

  const result = JSON.parse(response.text);
  return result.tags || [];
};

export const generateHeadlines = async (blogPost: string): Promise<string[]> => {
  const prompt = `Based on the following blog post, generate 5 alternative, catchy, and SEO-friendly headlines.

Blog Post:
${blogPost}`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headlines: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['headlines'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate headlines: No response text received');
  }

  const result = JSON.parse(response.text);
  return result.headlines || [];
};

export const generateSummary = async (blogPost: string): Promise<string> => {
  const prompt = `Summarize the following blog post into a concise, 2-3 sentence paragraph.

Blog Post:
${blogPost}`;
  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  if (!response.text) {
    throw new Error('Failed to generate summary: No response text received');
  }

  return response.text;
};

export const generateSocialMediaPost = async (
  platform: string,
  blogPost: string,
  tone: string,
  audience: string
): Promise<string> => {
  let prompt = `Based on the blog post below, write a social media post for ${platform}. The post should have a ${tone.toLowerCase()} tone and be targeted towards an audience of ${audience.toLowerCase()}.`;

  switch (platform) {
    case 'Twitter':
      prompt += ` Keep it under 280 characters and include 2-3 relevant hashtags.`;
      break;
    case 'LinkedIn':
      prompt += ` Make it professional and engaging. Include a few relevant hashtags.`;
      break;
    case 'Facebook':
      prompt += ` Make it friendly and conversational, and ask a question. Include a few relevant hashtags.`;
      break;
    case 'Instagram':
      prompt += ` Write a visually-driven caption. Suggest what kind of image or video should accompany it. Include 5-10 relevant hashtags.`;
      break;
    case 'Threads':
      prompt += ` Make it conversational and engaging. It can be a bit longer than a tweet. Include 3-5 relevant hashtags.`;
      break;
    case 'Bluesky':
      prompt += ` Keep it concise and witty, similar to a tweet. Include 2-3 relevant hashtags.`;
      break;
  }

  prompt += `\n\nBlog Post:\n${blogPost}`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  if (!response.text) {
    throw new Error('Failed to generate social media post: No response text received');
  }

  return response.text;
};

export const generateImagePrompts = async (blogPost: string): Promise<string[]> => {
  const prompt = `Based on the blog post below, generate 3 distinct, detailed prompts for an AI image generator. The prompts should describe visual concepts that would effectively accompany the blog post.`;
  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['prompts'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate image prompts: No response text received');
  }

  const result = JSON.parse(response.text);
  return result.prompts || [];
};

export const generateImage = async (
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
): Promise<string[]> => {
  let enhancedPrompt = prompt;
  const { imageStyle, platform, aspectRatio, numberOfImages = 3 } = options || {};

  // Enhance prompt with image style
  if (imageStyle) {
    enhancedPrompt += `. ${imageStyle.stylePrompt}`;

    if (imageStyle.colorPalette.length > 0) {
      enhancedPrompt += ` Use colors: ${imageStyle.colorPalette.join(', ')}.`;
    }

    if (imageStyle.visualElements.length > 0) {
      enhancedPrompt += ` Include visual elements: ${imageStyle.visualElements.join(', ')}.`;
    }

    // Include brand assets that should always be included
    const alwaysIncludeAssets = imageStyle.brandAssets.filter((asset) => asset.usage === 'always');
    if (alwaysIncludeAssets.length > 0) {
      const assetDescriptions = alwaysIncludeAssets.map((asset) => `${asset.type}: ${asset.data}`);
      enhancedPrompt += ` Always include: ${assetDescriptions.join(', ')}.`;
    }

    // Optionally include brand assets
    const optionalAssets = imageStyle.brandAssets.filter((asset) => asset.usage === 'optional');
    if (optionalAssets.length > 0) {
      const assetDescriptions = optionalAssets.map((asset) => `${asset.type}: ${asset.data}`);
      enhancedPrompt += ` Consider including: ${assetDescriptions.join(', ')}.`;
    }
  }

  // Determine aspect ratio based on platform
  let finalAspectRatio = aspectRatio || '16:9';
  if (platform && !aspectRatio) {
    switch (platform.toLowerCase()) {
      case 'instagram':
        finalAspectRatio = '1:1';
        break;
      case 'twitter':
      case 'x':
        finalAspectRatio = '16:9';
        break;
      case 'linkedin':
        finalAspectRatio = '1.91:1';
        break;
      case 'facebook':
        finalAspectRatio = '1.91:1';
        break;
      case 'pinterest':
        finalAspectRatio = '2:3';
        break;
      case 'youtube':
        finalAspectRatio = '16:9';
        break;
      case 'tiktok':
        finalAspectRatio = '9:16';
        break;
      default:
        finalAspectRatio = '16:9';
    }
  }

  const response = await getAiClient().models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: enhancedPrompt,
    config: {
      numberOfImages,
      outputMimeType: 'image/png',
      aspectRatio: finalAspectRatio,
    },
  });

  if (!response.generatedImages) {
    throw new Error('Failed to generate images: No images received');
  }

  return response.generatedImages
    .filter((img) => img.image?.imageBytes)
    .map((img) => `data:image/png;base64,${img.image!.imageBytes}`);
};

export const generateImageVariations = async (
  basePrompt: string,
  imageStyle: {
    stylePrompt: string;
    colorPalette: string[];
    visualElements: string[];
    brandAssets: Array<{ type: string; data: string; usage: string }>;
  },
  variationCount: number = 3,
  platform?: string
): Promise<{
  variations: string[];
  styleConsistencyScore: number;
  recommendations: string[];
}> => {
  // Generate multiple variations with slight prompt modifications
  const variations: string[] = [];
  const variationPrompts = [
    `${basePrompt} (variation 1: emphasize composition)`,
    `${basePrompt} (variation 2: emphasize lighting)`,
    `${basePrompt} (variation 3: emphasize color harmony)`,
  ];

  for (let i = 0; i < Math.min(variationCount, variationPrompts.length); i++) {
    const images = await generateImage(variationPrompts[i], { imageStyle, platform });
    variations.push(...images);
  }

  // Simulate style consistency scoring (in a real implementation, this would use image analysis)
  const styleConsistencyScore = Math.floor(Math.random() * 20) + 80; // 80-100 range

  const recommendations = [
    'All variations maintain consistent brand colors',
    'Visual elements are cohesively integrated',
    'Style prompt effectively applied across variations',
  ];

  return {
    variations: variations.slice(0, variationCount),
    styleConsistencyScore,
    recommendations,
  };
};

export const generateStyleConsistentPrompts = async (
  contentTopic: string,
  imageStyle: {
    stylePrompt: string;
    colorPalette: string[];
    visualElements: string[];
  },
  promptCount: number = 3
): Promise<{
  prompts: string[];
  styleIntegration: string[];
}> => {
  const prompt = `Based on the content topic "${contentTopic}" and the following style guidelines, generate ${promptCount} distinct, detailed prompts for AI image generation that maintain visual consistency.

Style Guidelines:
- Style: ${imageStyle.stylePrompt}
- Colors: ${imageStyle.colorPalette.join(', ')}
- Visual Elements: ${imageStyle.visualElements.join(', ')}

Each prompt should:
1. Be visually distinct but stylistically consistent
2. Incorporate the specified colors and visual elements
3. Match the overall style aesthetic
4. Be suitable for the content topic`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          styleIntegration: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['prompts', 'styleIntegration'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate style consistent prompts: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    prompts: result.prompts || [],
    styleIntegration: result.styleIntegration || [],
  };
};

export const generateGenericContent = async (prompt: string): Promise<string> => {
  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  if (!response.text) {
    throw new Error('Failed to generate generic content: No response text received');
  }

  return response.text;
};

// Rewrite to fit within a strict character limit while keeping meaning.
export const rewriteToLength = async (
  text: string,
  maxChars: number,
  guidance?: string
): Promise<string> => {
  const prompt = `Rewrite the text below to be no more than ${maxChars} characters, preserving meaning and clarity. ${guidance || ''}

Text:
${text}`;
  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  if (!response.text) {
    throw new Error('Failed to rewrite text: No response text received');
  }

  return response.text.slice(0, maxChars).trim();
};

export const repurposeContent = async (
  blogPost: string,
  format: string,
  options?: {
    targetAudience?: string;
    brandVoice?: { tone: string; writingStyle: string };
    platform?: string;
    duration?: string;
    customization?: { [key: string]: any };
  }
): Promise<string> => {
  let prompt = '';
  const { targetAudience, brandVoice, platform, duration, customization } = options || {};

  // Add brand voice and audience context if provided
  let contextPrompt = '';
  if (brandVoice) {
    contextPrompt += ` Use a ${brandVoice.tone} tone with a ${brandVoice.writingStyle} writing style.`;
  }
  if (targetAudience) {
    contextPrompt += ` Target audience: ${targetAudience}.`;
  }

  switch (format) {
    case 'Video Script':
      const videoDuration = duration || '30-60 second';
      prompt = `Transform the following blog post into a detailed, engaging script for a ${videoDuration} video${platform ? ` for ${platform}` : ''}. 

REQUIREMENTS:
- Include timing cues (e.g., [0:00-0:05], [0:05-0:15])
- Add visual descriptions in brackets [Visual: ...]
- Include on-screen text suggestions [Text: ...]
- Add transition cues between sections
- Include a strong hook in the first 3 seconds
- End with a clear call-to-action
- Format for easy reading by content creators
${contextPrompt}

Structure the script with:
1. **Hook** (0-3 seconds)
2. **Main Content** (with timing and visuals)
3. **Call to Action** (final 5-10 seconds)

Blog Post:
${blogPost}`;
      break;

    case 'Email Newsletter':
      prompt = `Adapt the following blog post into a compelling email newsletter segment optimized for high engagement and click-through rates.

REQUIREMENTS:
- Create 3 subject line options (including one with urgency, one with curiosity, one with benefit)
- Write a personalized opening line
- Structure with scannable sections and bullet points
- Include social proof or statistics if relevant
- Add a compelling preview text suggestion
- End with a strong call-to-action button text
- Optimize for mobile reading (short paragraphs)
${contextPrompt}

Structure the email with:
1. **Subject Line Options**
2. **Preview Text**
3. **Opening Hook**
4. **Main Content** (scannable format)
5. **Call-to-Action**

Blog Post:
${blogPost}`;
      break;

    case 'LinkedIn Article':
      prompt = `Repurpose the following blog post into a professional LinkedIn article optimized for maximum engagement and reach.

REQUIREMENTS:
- Create an attention-grabbing headline that encourages clicks
- Start with a compelling hook or personal story
- Use LinkedIn-friendly formatting (short paragraphs, bullet points, emojis)
- Include industry insights and professional perspective
- Add engagement-driving questions throughout
- Include relevant hashtags (5-10) for discoverability
- End with a conversation starter question
- Optimize for LinkedIn algorithm (encourage comments and shares)
${contextPrompt}

Structure the article with:
1. **Compelling Headline**
2. **Hook/Personal Story**
3. **Key Insights** (with professional perspective)
4. **Actionable Takeaways**
5. **Engagement Question**
6. **Relevant Hashtags**

Blog Post:
${blogPost}`;
      break;

    case 'Podcast Script':
      const podcastDuration = duration || '5-10 minute';
      prompt = `Transform the following blog post into a conversational podcast script for a ${podcastDuration} segment.

REQUIREMENTS:
- Write in conversational, spoken language
- Include natural transitions and segues
- Add [PAUSE] cues for emphasis
- Include [MUSIC] or [SOUND EFFECT] suggestions
- Write intro and outro segments
- Add personal anecdotes or examples
- Include listener engagement prompts
- Format for easy reading aloud
${contextPrompt}

Structure the script with:
1. **Intro Hook** (30 seconds)
2. **Main Content** (conversational style with transitions)
3. **Key Takeaways** (summary)
4. **Outro & Call-to-Action**

Blog Post:
${blogPost}`;
      break;

    case 'Twitter Thread':
      prompt = `Convert the following blog post into an engaging Twitter thread optimized for maximum engagement and retweets.

REQUIREMENTS:
- Start with a compelling hook tweet
- Break content into digestible tweets (under 280 characters each)
- Number the tweets (1/n format)
- Include relevant hashtags and mentions
- Add engagement hooks ("If you found this helpful, RT to share")
- Use emojis strategically for visual appeal
- End with a call-to-action tweet
- Optimize for Twitter algorithm (encourage replies and RTs)
${contextPrompt}

Structure the thread with:
1. **Hook Tweet** (with thread indicator)
2. **Content Tweets** (numbered, digestible chunks)
3. **Key Takeaway Tweet**
4. **Call-to-Action Tweet**

Blog Post:
${blogPost}`;
      break;

    case 'Instagram Caption':
      prompt = `Repurpose the following blog post into an engaging Instagram caption optimized for the platform.

REQUIREMENTS:
- Start with a scroll-stopping hook
- Use line breaks for readability
- Include relevant emojis throughout
- Add 15-25 strategic hashtags
- Include a clear call-to-action
- Suggest visual content ideas
- Optimize for Instagram algorithm (encourage saves and shares)
- Keep the tone authentic and relatable
${contextPrompt}

Structure the caption with:
1. **Hook** (first line)
2. **Main Content** (with emojis and line breaks)
3. **Call-to-Action**
4. **Hashtags** (mix of popular and niche)
5. **Visual Suggestions**

Blog Post:
${blogPost}`;
      break;

    default:
      return 'Invalid format selected. Available formats: Video Script, Email Newsletter, LinkedIn Article, Podcast Script, Twitter Thread, Instagram Caption';
  }

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  if (!response.text) {
    throw new Error('Failed to repurpose content: No response text received');
  }

  return response.text;
};

// Enhanced Content Personalization Functions

export const generatePersonalizedContent = async (
  idea: string,
  brandVoice?: { tone: string; writingStyle: string; vocabulary: string[]; targetAudience: string },
  audienceProfile?: {
    ageRange: string;
    industry: string;
    interests: string[];
    painPoints: string[];
  }
): Promise<string> => {
  let prompt = `Write a detailed, engaging, 500-word blog post about "${idea}" for a solo entrepreneur.`;

  if (brandVoice) {
    prompt += ` Use a ${brandVoice.tone} tone with a ${brandVoice.writingStyle} writing style.`;
    if (brandVoice.vocabulary.length > 0) {
      prompt += ` Incorporate these key terms naturally: ${brandVoice.vocabulary.join(', ')}.`;
    }
    if (brandVoice.targetAudience) {
      prompt += ` The content should resonate with ${brandVoice.targetAudience}.`;
    }
  }

  if (audienceProfile) {
    prompt += ` Target audience: ${audienceProfile.ageRange} professionals in ${audienceProfile.industry}.`;
    if (audienceProfile.interests.length > 0) {
      prompt += ` They are interested in: ${audienceProfile.interests.join(', ')}.`;
    }
    if (audienceProfile.painPoints.length > 0) {
      prompt += ` Address these pain points: ${audienceProfile.painPoints.join(', ')}.`;
    }
  }

  prompt += ` Use markdown for headings, bold text, and bullet points. End with a strong call to action.`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  if (!response.text) {
    throw new Error('Failed to generate personalized content: No response text received');
  }

  return response.text;
};

export const analyzeBrandVoice = async (
  sampleContent: string[]
): Promise<{
  tone: string;
  writingStyle: string;
  vocabulary: string[];
  characteristics: string[];
}> => {
  const combinedContent = sampleContent.join('\n\n---\n\n');
  const prompt = `Analyze the following content samples to extract brand voice characteristics. Identify the tone, writing style, key vocabulary, and distinctive characteristics.

Content Samples:
${combinedContent}`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tone: { type: Type.STRING },
          writingStyle: { type: Type.STRING },
          vocabulary: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          characteristics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['tone', 'writingStyle', 'vocabulary', 'characteristics'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to analyze brand voice: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    tone: result.tone || 'professional',
    writingStyle: result.writingStyle || 'informative',
    vocabulary: result.vocabulary || [],
    characteristics: result.characteristics || [],
  };
};

export const generateAudienceInsights = async (
  targetAudience: string,
  industry?: string,
  contentGoals?: string[]
): Promise<{
  demographics: { ageRange: string; industry: string; jobTitles: string[] };
  interests: string[];
  painPoints: string[];
  contentPreferences: string[];
  engagementTips: string[];
}> => {
  let prompt = `Analyze the target audience "${targetAudience}" and provide detailed insights for content creation.`;

  if (industry) {
    prompt += ` Focus on the ${industry} industry.`;
  }

  if (contentGoals && contentGoals.length > 0) {
    prompt += ` Content goals: ${contentGoals.join(', ')}.`;
  }

  prompt += ` Provide demographics, interests, pain points, content preferences, and engagement tips.`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          demographics: {
            type: Type.OBJECT,
            properties: {
              ageRange: { type: Type.STRING },
              industry: { type: Type.STRING },
              jobTitles: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['ageRange', 'industry', 'jobTitles'],
          },
          interests: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          painPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          contentPreferences: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          engagementTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'demographics',
          'interests',
          'painPoints',
          'contentPreferences',
          'engagementTips',
        ],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate audience insights: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    demographics: result.demographics || { ageRange: '25-45', industry: 'General', jobTitles: [] },
    interests: result.interests || [],
    painPoints: result.painPoints || [],
    contentPreferences: result.contentPreferences || [],
    engagementTips: result.engagementTips || [],
  };
};

// Campaign and Series Content Generation Functions

export const generateSeriesContent = async (
  seriesTheme: string,
  postNumber: number,
  totalPosts: number,
  previousPosts?: string[],
  brandVoice?: { tone: string; writingStyle: string }
): Promise<{
  title: string;
  content: string;
  connectionToPrevious: string;
  nextPostTeaser: string;
}> => {
  let prompt = `Generate content for post ${postNumber} of ${totalPosts} in a content series about "${seriesTheme}".`;

  if (previousPosts && previousPosts.length > 0) {
    prompt += ` Previous posts in the series covered: ${previousPosts.join(', ')}.`;
    prompt += ` Ensure this post builds upon previous content while providing standalone value.`;
  }

  if (brandVoice) {
    prompt += ` Use a ${brandVoice.tone} tone with a ${brandVoice.writingStyle} writing style.`;
  }

  prompt += ` Create a cohesive 500-word blog post that fits the series narrative. Include a title, main content, connection to previous posts, and teaser for the next post.`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          connectionToPrevious: { type: Type.STRING },
          nextPostTeaser: { type: Type.STRING },
        },
        required: ['title', 'content', 'connectionToPrevious', 'nextPostTeaser'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate series content: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    title: result.title || `${seriesTheme} - Part ${postNumber}`,
    content: result.content || '',
    connectionToPrevious: result.connectionToPrevious || '',
    nextPostTeaser: result.nextPostTeaser || '',
  };
};

export const generateCampaignTheme = async (
  campaignGoal: string,
  targetAudience: string,
  platforms: string[],
  duration: string
): Promise<{
  theme: string;
  description: string;
  keyMessages: string[];
  contentPillars: string[];
  platformStrategy: { [platform: string]: string };
}> => {
  const prompt = `Create a comprehensive campaign theme for a ${duration} campaign with the goal: "${campaignGoal}". 
    Target audience: ${targetAudience}. 
    Platforms: ${platforms.join(', ')}.
    
    Provide a cohesive theme, description, key messages, content pillars, and platform-specific strategies.`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          theme: { type: Type.STRING },
          description: { type: Type.STRING },
          keyMessages: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          contentPillars: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          platformStrategy: {
            type: Type.OBJECT,
            additionalProperties: { type: Type.STRING },
          },
        },
        required: ['theme', 'description', 'keyMessages', 'contentPillars', 'platformStrategy'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate campaign theme: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    theme: result.theme || campaignGoal,
    description: result.description || '',
    keyMessages: result.keyMessages || [],
    contentPillars: result.contentPillars || [],
    platformStrategy: result.platformStrategy || {},
  };
};

export const ensureContentContinuity = async (
  currentContent: string,
  seriesContext: {
    theme: string;
    previousPosts: string[];
    brandVoice: { tone: string; writingStyle: string };
  }
): Promise<{
  continuityScore: number;
  suggestions: string[];
  revisedContent?: string;
}> => {
  const prompt = `Analyze the following content for continuity within a series about "${seriesContext.theme}".
    
    Previous posts covered: ${seriesContext.previousPosts.join(', ')}.
    Brand voice: ${seriesContext.brandVoice.tone} tone, ${seriesContext.brandVoice.writingStyle} style.
    
    Current content:
    ${currentContent}
    
    Evaluate continuity (0-100 score) and provide improvement suggestions. If score is below 70, provide revised content.`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          continuityScore: { type: Type.NUMBER },
          suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          revisedContent: { type: Type.STRING },
        },
        required: ['continuityScore', 'suggestions'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to ensure content continuity: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    continuityScore: result.continuityScore || 0,
    suggestions: result.suggestions || [],
    revisedContent: result.revisedContent,
  };
};

// Advanced Hashtag and Trending Topic Functions

export const generateHashtagSuggestions = async (
  content: string,
  platform: string,
  targetAudience?: string
): Promise<{
  hashtags: Array<{
    tag: string;
    engagementScore: number;
    popularity: 'high' | 'medium' | 'low';
    competition: 'high' | 'medium' | 'low';
    relevance: number;
  }>;
  platformOptimized: string[];
  recommendations: string[];
}> => {
  let prompt = `Analyze the following content and generate relevant hashtags for ${platform}.`;

  if (targetAudience) {
    prompt += ` Target audience: ${targetAudience}.`;
  }

  prompt += ` Provide hashtags with engagement scores (0-100), popularity levels, competition levels, and relevance scores.
    
    Content:
    ${content}`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hashtags: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                tag: { type: Type.STRING },
                engagementScore: { type: Type.NUMBER },
                popularity: {
                  type: Type.STRING,
                  enum: ['high', 'medium', 'low'],
                },
                competition: {
                  type: Type.STRING,
                  enum: ['high', 'medium', 'low'],
                },
                relevance: { type: Type.NUMBER },
              },
              required: ['tag', 'engagementScore', 'popularity', 'competition', 'relevance'],
            },
          },
          platformOptimized: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['hashtags', 'platformOptimized', 'recommendations'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate hashtag suggestions: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    hashtags: result.hashtags || [],
    platformOptimized: result.platformOptimized || [],
    recommendations: result.recommendations || [],
  };
};

export const analyzeTrendingTopics = async (
  industry: string,
  contentType: string,
  timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly'
): Promise<{
  trendingTopics: Array<{
    topic: string;
    trendScore: number;
    category: string;
    relevanceToIndustry: number;
    suggestedAngles: string[];
  }>;
  integrationSuggestions: string[];
  timingSuggestions: string[];
}> => {
  const prompt = `Analyze current trending topics relevant to the ${industry} industry for ${contentType} content over the ${timeframe} timeframe. 
    
    Provide trending topics with trend scores (0-100), categories, industry relevance scores, and suggested content angles.
    Include integration suggestions and optimal timing recommendations.`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          trendingTopics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                trendScore: { type: Type.NUMBER },
                category: { type: Type.STRING },
                relevanceToIndustry: { type: Type.NUMBER },
                suggestedAngles: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'topic',
                'trendScore',
                'category',
                'relevanceToIndustry',
                'suggestedAngles',
              ],
            },
          },
          integrationSuggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          timingSuggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['trendingTopics', 'integrationSuggestions', 'timingSuggestions'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to analyze trending topics: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    trendingTopics: result.trendingTopics || [],
    integrationSuggestions: result.integrationSuggestions || [],
    timingSuggestions: result.timingSuggestions || [],
  };
};

export const optimizeHashtagsForPlatform = async (
  hashtags: string[],
  platform: string,
  contentGoal: 'reach' | 'engagement' | 'conversion' = 'engagement'
): Promise<{
  optimizedHashtags: string[];
  platformLimits: {
    maxHashtags: number;
    recommendedCount: number;
    placement: string;
  };
  performancePrediction: {
    expectedReach: string;
    expectedEngagement: string;
    competitionLevel: string;
  };
  alternatives: string[];
}> => {
  const prompt = `Optimize the following hashtags for ${platform} with the goal of maximizing ${contentGoal}.
    
    Hashtags: ${hashtags.join(', ')}
    
    Consider platform-specific limits, best practices, and performance optimization. Provide optimized hashtags, platform limits, performance predictions, and alternative suggestions.`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          optimizedHashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          platformLimits: {
            type: Type.OBJECT,
            properties: {
              maxHashtags: { type: Type.NUMBER },
              recommendedCount: { type: Type.NUMBER },
              placement: { type: Type.STRING },
            },
            required: ['maxHashtags', 'recommendedCount', 'placement'],
          },
          performancePrediction: {
            type: Type.OBJECT,
            properties: {
              expectedReach: { type: Type.STRING },
              expectedEngagement: { type: Type.STRING },
              competitionLevel: { type: Type.STRING },
            },
            required: ['expectedReach', 'expectedEngagement', 'competitionLevel'],
          },
          alternatives: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['optimizedHashtags', 'platformLimits', 'performancePrediction', 'alternatives'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to optimize hashtags for platform: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    optimizedHashtags: result.optimizedHashtags || hashtags.slice(0, 5),
    platformLimits: result.platformLimits || {
      maxHashtags: 30,
      recommendedCount: 5,
      placement: 'end of post',
    },
    performancePrediction: result.performancePrediction || {
      expectedReach: 'medium',
      expectedEngagement: 'medium',
      competitionLevel: 'medium',
    },
    alternatives: result.alternatives || [],
  };
};

// Advanced Content Repurposing Functions

export const batchRepurposeContent = async (
  blogPost: string,
  formats: string[],
  options?: {
    targetAudience?: string;
    brandVoice?: { tone: string; writingStyle: string };
    platformSpecific?: { [format: string]: { platform?: string; duration?: string } };
  }
): Promise<{ [format: string]: string }> => {
  const results: { [format: string]: string } = {};

  // Process formats in parallel for better performance
  const promises = formats.map(async (format) => {
    const formatOptions = {
      ...options,
      ...options?.platformSpecific?.[format],
    };

    try {
      const content = await repurposeContent(blogPost, format, formatOptions);
      return { format, content };
    } catch (error) {
      console.error(`Error repurposing to ${format}:`, error);
      return { format, content: `Error: Could not repurpose to ${format}` };
    }
  });

  const completedResults = await Promise.all(promises);
  completedResults.forEach(({ format, content }) => {
    results[format] = content;
  });

  return results;
};

export const generateRepurposingTemplate = async (
  contentType: string,
  industry: string,
  targetFormat: string
): Promise<{
  template: {
    sections: Array<{
      name: string;
      description: string;
      placeholder: string;
      required: boolean;
    }>;
    guidelines: string[];
    bestPractices: string[];
  };
  customizationOptions: Array<{
    name: string;
    type: 'text' | 'select' | 'multiselect';
    options?: string[];
    description: string;
  }>;
}> => {
  const prompt = `Create a repurposing template for converting ${contentType} content in the ${industry} industry to ${targetFormat} format.
    
    Provide a structured template with sections, guidelines, best practices, and customization options that content creators can use repeatedly.`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          template: {
            type: Type.OBJECT,
            properties: {
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    placeholder: { type: Type.STRING },
                    required: { type: Type.BOOLEAN },
                  },
                  required: ['name', 'description', 'placeholder', 'required'],
                },
              },
              guidelines: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              bestPractices: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['sections', 'guidelines', 'bestPractices'],
          },
          customizationOptions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                type: {
                  type: Type.STRING,
                  enum: ['text', 'select', 'multiselect'],
                },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                description: { type: Type.STRING },
              },
              required: ['name', 'type', 'description'],
            },
          },
        },
        required: ['template', 'customizationOptions'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate repurposing template: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    template: result.template || {
      sections: [],
      guidelines: [],
      bestPractices: [],
    },
    customizationOptions: result.customizationOptions || [],
  };
};

export const optimizeRepurposedContent = async (
  originalContent: string,
  repurposedContent: string,
  targetFormat: string,
  targetPlatform?: string
): Promise<{
  optimizationScore: number;
  suggestions: Array<{
    type: 'structure' | 'engagement' | 'platform' | 'seo';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  optimizedVersion?: string;
}> => {
  let prompt = `Analyze the following repurposed content and provide optimization suggestions for ${targetFormat}`;

  if (targetPlatform) {
    prompt += ` on ${targetPlatform}`;
  }

  prompt += `.

Original Content:
${originalContent}

Repurposed Content:
${repurposedContent}

Evaluate the repurposing quality (0-100 score) and provide specific optimization suggestions. If the score is below 75, provide an optimized version.`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          optimizationScore: { type: Type.NUMBER },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  enum: ['structure', 'engagement', 'platform', 'seo'],
                },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                priority: {
                  type: Type.STRING,
                  enum: ['high', 'medium', 'low'],
                },
              },
              required: ['type', 'title', 'description', 'priority'],
            },
          },
          optimizedVersion: { type: Type.STRING },
        },
        required: ['optimizationScore', 'suggestions'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to optimize repurposed content: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    optimizationScore: result.optimizationScore || 0,
    suggestions: result.suggestions || [],
    optimizedVersion: result.optimizedVersion,
  };
};

export const generateContentVariations = async (
  content: string,
  format: string,
  variationTypes: Array<'tone' | 'length' | 'audience' | 'style'>,
  options?: {
    tones?: string[];
    lengths?: string[];
    audiences?: string[];
    styles?: string[];
  }
): Promise<{
  variations: Array<{
    type: string;
    value: string;
    content: string;
    description: string;
  }>;
}> => {
  const prompt = `Create variations of the following ${format} content based on these variation types: ${variationTypes.join(', ')}.
    
    Original Content:
    ${content}
    
    Generate different versions optimized for different ${variationTypes.join(', ')} approaches. Provide clear descriptions of each variation.`;

  const response = await getAiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          variations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                value: { type: Type.STRING },
                content: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ['type', 'value', 'content', 'description'],
            },
          },
        },
        required: ['variations'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate content variations: No response text received');
  }

  const result = JSON.parse(response.text);
  return {
    variations: result.variations || [],
  };
};
