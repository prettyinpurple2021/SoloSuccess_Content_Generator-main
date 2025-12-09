import React, { useState, useEffect } from 'react';
import { Campaign, ContentSeries, Post, CampaignMetrics, OptimizationSuggestion } from '../types';
import { campaignService } from '../services/clientCampaignService';
import { apiService } from '../services/clientApiService';
import { PLATFORMS, Spinner } from '../constants';

interface CampaignManagerProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
  onPostUpdate?: (post: Post) => void;
}

const CampaignManager: React.FC<CampaignManagerProps> = ({
  isOpen,
  onClose,
  posts,
  onPostUpdate,
}) => {
  // State management
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'edit' | 'performance'>(
    'overview'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state for campaign creation/editing
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    theme: '',
    startDate: '',
    endDate: '',
    platforms: [] as string[],
  });

  // Performance data
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetrics | null>(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>(
    []
  );

  // Load campaigns on component mount
  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
    }
  }, [isOpen]);

  // Load campaign performance when a campaign is selected
  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignPerformance(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const campaignList = await campaignService.getCampaigns();
      setCampaigns(campaignList);
    } catch (err: any) {
      setError(`Failed to load campaigns: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCampaignPerformance = async (campaignId: string) => {
    try {
      setIsLoading(true);
      const metrics = await campaignService.getCampaignPerformance(campaignId);
      setCampaignMetrics(metrics);

      // Load optimization suggestions if campaign has posts
      if (metrics.totalPosts > 0) {
        // For now, we'll generate basic suggestions based on metrics
        const suggestions = generateOptimizationSuggestions(metrics);
        setOptimizationSuggestions(suggestions);
      }
    } catch (err: any) {
      setError(`Failed to load campaign performance: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateOptimizationSuggestions = (metrics: CampaignMetrics): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    // Low engagement suggestion
    if (metrics.avgEngagementRate < 2) {
      suggestions.push({
        type: 'content',
        title: 'Improve Content Engagement',
        description:
          'Your campaign engagement rate is below average. Consider using more interactive content formats or adjusting your posting times.',
        impact: 'high',
        effort: 'medium',
      });
    }

    // Platform performance suggestions
    const platformEntries = Object.entries(metrics.platformPerformance);
    if (platformEntries.length > 1) {
      const bestPlatform = platformEntries.reduce((best, current) =>
        current[1].avgEngagementRate > best[1].avgEngagementRate ? current : best
      );

      suggestions.push({
        type: 'format',
        title: `Focus on ${bestPlatform[0]}`,
        description: `${bestPlatform[0]} is showing the best engagement rate (${bestPlatform[1].avgEngagementRate.toFixed(1)}%). Consider allocating more resources to this platform.`,
        impact: 'medium',
        effort: 'low',
      });
    }

    // Content volume suggestion
    if (metrics.totalPosts < 5) {
      suggestions.push({
        type: 'content',
        title: 'Increase Content Volume',
        description:
          'Your campaign has relatively few posts. Consider creating more content to maintain audience engagement and improve reach.',
        impact: 'medium',
        effort: 'high',
      });
    }

    return suggestions;
  };

  const handleCreateCampaign = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!formData.name || !formData.theme || !formData.startDate || !formData.endDate) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.platforms.length === 0) {
        throw new Error('Please select at least one platform');
      }

      const campaign = await campaignService.createCampaign({
        name: formData.name,
        description: formData.description,
        theme: formData.theme,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        platforms: formData.platforms,
      });

      setCampaigns((prev) => [...prev, campaign]);
      setSuccess('Campaign created successfully!');
      setActiveTab('overview');
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCampaign = async () => {
    if (!selectedCampaign) return;

    try {
      setIsLoading(true);
      setError('');

      const updates: Partial<Campaign> = {};
      if (formData.name) updates.name = formData.name;
      if (formData.description) updates.description = formData.description;
      if (formData.theme) updates.theme = formData.theme;
      if (formData.startDate) updates.startDate = new Date(formData.startDate);
      if (formData.endDate) updates.endDate = new Date(formData.endDate);
      if (formData.platforms.length > 0) updates.platforms = formData.platforms;

      const updatedCampaign = await campaignService.updateCampaign(selectedCampaign.id, updates);

      setCampaigns((prev) => prev.map((c) => (c.id === updatedCampaign.id ? updatedCampaign : c)));
      setSelectedCampaign(updatedCampaign);
      setSuccess('Campaign updated successfully!');
      setActiveTab('overview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      await campaignService.deleteCampaign(campaignId, false); // Don't delete associated content
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign(null);
      }
      setSuccess('Campaign deleted successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignPostToCampaign = async (postId: string, campaignId: string) => {
    try {
      await db.updatePost(postId, { campaign_id: campaignId });
      if (onPostUpdate) {
        const updatedPost = posts.find((p) => p.id === postId);
        if (updatedPost) {
          onPostUpdate({ ...updatedPost, campaignId });
        }
      }
      setSuccess('Post assigned to campaign successfully!');
    } catch (err: any) {
      setError(`Failed to assign post: ${err.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      theme: '',
      startDate: '',
      endDate: '',
      platforms: [],
    });
  };

  const populateFormWithCampaign = (campaign: Campaign) => {
    setFormData({
      name: campaign.name,
      description: campaign.description,
      theme: campaign.theme,
      startDate: campaign.startDate.toISOString().split('T')[0],
      endDate: campaign.endDate.toISOString().split('T')[0],
      platforms: campaign.platforms,
    });
  };

  const handlePlatformToggle = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const getCampaignPosts = (campaignId: string) => {
    return posts.filter((post) => post.campaignId === campaignId);
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Campaign Manager</h2>
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
            { key: 'create', label: 'Create Campaign' },
            { key: 'performance', label: 'Performance', disabled: !selectedCampaign },
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
                <h3 className="text-lg font-semibold text-gray-900">Your Campaigns</h3>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create New Campaign
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">No campaigns created yet</div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Your First Campaign
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {campaigns.map((campaign) => {
                    const campaignPosts = getCampaignPosts(campaign.id);
                    return (
                      <div
                        key={campaign.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {campaign.name}
                              </h4>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}
                              >
                                {campaign.status}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-3">{campaign.description}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Theme: {campaign.theme}</span>
                              <span>Posts: {campaignPosts.length}</span>
                              <span>Platforms: {campaign.platforms.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span>Start: {campaign.startDate.toLocaleDateString()}</span>
                              <span>End: {campaign.endDate.toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCampaign(campaign);
                                populateFormWithCampaign(campaign);
                                setActiveTab('edit');
                              }}
                              className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCampaign(campaign.id);
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
              {selectedCampaign && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Assign Posts to "{selectedCampaign.name}"
                  </h4>
                  <div className="grid gap-3">
                    {posts
                      .filter((post) => !post.campaignId)
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
                            onClick={() => handleAssignPostToCampaign(post.id, selectedCampaign.id)}
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

          {/* Create/Edit Campaign Tab */}
          {(activeTab === 'create' || activeTab === 'edit') && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {activeTab === 'create' ? 'Create New Campaign' : 'Edit Campaign'}
              </h3>

              <div className="grid gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter campaign name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your campaign goals and strategy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Theme *
                  </label>
                  <input
                    type="text"
                    value={formData.theme}
                    onChange={(e) => setFormData((prev) => ({ ...prev, theme: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Product Launch, Brand Awareness, Holiday Campaign"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Platforms *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {PLATFORMS.map((platform) => (
                      <label key={platform} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.platforms.includes(platform)}
                          onChange={() => handlePlatformToggle(platform)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{platform}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-6 border-t">
                <button
                  onClick={activeTab === 'create' ? handleCreateCampaign : handleUpdateCampaign}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {activeTab === 'create' ? 'Create Campaign' : 'Update Campaign'}
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

          {/* Performance Tab */}
          {activeTab === 'performance' && selectedCampaign && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Performance: {selectedCampaign.name}
                </h3>
                <button
                  onClick={() => loadCampaignPerformance(selectedCampaign.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Refresh Data
                </button>
              </div>

              {campaignMetrics && (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {campaignMetrics.totalPosts}
                      </div>
                      <div className="text-sm text-gray-600">Total Posts</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {campaignMetrics.totalEngagement}
                      </div>
                      <div className="text-sm text-gray-600">Total Engagement</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {campaignMetrics.avgEngagementRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Avg Engagement Rate</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {Object.keys(campaignMetrics.platformPerformance).length}
                      </div>
                      <div className="text-sm text-gray-600">Active Platforms</div>
                    </div>
                  </div>

                  {/* Platform Performance */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">
                      Platform Performance
                    </h4>
                    <div className="grid gap-4">
                      {Object.entries(campaignMetrics.platformPerformance).map(
                        ([platform, metrics]) => (
                          <div key={platform} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900 capitalize">{platform}</h5>
                              <span className="text-sm text-gray-500">{metrics.posts} posts</span>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-gray-600">Likes</div>
                                <div className="font-medium">{metrics.totalLikes}</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Shares</div>
                                <div className="font-medium">{metrics.totalShares}</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Comments</div>
                                <div className="font-medium">{metrics.totalComments}</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Engagement Rate</div>
                                <div className="font-medium">
                                  {metrics.avgEngagementRate.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
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
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignManager;
