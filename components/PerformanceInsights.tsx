import React, { useState, useEffect } from 'react';
import {
  ContentInsight,
  OptimizationSuggestion,
  Post,
  AnalyticsData,
  LoadingState,
} from '../types';
// import { analyticsService } from '../services/analyticsService';
import { Spinner } from '../constants';

interface PerformanceInsightsProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
  loading: LoadingState;
  setLoading: (loading: LoadingState) => void;
}

export const PerformanceInsights: React.FC<PerformanceInsightsProps> = ({
  isOpen,
  onClose,
  posts,
  loading,
  setLoading,
}) => {
  const [topContent, setTopContent] = useState<ContentInsight[]>([]);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>(
    []
  );
  const [selectedPost, setSelectedPost] = useState<string>('');
  const [postInsights, setPostInsights] = useState<{
    analytics: AnalyticsData[];
    insights: string[];
    recommendations: OptimizationSuggestion[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'top-content' | 'recommendations' | 'post-analysis'
  >('overview');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadInsights();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPost) {
      loadPostInsights();
    }
  }, [selectedPost]);

  const loadInsights = async () => {
    try {
      setLoading({ ...loading, analytics: true });
      setError('');

      // Load top performing content
      const topPerforming = await analyticsService.identifyTopPerformingContent('month', 10);
      setTopContent(topPerforming);

      // Load optimization suggestions
      const suggestions = await analyticsService.generateOptimizationRecommendations('month');
      setOptimizationSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading insights:', error);
      setError('Failed to load performance insights. Please try again.');
    } finally {
      setLoading({ ...loading, analytics: false });
    }
  };

  const loadPostInsights = async () => {
    if (!selectedPost) return;

    try {
      setLoading({ ...loading, optimizationSuggestions: true });
      const insights = await analyticsService.getPostInsights(selectedPost);
      setPostInsights(insights);
    } catch (error) {
      console.error('Error loading post insights:', error);
      setError('Failed to load post insights.');
    } finally {
      setLoading({ ...loading, optimizationSuggestions: false });
    }
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low'): string => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
    }
  };

  const getEffortColor = (effort: 'high' | 'medium' | 'low'): string => {
    switch (effort) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'timing':
        return '⏰';
      case 'content':
        return '📝';
      case 'hashtags':
        return '#️⃣';
      case 'format':
        return '🎨';
      default:
        return '💡';
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Insights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">🏆</span>
            <h3 className="font-semibold text-gray-900">Top Performers</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">{topContent.length}</p>
          <p className="text-sm text-gray-600">High-performing posts identified</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">💡</span>
            <h3 className="font-semibold text-gray-900">Opportunities</h3>
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {optimizationSuggestions.filter((s) => s.impact === 'high').length}
          </p>
          <p className="text-sm text-gray-600">High-impact improvements</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">📈</span>
            <h3 className="font-semibold text-gray-900">Quick Wins</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {optimizationSuggestions.filter((s) => s.effort === 'low').length}
          </p>
          <p className="text-sm text-gray-600">Low-effort optimizations</p>
        </div>
      </div>

      {/* Recent Insights */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Insights</h3>
        {topContent.slice(0, 3).map((content, index) => (
          <div
            key={content.postId}
            className="flex items-start space-x-3 py-3 border-b last:border-b-0"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{content.title}</p>
              <p className="text-sm text-gray-600 mt-1">
                {content.insights.slice(0, 2).join('. ')}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
                  {content.platform}
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Score: {content.engagementScore.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTopContentTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Top Performing Content</h3>
        <span className="text-sm text-gray-600">{topContent.length} posts analyzed</span>
      </div>

      {topContent.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-gray-600">No performance data available yet</p>
          <p className="text-sm text-gray-500 mt-1">Publish some content to see top performers</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topContent.map((content, index) => (
            <div
              key={content.postId}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">#{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">{content.title}</h4>
                    <div className="flex items-center space-x-4 mb-3">
                      <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
                        {content.platform}
                      </span>
                      <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {content.contentType}
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        Score: {content.engagementScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {content.insights.map((insight, idx) => (
                        <p key={idx} className="text-sm text-gray-600 flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {insight}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRecommendationsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Optimization Recommendations</h3>
        <span className="text-sm text-gray-600">{optimizationSuggestions.length} suggestions</span>
      </div>

      {optimizationSuggestions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <p className="text-gray-600">No recommendations available</p>
          <p className="text-sm text-gray-500 mt-1">
            Create more content to get personalized suggestions
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {optimizationSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 text-2xl">{getTypeIcon(suggestion.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getImpactColor(suggestion.impact)}`}
                      >
                        {suggestion.impact} impact
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getEffortColor(suggestion.effort)}`}
                      >
                        {suggestion.effort} effort
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{suggestion.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPostAnalysisTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Individual Post Analysis</h3>
      </div>

      {/* Post Selector */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select a post to analyze:
        </label>
        <select
          value={selectedPost}
          onChange={(e) => setSelectedPost(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a post...</option>
          {posts
            .filter((post) => post.status === 'posted')
            .map((post) => (
              <option key={post.id} value={post.id}>
                {post.topic} (
                {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'No date'})
              </option>
            ))}
        </select>
      </div>

      {/* Post Insights */}
      {loading.optimizationSuggestions ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
          <span className="ml-2 text-gray-600">Analyzing post...</span>
        </div>
      ) : postInsights ? (
        <div className="space-y-4">
          {/* Analytics Data */}
          {postInsights.analytics.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Performance Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {postInsights.analytics.map((analytics, index) => (
                  <div key={index} className="text-center">
                    <p className="text-sm text-gray-600 capitalize">{analytics.platform}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Likes:</span>
                        <span className="font-medium">{analytics.likes}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Shares:</span>
                        <span className="font-medium">{analytics.shares}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Comments:</span>
                        <span className="font-medium">{analytics.comments}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Clicks:</span>
                        <span className="font-medium">{analytics.clicks}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Insights */}
          {postInsights.insights.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Content Insights</h4>
              <div className="space-y-2">
                {postInsights.insights.map((insight, index) => (
                  <p key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Post-Specific Recommendations */}
          {postInsights.recommendations.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Recommendations for This Post</h4>
              <div className="space-y-3">
                {postInsights.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 text-lg">{getTypeIcon(rec.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-medium text-gray-900">{rec.title}</h5>
                        <div className="flex items-center space-x-1">
                          <span
                            className={`text-xs px-2 py-1 rounded ${getImpactColor(rec.impact)}`}
                          >
                            {rec.impact}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : selectedPost ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No insights available for this post</p>
          <p className="text-sm text-gray-500 mt-1">Analytics data may not be available yet</p>
        </div>
      ) : null}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Performance Insights</h2>
            <p className="text-sm text-gray-600">
              Content analysis and optimization recommendations
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'top-content', label: 'Top Content', icon: '🏆' },
              { id: 'recommendations', label: 'Recommendations', icon: '💡' },
              { id: 'post-analysis', label: 'Post Analysis', icon: '🔍' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading.analytics ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-2 text-gray-600">Loading insights...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadInsights}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'top-content' && renderTopContentTab()}
              {activeTab === 'recommendations' && renderRecommendationsTab()}
              {activeTab === 'post-analysis' && renderPostAnalysisTab()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
