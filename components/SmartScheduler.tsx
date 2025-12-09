import React, { useState, useEffect } from 'react';
import { Post, TimeSlot, SchedulingSuggestion, ConflictAnalysis, AudienceProfile } from '../types';
// import { schedulingService } from '../services/schedulingService';

interface SmartSchedulerProps {
  posts: Post[];
  selectedPosts: string[];
  audienceProfiles: AudienceProfile[];
  onScheduleUpdate: (postId: string, scheduleDate: Date, platform?: string) => void;
  onBulkSchedule: (suggestions: SchedulingSuggestion[]) => void;
  onClose: () => void;
}

const SmartScheduler: React.FC<SmartSchedulerProps> = ({
  posts,
  selectedPosts,
  audienceProfiles,
  onScheduleUpdate,
  onBulkSchedule,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [optimalTimes, setOptimalTimes] = useState<TimeSlot[]>([]);
  const [schedulingSuggestions, setSchedulingSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [conflictAnalysis, setConflictAnalysis] = useState<ConflictAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  // Bulk scheduling options
  const [bulkOptions, setBulkOptions] = useState({
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    platforms: ['twitter', 'linkedin'],
    spacing: 'optimal' as 'optimal' | 'even' | 'custom',
    customSpacingHours: 4,
    respectOptimalTimes: true,
    avoidWeekends: false,
    targetTimezones: ['UTC'],
  });

  // Timezone management
  const [selectedTimezone, setSelectedTimezone] = useState('UTC');
  const availableTimezones = ['UTC', 'EST', 'PST', 'GMT', 'CET', 'JST', 'AEST'];

  // Platform selection
  const availablePlatforms = [
    { id: 'twitter', name: 'Twitter', color: 'bg-blue-500' },
    { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-600' },
    { id: 'facebook', name: 'Facebook', color: 'bg-blue-700' },
    { id: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
    { id: 'threads', name: 'Threads', color: 'bg-gray-800' },
    { id: 'bluesky', name: 'Bluesky', color: 'bg-sky-500' },
  ];

  useEffect(() => {
    if (selectedPost) {
      loadOptimalTimes();
      loadSchedulingSuggestions();
    }
  }, [selectedPost]);

  useEffect(() => {
    if (posts.length > 0) {
      analyzeConflicts();
    }
  }, [posts]);

  const loadOptimalTimes = async () => {
    if (!selectedPost) return;

    setLoading(true);
    try {
      const audienceProfile = audienceProfiles.find(
        (ap) => ap.id === selectedPost.audienceProfileId
      );
      const times = await schedulingService.analyzeOptimalTimes(undefined, audienceProfile);
      setOptimalTimes(times);
    } catch (error) {
      console.error('Error loading optimal times:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedulingSuggestions = async () => {
    if (!selectedPost) return;

    try {
      const audienceProfile = audienceProfiles.find(
        (ap) => ap.id === selectedPost.audienceProfileId
      );
      const suggestions = await schedulingService.getSchedulingSuggestions(
        selectedPost,
        bulkOptions.platforms,
        audienceProfile
      );
      setSchedulingSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading scheduling suggestions:', error);
    }
  };

  const analyzeConflicts = async () => {
    try {
      const analysis = await schedulingService.analyzeContentConflicts(posts);
      setConflictAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing conflicts:', error);
    }
  };

  const handleBulkSchedule = async () => {
    setLoading(true);
    try {
      const postsToSchedule = posts.filter((post) => selectedPosts.includes(post.id));
      const suggestions = await schedulingService.bulkSchedulePosts(postsToSchedule, bulkOptions);
      setSchedulingSuggestions(suggestions);
      onBulkSchedule(suggestions);
    } catch (error) {
      console.error('Error bulk scheduling:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeSlot = (timeSlot: TimeSlot) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[timeSlot.dayOfWeek]} at ${timeSlot.time}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-500 bg-red-500/10';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>

        <div className="glass-card-inner">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-display font-black text-white">Smart Scheduler</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-2xl transition-colors"
            >
              ×
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('single')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'single'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Single Post Scheduling
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'bulk'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Bulk Scheduling
            </button>
          </div>

          {/* Conflict Analysis */}
          {conflictAnalysis && conflictAnalysis.conflicts.length > 0 && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-red-400 mb-2">
                Scheduling Conflicts Detected
              </h3>
              <div className="space-y-2">
                {conflictAnalysis.conflicts.slice(0, 3).map((conflict, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border ${getSeverityColor(conflict.severity)}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold capitalize">
                          {conflict.conflictType} Conflict
                        </span>
                        <span
                          className={`ml-2 px-2 py-1 rounded text-xs ${
                            conflict.severity === 'high'
                              ? 'bg-red-500 text-white'
                              : conflict.severity === 'medium'
                                ? 'bg-yellow-500 text-black'
                                : 'bg-blue-500 text-white'
                          }`}
                        >
                          {conflict.severity}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 mt-1">{conflict.resolution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'single' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Post Selection */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Select Post</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {posts
                    .filter((post) => post.status === 'draft')
                    .map((post) => (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedPost?.id === post.id
                            ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50'
                            : 'bg-white/10 hover:bg-white/20 border border-white/20'
                        }`}
                      >
                        <div className="font-semibold text-white">{post.idea}</div>
                        <div className="text-sm text-white/70">{post.topic}</div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Optimal Times & Suggestions */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Optimal Times</h3>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {optimalTimes.slice(0, 5).map((timeSlot, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white/10 rounded-lg border border-white/20"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">
                            {formatTimeSlot(timeSlot)}
                          </span>
                          <span
                            className={`text-sm font-semibold ${getConfidenceColor(timeSlot.confidence)}`}
                          >
                            {Math.round(timeSlot.confidence * 100)}% confidence
                          </span>
                        </div>
                        <div className="text-sm text-white/70">
                          Engagement Score: {timeSlot.engagementScore.toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scheduling Suggestions */}
                {schedulingSuggestions.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-white mb-3">Suggestions</h4>
                    <div className="space-y-2">
                      {schedulingSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="p-3 bg-white/10 rounded-lg border border-white/20"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-white capitalize">
                                {suggestion.platform}
                              </div>
                              <div className="text-sm text-white/70">
                                {suggestion.suggestedTime.toLocaleString()}
                              </div>
                              <div className="text-xs text-white/60 mt-1">{suggestion.reason}</div>
                            </div>
                            <button
                              onClick={() =>
                                onScheduleUpdate(
                                  suggestion.postId,
                                  suggestion.suggestedTime,
                                  suggestion.platform
                                )
                              }
                              className="holographic-btn text-sm px-3 py-1"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bulk' && (
            <div className="space-y-6">
              {/* Bulk Scheduling Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Date Range</label>
                  <div className="space-y-2">
                    <input
                      type="datetime-local"
                      value={bulkOptions.startDate.toISOString().slice(0, 16)}
                      onChange={(e) =>
                        setBulkOptions((prev) => ({
                          ...prev,
                          startDate: new Date(e.target.value),
                        }))
                      }
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                    />
                    <input
                      type="datetime-local"
                      value={bulkOptions.endDate.toISOString().slice(0, 16)}
                      onChange={(e) =>
                        setBulkOptions((prev) => ({
                          ...prev,
                          endDate: new Date(e.target.value),
                        }))
                      }
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                    />
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Platforms</label>
                  <div className="space-y-2">
                    {availablePlatforms.map((platform) => (
                      <label key={platform.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={bulkOptions.platforms.includes(platform.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkOptions((prev) => ({
                                ...prev,
                                platforms: [...prev.platforms, platform.id],
                              }));
                            } else {
                              setBulkOptions((prev) => ({
                                ...prev,
                                platforms: prev.platforms.filter((p) => p !== platform.id),
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-white text-sm">{platform.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Spacing Options */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Spacing Strategy
                  </label>
                  <select
                    value={bulkOptions.spacing}
                    onChange={(e) =>
                      setBulkOptions((prev) => ({
                        ...prev,
                        spacing: e.target.value as 'optimal' | 'even' | 'custom',
                      }))
                    }
                    className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                  >
                    <option value="optimal">Optimal Times</option>
                    <option value="even">Even Distribution</option>
                    <option value="custom">Custom Spacing</option>
                  </select>

                  {bulkOptions.spacing === 'custom' && (
                    <input
                      type="number"
                      value={bulkOptions.customSpacingHours}
                      onChange={(e) =>
                        setBulkOptions((prev) => ({
                          ...prev,
                          customSpacingHours: parseInt(e.target.value),
                        }))
                      }
                      className="w-full mt-2 p-2 bg-white/10 border border-white/20 rounded text-white"
                      placeholder="Hours between posts"
                      min="1"
                    />
                  )}
                </div>
              </div>

              {/* Additional Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Timezone Selection */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Target Timezones
                  </label>
                  <select
                    multiple
                    value={bulkOptions.targetTimezones}
                    onChange={(e) => {
                      const selected = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      );
                      setBulkOptions((prev) => ({ ...prev, targetTimezones: selected }));
                    }}
                    className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                    size={4}
                  >
                    {availableTimezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preferences */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Preferences</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={bulkOptions.respectOptimalTimes}
                        onChange={(e) =>
                          setBulkOptions((prev) => ({
                            ...prev,
                            respectOptimalTimes: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      <span className="text-white text-sm">Respect optimal times</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={bulkOptions.avoidWeekends}
                        onChange={(e) =>
                          setBulkOptions((prev) => ({
                            ...prev,
                            avoidWeekends: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      <span className="text-white text-sm">Avoid weekends</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Selected Posts */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Selected Posts ({selectedPosts.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {posts
                    .filter((post) => selectedPosts.includes(post.id))
                    .map((post) => (
                      <div
                        key={post.id}
                        className="p-3 bg-white/10 rounded-lg border border-white/20"
                      >
                        <div className="font-semibold text-white text-sm">{post.idea}</div>
                        <div className="text-xs text-white/70">{post.topic}</div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Bulk Schedule Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleBulkSchedule}
                  disabled={loading || selectedPosts.length === 0}
                  className="holographic-btn px-8 py-3 text-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Generating Schedule...' : 'Generate Bulk Schedule'}
                </button>
              </div>

              {/* Bulk Scheduling Results */}
              {schedulingSuggestions.length > 0 && activeTab === 'bulk' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Scheduling Suggestions</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {schedulingSuggestions.map((suggestion, index) => {
                      const post = posts.find((p) => p.id === suggestion.postId);
                      return (
                        <div
                          key={index}
                          className="p-3 bg-white/10 rounded-lg border border-white/20"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-semibold text-white text-sm">
                                {post?.idea || 'Unknown Post'}
                              </div>
                              <div className="text-xs text-white/70 capitalize">
                                {suggestion.platform} • {suggestion.suggestedTime.toLocaleString()}
                              </div>
                              <div className="text-xs text-white/60 mt-1">{suggestion.reason}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
                              >
                                {Math.round(suggestion.confidence * 100)}%
                              </span>
                              <button
                                onClick={() =>
                                  onScheduleUpdate(
                                    suggestion.postId,
                                    suggestion.suggestedTime,
                                    suggestion.platform
                                  )
                                }
                                className="holographic-btn text-xs px-2 py-1"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartScheduler;
