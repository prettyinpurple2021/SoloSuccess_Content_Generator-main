import React, { useState, useEffect } from 'react';
import { AudienceProfile, EngagementData } from '../types';
import { apiService } from '../services/clientApiService';
import { generateAudienceInsights } from '../services/geminiService';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Users,
  TrendingUp,
  Loader2,
  Save,
  AlertCircle,
  Target,
  BarChart3,
} from 'lucide-react';

interface AudienceProfileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAudienceProfile?: AudienceProfile | null;
  onAudienceProfileSelect: (profile: AudienceProfile | null) => void;
  audienceProfiles: AudienceProfile[];
  onAudienceProfilesUpdate: (profiles: AudienceProfile[]) => void;
}

interface AudienceProfileForm {
  name: string;
  ageRange: string;
  industry: string;
  interests: string[];
  painPoints: string[];
  preferredContentTypes: string[];
  engagementPatterns: EngagementData;
}

const AGE_RANGE_OPTIONS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

const INDUSTRY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Real Estate',
  'Marketing',
  'Consulting',
  'E-commerce',
  'SaaS',
  'Non-profit',
  'Government',
  'Entertainment',
  'Other',
];

const CONTENT_TYPE_OPTIONS = [
  'Blog Posts',
  'Video Content',
  'Infographics',
  'Podcasts',
  'Case Studies',
  'Tutorials',
  'News Updates',
  'Behind-the-scenes',
  'User-generated Content',
  'Live Streams',
  'Webinars',
  'E-books',
  'Templates',
  'Checklists',
];

