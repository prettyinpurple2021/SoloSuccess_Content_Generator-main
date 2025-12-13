import React, { useState, useEffect } from 'react';
import { useUser } from '@stackframe/react';
// FIX: Import Timestamp type and rename Timestamp value to avoid name collision.
import {
  Post,
  ViewMode,
  LoadingState,
  SocialMediaPosts,
  GeneratedImages,
  ImageStyle,
  BrandVoice,
  AudienceProfile,
  Campaign,
  ContentSeries,
  ContentTemplate,
  PerformanceReport,
  SchedulingSuggestion,
} from './types';
// Enhanced error handling is now handled in AppWithErrorHandling.tsx wrapper
import { apiService as clientApi } from './services/clientApiService';
import { campaignService } from './services/clientCampaignService';

// User type for Stack Auth
interface User {
  id: string;
  email: string;
  name?: string;
}
import * as geminiService from './services/geminiService';
// import * as schedulerService from './services/schedulerService';
// Blogger integration now handled through Integration Manager
import { postScheduler } from './services/postScheduler';
import {
  CalendarIcon,
  ListIcon,
  SparklesIcon,
  PLATFORMS,
  TONES,
  AUDIENCES,
  Spinner,
  PLATFORM_CONFIG,
  CopyIcon,
} from './constants';
import CalendarView from './components/CalendarView';
import IntegrationManager from './components/IntegrationManager';
import RepurposingWorkflow from './components/RepurposingWorkflow';
import ImageStyleManager from './components/ImageStyleManager';
import ContentSeriesManager from './components/ContentSeriesManager';
import TemplateLibrary from './components/TemplateLibrary';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { PerformanceInsights } from './components/PerformanceInsights';
import DragDropContentBuilder from './components/DragDropContentBuilder';
import VoiceCommands from './components/VoiceCommands';
import GamificationSystem from './components/GamificationSystem';
import { aiLearningService } from './services/aiLearningService';
import { marked } from 'marked';
// import { v4 as uuidv4 } from 'uuid';

// Local type for content builder interoperability
type ContentBlock = {
  id: string;
  type: 'text' | 'image' | 'list' | 'quote' | 'hashtags' | 'link' | 'video' | 'cta';
  content: string;
  metadata?: {
    imageUrl?: string;
    linkUrl?: string;
    videoUrl?: string;
    listItems?: string[];
    style?: 'bold' | 'italic' | 'highlight';
  };
};

