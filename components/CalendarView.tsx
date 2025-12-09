import React, { useState, useEffect } from 'react';
import {
  Post,
  Campaign,
  ContentSeries,
  TimeSlot,
  ConflictAnalysis,
  AudienceProfile,
} from '../types';
// import { schedulingService } from '../services/schedulingService';

interface CalendarViewProps {
  posts: Post[];
  campaigns: Campaign[];
  contentSeries: ContentSeries[];
  audienceProfiles: AudienceProfile[];
  optimalTimes: TimeSlot[];
  onPostClick: (post: Post) => void;
  onPostReschedule: (postId: string, newDate: Date) => void;
  onShowConflicts?: (conflicts: ConflictAnalysis) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  posts,
  campaigns,
  contentSeries,
  audienceProfiles,
  optimalTimes,
  onPostClick,
  onPostReschedule,
  onShowConflicts,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedPost, setDraggedPost] = useState<Post | null>(null);
  const [conflictAnalysis, setConflictAnalysis] = useState<ConflictAnalysis | null>(null);
  const [showOptimalTimes, setShowOptimalTimes] = useState(true);
  const [showCampaigns, setShowCampaigns] = useState(true);
  const [showSeries, setShowSeries] = useState(true);

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    analyzeConflicts();
  }, [posts]);

  const analyzeConflicts = async () => {
    try {
      const analysis = await schedulingService.analyzeContentConflicts(posts);
      setConflictAnalysis(analysis);
      if (onShowConflicts) {
        onShowConflicts(analysis);
      }
    } catch (error) {
      console.error('Error analyzing conflicts:', error);
    }
  };

  const calendarDays = Array.from({ length: startDay }, (_, i) => ({
    key: `empty-${i}`,
    empty: true,
    day: 0,
    date: new Date(),
    posts: [] as Post[],
    campaigns: [] as Campaign[],
    series: [] as ContentSeries[],
    isToday: false,
    isOptimalTime: false,
    hasConflicts: false,
  }));

  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    const datePosts = posts.filter(
      (p) => p.scheduleDate && p.scheduleDate.toDateString() === date.toDateString()
    );

    // Find campaigns active on this date
    const activeCampaigns = campaigns.filter((campaign) => {
      const startDate = new Date(campaign.startDate);
      const endDate = new Date(campaign.endDate);
      return date >= startDate && date <= endDate;
    });

    // Find series with posts on this date
    const activeSeries = contentSeries.filter((series) =>
      datePosts.some((post) => post.seriesId === series.id)
    );

    // Check if this is an optimal time slot
    const isOptimalTime = optimalTimes.some(
      (timeSlot) => timeSlot.dayOfWeek === date.getDay() && showOptimalTimes
    );

    // Check for conflicts on this date
    const hasConflicts =
      conflictAnalysis?.conflicts.some((conflict) =>
        datePosts.some((post) => post.id === conflict.postId1 || post.id === conflict.postId2)
      ) || false;

    calendarDays.push({
      key: `day-${i}`,
      day: i,
      date,
      posts: datePosts,
      campaigns: activeCampaigns,
      series: activeSeries,
      isToday: new Date().toDateString() === date.toDateString(),
      empty: false,
      isOptimalTime,
      hasConflicts,
    });
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'bg-gradient-to-r from-pink-400 to-red-400 text-white shadow-lg';
      case 'scheduled':
        return 'bg-gradient-to-r from-green-400 to-emerald-400 text-black shadow-lg';
      case 'draft':
        return 'bg-gradient-to-r from-yellow-300 to-orange-300 text-black shadow-lg';
      default:
        return 'bg-gradient-to-r from-purple-300 to-blue-300 text-black shadow-lg';
    }
  };

  const getCampaignColor = (campaignId: string) => {
    const colors = [
      'bg-blue-500/20 border-blue-400',
      'bg-green-500/20 border-green-400',
      'bg-purple-500/20 border-purple-400',
      'bg-orange-500/20 border-orange-400',
      'bg-pink-500/20 border-pink-400',
    ];
    const index =
      campaignId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const getSeriesColor = (seriesId: string) => {
    const colors = [
      'bg-cyan-500/20 border-cyan-400',
      'bg-indigo-500/20 border-indigo-400',
      'bg-teal-500/20 border-teal-400',
      'bg-rose-500/20 border-rose-400',
      'bg-amber-500/20 border-amber-400',
    ];
    const index =
      seriesId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, post: Post) => {
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (draggedPost) {
      // Set time to current time or a default time if not set
      const newDate = new Date(targetDate);
      if (draggedPost.scheduleDate) {
        newDate.setHours(draggedPost.scheduleDate.getHours());
        newDate.setMinutes(draggedPost.scheduleDate.getMinutes());
      } else {
        newDate.setHours(12, 0, 0, 0); // Default to noon
      }
      onPostReschedule(draggedPost.id, newDate);
      setDraggedPost(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedPost(null);
  };

  return (
    <div className="glass-card relative">
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="glass-card-inner">
        {/* Header with navigation and controls */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => changeMonth(-1)} className="holographic-btn text-2xl px-6 py-3">
            ←
          </button>
          <h3 className="text-3xl font-display font-black text-white tracking-wider">
            {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
          </h3>
          <button onClick={() => changeMonth(1)} className="holographic-btn text-2xl px-6 py-3">
            →
          </button>
        </div>

        {/* View Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowOptimalTimes(!showOptimalTimes)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              showOptimalTimes
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Optimal Times
          </button>
          <button
            onClick={() => setShowCampaigns(!showCampaigns)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              showCampaigns
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setShowSeries(!showSeries)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              showSeries
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Series
          </button>
        </div>

        {/* Conflict Warning */}
        {conflictAnalysis && conflictAnalysis.conflicts.length > 0 && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-red-400 text-sm font-semibold">
                ⚠️ {conflictAnalysis.conflicts.length} scheduling conflicts detected
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded"></div>
            <span className="text-white/70">Scheduled</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-r from-yellow-300 to-orange-300 rounded"></div>
            <span className="text-white/70">Draft</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-r from-pink-400 to-red-400 rounded"></div>
            <span className="text-white/70">Posted</span>
          </div>
          {showOptimalTimes && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500/30 border border-green-400 rounded"></div>
              <span className="text-white/70">Optimal Time</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500/30 border border-red-400 rounded"></div>
            <span className="text-white/70">Conflicts</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center">
          {daysOfWeek.map((day) => (
            <div key={day} className="font-accent text-lg font-bold text-white pb-3">
              {day}
            </div>
          ))}
          {calendarDays.map((dayInfo) => (
            <div
              key={dayInfo.key}
              className={`h-40 sm:h-44 border rounded-xl p-2 overflow-y-auto transition-all backdrop-filter blur-10 relative ${
                dayInfo.isToday
                  ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400/50 shadow-lg'
                  : dayInfo.isOptimalTime && showOptimalTimes
                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-400/40'
                    : dayInfo.hasConflicts
                      ? 'bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-400/40'
                      : 'bg-white/10 border-white/20'
              } ${dayInfo.empty ? 'opacity-30' : ''}`}
              onDragOver={!dayInfo.empty ? handleDragOver : undefined}
              onDrop={!dayInfo.empty ? (e) => handleDrop(e, dayInfo.date) : undefined}
            >
              {!dayInfo.empty && (
                <>
                  {/* Day number and indicators */}
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-bold text-sm text-white">{dayInfo.day}</div>
                    <div className="flex space-x-1">
                      {dayInfo.isOptimalTime && showOptimalTimes && (
                        <div
                          className="w-2 h-2 bg-green-400 rounded-full"
                          title="Optimal posting time"
                        ></div>
                      )}
                      {dayInfo.hasConflicts && (
                        <div
                          className="w-2 h-2 bg-red-400 rounded-full"
                          title="Scheduling conflicts"
                        ></div>
                      )}
                    </div>
                  </div>

                  {/* Campaign indicators */}
                  {showCampaigns && dayInfo.campaigns.length > 0 && (
                    <div className="mb-1">
                      {dayInfo.campaigns.slice(0, 2).map((campaign) => (
                        <div
                          key={campaign.id}
                          className={`text-xs px-1 py-0.5 rounded border mb-1 truncate ${getCampaignColor(campaign.id)}`}
                          title={`Campaign: ${campaign.name}`}
                        >
                          📋 {campaign.name}
                        </div>
                      ))}
                      {dayInfo.campaigns.length > 2 && (
                        <div className="text-xs text-white/60">
                          +{dayInfo.campaigns.length - 2} more
                        </div>
                      )}
                    </div>
                  )}

                  {/* Series indicators */}
                  {showSeries && dayInfo.series.length > 0 && (
                    <div className="mb-1">
                      {dayInfo.series.slice(0, 1).map((series) => (
                        <div
                          key={series.id}
                          className={`text-xs px-1 py-0.5 rounded border mb-1 truncate ${getSeriesColor(series.id)}`}
                          title={`Series: ${series.name}`}
                        >
                          📚 {series.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Posts */}
                  {dayInfo.posts.map((post) => (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, post)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onPostClick(post)}
                      className={`text-xs p-2 mt-1 rounded-lg cursor-move transition-all hover:scale-105 font-semibold relative ${getStatusColor(post.status)} ${
                        draggedPost?.id === post.id ? 'opacity-50' : ''
                      }`}
                      title={`${post.idea} - Drag to reschedule`}
                    >
                      <div className="truncate">{post.idea}</div>
                      {post.scheduleDate && (
                        <div className="text-xs opacity-75 mt-1">
                          {post.scheduleDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                      {/* Conflict indicator */}
                      {conflictAnalysis?.conflicts.some(
                        (conflict) => conflict.postId1 === post.id || conflict.postId2 === post.id
                      ) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>
                      )}
                      {/* Series indicator */}
                      {post.seriesId && (
                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-purple-500 rounded-full border border-white"></div>
                      )}
                    </div>
                  ))}

                  {/* Drop zone indicator when dragging */}
                  {draggedPost && (
                    <div className="absolute inset-0 border-2 border-dashed border-purple-400 rounded-xl bg-purple-500/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-purple-400 text-xs font-semibold">Drop here</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