export default function AudienceProfileManager({
  isOpen,
  onClose,
  selectedAudienceProfile,
  onAudienceProfileSelect,
  audienceProfiles,
  onAudienceProfilesUpdate,
}: AudienceProfileManagerProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'preview' | 'insights'>(
    'list'
  );
  const [editingProfile, setEditingProfile] = useState<AudienceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [generatedInsights, setGeneratedInsights] = useState<any>(null);

  const [form, setForm] = useState<AudienceProfileForm>({
    name: '',
    ageRange: '',
    industry: '',
    interests: [],
    painPoints: [],
    preferredContentTypes: [],
    engagementPatterns: {},
  });

  const [newInterest, setNewInterest] = useState('');
  const [newPainPoint, setNewPainPoint] = useState('');

  useEffect(() => {
    if (activeTab === 'edit' && editingProfile) {
      setForm({
        name: editingProfile.name,
        ageRange: editingProfile.ageRange,
        industry: editingProfile.industry,
        interests: [...editingProfile.interests],
        painPoints: [...editingProfile.painPoints],
        preferredContentTypes: [...editingProfile.preferredContentTypes],
        engagementPatterns: { ...editingProfile.engagementPatterns },
      });
    } else if (activeTab === 'create') {
      setForm({
        name: '',
        ageRange: '',
        industry: '',
        interests: [],
        painPoints: [],
        preferredContentTypes: [],
        engagementPatterns: {},
      });
    }
  }, [activeTab, editingProfile]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCreateNew = () => {
    clearMessages();
    setEditingProfile(null);
    setGeneratedInsights(null);
    setActiveTab('create');
  };

  const handleEdit = (profile: AudienceProfile) => {
    clearMessages();
    setEditingProfile(profile);
    setGeneratedInsights(null);
    setActiveTab('edit');
  };

  const handlePreview = (profile: AudienceProfile) => {
    clearMessages();
    setEditingProfile(profile);
    setActiveTab('preview');
  };

  const handleViewInsights = (profile: AudienceProfile) => {
    clearMessages();
    setEditingProfile(profile);
    setActiveTab('insights');
  };

  const handleDelete = async (profile: AudienceProfile) => {
    if (!confirm(`Are you sure you want to delete "${profile.name}"?`)) return;

    setIsLoading(true);
    setError(null);

    try {
      await db.deleteAudienceProfile(profile.id);
      const updatedProfiles = audienceProfiles.filter((p) => p.id !== profile.id);
      onAudienceProfilesUpdate(updatedProfiles);

      // If this was the selected profile, clear selection
      if (selectedAudienceProfile?.id === profile.id) {
        onAudienceProfileSelect(null);
      }

      setSuccess('Audience profile deleted successfully');
      setActiveTab('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete audience profile');
    } finally {
      setIsLoading(false);
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !form.interests.includes(newInterest.trim())) {
      setForm((prev) => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()],
      }));
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }));
  };

  const addPainPoint = () => {
    if (newPainPoint.trim() && !form.painPoints.includes(newPainPoint.trim())) {
      setForm((prev) => ({
        ...prev,
        painPoints: [...prev.painPoints, newPainPoint.trim()],
      }));
      setNewPainPoint('');
    }
  };

  const removePainPoint = (painPoint: string) => {
    setForm((prev) => ({
      ...prev,
      painPoints: prev.painPoints.filter((p) => p !== painPoint),
    }));
  };

  const toggleContentType = (contentType: string) => {
    setForm((prev) => ({
      ...prev,
      preferredContentTypes: prev.preferredContentTypes.includes(contentType)
        ? prev.preferredContentTypes.filter((t) => t !== contentType)
        : [...prev.preferredContentTypes, contentType],
    }));
  };

  const generateInsights = async () => {
    if (!form.name.trim()) {
      setError('Please enter a profile name first');
      return;
    }

    setIsGeneratingInsights(true);
    setError(null);

    try {
      const targetAudience = `${form.ageRange} ${form.industry} professionals`;
      const insights = await generateAudienceInsights(targetAudience, form.industry, [
        'engagement',
        'content creation',
        'social media marketing',
      ]);

      setGeneratedInsights(insights);

      // Auto-populate form with insights if fields are empty
      if (insights.interests && insights.interests.length > 0 && form.interests.length === 0) {
        setForm((prev) => ({ ...prev, interests: insights.interests }));
      }

      if (insights.painPoints && insights.painPoints.length > 0 && form.painPoints.length === 0) {
        setForm((prev) => ({ ...prev, painPoints: insights.painPoints }));
      }

      if (
        insights.contentPreferences &&
        insights.contentPreferences.length > 0 &&
        form.preferredContentTypes.length === 0
      ) {
        setForm((prev) => ({ ...prev, preferredContentTypes: insights.contentPreferences }));
      }

      setSuccess('Audience insights generated successfully! Form updated with recommendations.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audience insights');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Please enter a name for the audience profile');
      return;
    }

    if (!form.ageRange) {
      setError('Please select an age range');
      return;
    }

    if (!form.industry) {
      setError('Please select an industry');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const profileData = {
        name: form.name.trim(),
        age_range: form.ageRange,
        industry: form.industry,
        interests: form.interests,
        pain_points: form.painPoints,
        preferred_content_types: form.preferredContentTypes,
        engagement_patterns: form.engagementPatterns,
      };

      let savedProfile: AudienceProfile;

      if (activeTab === 'edit' && editingProfile) {
        savedProfile = await db.updateAudienceProfile(editingProfile.id, profileData);
        const updatedProfiles = audienceProfiles.map((p) =>
          p.id === editingProfile.id ? savedProfile : p
        );
        onAudienceProfilesUpdate(updatedProfiles);
        setSuccess('Audience profile updated successfully');
      } else {
        savedProfile = await db.addAudienceProfile(profileData);
        onAudienceProfilesUpdate([savedProfile, ...audienceProfiles]);
        setSuccess('Audience profile created successfully');
      }

      setActiveTab('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save audience profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (profile: AudienceProfile) => {
    onAudienceProfileSelect(profile);
    setSuccess(`Selected "${profile.name}" as active audience profile`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Audience Profile Manager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b px-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Profiles ({audienceProfiles.length})
          </button>
          {(activeTab === 'create' || activeTab === 'edit') && (
            <button
              onClick={() => setActiveTab(activeTab)}
              className="px-4 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-600"
            >
              {activeTab === 'create' ? 'Create New' : 'Edit Profile'}
            </button>
          )}
          {activeTab === 'preview' && (
            <button
              onClick={() => setActiveTab('preview')}
              className="px-4 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-600"
            >
              Preview Profile
            </button>
          )}
          {activeTab === 'insights' && (
            <button
              onClick={() => setActiveTab('insights')}
              className="px-4 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-600"
            >
              Audience Insights
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'list' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-600">
                  Create and manage audience profiles to target your content more effectively.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New Profile
                </button>
              </div>

              {audienceProfiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Audience Profiles Yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Create your first audience profile to better target your content.
                  </p>
                  <button
                    onClick={handleCreateNew}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Audience Profile
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {audienceProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        selectedAudienceProfile?.id === profile.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">{profile.name}</h3>
                            {selectedAudienceProfile?.id === profile.id && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span>Age: {profile.ageRange}</span>
                            <span>Industry: {profile.industry}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <span>{profile.interests.length} interests</span>
                            <span>•</span>
                            <span>{profile.painPoints.length} pain points</span>
                            <span>•</span>
                            <span>{profile.preferredContentTypes.length} content preferences</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {profile.interests.slice(0, 3).map((interest, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                              >
                                {interest}
                              </span>
                            ))}
                            {profile.interests.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                +{profile.interests.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {selectedAudienceProfile?.id !== profile.id && (
                            <button
                              onClick={() => handleSelect(profile)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Select
                            </button>
                          )}
                          <button
                            onClick={() => handleViewInsights(profile)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View Insights"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePreview(profile)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(profile)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(profile)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(activeTab === 'create' || activeTab === 'edit') && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {activeTab === 'create' ? 'Create New Audience Profile' : 'Edit Audience Profile'}
                </h3>
                <button
                  onClick={generateInsights}
                  disabled={isGeneratingInsights || !form.name.trim()}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isGeneratingInsights ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Target className="w-3 h-3" />
                  )}
                  Generate Insights
                </button>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Tech Entrepreneurs, Small Business Owners"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age Range *
                  </label>
                  <select
                    value={form.ageRange}
                    onChange={(e) => setForm((prev) => ({ ...prev, ageRange: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select age range</option>
                    {AGE_RANGE_OPTIONS.map((range) => (
                      <option key={range} value={range}>
                        {range}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry *</label>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select industry</option>
                    {INDUSTRY_OPTIONS.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interests & Topics
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add interest or topic"
                  />
                  <button
                    onClick={addInterest}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {interest}
                      <button
                        onClick={() => removeInterest(interest)}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Pain Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pain Points & Challenges
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newPainPoint}
                    onChange={(e) => setNewPainPoint(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPainPoint()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add pain point or challenge"
                  />
                  <button
                    onClick={addPainPoint}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.painPoints.map((painPoint, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                    >
                      {painPoint}
                      <button
                        onClick={() => removePainPoint(painPoint)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Preferred Content Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Content Types
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {CONTENT_TYPE_OPTIONS.map((contentType) => (
                    <label
                      key={contentType}
                      className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={form.preferredContentTypes.includes(contentType)}
                        onChange={() => toggleContentType(contentType)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{contentType}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Generated Insights */}
              {generatedInsights && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    AI-Generated Audience Insights
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {generatedInsights.interests && generatedInsights.interests.length > 0 && (
                      <div>
                        <h5 className="font-medium text-purple-800 mb-1">Suggested Interests:</h5>
                        <p className="text-purple-700">{generatedInsights.interests.join(', ')}</p>
                      </div>
                    )}
                    {generatedInsights.painPoints && generatedInsights.painPoints.length > 0 && (
                      <div>
                        <h5 className="font-medium text-purple-800 mb-1">Common Pain Points:</h5>
                        <p className="text-purple-700">{generatedInsights.painPoints.join(', ')}</p>
                      </div>
                    )}
                    {generatedInsights.contentPreferences &&
                      generatedInsights.contentPreferences.length > 0 && (
                        <div>
                          <h5 className="font-medium text-purple-800 mb-1">Content Preferences:</h5>
                          <p className="text-purple-700">
                            {generatedInsights.contentPreferences.join(', ')}
                          </p>
                        </div>
                      )}
                    {generatedInsights.engagementTips &&
                      generatedInsights.engagementTips.length > 0 && (
                        <div>
                          <h5 className="font-medium text-purple-800 mb-1">Engagement Tips:</h5>
                          <ul className="text-purple-700 list-disc list-inside">
                            {generatedInsights.engagementTips
                              .slice(0, 3)
                              .map((tip: string, index: number) => (
                                <li key={index}>{tip}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {activeTab === 'create' ? 'Create Profile' : 'Update Profile'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preview' && editingProfile && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Preview: {editingProfile.name}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Demographics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Age Range:</span>
                        <span className="font-medium">{editingProfile.ageRange}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Industry:</span>
                        <span className="font-medium">{editingProfile.industry}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Interests</h4>
                    <div className="flex flex-wrap gap-1">
                      {editingProfile.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Pain Points</h4>
                    <div className="flex flex-wrap gap-1">
                      {editingProfile.painPoints.map((painPoint, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                        >
                          {painPoint}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Content Preferences</h4>
                  <div className="space-y-2">
                    {editingProfile.preferredContentTypes.map((contentType, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">{contentType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Back to List
                </button>
                <button
                  onClick={() => handleEdit(editingProfile)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            </div>
          )}

          {activeTab === 'insights' && editingProfile && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Audience Insights: {editingProfile.name}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3">Content Strategy</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <p>• Focus on {editingProfile.preferredContentTypes.slice(0, 3).join(', ')}</p>
                    <p>• Address pain points: {editingProfile.painPoints.slice(0, 2).join(', ')}</p>
                    <p>
                      • Target {editingProfile.ageRange} professionals in {editingProfile.industry}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-3">Engagement Opportunities</h4>
                  <div className="space-y-2 text-sm text-green-800">
                    <p>• Leverage interests: {editingProfile.interests.slice(0, 3).join(', ')}</p>
                    <p>• Create educational content about industry trends</p>
                    <p>• Share case studies and success stories</p>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-3">Content Timing</h4>
                  <div className="space-y-2 text-sm text-purple-800">
                    <p>• Best posting times: 9-11 AM, 2-4 PM</p>
                    <p>• Peak engagement: Tuesday-Thursday</p>
                    <p>• Weekend content: Lighter, inspirational topics</p>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-3">Platform Recommendations</h4>
                  <div className="space-y-2 text-sm text-orange-800">
                    <p>• LinkedIn: Professional insights and industry news</p>
                    <p>• Twitter: Quick tips and thought leadership</p>
                    <p>• Instagram: Behind-the-scenes and visual content</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Back to List
                </button>
                <button
                  onClick={() => handleEdit(editingProfile)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