const App: React.FC = () => {
  // Stack Auth user
  const stackUser = useUser();

  // Core State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentBlogTopic, setCurrentBlogTopic] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [selectedIdea, setSelectedIdea] = useState('');
  const [blogPost, setBlogPost] = useState('');
  const [postViewMode, setPostViewMode] = useState<'raw' | 'preview'>('preview');
  const [parsedMarkdown, setParsedMarkdown] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [allScheduledPosts, setAllScheduledPosts] = useState<Post[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState<LoadingState>({});

  // Unified Post Details Modal State
  const [showPostDetailsModal, setShowPostDetailsModal] = useState(false);
  const [selectedPostForDetails, setSelectedPostForDetails] = useState<Post | null>(null);
  const [parsedDetailsContent, setParsedDetailsContent] = useState('');

  // AI Feature States
  const [activeCreativeTab, setActiveCreativeTab] = useState('content');
  const [summary, setSummary] = useState('');
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [socialMediaPosts, setSocialMediaPosts] = useState<SocialMediaPosts>({});
  const [socialMediaTones, setSocialMediaTones] = useState<{ [key: string]: string }>({});
  const [socialMediaAudiences, setSocialMediaAudiences] = useState<{ [key: string]: string }>({});
  const [imagePrompts, setImagePrompts] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImages>({});
  const [selectedImageForPost, setSelectedImageForPost] = useState<string | null>(null);

  // Repurposing Modal State
  const [showRepurposeModal, setShowRepurposeModal] = useState(false);
  const [repurposingPost, setRepurposingPost] = useState<Post | null>(null);

  // Integration Manager Modal State
  const [showIntegrationManager, setShowIntegrationManager] = useState(false);

  // Tagging State
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  // Blogger integration now handled through Integration Manager

  // Image Style State
  const [showImageStyleManager, setShowImageStyleManager] = useState(false);
  const [imageStyles, setImageStyles] = useState<ImageStyle[]>([]);
  const [selectedImageStyle, setSelectedImageStyle] = useState<ImageStyle | null>(null);
  const [selectedPlatformForImage, setSelectedPlatformForImage] = useState<string>('general');

  // Enhanced Features State Management

  // Brand Voice and Personalization State
  const [brandVoices, setBrandVoices] = useState<BrandVoice[]>([]);

  // New Feature States
  // Content Builder is shown via Enhanced Features tab
  const [contentBuilderBlocks, setContentBuilderBlocks] = useState<ContentBlock[]>([]);
  // Gamification is shown via Enhanced Features tab
  const [selectedBrandVoice, setSelectedBrandVoice] = useState<BrandVoice | null>(null);
  const [showBrandVoiceManager, setShowBrandVoiceManager] = useState(false);

  // Audience Profile State
  const [audienceProfiles, setAudienceProfiles] = useState<AudienceProfile[]>([]);
  const [selectedAudienceProfile, setSelectedAudienceProfile] = useState<AudienceProfile | null>(
    null
  );
  const [showAudienceProfileManager, setShowAudienceProfileManager] = useState(false);

  // Campaign Management State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignManager, setShowCampaignManager] = useState(false);

  // Content Series State
  const [contentSeries, setContentSeries] = useState<ContentSeries[]>([]);
  const [selectedContentSeries, setSelectedContentSeries] = useState<ContentSeries | null>(null);
  const [showContentSeriesManager, setShowContentSeriesManager] = useState(false);

  // Template Library State
  const [contentTemplates, setContentTemplates] = useState<ContentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

  // Analytics and Performance State
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [showPerformanceInsights, setShowPerformanceInsights] = useState(false);
  // Optimization suggestions are computed on-demand inside insights views

  // Smart Scheduling State
  const [schedulingSuggestions, setSchedulingSuggestions] = useState<SchedulingSuggestion[]>([]);
  // Smart scheduler is accessed via Enhanced Features → Scheduling tab

  // Enhanced UI State
  const [activeEnhancedTab, setActiveEnhancedTab] = useState('personalization');
  const [showEnhancedFeatures, setShowEnhancedFeatures] = useState(false);

  const withLoading = <T extends unknown[]>(key: string, fn: (...args: T) => Promise<void>) => {
    return async (...args: T) => {
      setIsLoading((prev) => ({ ...prev, [key]: true }));
      setErrorMessage('');
      try {
        await fn(...args);
      } catch (error: unknown) {
        console.error(`Error in ${key}:`, error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        setErrorMessage(message);
      } finally {
        setIsLoading((prev) => ({ ...prev, [key]: false }));
      }
    };
  };

  // Enhanced error handling for new features
  const handleEnhancedFeatureError = (error: unknown, feature: string) => {
    console.error(`Enhanced feature error in ${feature}:`, error);
    const userFriendlyMessage = getEnhancedFeatureErrorMessage(error, feature);
    setErrorMessage(userFriendlyMessage);
  };

  const getEnhancedFeatureErrorMessage = (error: unknown, feature: string): string => {
    const baseMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    switch (feature) {
      case 'brandVoice':
        return `Brand voice error: ${baseMessage}. Please check your brand voice settings.`;
      case 'audienceProfile':
        return `Audience profile error: ${baseMessage}. Please verify your audience profile data.`;
      case 'campaign':
        return `Campaign error: ${baseMessage}. Please check your campaign configuration.`;
      case 'analytics':
        return `Analytics error: ${baseMessage}. Analytics data may be temporarily unavailable.`;
      case 'template':
        return `Template error: ${baseMessage}. Please try selecting a different template.`;
      case 'scheduling':
        return `Smart scheduling error: ${baseMessage}. Falling back to manual scheduling.`;
      default:
        return `${feature} error: ${baseMessage}`;
    }
  };

  useEffect(() => {
    // Handle Stack Auth user state
    console.log('App: Stack user check', { stackUser, isAuthReady });
    if (stackUser !== undefined) {
      if (stackUser) {
        // Convert Stack user to our User type
        const raw = stackUser as unknown as {
          primaryEmail?: string;
          email?: string;
          displayName?: string;
        };
        const convertedUser: User = {
          id: stackUser.id,
          email: raw.primaryEmail ?? raw.email ?? '',
          name: raw.displayName || undefined,
        };
        console.log('✅ Stack user authenticated:', convertedUser.id);
        setUser(convertedUser);
        setIsAuthReady(true);
      } else {
        // No user authenticated
        console.log('🔄 No Stack user found');
        setUser(null);
        setIsAuthReady(true);
      }
    } else {
      console.log('⏳ Stack user is undefined (loading)');
    }

    // Blogger integration now handled through Integration Manager

    return () => {};
  }, [stackUser]);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setAllScheduledPosts([]);
      // Stop scheduler when user is not authenticated
      postScheduler.stop();
      return;
    }

    // Initial load of posts and enhanced features data
    const loadData = async () => {
      try {
        // Lightweight check for overdue posts (non-blocking, fire and forget)
        fetch('/api/scheduled-posts/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {
          // Silently fail - this is just a background check
        });

        const [posts, voices, profiles, campaignsList, styles, seriesList, templates] =
          await Promise.all([
            clientApi.getPosts(user.id),
            clientApi.getBrandVoices(user.id).catch(() => []),
            clientApi.getAudienceProfiles(user.id).catch(() => []),
            campaignService.getCampaigns(user.id).catch(() => []),
            clientApi.getImageStyles(user.id).catch(() => []),
            clientApi.getContentSeries(user.id).catch(() => []),
            clientApi.getContentTemplates(user.id).catch(() => []),
          ]);

        setAllScheduledPosts(posts);
        setImageStyles(styles);
        setBrandVoices(voices);
        setAudienceProfiles(profiles);
        setCampaigns(campaignsList);
        setContentSeries(seriesList);
        setContentTemplates(templates);

        // Set default selections if available
        if (voices.length > 0 && !selectedBrandVoice) {
          setSelectedBrandVoice(voices[0]);
        }
        if (profiles.length > 0 && !selectedAudienceProfile) {
          setSelectedAudienceProfile(profiles[0]);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(`Failed to load data: ${msg}`);
      }
    };

    loadData();

    // Start the post scheduler
    postScheduler.start();

    return () => {
      postScheduler.stop();
    };
  }, [isAuthReady, user, selectedBrandVoice, selectedAudienceProfile]);

  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  useEffect(() => {
    if (blogPost) {
      Promise.resolve(marked.parse(blogPost)).then((html) => setParsedMarkdown(html as string));
    } else {
      setParsedMarkdown('');
    }
  }, [blogPost]);

  useEffect(() => {
    if (selectedPostForDetails?.content) {
      Promise.resolve(marked.parse(selectedPostForDetails.content)).then((html) =>
        setParsedDetailsContent(html as string)
      );
    } else {
      setParsedDetailsContent('');
    }
  }, [selectedPostForDetails]);

  const clearWorkflow = () => {
    setCurrentBlogTopic('');
    setIdeas([]);
    setSelectedIdea('');
    setBlogPost('');
    setSummary('');
    setHeadlines([]);
    setSuggestedTags([]);
    setSelectedTags([]);
    setSocialMediaPosts({});
    setSocialMediaTones({});
    setSocialMediaAudiences({});
    setImagePrompts([]);
    setGeneratedImages({});
    setSelectedImageForPost(null);
    setEditingPostId(null);
    setPostViewMode('preview');

    // Note: We don't clear enhanced feature selections (brand voice, audience, etc.)
    // as users typically want to keep these selections across multiple posts
    // Only clear template selection as it's more post-specific
    setSelectedTemplate(null);
  };

  const handleGenerateTopic = withLoading('topic', async () => {
    clearWorkflow();
    const topic = await geminiService.generateTopic();
    setCurrentBlogTopic(topic);
  });

  const handleGenerateIdeas = withLoading('ideas', async () => {
    if (!currentBlogTopic) {
      setErrorMessage('Please generate a topic first.');
      return;
    }

    // Get AI learning suggestions for better ideas
    const suggestions = user
      ? aiLearningService.getPersonalizedSuggestions(user.id, {
          currentTopic: currentBlogTopic,
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
        })
      : [];

    const generatedIdeas = await geminiService.generateIdeas(currentBlogTopic);
    setIdeas(generatedIdeas);

    // Record interaction for learning
    if (user) {
      aiLearningService.recordInteraction({
        userId: user.id,
        type: 'content_generated',
        data: {
          topic: currentBlogTopic,
          timestamp: new Date(),
          context: { suggestionsUsed: suggestions.length > 0 },
        },
      });
    }
  });

  const handleGeneratePost = withLoading('post', async (idea: string) => {
    setSelectedIdea(idea);

    // Record idea selection for AI learning
    if (user) {
      const rejectedIdeas = ideas.filter((i) => i !== idea);
      aiLearningService.recordInteraction({
        userId: user.id,
        type: 'idea_selected',
        data: {
          topic: currentBlogTopic,
          selectedOption: idea,
          rejectedOptions: rejectedIdeas,
          timestamp: new Date(),
        },
      });
    }

    // Enhanced content generation with personalization
    // Personalization values are passed into the AI generation calls below

    const postContent = await geminiService.generatePersonalizedContent(
      idea,
      selectedBrandVoice
        ? {
            tone: selectedBrandVoice.tone,
            writingStyle: selectedBrandVoice.writingStyle,
            vocabulary: [],
            targetAudience: selectedBrandVoice.targetAudience || 'general',
          }
        : undefined,
      selectedAudienceProfile
        ? {
            ageRange: selectedAudienceProfile.ageRange,
            industry: selectedAudienceProfile.industry,
            interests: selectedAudienceProfile.interests,
            painPoints: selectedAudienceProfile.painPoints,
          }
        : undefined
    );
    setBlogPost(postContent);
    setPostViewMode('preview');
    handleGenerateTags(postContent); // Auto-generate tags
  });

  const handleGenerateTags = withLoading('tags', async (postContent: string) => {
    if (!postContent) return;
    const tags = await geminiService.generateTags(postContent);
    setSuggestedTags(tags);
    setSelectedTags(tags);
  });

  const handleGenerateSummary = withLoading('summary', async () => {
    const result = await geminiService.generateSummary(blogPost);
    setSummary(result);
  });

  const handleGenerateHeadlines = withLoading('headlines', async () => {
    const results = await geminiService.generateHeadlines(blogPost);
    setHeadlines(results);
  });

  type GeminiSocialClient = {
    generateSocialMediaPost?: (
      topic: string,
      platform: string,
      tone: string,
      length: number
    ) => Promise<{ content: string }>;
  };

  const handleGenerateSocialPost = async (platform: string) => {
    const key = `social-${platform}`;
    setIsLoading((prev) => ({ ...prev, [key]: true }));
    setErrorMessage('');
    try {
      const tone = socialMediaTones[platform] || TONES[0];

      // Enhanced social media generation with personalization
      // personalization used via generatePersonalizedContent elsewhere

      const config = PLATFORM_CONFIG[platform];
      const length = config?.charLimit || 200;
      const gemini = geminiService as unknown as GeminiSocialClient;
      const result = await (async () => {
        if (gemini.generateSocialMediaPost) {
          return await gemini.generateSocialMediaPost(
            currentBlogTopic || selectedIdea || 'Social post',
            platform,
            tone,
            length
          );
        }
        return { content: '' };
      })();
      const post = result.content || '';
      setSocialMediaPosts((prev) => ({ ...prev, [platform]: post }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error generating social post for ${platform}:`, error);
      setErrorMessage(msg || `An unexpected error occurred for ${platform}.`);
    } finally {
      setIsLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleGenerateAllSocialPosts = withLoading('socialAll', async () => {
    // personalization used via generatePersonalizedContent elsewhere

    const gemini = geminiService as unknown as GeminiSocialClient;
    const promises = PLATFORMS.map(async (platform) => {
      const tone = socialMediaTones[platform] || TONES[0];
      const config = PLATFORM_CONFIG[platform];
      const length = config?.charLimit || 200;
      try {
        if (!gemini.generateSocialMediaPost) throw new Error('Social generation unavailable');
        const res = await gemini.generateSocialMediaPost(
          currentBlogTopic || selectedIdea || 'Social post',
          platform,
          tone,
          length
        );
        return { platform, post: res.content || '' };
      } catch (error) {
        console.error(`Error generating for ${platform} in 'All' mode:`, error);
        return { platform, post: `Error: Could not generate content for ${platform}.` };
      }
    });
    const results = await Promise.all(promises);
    const newPosts: SocialMediaPosts = {};
    results.forEach(({ platform, post }) => {
      newPosts[platform] = post;
    });
    setSocialMediaPosts((prev) => ({ ...prev, ...newPosts }));
  });

  const handleSocialPostChange = (platform: string, value: string) => {
    setSocialMediaPosts((prev) => ({ ...prev, [platform]: value }));
  };

  // Removed unused loadImageStyles (initial load handles styles)

  // Enhanced Features Handlers

  // Brand Voice Management
  // Removed unused loadBrandVoices

  const handleBrandVoiceSelect = (voice: BrandVoice | null) => {
    setSelectedBrandVoice(voice);
    if (voice) {
      setSuccessMessage(`Brand voice "${voice.name}" selected for content generation.`);
    }
  };

  // Audience Profile Management
  // Removed unused loadAudienceProfiles

  const handleAudienceProfileSelect = (profile: AudienceProfile | null) => {
    setSelectedAudienceProfile(profile);
    if (profile) {
      setSuccessMessage(`Audience profile "${profile.name}" selected for content targeting.`);
    }
  };

  // Campaign Management
  // Removed unused loadCampaigns

  const handleCampaignSelect = (campaign: Campaign | null) => {
    setSelectedCampaign(campaign);
    if (campaign) {
      setSuccessMessage(`Campaign "${campaign.name}" selected.`);
    }
  };

  // Content Series Management
  // Removed unused loadContentSeries

  const handleContentSeriesSelect = (series: ContentSeries | null) => {
    setSelectedContentSeries(series);
    if (series) {
      setSuccessMessage(`Content series "${series.name}" selected.`);
    }
  };

  // Template Management
  // Removed unused loadContentTemplates

  const handleTemplateSelect = (template: ContentTemplate | null) => {
    setSelectedTemplate(template);
    if (template) {
      setSuccessMessage(`Template "${template.name}" selected for content generation.`);
    }
  };

  // Analytics and Performance

  const generatePerformanceReport = withLoading(
    'performanceReport',
    async (timeframe: string = '30d') => {
      try {
        // This would typically call an analytics service
        // For now, we'll create a placeholder implementation
        const report: PerformanceReport = {
          timeframe,
          totalPosts: allScheduledPosts.length,
          totalEngagement: 0,
          avgEngagementRate: 0,
          topContent: [],
          platformBreakdown: {},
          trends: [],
          recommendations: [],
        };
        setPerformanceReport(report);
      } catch (error: unknown) {
        handleEnhancedFeatureError(error, 'analytics');
      }
    }
  );

  // Smart Scheduling
  const generateSchedulingSuggestions = withLoading('schedulingSuggestions', async () => {
    try {
      // This would typically call the scheduling service
      // For now, we'll create placeholder suggestions
      const suggestions: SchedulingSuggestion[] = [];
      setSchedulingSuggestions(suggestions);
    } catch (error: unknown) {
      handleEnhancedFeatureError(error, 'scheduling');
    }
  });

  const handleGenerateImagePrompts = withLoading('prompts', async () => {
    if (selectedImageStyle) {
      const { prompts } = await geminiService.generateStyleConsistentPrompts(
        selectedIdea || currentBlogTopic,
        {
          stylePrompt: selectedImageStyle.stylePrompt,
          colorPalette: selectedImageStyle.colorPalette,
          visualElements: selectedImageStyle.visualElements,
        }
      );
      setImagePrompts(prompts);
    } else {
      const prompts = await geminiService.generateImagePrompts(blogPost);
      setImagePrompts(prompts);
    }
  });

  const handleGenerateImages = withLoading('images', async (prompt: string) => {
    const imageOptions = selectedImageStyle
      ? {
          imageStyle: {
            stylePrompt: selectedImageStyle.stylePrompt,
            colorPalette: selectedImageStyle.colorPalette,
            visualElements: selectedImageStyle.visualElements,
            brandAssets: selectedImageStyle.brandAssets,
          },
          platform: selectedPlatformForImage !== 'general' ? selectedPlatformForImage : undefined,
        }
      : {
          platform: selectedPlatformForImage !== 'general' ? selectedPlatformForImage : undefined,
        };

    const images = await geminiService.generateImage(prompt, imageOptions);
    setGeneratedImages((prev) => ({ ...prev, [prompt]: images }));
  });

  const handleGenerateImageVariations = withLoading('variations', async (basePrompt: string) => {
    if (!selectedImageStyle) {
      setErrorMessage('Please select an image style first.');
      return;
    }

    const { variations } = await geminiService.generateImageVariations(
      basePrompt,
      {
        stylePrompt: selectedImageStyle.stylePrompt,
        colorPalette: selectedImageStyle.colorPalette,
        visualElements: selectedImageStyle.visualElements,
        brandAssets: selectedImageStyle.brandAssets,
      },
      3,
      selectedPlatformForImage !== 'general' ? selectedPlatformForImage : undefined
    );

    setGeneratedImages((prev) => ({
      ...prev,
      [`${basePrompt} (variations)`]: variations,
    }));
  });

  const handleSaveDraft = withLoading('save', async () => {
    if (!user || !selectedIdea || !blogPost) {
      setErrorMessage('Missing content to save as draft.');
      return;
    }
    const post = {
      topic: currentBlogTopic,
      idea: selectedIdea,
      content: blogPost,
      status: 'draft' as const,
      tags: selectedTags,
      summary,
      headlines,
      socialMediaPosts,
      socialMediaTones,
      socialMediaAudiences,
      createdAt: new Date(),
      selectedImage: selectedImageForPost || undefined,
      // Enhanced features
      brandVoiceId: selectedBrandVoice?.id,
      audienceProfileId: selectedAudienceProfile?.id,
      campaignId: selectedCampaign?.id,
      seriesId: selectedContentSeries?.id,
      templateId: selectedTemplate?.id,
      imageStyleId: selectedImageStyle?.id,
    };

    if (editingPostId) {
      type PostUpsert = Partial<Post>;
      await clientApi.updatePost(user.id, editingPostId, post as PostUpsert);
      setSuccessMessage('Draft updated successfully!');
    } else {
      type PostUpsert = Partial<Post>;
      await clientApi.addPost(user.id, post as PostUpsert);
      setSuccessMessage('Draft saved successfully!');

      // Track post creation for gamification
      if (user) {
        aiLearningService.recordInteraction({
          userId: user.id,
          type: 'content_generated',
          data: {
            topic: post.topic,
            timestamp: new Date(),
            context: { action: 'draft_saved' },
          },
        });
      }
    }
    clearWorkflow();
  });

  const handleSchedulePost = withLoading('schedule', async () => {
    if (!user || !scheduleDate || (!editingPostId && (!selectedIdea || !blogPost))) {
      setErrorMessage('Missing content or schedule date.');
      return;
    }

    // Request notification permission for scheduled posts
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      await Notification.requestPermission();
    }
    const scheduledDate = new Date(scheduleDate);
    const postData = editingPostId ? allScheduledPosts.find((p) => p.id === editingPostId) : null;

    const post = {
      topic: postData?.topic ?? currentBlogTopic,
      idea: postData?.idea ?? selectedIdea,
      content: postData?.content ?? blogPost,
      status: 'scheduled' as const,
      tags: postData?.tags ?? selectedTags,
      summary: postData?.summary ?? summary,
      headlines: postData?.headlines ?? headlines,
      scheduleDate: scheduledDate,
      socialMediaPosts: postData?.socialMediaPosts ?? socialMediaPosts,
      socialMediaTones: postData?.socialMediaTones ?? socialMediaTones,
      socialMediaAudiences: postData?.socialMediaAudiences ?? socialMediaAudiences,
      selectedImage: postData?.selectedImage ?? selectedImageForPost ?? undefined,
      createdAt: postData?.createdAt ?? new Date(),
      // Enhanced features
      brandVoiceId: postData?.brandVoiceId ?? selectedBrandVoice?.id,
      audienceProfileId: postData?.audienceProfileId ?? selectedAudienceProfile?.id,
      campaignId: postData?.campaignId ?? selectedCampaign?.id,
      seriesId: postData?.seriesId ?? selectedContentSeries?.id,
      templateId: postData?.templateId ?? selectedTemplate?.id,
      imageStyleId: postData?.imageStyleId ?? selectedImageStyle?.id,
    };

    if (editingPostId) {
      type PostUpsert = Partial<Post>;
      await clientApi.updatePost(user.id, editingPostId, post as PostUpsert);
      setSuccessMessage('Post rescheduled successfully!');
    } else {
      type PostUpsert = Partial<Post>;
      await clientApi.addPost(user.id, post as PostUpsert);
      setSuccessMessage('Post scheduled successfully!');

      // Track post scheduling for gamification
      if (user) {
        aiLearningService.recordInteraction({
          userId: user.id,
          type: 'platform_posted',
          data: {
            topic: post.topic,
            platform: 'scheduled',
            timestamp: new Date(),
            context: { scheduled_for: scheduledDate },
          },
        });
      }
    }

    setShowScheduleModal(false);
    setScheduleDate('');
    clearWorkflow();
  });

  const handleDeletePost = withLoading('delete', async (postId: string) => {
    if (!user) return;
    if (window.confirm('Are you sure you want to delete this post?')) {
      await clientApi.deletePost(user?.id || '', postId);
      setSuccessMessage('Post deleted.');
      if (showPostDetailsModal) {
        setShowPostDetailsModal(false);
        setSelectedPostForDetails(null);
      }
    }
  });

  const populateFormForEditing = (post: Post) => {
    clearWorkflow();
    setCurrentBlogTopic(post.topic);
    setIdeas([post.idea]);
    setSelectedIdea(post.idea);
    setBlogPost(post.content);
    setPostViewMode('preview');
    setSummary(post.summary || '');
    setHeadlines(post.headlines || []);
    setSelectedTags(post.tags);
    setSuggestedTags(post.tags);
    setSocialMediaPosts(post.socialMediaPosts);
    setSocialMediaTones(post.socialMediaTones || {});
    setSocialMediaAudiences(post.socialMediaAudiences || {});
    setSelectedImageForPost(post.selectedImage || null);

    // Restore enhanced features selections
    if (post.brandVoiceId) {
      const brandVoice = brandVoices.find((v) => v.id === post.brandVoiceId);
      setSelectedBrandVoice(brandVoice || null);
    }
    if (post.audienceProfileId) {
      const audienceProfile = audienceProfiles.find((p) => p.id === post.audienceProfileId);
      setSelectedAudienceProfile(audienceProfile || null);
    }
    if (post.campaignId) {
      const campaign = campaigns.find((c) => c.id === post.campaignId);
      setSelectedCampaign(campaign || null);
    }
    if (post.seriesId) {
      const series = contentSeries.find((s) => s.id === post.seriesId);
      setSelectedContentSeries(series || null);
    }
    if (post.templateId) {
      const template = contentTemplates.find((t) => t.id === post.templateId);
      setSelectedTemplate(template || null);
    }
    if (post.imageStyleId) {
      const imageStyle = imageStyles.find((s) => s.id === post.imageStyleId);
      setSelectedImageStyle(imageStyle || null);
    }

    setEditingPostId(post.id);
    setShowPostDetailsModal(false);
    setSelectedPostForDetails(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePostClick = (post: Post) => {
    setSelectedPostForDetails(post);
    setShowPostDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowPostDetailsModal(false);
    setSelectedPostForDetails(null);
  };

  const handleOpenSchedulerForExisting = (post: Post) => {
    setEditingPostId(post.id);
    const now = new Date();
    const schedule = post.scheduleDate && post.scheduleDate > now ? post.scheduleDate : now;
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const pad = (num: number) => num.toString().padStart(2, '0');
    const formattedDate = `${schedule.getFullYear()}-${pad(schedule.getMonth() + 1)}-${pad(schedule.getDate())}T${pad(schedule.getHours())}:${pad(schedule.getMinutes())}`;
    setScheduleDate(formattedDate);
    setShowScheduleModal(true);
    handleCloseDetailsModal();
  };

  const handleStartRepurposing = () => {
    if (!selectedPostForDetails) return;
    setRepurposingPost(selectedPostForDetails);
    setShowRepurposeModal(true);
    handleCloseDetailsModal();
  };

  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage(`${type} copied to clipboard!`);
  };

  // Blogger posting now handled through Integration Manager

  const getStatusPill = (status: string) => {
    const baseClasses = 'status-pill';
    switch (status) {
      case 'posted':
        return `${baseClasses} status-posted`;
      case 'scheduled':
        return `${baseClasses} status-scheduled`;
      case 'draft':
        return `${baseClasses} status-draft`;
      default:
        return `${baseClasses} status-draft`;
    }
  };

  const creativeTabs = [
    { id: 'content', label: 'Content Tools' },
    { id: 'personalization', label: 'Personalization' },
    { id: 'tags', label: 'SEO & Tags' },
    { id: 'social', label: 'Social Media' },
    { id: 'image', label: 'Image Generation' },
    { id: 'campaign', label: 'Campaign & Series' },
    { id: 'publish', label: 'Publishing' },
  ];

  const enhancedFeatureTabs = [
    { id: 'personalization', label: 'Brand & Audience' },
    { id: 'campaigns', label: 'Campaigns & Series' },
    { id: 'analytics', label: 'Analytics & Insights' },
    { id: 'templates', label: 'Template Library' },
    { id: 'scheduling', label: 'Smart Scheduling' },
    { id: 'contentbuilder', label: '🎨 Content Builder' },
    { id: 'gamification', label: '🎮 Achievements' },
  ];

  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 relative">
      {/* Background Sparkles */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="sparkle" style={{ top: '10%', left: '10%', animationDelay: '0s' }}></div>
        <div className="sparkle" style={{ top: '20%', right: '15%', animationDelay: '0.5s' }}></div>
        <div className="sparkle" style={{ bottom: '30%', left: '20%', animationDelay: '1s' }}></div>
        <div
          className="sparkle"
          style={{ bottom: '10%', right: '10%', animationDelay: '1.5s' }}
        ></div>
        <div className="sparkle" style={{ top: '50%', left: '5%', animationDelay: '2s' }}></div>
        <div className="sparkle" style={{ top: '70%', right: '25%', animationDelay: '2.5s' }}></div>
      </div>

      <header className="text-center mb-16 relative">
        <div className="relative inline-block">
          <h1 className="text-6xl sm:text-8xl font-display gradient-text tracking-wider mb-4 relative">
            SoloSuccess AI
            <div className="sparkle" style={{ top: '10px', right: '10px' }}></div>
            <div className="sparkle" style={{ bottom: '10px', left: '10px' }}></div>
          </h1>
        </div>
        <h2 className="text-2xl sm:text-3xl font-accent text-white mb-6 font-bold">
          Your Empire. Your Vision. Your AI DreamTeam.
        </h2>
        <p className="max-w-3xl mx-auto text-lg text-white/90 font-medium leading-relaxed">
          Your AI-powered partner for building your empire and achieving
          <span className="gradient-text font-bold"> extraordinary success</span>
        </p>
        {user && (
          <div className="mt-4 flex justify-center items-center gap-4">
            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
              <div
                className={`w-2 h-2 rounded-full ${postScheduler.getStatus().isRunning ? 'bg-green-400' : 'bg-red-400'}`}
              ></div>
              <span className="text-white/80">
                Scheduler {postScheduler.getStatus().isRunning ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
              <span className="text-white/80">👤 {user.email}</span>
            </div>
            <button
              onClick={() => setShowIntegrationManager(true)}
              className="bg-gradient-to-br from-secondary to-accent hover:shadow-neon-accent transition-all duration-300 text-white font-bold py-2 px-4 rounded-lg text-sm"
            >
              🔗 Integrations
            </button>
            <button
              onClick={() => setShowEnhancedFeatures(true)}
              className="bg-gradient-to-br from-purple-500 to-pink-500 hover:shadow-neon-accent transition-all duration-300 text-white font-bold py-2 px-4 rounded-lg text-sm"
            >
              ⚡ Enhanced Features
            </button>
            <button
              onClick={() => (window.location.href = '/profile')}
              className="bg-gradient-to-br from-purple-500 to-pink-500 hover:shadow-neon-accent transition-all duration-300 text-white font-bold py-2 px-4 rounded-lg text-sm"
            >
              👤 Profile
            </button>
            <button
              onClick={() => (window.location.href = '/logout')}
              className="bg-gradient-to-br from-red-500 to-red-600 hover:shadow-neon-red transition-all duration-300 text-white font-bold py-2 px-4 rounded-lg text-sm"
            >
              🚪 Sign Out
            </button>
          </div>
        )}
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Workflow */}
        <div className="flex flex-col gap-8">
          {/* Step 1: Topic */}
          <section className="glass-card relative">
            <div className="sparkle"></div>
            <div className="sparkle"></div>
            <div className="sparkle"></div>
            <div className="sparkle"></div>
            <div className="glass-card-inner">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-display font-black text-white">
                  ✨ Step 1: Discover a Topic
                </h3>
                <button
                  onClick={handleGenerateTopic}
                  disabled={isLoading.topic}
                  className="holographic-btn disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading.topic ? <Spinner /> : <SparklesIcon />}
                  {isLoading.topic ? 'Discovering...' : 'Discover Magic'}
                </button>
              </div>
              {currentBlogTopic && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-white/30 backdrop-filter blur-15">
                  <p className="text-xl font-bold text-white">{currentBlogTopic}</p>
                </div>
              )}
            </div>
          </section>

          {/* Step 2: Ideas */}
          {currentBlogTopic && (
            <section className="glass-card relative">
              <div className="sparkle"></div>
              <div className="sparkle"></div>
              <div className="sparkle"></div>
              <div className="sparkle"></div>
              <div className="glass-card-inner">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-3xl font-display font-black text-white">
                    🚀 Step 2: Generate Ideas
                  </h3>
                  <button
                    onClick={handleGenerateIdeas}
                    disabled={!currentBlogTopic || isLoading.ideas}
                    className="holographic-btn disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading.ideas ? <Spinner /> : <SparklesIcon />}
                    {isLoading.ideas ? 'Generating...' : 'Generate Ideas'}
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  {ideas.map((idea, index) => (
                    <button
                      key={index}
                      onClick={() => handleGeneratePost(idea)}
                      disabled={isLoading.post}
                      className={`text-left p-4 rounded-xl font-semibold transition-all duration-300 border backdrop-filter blur-15 ${
                        selectedIdea === idea
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/50 text-white shadow-lg glow-pulse'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/15 hover:border-white/30'
                      }`}
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Step 3: Blog Post */}
          {blogPost && (
            <section className="glass-card relative">
              <div className="sparkle"></div>
              <div className="sparkle"></div>
              <div className="sparkle"></div>
              <div className="sparkle"></div>
              <div className="glass-card-inner">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-3xl font-display font-black text-white">
                    📝 Step 3: Your AI-Generated Post
                  </h3>
                  <div className="flex items-center gap-2 p-2 bg-white/10 rounded-xl border border-white/20 backdrop-filter blur-15">
                    <button
                      onClick={() => setPostViewMode('raw')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                        postViewMode === 'raw'
                          ? 'bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white shadow-lg'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      Markdown
                    </button>
                    <button
                      onClick={() => setPostViewMode('preview')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                        postViewMode === 'preview'
                          ? 'bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white shadow-lg'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>
                {selectedImageForPost && (
                  <div className="mb-4">
                    <img
                      src={selectedImageForPost}
                      alt="Selected for post"
                      className="rounded-lg w-full object-cover max-h-64"
                    />
                  </div>
                )}
                {postViewMode === 'preview' ? (
                  <div
                    className="prose max-w-none h-64 overflow-y-auto p-4 border border-border rounded-lg"
                    dangerouslySetInnerHTML={{ __html: parsedMarkdown }}
                  ></div>
                ) : (
                  <textarea
                    value={blogPost}
                    onChange={(e) => setBlogPost(e.target.value)}
                    className="glass-input w-full h-64 font-mono text-sm resize-none"
                    aria-label="Blog post markdown content"
                  />
                )}
              </div>
            </section>
          )}

          {/* Step 4: Enhance & Distribute */}
          {blogPost && (
            <section className="glass-card relative">
              <div className="sparkle"></div>
              <div className="sparkle"></div>
              <div className="sparkle"></div>
              <div className="sparkle"></div>
              <div className="glass-card-inner">
                <h3 className="text-3xl font-display font-black text-white mb-6">
                  🎨 Step 4: Enhance &amp; Distribute
                </h3>
                <div className="flex flex-wrap border-b border-border mb-4 -mx-2">
                  {creativeTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCreativeTab(tab.id)}
                      className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeCreativeTab === tab.id ? 'text-secondary border-secondary' : 'text-muted-foreground border-transparent hover:text-white'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Personalization Tab */}
                {activeCreativeTab === 'personalization' && (
                  <div className="space-y-6">
                    {/* Brand Voice Selection */}
                    <div className="glass-card p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-primary-foreground">Brand Voice</h4>
                        <button
                          onClick={() => setShowBrandVoiceManager(true)}
                          className="bg-secondary/80 hover:bg-secondary text-white text-sm py-1 px-3 rounded"
                        >
                          Manage Voices
                        </button>
                      </div>
                      <select
                        value={selectedBrandVoice?.id || ''}
                        onChange={(e) => {
                          const voice = brandVoices.find((v) => v.id === e.target.value);
                          handleBrandVoiceSelect(voice || null);
                        }}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
                      >
                        <option value="">No specific brand voice</option>
                        {brandVoices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name} ({voice.tone})
                          </option>
                        ))}
                      </select>
                      {selectedBrandVoice && (
                        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>Tone:</strong> {selectedBrandVoice.tone} |
                            <strong> Style:</strong> {selectedBrandVoice.writingStyle}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Target: {selectedBrandVoice.targetAudience}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Audience Profile Selection */}
                    <div className="glass-card p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-primary-foreground">Target Audience</h4>
                        <button
                          onClick={() => setShowAudienceProfileManager(true)}
                          className="bg-secondary/80 hover:bg-secondary text-white text-sm py-1 px-3 rounded"
                        >
                          Manage Profiles
                        </button>
                      </div>
                      <select
                        value={selectedAudienceProfile?.id || ''}
                        onChange={(e) => {
                          const profile = audienceProfiles.find((p) => p.id === e.target.value);
                          handleAudienceProfileSelect(profile || null);
                        }}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
                      >
                        <option value="">No specific audience</option>
                        {audienceProfiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name} ({profile.industry})
                          </option>
                        ))}
                      </select>
                      {selectedAudienceProfile && (
                        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>Age:</strong> {selectedAudienceProfile.ageRange} |
                            <strong> Industry:</strong> {selectedAudienceProfile.industry}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Interests: {selectedAudienceProfile.interests.slice(0, 3).join(', ')}
                            {selectedAudienceProfile.interests.length > 3 && '...'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Template Selection */}
                    <div className="glass-card p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-primary-foreground">Content Template</h4>
                        <button
                          onClick={() => setShowTemplateLibrary(true)}
                          className="bg-secondary/80 hover:bg-secondary text-white text-sm py-1 px-3 rounded"
                        >
                          Browse Library
                        </button>
                      </div>
                      <select
                        value={selectedTemplate?.id || ''}
                        onChange={(e) => {
                          const template = contentTemplates.find((t) => t.id === e.target.value);
                          handleTemplateSelect(template || null);
                        }}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
                      >
                        <option value="">No template (free-form)</option>
                        {contentTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} ({template.category})
                          </option>
                        ))}
                      </select>
                      {selectedTemplate && (
                        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>Type:</strong> {selectedTemplate.contentType} |
                            <strong> Category:</strong> {selectedTemplate.category}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Used {selectedTemplate.usageCount} times | Rating:{' '}
                            {selectedTemplate.rating}/5
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Content Tools Tab */}
                {activeCreativeTab === 'content' && (
                  <div className="space-y-6">
                    <div>
                      <button
                        onClick={handleGenerateSummary}
                        disabled={isLoading.summary}
                        className="holographic-btn disabled:opacity-50 mb-4"
                      >
                        {isLoading.summary ? <Spinner /> : <SparklesIcon />} Generate Summary
                      </button>
                      {summary && (
                        <div className="p-4 bg-white/10 border border-white/20 rounded-xl backdrop-filter blur-15">
                          <p className="text-white font-medium">{summary}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <button
                        onClick={handleGenerateHeadlines}
                        disabled={isLoading.headlines}
                        className="holographic-btn disabled:opacity-50 mb-4"
                      >
                        {isLoading.headlines ? <Spinner /> : <SparklesIcon />} Generate Headlines
                      </button>
                      {headlines.length > 0 && (
                        <div className="p-4 bg-white/10 border border-white/20 rounded-xl backdrop-filter blur-15">
                          <ul className="space-y-2 list-disc list-inside text-white">
                            {headlines.map((h, i) => (
                              <li key={i} className="font-medium">
                                {h}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags Tab */}
                {activeCreativeTab === 'tags' && (
                  <div>
                    <h4 className="font-semibold mb-2 text-primary-foreground">Suggested Tags</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {suggestedTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() =>
                            setSelectedTags((prev) =>
                              prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                            )
                          }
                          className={`px-4 py-2 text-sm font-semibold rounded-full transition-all border backdrop-filter blur-10 ${
                            selectedTags.includes(tag)
                              ? 'bg-gradient-to-r from-purple-500/60 to-pink-500/60 text-white border-purple-400/50 shadow-lg'
                              : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        placeholder="Add custom tag..."
                        className="glass-input w-full"
                      />
                      <button
                        onClick={() => {
                          if (customTag && !selectedTags.includes(customTag))
                            setSelectedTags((prev) => [...prev, customTag]);
                          setCustomTag('');
                        }}
                        className="holographic-btn"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Social Media Tab */}
                {activeCreativeTab === 'social' && (
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <button
                        onClick={handleGenerateAllSocialPosts}
                        disabled={isLoading.socialAll}
                        className="flex items-center gap-2 bg-gradient-to-br from-secondary to-accent hover:shadow-neon-accent transition-all duration-300 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                      >
                        {isLoading.socialAll ? <Spinner /> : <SparklesIcon />}
                        {isLoading.socialAll ? 'Generating All...' : 'Generate For All Platforms'}
                      </button>
                    </div>
                    <div className="space-y-4">
                      {PLATFORMS.map((platform) => {
                        const config = PLATFORM_CONFIG[platform];
                        const Icon = config.icon;
                        const post = socialMediaPosts[platform] || '';
                        const platformLoadingKey = `social-${platform}`;
                        const isLoadingPlatform =
                          isLoading[platformLoadingKey] || isLoading.socialAll;

                        return (
                          <div key={platform} className="glass-card p-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex items-center gap-3">
                                <Icon className="h-8 w-8 text-primary-foreground flex-shrink-0" />
                                <h4 className="font-bold text-xl text-primary-foreground">
                                  {platform}
                                </h4>
                              </div>
                              <button
                                onClick={() => handleGenerateSocialPost(platform)}
                                disabled={isLoadingPlatform}
                                className="flex-shrink-0 flex items-center justify-center gap-2 bg-primary/80 hover:bg-primary text-white font-bold py-2 px-3 rounded-lg disabled:opacity-50 min-w-[110px]"
                              >
                                {isLoading[platformLoadingKey] ? (
                                  <Spinner className="h-4 w-4" />
                                ) : (
                                  <SparklesIcon className="h-4 w-4" />
                                )}
                                <span>
                                  {isLoading[platformLoadingKey] ? 'Generating' : 'Generate'}
                                </span>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                              <select
                                value={socialMediaTones[platform] || TONES[0]}
                                onChange={(e) =>
                                  setSocialMediaTones((prev) => ({
                                    ...prev,
                                    [platform]: e.target.value,
                                  }))
                                }
                                className="bg-muted border border-border rounded-lg px-2 py-1.5 w-full text-sm"
                              >
                                {TONES.map((t) => (
                                  <option key={t} value={t}>
                                    {t} Tone
                                  </option>
                                ))}
                              </select>
                              <select
                                value={socialMediaAudiences[platform] || AUDIENCES[0]}
                                onChange={(e) =>
                                  setSocialMediaAudiences((prev) => ({
                                    ...prev,
                                    [platform]: e.target.value,
                                  }))
                                }
                                className="bg-muted border border-border rounded-lg px-2 py-1.5 w-full text-sm"
                              >
                                {AUDIENCES.map((a) => (
                                  <option key={a} value={a}>
                                    {a} Audience
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="mt-2">
                              {isLoadingPlatform ? (
                                <div className="h-32 flex flex-col items-center justify-center bg-muted/30 rounded-lg text-muted-foreground">
                                  <Spinner className="h-8 w-8" />
                                  <span className="mt-2 text-sm">AI is drafting your post...</span>
                                </div>
                              ) : (
                                <textarea
                                  value={post}
                                  onChange={(e) => handleSocialPostChange(platform, e.target.value)}
                                  placeholder={`Click 'Generate' to create content for ${platform}...`}
                                  className="w-full h-32 bg-muted/50 border border-border rounded-lg p-3 text-sm text-foreground focus:ring-secondary focus:border-secondary resize-y"
                                  aria-label={`${platform} post content`}
                                />
                              )}

                              {!isLoadingPlatform && (
                                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1 px-1">
                                  {config.charLimit ? (
                                    <span
                                      className={
                                        post.length > config.charLimit
                                          ? 'text-red-500 font-bold'
                                          : ''
                                      }
                                    >
                                      {post.length} / {config.charLimit}
                                    </span>
                                  ) : (
                                    <span />
                                  )}
                                  {post && (
                                    <button
                                      onClick={() =>
                                        handleCopyToClipboard(post, `${platform} post`)
                                      }
                                      className="font-semibold hover:text-secondary flex items-center gap-1"
                                    >
                                      <CopyIcon className="h-4 w-4" /> Copy
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Image Generation Tab */}
                {activeCreativeTab === 'image' && (
                  <div className="space-y-4">
                    {/* Image Style and Platform Selection */}
                    <div className="glass-card p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-primary-foreground">
                          Image Style & Platform
                        </h4>
                        <button
                          onClick={() => setShowImageStyleManager(true)}
                          className="bg-secondary/80 hover:bg-secondary text-white text-sm py-1 px-3 rounded"
                        >
                          Manage Styles
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary-foreground mb-2">
                            Image Style
                          </label>
                          <select
                            value={selectedImageStyle?.id || ''}
                            onChange={(e) => {
                              const style = imageStyles.find((s) => s.id === e.target.value);
                              setSelectedImageStyle(style || null);
                            }}
                            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
                          >
                            <option value="">No specific style</option>
                            {imageStyles.map((style) => (
                              <option key={style.id} value={style.id}>
                                {style.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-primary-foreground mb-2">
                            Target Platform
                          </label>
                          <select
                            value={selectedPlatformForImage}
                            onChange={(e) => setSelectedPlatformForImage(e.target.value)}
                            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
                          >
                            <option value="general">General (16:9)</option>
                            <option value="instagram">Instagram (1:1)</option>
                            <option value="twitter">Twitter/X (16:9)</option>
                            <option value="linkedin">LinkedIn (1.91:1)</option>
                            <option value="facebook">Facebook (1.91:1)</option>
                            <option value="pinterest">Pinterest (2:3)</option>
                            <option value="youtube">YouTube (16:9)</option>
                            <option value="tiktok">TikTok (9:16)</option>
                          </select>
                        </div>
                      </div>

                      {selectedImageStyle && (
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Style:</strong> {selectedImageStyle.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedImageStyle.stylePrompt}
                          </p>
                          {selectedImageStyle.colorPalette.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">Colors:</span>
                              {selectedImageStyle.colorPalette
                                .slice(0, 5)
                                .map((color: string, index: number) => (
                                  <div
                                    key={index}
                                    className="w-4 h-4 rounded border border-border"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Image Generation Controls */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleGenerateImagePrompts}
                        disabled={isLoading.prompts}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary/80 hover:bg-primary text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                      >
                        {isLoading.prompts ? <Spinner /> : <SparklesIcon />}
                        {selectedImageStyle
                          ? 'Generate Style-Consistent Ideas'
                          : 'Generate Image Ideas'}
                      </button>
                      {selectedImageStyle && imagePrompts.length > 0 && (
                        <button
                          onClick={() => handleGenerateImageVariations(imagePrompts[0])}
                          disabled={isLoading.variations}
                          className="bg-secondary/80 hover:bg-secondary text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                        >
                          {isLoading.variations ? <Spinner /> : 'Variations'}
                        </button>
                      )}
                    </div>

                    {/* Generated Image Prompts and Images */}
                    {imagePrompts.map((prompt) => (
                      <div key={prompt} className="glass-card p-4">
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <p className="text-sm text-primary-foreground flex-1">{prompt}</p>
                          <button
                            onClick={() => handleGenerateImages(prompt)}
                            disabled={isLoading.images}
                            className="bg-primary/80 hover:bg-primary text-white text-sm py-1 px-3 rounded disabled:opacity-50"
                          >
                            {isLoading.images ? <Spinner className="h-4 w-4" /> : 'Generate'}
                          </button>
                        </div>

                        {isLoading.images && (
                          <div className="flex justify-center py-8">
                            <div className="text-center">
                              <Spinner className="h-8 w-8 mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Generating{' '}
                                {selectedPlatformForImage !== 'general'
                                  ? selectedPlatformForImage
                                  : 'optimized'}{' '}
                                images
                                {selectedImageStyle ? ` with ${selectedImageStyle.name} style` : ''}
                                ...
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {generatedImages[prompt]?.map((imgSrc, index) => (
                            <div key={imgSrc} className="relative group">
                              <img
                                src={imgSrc}
                                onClick={() => setSelectedImageForPost(imgSrc)}
                                className={`w-full h-32 object-cover rounded-lg cursor-pointer border-4 transition-all ${
                                  selectedImageForPost === imgSrc
                                    ? 'border-accent shadow-lg'
                                    : 'border-transparent hover:border-primary/50'
                                }`}
                                alt={`${prompt} - variation ${index + 1}`}
                              />
                              {selectedImageForPost === imgSrc && (
                                <div className="absolute top-2 right-2 bg-accent text-white text-xs px-2 py-1 rounded">
                                  Selected
                                </div>
                              )}
                              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {selectedPlatformForImage !== 'general'
                                  ? selectedPlatformForImage
                                  : 'General'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Image Variations */}
                    {generatedImages[`${imagePrompts[0]} (variations)`] && (
                      <div className="glass-card p-4">
                        <h5 className="font-semibold text-primary-foreground mb-3">
                          Style Variations
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {generatedImages[`${imagePrompts[0]} (variations)`]?.map(
                            (imgSrc, index) => (
                              <div key={imgSrc} className="relative group">
                                <img
                                  src={imgSrc}
                                  onClick={() => setSelectedImageForPost(imgSrc)}
                                  className={`w-full h-32 object-cover rounded-lg cursor-pointer border-4 transition-all ${
                                    selectedImageForPost === imgSrc
                                      ? 'border-accent shadow-lg'
                                      : 'border-transparent hover:border-primary/50'
                                  }`}
                                  alt={`Variation ${index + 1}`}
                                />
                                {selectedImageForPost === imgSrc && (
                                  <div className="absolute top-2 right-2 bg-accent text-white text-xs px-2 py-1 rounded">
                                    Selected
                                  </div>
                                )}
                                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                  Variation {index + 1}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Campaign & Series Tab */}
                {activeCreativeTab === 'campaign' && (
                  <div className="space-y-6">
                    {/* Campaign Selection */}
                    <div className="glass-card p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-primary-foreground">Campaign</h4>
                        <button
                          onClick={() => setShowCampaignManager(true)}
                          className="bg-secondary/80 hover:bg-secondary text-white text-sm py-1 px-3 rounded"
                        >
                          Manage Campaigns
                        </button>
                      </div>
                      <select
                        value={selectedCampaign?.id || ''}
                        onChange={(e) => {
                          const campaign = campaigns.find((c) => c.id === e.target.value);
                          handleCampaignSelect(campaign || null);
                        }}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
                      >
                        <option value="">No campaign (standalone post)</option>
                        {campaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name} ({campaign.status})
                          </option>
                        ))}
                      </select>
                      {selectedCampaign && (
                        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>Theme:</strong> {selectedCampaign.theme}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedCampaign.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Posts: {selectedCampaign.posts.length}</span>
                            <span>Platforms: {selectedCampaign.platforms.join(', ')}</span>
                            <span
                              className={`px-2 py-1 rounded ${
                                selectedCampaign.status === 'active'
                                  ? 'bg-green-500/20 text-green-400'
                                  : selectedCampaign.status === 'draft'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {selectedCampaign.status}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content Series Selection */}
                    <div className="glass-card p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-primary-foreground">Content Series</h4>
                        <button
                          onClick={() => setShowContentSeriesManager(true)}
                          className="bg-secondary/80 hover:bg-secondary text-white text-sm py-1 px-3 rounded"
                        >
                          Manage Series
                        </button>
                      </div>
                      <select
                        value={selectedContentSeries?.id || ''}
                        onChange={(e) => {
                          const series = contentSeries.find((s) => s.id === e.target.value);
                          handleContentSeriesSelect(series || null);
                        }}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
                      >
                        <option value="">No series (standalone post)</option>
                        {contentSeries.map((series) => (
                          <option key={series.id} value={series.id}>
                            {series.name} ({series.currentPost}/{series.totalPosts})
                          </option>
                        ))}
                      </select>
                      {selectedContentSeries && (
                        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>Theme:</strong> {selectedContentSeries.theme}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              Progress: {selectedContentSeries.currentPost}/
                              {selectedContentSeries.totalPosts}
                            </span>
                            <span>Frequency: {selectedContentSeries.frequency}</span>
                            {selectedContentSeries.campaignId && <span>Part of campaign</span>}
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2 mt-2">
                            <div
                              className="bg-secondary h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${(selectedContentSeries.currentPost / selectedContentSeries.totalPosts) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Smart Scheduling Suggestions */}
                    <div className="glass-card p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-primary-foreground">Smart Scheduling</h4>
                        <button
                          onClick={generateSchedulingSuggestions}
                          disabled={isLoading.schedulingSuggestions}
                          className="bg-secondary/80 hover:bg-secondary text-white text-sm py-1 px-3 rounded disabled:opacity-50"
                        >
                          {isLoading.schedulingSuggestions ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            'Get Suggestions'
                          )}
                        </button>
                      </div>
                      {schedulingSuggestions.length > 0 ? (
                        <div className="space-y-2">
                          {schedulingSuggestions.slice(0, 3).map((suggestion, index) => (
                            <div key={index} className="p-3 bg-muted/30 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-primary-foreground">
                                    {suggestion.platform}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {suggestion.suggestedTime.toLocaleDateString()} at{' '}
                                    {suggestion.suggestedTime.toLocaleTimeString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {suggestion.reason}
                                  </p>
                                </div>
                                <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded">
                                  {Math.round(suggestion.confidence * 100)}% confidence
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Click &quot;Get Suggestions&quot; to see optimal posting times based on
                          your audience engagement patterns.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Publishing Tab */}
                {activeCreativeTab === 'publish' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => handleCopyToClipboard(parsedMarkdown, 'HTML')}
                      className="bg-secondary/80 hover:bg-secondary text-white font-bold py-2 px-4 rounded-lg w-full"
                    >
                      Copy HTML Content
                    </button>

                    <div className="border-t border-border pt-4">
                      <h4 className="font-semibold mb-2 text-primary-foreground">
                        Publishing Platforms
                      </h4>
                      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">📝</span>
                          <div>
                            <h5 className="font-semibold text-blue-300">Blogger Integration</h5>
                            <p className="text-sm text-blue-200">
                              Connect your own Blogger account to publish posts directly
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowIntegrationManager(true)}
                          className="w-full bg-blue-600/80 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                          Set Up Blogger Integration
                        </button>
                      </div>

                      <div className="text-sm text-white/60 mt-3">
                        <p>
                          💡 <strong>Tip:</strong> Use the Integration Manager to connect your own
                          social media accounts and publishing platforms. Each user manages their
                          own credentials securely.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-4 mt-6 border-t border-border pt-4">
                  <button
                    onClick={handleSaveDraft}
                    disabled={isLoading.save}
                    className="bg-primary/80 hover:bg-primary text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {isLoading.save ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="bg-gradient-to-br from-primary to-accent hover:shadow-neon-primary text-white font-bold py-2 px-4 rounded-lg"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Content Library */}
        <div className="glass-card relative">
          <div className="sparkle"></div>
          <div className="sparkle"></div>
          <div className="sparkle"></div>
          <div className="sparkle"></div>
          <div className="glass-card-inner">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-4xl font-display font-black text-white">📚 Content Library</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 p-2 bg-white/10 rounded-xl border border-white/20 backdrop-filter blur-15">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 rounded-lg transition-all ${
                      viewMode === 'list'
                        ? 'bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white shadow-lg'
                        : 'text-white hover:bg-white/10'
                    }`}
                    aria-label="List view"
                  >
                    <ListIcon />
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`p-3 rounded-lg transition-all ${
                      viewMode === 'calendar'
                        ? 'bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white shadow-lg'
                        : 'text-white hover:bg-white/10'
                    }`}
                    aria-label="Calendar view"
                  >
                    <CalendarIcon />
                  </button>
                </div>
                <button
                  onClick={() => postScheduler.triggerCheck()}
                  className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm rounded-lg border border-green-500/30 transition-all"
                  title="Check for posts to publish now"
                >
                  Check Now
                </button>
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className="space-y-4 max-h-[80vh] overflow-y-auto">
                {allScheduledPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="glass-card p-4 flex justify-between items-center cursor-pointer hover:border-accent transition-all duration-300"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      {post.selectedImage && (
                        <img
                          src={post.selectedImage}
                          alt={post.idea}
                          className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                        />
                      )}
                      <div className="truncate">
                        <p className="font-bold text-lg text-primary-foreground truncate">
                          {post.idea}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {post.scheduleDate
                            ? `Scheduled: ${post.scheduleDate.toLocaleDateString()}`
                            : 'Draft'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      {getStatusPill(post.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <CalendarView
                posts={allScheduledPosts}
                campaigns={campaigns}
                contentSeries={contentSeries}
                audienceProfiles={audienceProfiles}
                optimalTimes={[]}
                onPostClick={handlePostClick}
                onPostReschedule={async (postId, newDate) => {
                  if (!user) return;
                  const update: Partial<Post> = { scheduleDate: newDate };
                  await clientApi.updatePost(user.id, postId, update);
                  setAllScheduledPosts((prev) =>
                    prev.map((p) => (p.id === postId ? { ...p, scheduleDate: newDate } : p))
                  );
                }}
              />
            )}
          </div>
        </div>
      </main>

      {/* Post Details Modal */}
      {showPostDetailsModal && selectedPostForDetails && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"
          onClick={handleCloseDetailsModal}
        >
          <div
            className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border">
              <h3 className="text-2xl font-display text-secondary">
                {selectedPostForDetails.idea}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                {getStatusPill(selectedPostForDetails.status)}
                {selectedPostForDetails.scheduleDate && (
                  <span className="text-sm text-muted-foreground">
                    Scheduled for: {selectedPostForDetails.scheduleDate.toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-grow">
              {selectedPostForDetails.selectedImage && (
                <img
                  src={selectedPostForDetails.selectedImage}
                  alt={selectedPostForDetails.idea}
                  className="rounded-lg w-full object-cover max-h-80 mb-6"
                />
              )}
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: parsedDetailsContent }}
              ></div>
            </div>
            <div className="p-4 bg-muted/30 border-t border-border flex flex-wrap justify-end gap-3">
              <button
                onClick={() => handleOpenSchedulerForExisting(selectedPostForDetails)}
                className="bg-primary/80 hover:bg-primary text-white font-bold py-2 px-4 rounded-lg"
              >
                Reschedule
              </button>
              <button
                onClick={() => populateFormForEditing(selectedPostForDetails)}
                className="bg-primary/80 hover:bg-primary text-white font-bold py-2 px-4 rounded-lg"
              >
                Edit
              </button>
              <button
                onClick={handleStartRepurposing}
                className="bg-secondary/80 hover:bg-secondary text-white font-bold py-2 px-4 rounded-lg"
              >
                Repurpose
              </button>
              <button
                onClick={() => handleDeletePost(selectedPostForDetails.id)}
                className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
              >
                Delete
              </button>
              <button
                onClick={handleCloseDetailsModal}
                className="bg-muted hover:bg-muted/70 text-white font-bold py-2 px-4 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repurpose Modal */}
      {showRepurposeModal && repurposingPost && (
        <RepurposingWorkflow
          post={repurposingPost}
          onClose={() => {
            setShowRepurposeModal(false);
            setRepurposingPost(null);
          }}
          onSuccess={setSuccessMessage}
          onError={setErrorMessage}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"
          onClick={() => setShowScheduleModal(false)}
        >
          <div className="glass-card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-2xl font-display text-secondary mb-4">Schedule Your Post</h3>
              <p className="text-muted-foreground mb-6">
                Select a precise date and time for this post to be published.
              </p>
              <div className="flex flex-col gap-2">
                <label htmlFor="schedule-date" className="font-semibold text-primary-foreground">
                  Publication Date & Time
                </label>
                <input
                  id="schedule-date"
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="bg-muted border border-border rounded-lg px-3 py-2 w-full text-foreground"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>
            <div className="p-4 bg-muted/30 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="bg-muted hover:bg-muted/70 text-white font-bold py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedulePost}
                disabled={isLoading.schedule || !scheduleDate}
                className="flex items-center justify-center gap-2 w-44 bg-gradient-to-br from-primary to-accent hover:shadow-neon-primary text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {isLoading.schedule ? <Spinner /> : null}
                {isLoading.schedule ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {(successMessage || errorMessage) && (
        <div
          className={`fixed bottom-5 right-5 glass-card p-4 rounded-lg border-l-4 ${successMessage ? 'border-secondary' : 'border-red-500'}`}
        >
          <p>{successMessage || errorMessage}</p>
        </div>
      )}

      {/* Integration Manager Modal */}
      <IntegrationManager
        isOpen={showIntegrationManager}
        onClose={() => setShowIntegrationManager(false)}
        userId={user?.id}
      />

      {/* Image Style Manager Modal */}
      {showImageStyleManager && (
        <ImageStyleManager
          onClose={() => setShowImageStyleManager(false)}
          onSuccess={setSuccessMessage}
          onError={setErrorMessage}
          userId={user?.id || ''}
        />
      )}

      {/* Brand Voice Manager Modal */}
      {showBrandVoiceManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Brand Voice Manager</h2>
              <button
                onClick={() => setShowBrandVoiceManager(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-white/60 text-center py-8">
              Brand Voice Manager component will be implemented in a future task.
            </p>
          </div>
        </div>
      )}

      {/* Audience Profile Manager Modal */}
      {showAudienceProfileManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Audience Profile Manager</h2>
              <button
                onClick={() => setShowAudienceProfileManager(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-white/60 text-center py-8">
              Audience Profile Manager component will be implemented in a future task.
            </p>
          </div>
        </div>
      )}

      {/* Campaign Manager Modal */}
      {showCampaignManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-6 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Campaign Manager</h2>
              <button
                onClick={() => setShowCampaignManager(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-white/60 text-center py-8">
              Campaign Manager component will be implemented in a future task.
            </p>
          </div>
        </div>
      )}

      {/* Content Series Manager Modal */}
      {showContentSeriesManager && (
        <ContentSeriesManager
          isOpen={showContentSeriesManager}
          onClose={() => setShowContentSeriesManager(false)}
          posts={allScheduledPosts}
          campaigns={campaigns}
          onPostUpdate={(updated) => {
            setAllScheduledPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }}
        />
      )}

      {/* Template Library Modal */}
      {showTemplateLibrary && user && (
        <TemplateLibrary
          isOpen={showTemplateLibrary}
          onClose={() => setShowTemplateLibrary(false)}
          onSelectTemplate={(template) => {
            setSelectedTemplate(template);
            setSuccessMessage(`Template "${template.name}" selected for content generation.`);
          }}
          onEditTemplate={(template) => {
            setSelectedTemplate(template);
            setShowTemplateLibrary(false);
          }}
          onCreateNew={() => {
            setShowTemplateLibrary(false);
            setSuccessMessage('Template creation coming up...');
          }}
          userId={user.id}
        />
      )}

      {/* Analytics Dashboard Modal */}
      <AnalyticsDashboard
        isOpen={showAnalyticsDashboard}
        onClose={() => setShowAnalyticsDashboard(false)}
        loading={isLoading}
        setLoading={setIsLoading}
      />

      {/* Performance Insights Modal */}
      <PerformanceInsights
        isOpen={showPerformanceInsights}
        onClose={() => setShowPerformanceInsights(false)}
        posts={allScheduledPosts}
        loading={isLoading}
        setLoading={setIsLoading}
      />

      {/* Enhanced Features Dashboard Modal */}
      {showEnhancedFeatures && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-display font-black text-white">
                ⚡ Enhanced Features Dashboard
              </h2>
              <button
                onClick={() => setShowEnhancedFeatures(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Enhanced Features Tabs */}
            <div className="flex flex-wrap border-b border-white/20 mb-6 -mx-2">
              {enhancedFeatureTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveEnhancedTab(tab.id)}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                    activeEnhancedTab === tab.id
                      ? 'text-secondary border-secondary'
                      : 'text-white/60 border-transparent hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Brand & Audience Tab */}
            {activeEnhancedTab === 'personalization' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Brand Voices */}
                <div className="glass-card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Brand Voices</h3>
                    <button
                      onClick={() => setShowBrandVoiceManager(true)}
                      className="bg-secondary/80 hover:bg-secondary text-white py-2 px-4 rounded-lg"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="space-y-3">
                    {brandVoices.slice(0, 3).map((voice) => (
                      <div key={voice.id} className="p-3 bg-white/5 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-white">{voice.name}</h4>
                            <p className="text-sm text-white/60">
                              {voice.tone} • {voice.writingStyle}
                            </p>
                          </div>
                          <button
                            onClick={() => handleBrandVoiceSelect(voice)}
                            className={`text-xs px-2 py-1 rounded ${
                              selectedBrandVoice?.id === voice.id
                                ? 'bg-secondary text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                          >
                            {selectedBrandVoice?.id === voice.id ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {brandVoices.length === 0 && (
                      <p className="text-white/60 text-center py-4">
                        No brand voices created yet. Click &quot;Manage&quot; to create your first
                        one.
                      </p>
                    )}
                  </div>
                </div>

                {/* Audience Profiles */}
                <div className="glass-card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Audience Profiles</h3>
                    <button
                      onClick={() => setShowAudienceProfileManager(true)}
                      className="bg-secondary/80 hover:bg-secondary text-white py-2 px-4 rounded-lg"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="space-y-3">
                    {audienceProfiles.slice(0, 3).map((profile) => (
                      <div key={profile.id} className="p-3 bg-white/5 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-white">{profile.name}</h4>
                            <p className="text-sm text-white/60">
                              {profile.industry} • {profile.ageRange}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAudienceProfileSelect(profile)}
                            className={`text-xs px-2 py-1 rounded ${
                              selectedAudienceProfile?.id === profile.id
                                ? 'bg-secondary text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                          >
                            {selectedAudienceProfile?.id === profile.id ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {audienceProfiles.length === 0 && (
                      <p className="text-white/60 text-center py-4">
                        No audience profiles created yet. Click &quot;Manage&quot; to create your
                        first one.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Campaigns & Series Tab */}
            {activeEnhancedTab === 'campaigns' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Campaigns */}
                <div className="glass-card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Campaigns</h3>
                    <button
                      onClick={() => setShowCampaignManager(true)}
                      className="bg-secondary/80 hover:bg-secondary text-white py-2 px-4 rounded-lg"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="space-y-3">
                    {campaigns.slice(0, 3).map((campaign) => (
                      <div key={campaign.id} className="p-3 bg-white/5 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-white">{campaign.name}</h4>
                            <p className="text-sm text-white/60">{campaign.theme}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  campaign.status === 'active'
                                    ? 'bg-green-500/20 text-green-400'
                                    : campaign.status === 'draft'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-gray-500/20 text-gray-400'
                                }`}
                              >
                                {campaign.status}
                              </span>
                              <span className="text-xs text-white/60">
                                {campaign.posts.length} posts
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCampaignSelect(campaign)}
                            className={`text-xs px-2 py-1 rounded ${
                              selectedCampaign?.id === campaign.id
                                ? 'bg-secondary text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                          >
                            {selectedCampaign?.id === campaign.id ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {campaigns.length === 0 && (
                      <p className="text-white/60 text-center py-4">
                        No campaigns created yet. Click &quot;Manage&quot; to create your first one.
                      </p>
                    )}
                  </div>
                </div>

                {/* Content Series */}
                <div className="glass-card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Content Series</h3>
                    <button
                      onClick={() => setShowContentSeriesManager(true)}
                      className="bg-secondary/80 hover:bg-secondary text-white py-2 px-4 rounded-lg"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="space-y-3">
                    {contentSeries.slice(0, 3).map((series) => (
                      <div key={series.id} className="p-3 bg-white/5 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{series.name}</h4>
                            <p className="text-sm text-white/60">{series.theme}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-white/60">
                                {series.currentPost}/{series.totalPosts} • {series.frequency}
                              </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                              <div
                                className="bg-secondary h-1 rounded-full transition-all duration-300"
                                style={{
                                  width: `${(series.currentPost / series.totalPosts) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => handleContentSeriesSelect(series)}
                            className={`text-xs px-2 py-1 rounded ml-2 ${
                              selectedContentSeries?.id === series.id
                                ? 'bg-secondary text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                          >
                            {selectedContentSeries?.id === series.id ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {contentSeries.length === 0 && (
                      <p className="text-white/60 text-center py-4">
                        No content series created yet. Click &quot;Manage&quot; to create your first
                        one.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Analytics & Insights Tab */}
            {activeEnhancedTab === 'analytics' && (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Performance Analytics</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowAnalyticsDashboard(true)}
                        className="bg-blue-600/80 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
                      >
                        📊 Dashboard
                      </button>
                      <button
                        onClick={() => setShowPerformanceInsights(true)}
                        className="bg-purple-600/80 hover:bg-purple-600 text-white py-2 px-4 rounded-lg"
                      >
                        💡 Insights
                      </button>
                      <button
                        onClick={() => generatePerformanceReport('30d')}
                        disabled={isLoading.performanceReport}
                        className="bg-secondary/80 hover:bg-secondary text-white py-2 px-4 rounded-lg disabled:opacity-50"
                      >
                        {isLoading.performanceReport ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          'Generate Report'
                        )}
                      </button>
                    </div>
                  </div>
                  {performanceReport ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/5 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-secondary">
                          {performanceReport.totalPosts}
                        </div>
                        <div className="text-sm text-white/60">Total Posts</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-secondary">
                          {performanceReport.totalEngagement}
                        </div>
                        <div className="text-sm text-white/60">Total Engagement</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-secondary">
                          {performanceReport.avgEngagementRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-white/60">Avg Engagement Rate</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/60 text-center py-8">
                      Click &quot;Generate Report&quot; to see your content performance analytics.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Template Library Tab */}
            {activeEnhancedTab === 'templates' && (
              <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Template Library</h3>
                  <button
                    onClick={() => setShowTemplateLibrary(true)}
                    className="bg-secondary/80 hover:bg-secondary text-white py-2 px-4 rounded-lg"
                  >
                    Browse Library
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contentTemplates.slice(0, 6).map((template) => (
                    <div key={template.id} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white">{template.name}</h4>
                        <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded">
                          {template.contentType}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 mb-3">{template.category}</p>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-white/60">
                          Used {template.usageCount} times
                        </div>
                        <button
                          onClick={() => handleTemplateSelect(template)}
                          className={`text-xs px-2 py-1 rounded ${
                            selectedTemplate?.id === template.id
                              ? 'bg-secondary text-white'
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          {selectedTemplate?.id === template.id ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {contentTemplates.length === 0 && (
                    <div className="col-span-full text-white/60 text-center py-8">
                      No templates available yet. Click &quot;Browse Library&quot; to explore
                      templates.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Smart Scheduling Tab */}
            {activeEnhancedTab === 'scheduling' && (
              <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Smart Scheduling</h3>
                  <button
                    onClick={generateSchedulingSuggestions}
                    disabled={isLoading.schedulingSuggestions}
                    className="bg-secondary/80 hover:bg-secondary text-white py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {isLoading.schedulingSuggestions ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      'Get Suggestions'
                    )}
                  </button>
                </div>
                {schedulingSuggestions.length > 0 ? (
                  <div className="space-y-3">
                    {schedulingSuggestions.map((suggestion, index) => (
                      <div key={index} className="p-4 bg-white/5 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-white">{suggestion.platform}</h4>
                            <p className="text-sm text-white/60">
                              {suggestion.suggestedTime.toLocaleDateString()} at{' '}
                              {suggestion.suggestedTime.toLocaleTimeString()}
                            </p>
                            <p className="text-xs text-white/60 mt-1">{suggestion.reason}</p>
                          </div>
                          <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded">
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/60 text-center py-8">
                    Click &quot;Get Suggestions&quot; to see optimal posting times based on your
                    audience engagement patterns.
                  </p>
                )}
              </div>
            )}

            {/* Content Builder Tab */}
            {activeEnhancedTab === 'contentbuilder' && (
              <div className="space-y-6">
                <DragDropContentBuilder
                  initialBlocks={contentBuilderBlocks}
                  onContentChange={(blocks) => setContentBuilderBlocks(blocks)}
                  onSave={(content) => {
                    setBlogPost(content);
                    setShowEnhancedFeatures(false);
                    setSuccessMessage('Content imported from builder! ✨');
                  }}
                />
              </div>
            )}

            {/* Gamification Tab */}
            {activeEnhancedTab === 'gamification' && (
              <div className="space-y-6">
                <GamificationSystem
                  userId={user?.id || 'anonymous'}
                  onAchievementUnlocked={(achievement) => {
                    setSuccessMessage(
                      `🎉 Achievement Unlocked: ${achievement.title}! +${achievement.points} points ✨`
                    );
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice Commands - Always Available */}
      {user && (
        <VoiceCommands
          onCreatePost={(topic) => {
            setCurrentBlogTopic(topic);
            if (topic) {
              handleGenerateIdeas();
            }
            // Track for gamification
            aiLearningService.recordInteraction({
              userId: user.id,
              type: 'content_generated',
              data: { topic, timestamp: new Date() },
            });
          }}
          onGenerateIdeas={(topic) => {
            setCurrentBlogTopic(topic);
            handleGenerateIdeas();
          }}
          onOpenSettings={() => setShowEnhancedFeatures(true)}
          onNavigate={(page) => {
            if (page === 'analytics') setActiveEnhancedTab('analytics');
            if (page === 'calendar') setViewMode('calendar');
            setShowEnhancedFeatures(true);
          }}
          onToggleTheme={() => {
            // This would integrate with your theme system
            setSuccessMessage('Theme toggled! ✨');
          }}
        />
      )}
    </div>
  );
};

export default App;
