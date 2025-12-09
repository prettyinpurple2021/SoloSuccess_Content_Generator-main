import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  X,
  Search,
  ChevronRight,
  Book,
  Video,
  MessageCircle,
  ExternalLink,
  Lightbulb,
  Target,
  BarChart3,
  Calendar,
  Palette,
  Users,
  Zap,
} from 'lucide-react';
import {
  HoloCard,
  HoloButton,
  HoloText,
  HoloInput,
  SparkleEffect,
  FloatingSkull,
} from './HolographicTheme';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
}

interface HelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  initialArticle?: string;
}

export const HelpSystem: React.FC<HelpSystemProps> = ({
  isOpen,
  onClose,
  initialCategory,
  initialArticle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'getting-started');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(initialArticle || null);
  const [showSearch, setShowSearch] = useState(false);

  const categories = [
    { id: 'getting-started', name: 'Getting Started', icon: <Lightbulb className="w-5 h-5" /> },
    { id: 'brand-voice', name: 'Brand Voice', icon: <Target className="w-5 h-5" /> },
    { id: 'campaigns', name: 'Campaigns', icon: <Calendar className="w-5 h-5" /> },
    { id: 'analytics', name: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'templates', name: 'Templates', icon: <Palette className="w-5 h-5" /> },
    { id: 'audience', name: 'Audience Profiles', icon: <Users className="w-5 h-5" /> },
    { id: 'advanced', name: 'Advanced Features', icon: <Zap className="w-5 h-5" /> },
  ];

  const articles: HelpArticle[] = [
    // Getting Started
    {
      id: 'welcome',
      title: 'Welcome to Enhanced Features',
      description: 'Overview of new capabilities and how to get started',
      category: 'getting-started',
      icon: <Lightbulb className="w-5 h-5" />,
      tags: ['overview', 'introduction', 'features'],
      difficulty: 'beginner',
      estimatedTime: '3 min',
      content: (
        <div className="space-y-4">
          <p>
            Welcome to the enhanced content creation features! These new tools will help you create
            more engaging, personalized content.
          </p>

          <h3 className="text-lg font-semibold">Key Features:</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Target className="w-4 h-4 text-blue-500 mt-1" />
              <div>
                <strong>Brand Voice:</strong> Define your unique tone and style for consistent
                content
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Users className="w-4 h-4 text-purple-500 mt-1" />
              <div>
                <strong>Audience Profiles:</strong> Create detailed profiles for targeted content
                generation
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-green-500 mt-1" />
              <div>
                <strong>Campaigns:</strong> Organize content into coordinated campaigns and series
              </div>
            </li>
            <li className="flex items-start gap-2">
              <BarChart3 className="w-4 h-4 text-red-500 mt-1" />
              <div>
                <strong>Analytics:</strong> Track performance and get optimization insights
              </div>
            </li>
          </ul>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Quick Start:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Create your first brand voice</li>
              <li>2. Set up an audience profile</li>
              <li>3. Start a campaign to organize your content</li>
              <li>4. Monitor performance in the analytics dashboard</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'first-steps',
      title: 'Your First 5 Minutes',
      description: 'Quick setup guide to get the most out of enhanced features',
      category: 'getting-started',
      icon: <Zap className="w-5 h-5" />,
      tags: ['setup', 'quick-start', 'tutorial'],
      difficulty: 'beginner',
      estimatedTime: '5 min',
      content: (
        <div className="space-y-4">
          <p>Get up and running with enhanced features in just 5 minutes:</p>

          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium">Step 1: Create a Brand Voice (2 min)</h4>
              <p className="text-sm text-gray-600">
                Go to Brand Voice Manager and create your first voice profile. This will improve all
                AI-generated content.
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-medium">Step 2: Set Up Audience Profile (1 min)</h4>
              <p className="text-sm text-gray-600">
                Define who you're writing for in the Audience Profile Manager for more targeted
                content.
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium">Step 3: Create Your First Campaign (1 min)</h4>
              <p className="text-sm text-gray-600">
                Organize your content with campaigns for better coordination and tracking.
              </p>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-medium">Step 4: Generate Enhanced Content (1 min)</h4>
              <p className="text-sm text-gray-600">
                Create new content using your brand voice and audience profile for personalized
                results.
              </p>
            </div>
          </div>
        </div>
      ),
    },

    // Brand Voice
    {
      id: 'brand-voice-basics',
      title: 'Understanding Brand Voice',
      description: 'Learn how to create and use brand voices effectively',
      category: 'brand-voice',
      icon: <Target className="w-5 h-5" />,
      tags: ['brand-voice', 'tone', 'style', 'consistency'],
      difficulty: 'beginner',
      estimatedTime: '4 min',
      content: (
        <div className="space-y-4">
          <p>
            Brand voice defines how your content sounds and feels to your audience. It ensures
            consistency across all your communications.
          </p>

          <h3 className="text-lg font-semibold">What Makes a Good Brand Voice?</h3>
          <ul className="space-y-2">
            <li>
              <strong>Tone:</strong> Professional, casual, friendly, authoritative, etc.
            </li>
            <li>
              <strong>Vocabulary:</strong> Industry terms, casual language, technical jargon
            </li>
            <li>
              <strong>Style:</strong> Sentence structure, paragraph length, formatting preferences
            </li>
            <li>
              <strong>Personality:</strong> Humorous, serious, encouraging, direct
            </li>
          </ul>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">💡 Pro Tip:</h4>
            <p className="text-sm text-yellow-800">
              Include 3-5 sample pieces of content that represent your ideal voice. The AI will
              learn from these examples.
            </p>
          </div>

          <h3 className="text-lg font-semibold">Creating Your Brand Voice:</h3>
          <ol className="space-y-2">
            <li>1. Click "Brand Voice Manager" in the main interface</li>
            <li>2. Choose a descriptive name for your voice</li>
            <li>3. Select your primary tone</li>
            <li>4. Add sample content that represents your style</li>
            <li>5. Save and start using it in content generation</li>
          </ol>
        </div>
      ),
    },

    // Campaigns
    {
      id: 'campaign-basics',
      title: 'Creating Effective Campaigns',
      description: 'Learn how to organize and coordinate your content with campaigns',
      category: 'campaigns',
      icon: <Calendar className="w-5 h-5" />,
      tags: ['campaigns', 'organization', 'coordination', 'series'],
      difficulty: 'beginner',
      estimatedTime: '5 min',
      content: (
        <div className="space-y-4">
          <p>
            Campaigns help you organize related content pieces and track their collective
            performance.
          </p>

          <h3 className="text-lg font-semibold">When to Use Campaigns:</h3>
          <ul className="space-y-2">
            <li>• Product launches or announcements</li>
            <li>• Educational content series</li>
            <li>• Seasonal or event-based content</li>
            <li>• Multi-platform content coordination</li>
          </ul>

          <h3 className="text-lg font-semibold">Campaign Structure:</h3>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div>
                <strong>Campaign:</strong> Overall theme or goal
              </div>
              <div className="ml-4">
                <strong>↳ Content Series:</strong> Related posts within the campaign
              </div>
              <div className="ml-8">
                <strong>↳ Individual Posts:</strong> Specific content pieces
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold">Best Practices:</h3>
          <ul className="space-y-2">
            <li>• Keep campaigns focused on a single theme or goal</li>
            <li>• Plan 5-10 pieces of content per campaign</li>
            <li>• Use consistent messaging across all platforms</li>
            <li>• Monitor performance and adjust strategy</li>
          </ul>
        </div>
      ),
    },

    // Analytics
    {
      id: 'analytics-overview',
      title: 'Understanding Your Analytics',
      description: 'Learn how to read and act on your content performance data',
      category: 'analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      tags: ['analytics', 'performance', 'metrics', 'insights'],
      difficulty: 'intermediate',
      estimatedTime: '6 min',
      content: (
        <div className="space-y-4">
          <p>
            Analytics help you understand what content works best and how to improve your strategy.
          </p>

          <h3 className="text-lg font-semibold">Key Metrics:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900">Engagement Rate</h4>
              <p className="text-sm text-blue-800">
                Likes, shares, comments divided by impressions
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-medium text-green-900">Reach</h4>
              <p className="text-sm text-green-800">Total unique users who saw your content</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <h4 className="font-medium text-purple-900">Click-through Rate</h4>
              <p className="text-sm text-purple-800">Clicks divided by impressions</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <h4 className="font-medium text-red-900">Performance Score</h4>
              <p className="text-sm text-red-800">Overall content effectiveness (0-10)</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold">Using Insights:</h3>
          <ul className="space-y-2">
            <li>• Identify your top-performing content types</li>
            <li>• Find optimal posting times for each platform</li>
            <li>• Compare campaign performance</li>
            <li>• Get AI-powered optimization suggestions</li>
          </ul>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">📊 Reading the Dashboard:</h4>
            <p className="text-sm text-yellow-800">
              Focus on trends rather than individual post performance. Look for patterns in your
              top-performing content and replicate those elements.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const filteredArticles = articles.filter((article) => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const selectedArticleData = selectedArticle
    ? articles.find((a) => a.id === selectedArticle)
    : null;

  useEffect(() => {
    if (initialArticle) {
      setSelectedArticle(initialArticle);
    }
  }, [initialArticle]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <HoloCard className="max-w-6xl w-full max-h-[90vh] overflow-hidden flex">
        <SparkleEffect count={12} size="medium" />
        <FloatingSkull className="absolute top-4 right-4" size="small" />

        {/* Sidebar */}
        <div className="w-80 border-r border-white/20 flex flex-col bg-glass-purple">
          {/* Header */}
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between mb-4">
              <HoloText variant="subtitle" glow className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Help & Guides ✨
              </HoloText>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <HoloInput
                placeholder="Search help articles... 🔍"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSelectedArticle(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category.icon}
                    <span className="font-medium">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Articles List */}
            <div className="border-t border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {searchQuery ? 'Search Results' : 'Articles'}
              </h3>
              <div className="space-y-2">
                {filteredArticles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedArticle === article.id
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">{article.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm mb-1">{article.title}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">{article.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              article.difficulty === 'beginner'
                                ? 'bg-green-100 text-green-700'
                                : article.difficulty === 'intermediate'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {article.difficulty}
                          </span>
                          <span className="text-xs text-gray-500">{article.estimatedTime}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedArticleData ? (
            <>
              {/* Article Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">{selectedArticleData.icon}</div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedArticleData.title}
                    </h1>
                    <p className="text-gray-600 mb-4">{selectedArticleData.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span
                        className={`px-2 py-1 rounded-full ${
                          selectedArticleData.difficulty === 'beginner'
                            ? 'bg-green-100 text-green-700'
                            : selectedArticleData.difficulty === 'intermediate'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {selectedArticleData.difficulty}
                      </span>
                      <span>📖 {selectedArticleData.estimatedTime} read</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Article Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose max-w-none">{selectedArticleData.content}</div>

                {/* Tags */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedArticleData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Welcome Screen */
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Help Center</h2>
                <p className="text-gray-600 mb-6">
                  Select a category or search for specific topics to get started with enhanced
                  features.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedArticle('welcome')}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <Lightbulb className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-sm font-medium">Quick Start</div>
                  </button>
                  <button
                    onClick={() => setSelectedArticle('first-steps')}
                    className="p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                  >
                    <Zap className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <div className="text-sm font-medium">First Steps</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </HoloCard>
    </div>
  );
};

/**
 * Floating help button component
 */
export const HelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-12 h-12 glass-card bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40 flex items-center justify-center sparkles neon-glow"
      title="Help & Guides ✨"
    >
      <HelpCircle className="w-6 h-6" />
      <SparkleEffect count={2} size="small" />
    </button>
  );
};

/**
 * Hook for managing help system state
 */
export const useHelpSystem = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialCategory, setInitialCategory] = useState<string>();
  const [initialArticle, setInitialArticle] = useState<string>();

  const openHelp = (category?: string, article?: string) => {
    setInitialCategory(category);
    setInitialArticle(article);
    setIsOpen(true);
  };

  const closeHelp = () => {
    setIsOpen(false);
    setInitialCategory(undefined);
    setInitialArticle(undefined);
  };

  return {
    isOpen,
    openHelp,
    closeHelp,
    initialCategory,
    initialArticle,
  };
};

export default HelpSystem;
