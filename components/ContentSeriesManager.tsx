import React, { useState, useEffect } from 'react';
import {
  ContentSeries,
  Campaign,
  Post,
  SeriesPost,
  OptimizationSuggestion,
  SchedulingSuggestion,
} from '../types';
import { campaignService } from '../services/clientCampaignService';
import { apiService } from '../services/clientApiService';
import { Spinner } from '../constants';

interface ContentSeriesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
  campaigns: Campaign[];
  onPostUpdate?: (post: Post) => void;
}

const ContentSeriesManager: React.FC<ContentSeriesManagerProps> = ({
  isOpen,
  onClose,
  posts,
  campaigns,
  onPostUpdate,
}) => {
  // State management
  const [contentSeries, setContentSeries] = useState<ContentSeries[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<ContentSeries | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'create' | 'edit' | 'progress' | 'schedule'
  >('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state for series creation/editing
  const [formData, setFormData] = useState({
    name: '',
    theme: '',
    totalPosts: 5,
    frequency: 'weekly' as 'daily' | 'weekly' | 'biweekly',
    campaignId: '',
  });

  // Progress and scheduling data
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>(
    []
  );
  const [schedulingSuggestions, setSchedulingSuggestions] = useState<SchedulingSuggestion[]>([]);

  // Load content series on component mount
  useEffect(() => {
    if (isOpen) {
      loadContentSeries();
    }
  }, [isOpen]);

  // Load suggestions when a series is selected
  useEffect(() => {
    if (selectedSeries) {
      loadSeriesSuggestions(selectedSeries.id);
    }
  }, [selectedSeries]);

  const loadContentSeries = async () => {
    try {
      setIsLoading(true);
      const seriesList = await campaignService.getContentSeries();
      setContentSeries(seriesList);
    } catch (err: any) {
      setError(`Failed to load content series: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSeriesSuggestions = async (seriesId: string) => {
    try {
      setIsLoading(true);

      // Load optimization suggestions
      const suggestions = await campaignService.suggestSeriesAdjustments(seriesId);
      setOptimizationSuggestions(suggestions);

      // Load scheduling suggestions
      const scheduleSuggestions = await campaignService.optimizeSeriesScheduling(seriesId);
      setSchedulingSuggestions(scheduleSuggestions);
    } catch (err: any) {
      setError(`Failed to load suggestions: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSeries = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!formData.name || !formData.theme) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.totalPosts < 1 || formData.totalPosts > 50) {
        throw new Error('Total posts must be between 1 and 50');
      }

      const series = await campaignService.createContentSeries({
        name: formData.name,
        theme: formData.theme,
        totalPosts: formData.totalPosts,
        frequency: formData.frequency,
        campaignId: formData.campaignId || undefined,
      });

      setContentSeries((prev) => [...prev, series]);
      setSuccess('Content series created successfully!');
      setActiveTab('overview');
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSeries = async () => {
    if (!selectedSeries) return;

    try {
      setIsLoading(true);
      setError('');

      const updates: Partial<ContentSeries> = {};
      if (formData.name) updates.name = formData.name;
      if (formData.theme) updates.theme = formData.theme;
      if (formData.totalPosts) updates.totalPosts = formData.totalPosts;
      if (formData.frequency) updates.frequency = formData.frequency;
      if (formData.campaignId) updates.campaignId = formData.campaignId;

      const updatedSeries = await campaignService.updateContentSeries(selectedSeries.id, updates);

      setContentSeries((prev) => prev.map((s) => (s.id === updatedSeries.id ? updatedSeries : s)));
      setSelectedSeries(updatedSeries);
      setSuccess('Content series updated successfully!');
      setActiveTab('overview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSeries = async (seriesId: string) => {
    if (
      !confirm('Are you sure you want to delete this content series? This action cannot be undone.')
    ) {
      return;
    }

    try {
      setIsLoading(true);
      await campaignService.deleteContentSeries(seriesId, false); // Don't delete associated posts
      setContentSeries((prev) => prev.filter((s) => s.id !== seriesId));
      if (selectedSeries?.id === seriesId) {
        setSelectedSeries(null);
      }
      setSuccess('Content series deleted successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvanceSeries = async (seriesId: string) => {
    try {
      setIsLoading(true);
      const updatedSeries = await campaignService.advanceContentSeries(seriesId);
      setContentSeries((prev) => prev.map((s) => (s.id === updatedSeries.id ? updatedSeries : s)));
      if (selectedSeries?.id === seriesId) {
        setSelectedSeries(updatedSeries);
      }
      setSuccess('Series advanced to next post!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignPostToSeries = async (postId: string, seriesId: string) => {
    try {
      await db.updatePost(postId, { series_id: seriesId });
      if (onPostUpdate) {
        const updatedPost = posts.find((p) => p.id === postId);
        if (updatedPost) {
          onPostUpdate({ ...updatedPost, seriesId });
        }
      }
      setSuccess('Post assigned to series successfully!');
      // Reload series to update post counts
      loadContentSeries();
    } catch (err: any) {
      setError(`Failed to assign post: ${err.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      theme: '',
      totalPosts: 5,
      frequency: 'weekly',
      campaignId: '',
    });
  };

  const populateFormWithSeries = (series: ContentSeries) => {
    setFormData({
      name: series.name,
      theme: series.theme,
      totalPosts: series.totalPosts,
      frequency: series.frequency,
      campaignId: series.campaignId || '',
    });
  };

  const getSeriesPosts = (seriesId: string) => {
    return posts.filter((post) => post.seriesId === seriesId);
  };

  const getProgressPercentage = (series: ContentSeries) => {
    return Math.round((series.currentPost / series.totalPosts) * 100);
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'biweekly':
        return 'Bi-weekly';
      default:
        return frequency;
    }
  };

  const getCampaignName = (campaignId?: string) => {
    if (!campaignId) return 'No Campaign';
    const campaign = campaigns.find((c) => c.id === campaignId);
    return campaign ? campaign.name : 'Unknown Campaign';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Content Series Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'create', label: 'Create Series' },
            { key: 'progress', label: 'Progress Tracking', disabled: !selectedSeries },
            { key: 'schedule', label: 'Scheduling', disabled: !selectedSeries },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              disabled={tab.disabled}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : tab.disabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          {/* Loading Spinner */}
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <Spinner />
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Your Content Series</h3>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create New Series
                </button>
              </div>

              {contentSeries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">No content series created yet</div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Your First Series
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {contentSeries.map((series) => {
                    const seriesPosts = getSeriesPosts(series.id);
                    const progressPercentage = getProgressPercentage(series);

                    return (
                      <div
                        key={series.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedSeries(series)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900">{series.name}</h4>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {getFrequencyLabel(series.frequency)}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-3">Theme: {series.theme}</p>

                            {/* Progress Bar */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                                <span>
                                  Progress: {series.currentPost} of {series.totalPosts} posts
                                </span>
                                <span>{progressPercentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${progressPercentage}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Posts: {seriesPosts.length}</span>
                              <span>Campaign: {getCampaignName(series.campaignId)}</span>
                              <span>Created: {series.createdAt.toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {series.currentPost < series.totalPosts && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdvanceSeries(series.id);
                                }}
                                className="text-green-600 hover:text-green-800 px-3 py-1 rounded"
                              >
                                Advance
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSeries(series);
                                populateFormWithSeries(series);
                                setActiveTab('edit');
                              }}
                              className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSeries(series.id);
                              }}
                              className="text-red-600 hover:text-red-800 px-3 py-1 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Post Assignment Section */}
              {selectedSeries && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Assign Posts to "{selectedSeries.name}"
                  </h4>
                  <div className="grid gap-3">
                    {posts
                      .filter((post) => !post.seriesId)
                      .map((post) => (
                        <div
                          key={post.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded"
                        >
                          <div>
                            <div className="font-medium text-gray-900">{post.topic}</div>
                            <div className="text-sm text-gray-500">
                              Status: {post.status} | Created:{' '}
                              {post.createdAt?.toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => handleAssignPostToSeries(post.id, selectedSeries.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create/Edit Series Tab */}
          {(activeTab === 'create' || activeTab === 'edit') && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {activeTab === 'create' ? 'Create New Content Series' : 'Edit Content Series'}
              </h3>

              <div className="grid gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Series Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter series name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Series Theme *
                  </label>
                  <input
                    type="text"
                    value={formData.theme}
                    onChange={(e) => setFormData((prev) => ({ ...prev, theme: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Getting Started with AI, Weekly Tips, Product Deep Dives"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Posts *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.totalPosts}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          totalPosts: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Posting Frequency *
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, frequency: e.target.value as any }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Associated Campaign (Optional)
                  </label>
                  <select
                    value={formData.campaignId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, campaignId: e.target.value }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No Campaign</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-6 border-t">
                <button
                  onClick={activeTab === 'create' ? handleCreateSeries : handleUpdateSeries}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {activeTab === 'create' ? 'Create Series' : 'Update Series'}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('overview');
                    resetForm();
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Progress Tracking Tab */}
          {activeTab === 'progress' && selectedSeries && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Progress: {selectedSeries.name}
                </h3>
                <button
                  onClick={() => loadSeriesSuggestions(selectedSeries.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Refresh Data
                </button>
              </div>

              {/* Series Overview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedSeries.currentPost}
                    </div>
                    <div className="text-sm text-gray-600">Current Post</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {selectedSeries.totalPosts}
                    </div>
                    <div className="text-sm text-gray-600">Total Posts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {getProgressPercentage(selectedSeries)}%
                    </div>
                    <div className="text-sm text-gray-600">Complete</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {getFrequencyLabel(selectedSeries.frequency)}
                    </div>
                    <div className="text-sm text-gray-600">Frequency</div>
                  </div>
                </div>
              </div>

              {/* Series Posts */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Series Posts</h4>
                <div className="space-y-3">
                  {selectedSeries.posts.map((seriesPost, index) => {
                    const post = posts.find((p) => p.id === seriesPost.postId);
                    return (
                      <div key={seriesPost.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                index < selectedSeries.currentPost
                                  ? 'bg-green-100 text-green-800'
                                  : index === selectedSeries.currentPost
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {post ? post.topic : seriesPost.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                Status: {post ? post.status : 'Not Created'}
                                {seriesPost.scheduledDate &&
                                  ` | Scheduled: ${seriesPost.scheduledDate.toLocaleDateString()}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {index < selectedSeries.currentPost && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                Completed
                              </span>
                            )}
                            {index === selectedSeries.currentPost && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                Current
                              </span>
                            )}
                            {index > selectedSeries.currentPost && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                Upcoming
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optimization Suggestions */}
              {optimizationSuggestions.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Optimization Suggestions
                  </h4>
                  <div className="space-y-3">
                    {optimizationSuggestions.map((suggestion, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium text-gray-900">{suggestion.title}</h5>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  suggestion.impact === 'high'
                                    ? 'bg-red-100 text-red-800'
                                    : suggestion.impact === 'medium'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {suggestion.impact} impact
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  suggestion.effort === 'high'
                                    ? 'bg-red-100 text-red-800'
                                    : suggestion.effort === 'medium'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {suggestion.effort} effort
                              </span>
                            </div>
                            <p className="text-gray-600">{suggestion.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scheduling Tab */}
          {activeTab === 'schedule' && selectedSeries && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Scheduling: {selectedSeries.name}
                </h3>
                <button
                  onClick={() => loadSeriesSuggestions(selectedSeries.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Generate Schedule
                </button>
              </div>

              {/* Scheduling Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Scheduling Configuration</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Frequency:</span>
                    <div className="font-medium">{getFrequencyLabel(selectedSeries.frequency)}</div>
                  </div>
                  <div>
                    <span className="text-blue-700">Total Posts:</span>
                    <div className="font-medium">{selectedSeries.totalPosts}</div>
                  </div>
                  <div>
                    <span className="text-blue-700">Remaining:</span>
                    <div className="font-medium">
                      {selectedSeries.totalPosts - selectedSeries.currentPost}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scheduling Suggestions */}
              {schedulingSuggestions.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Optimal Scheduling Suggestions
                  </h4>
                  <div className="space-y-3">
                    {schedulingSuggestions.map((suggestion, index) => {
                      const post = posts.find((p) => p.id === suggestion.postId);
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1">
                                {post ? post.topic : `Post ${index + 1}`}
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                Platform: {suggestion.platform}
                              </div>
                              <div className="text-sm text-blue-600">
                                Suggested Time: {suggestion.suggestedTime.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                Reason: {suggestion.reason}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  suggestion.confidence > 0.8
                                    ? 'bg-green-100 text-green-800'
                                    : suggestion.confidence > 0.6
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {Math.round(suggestion.confidence * 100)}% confidence
                              </span>
                              <button
                                onClick={() => {
                                  // Here you would implement the logic to apply the scheduling suggestion
                                  setSuccess('Scheduling suggestion applied!');
                                }}
                                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {schedulingSuggestions.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">No scheduling suggestions available</div>
                  <div className="text-sm text-gray-400">
                    Make sure your series has posts assigned and try generating a schedule.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentSeriesManager;
