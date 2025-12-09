import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Star,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  Users,
  Award,
  Crown,
  Flame,
  Gift,
  Medal,
} from 'lucide-react';
import {
  HoloCard,
  HoloButton,
  HoloText,
  SparkleEffect,
  FloatingSkull,
  RainbowProgress,
} from './HolographicTheme';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'content' | 'engagement' | 'consistency' | 'growth' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  reward?: {
    type: 'theme' | 'feature' | 'badge' | 'title';
    value: string;
  };
}

interface UserStats {
  level: number;
  totalPoints: number;
  pointsToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalPosts: number;
  totalEngagement: number;
  achievements: Achievement[];
  badges: string[];
  title: string;
  joinedDate: Date;
}

interface GamificationSystemProps {
  userId: string;
  onAchievementUnlocked?: (achievement: Achievement) => void;
  className?: string;
}

export const GamificationSystem: React.FC<GamificationSystemProps> = ({
  userId,
  onAchievementUnlocked,
  className = '',
}) => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [recentUnlocks, setRecentUnlocks] = useState<Achievement[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Initialize achievements
  const achievements: Achievement[] = [
    // Content Creation Achievements
    {
      id: 'first_post',
      title: 'First Steps',
      description: 'Create your first post',
      icon: <Star className="w-6 h-6" />,
      category: 'content',
      rarity: 'common',
      points: 50,
      progress: 0,
      maxProgress: 1,
      unlocked: false,
    },
    {
      id: 'content_creator',
      title: 'Content Creator',
      description: 'Create 10 posts',
      icon: <Trophy className="w-6 h-6" />,
      category: 'content',
      rarity: 'common',
      points: 200,
      progress: 0,
      maxProgress: 10,
      unlocked: false,
    },
    {
      id: 'prolific_writer',
      title: 'Prolific Writer',
      description: 'Create 50 posts',
      icon: <Crown className="w-6 h-6" />,
      category: 'content',
      rarity: 'rare',
      points: 500,
      progress: 0,
      maxProgress: 50,
      unlocked: false,
      reward: { type: 'title', value: 'Content Master' },
    },
    {
      id: 'content_legend',
      title: 'Content Legend',
      description: 'Create 100 posts',
      icon: <Medal className="w-6 h-6" />,
      category: 'content',
      rarity: 'legendary',
      points: 1000,
      progress: 0,
      maxProgress: 100,
      unlocked: false,
      reward: { type: 'theme', value: 'legendary_sparkles' },
    },

    // Engagement Achievements
    {
      id: 'viral_post',
      title: 'Going Viral',
      description: 'Get 1000+ total engagement on a single post',
      icon: <TrendingUp className="w-6 h-6" />,
      category: 'engagement',
      rarity: 'epic',
      points: 750,
      progress: 0,
      maxProgress: 1000,
      unlocked: false,
    },
    {
      id: 'engagement_master',
      title: 'Engagement Master',
      description: 'Reach 10,000 total engagement across all posts',
      icon: <Users className="w-6 h-6" />,
      category: 'engagement',
      rarity: 'rare',
      points: 600,
      progress: 0,
      maxProgress: 10000,
      unlocked: false,
    },

    // Consistency Achievements
    {
      id: 'daily_poster',
      title: 'Daily Poster',
      description: 'Post content for 7 days in a row',
      icon: <Calendar className="w-6 h-6" />,
      category: 'consistency',
      rarity: 'common',
      points: 300,
      progress: 0,
      maxProgress: 7,
      unlocked: false,
    },
    {
      id: 'streak_master',
      title: 'Streak Master',
      description: 'Maintain a 30-day posting streak',
      icon: <Flame className="w-6 h-6" />,
      category: 'consistency',
      rarity: 'epic',
      points: 800,
      progress: 0,
      maxProgress: 30,
      unlocked: false,
      reward: { type: 'feature', value: 'streak_multiplier' },
    },

    // Special Achievements
    {
      id: 'skull_collector',
      title: 'Skull Collector 💀',
      description: 'Use the holographic theme for 30 days',
      icon: <Gift className="w-6 h-6" />,
      category: 'special',
      rarity: 'rare',
      points: 400,
      progress: 0,
      maxProgress: 30,
      unlocked: false,
      reward: { type: 'badge', value: 'skull_master' },
    },
    {
      id: 'voice_commander',
      title: 'Voice Commander',
      description: 'Use voice commands 50 times',
      icon: <Zap className="w-6 h-6" />,
      category: 'special',
      rarity: 'rare',
      points: 350,
      progress: 0,
      maxProgress: 50,
      unlocked: false,
    },
  ];

  useEffect(() => {
    loadUserStats();
  }, [userId]);

  const loadUserStats = () => {
    // In a real app, this would load from your database
    const savedStats = localStorage.getItem(`gamification_${userId}`);
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      setUserStats({
        ...stats,
        achievements: achievements.map((achievement) => {
          const saved = stats.achievements?.find((a: Achievement) => a.id === achievement.id);
          return saved ? { ...achievement, ...saved } : achievement;
        }),
      });
    } else {
      // Initialize new user
      setUserStats({
        level: 1,
        totalPoints: 0,
        pointsToNextLevel: 100,
        currentStreak: 0,
        longestStreak: 0,
        totalPosts: 0,
        totalEngagement: 0,
        achievements,
        badges: [],
        title: 'Content Newbie',
        joinedDate: new Date(),
      });
    }
  };

  const saveUserStats = (stats: UserStats) => {
    localStorage.setItem(`gamification_${userId}`, JSON.stringify(stats));
  };

  const checkAchievements = (stats: UserStats) => {
    const newUnlocks: Achievement[] = [];

    stats.achievements.forEach((achievement) => {
      if (!achievement.unlocked && achievement.progress >= achievement.maxProgress) {
        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        stats.totalPoints += achievement.points;

        // Add reward
        if (achievement.reward) {
          switch (achievement.reward.type) {
            case 'title':
              stats.title = achievement.reward.value;
              break;
            case 'badge':
              stats.badges.push(achievement.reward.value);
              break;
          }
        }

        newUnlocks.push(achievement);
        onAchievementUnlocked?.(achievement);
      }
    });

    // Check for level up
    const newLevel = Math.floor(stats.totalPoints / 100) + 1;
    if (newLevel > stats.level) {
      stats.level = newLevel;
      stats.pointsToNextLevel = newLevel * 100 - stats.totalPoints;
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    } else {
      stats.pointsToNextLevel = stats.level * 100 - stats.totalPoints;
    }

    if (newUnlocks.length > 0) {
      setRecentUnlocks(newUnlocks);
      setTimeout(() => setRecentUnlocks([]), 5000);
    }

    return stats;
  };

  const updateProgress = (achievementId: string, progress: number) => {
    if (!userStats) return;

    const updatedStats = { ...userStats };
    const achievement = updatedStats.achievements.find((a) => a.id === achievementId);

    if (achievement && !achievement.unlocked) {
      achievement.progress = Math.min(achievement.maxProgress, achievement.progress + progress);
    }

    const finalStats = checkAchievements(updatedStats);
    setUserStats(finalStats);
    saveUserStats(finalStats);
  };

  // Public methods for tracking user actions
  const trackPostCreated = () => {
    if (!userStats) return;

    const updatedStats = { ...userStats };
    updatedStats.totalPosts += 1;
    updatedStats.currentStreak += 1;
    updatedStats.longestStreak = Math.max(updatedStats.longestStreak, updatedStats.currentStreak);

    // Update achievement progress
    updateProgress('first_post', 1);
    updateProgress('content_creator', 1);
    updateProgress('prolific_writer', 1);
    updateProgress('content_legend', 1);
    updateProgress('daily_poster', 1);
    updateProgress('streak_master', 1);
  };

  const trackEngagement = (engagementCount: number) => {
    if (!userStats) return;

    const updatedStats = { ...userStats };
    updatedStats.totalEngagement += engagementCount;

    // Check for viral post
    if (engagementCount >= 1000) {
      updateProgress('viral_post', engagementCount);
    }

    // Update total engagement achievement
    updateProgress('engagement_master', engagementCount);
  };

  const trackVoiceCommand = () => {
    updateProgress('voice_commander', 1);
  };

  const trackThemeUsage = () => {
    updateProgress('skull_collector', 1);
  };

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'text-gray-400 border-gray-400';
      case 'rare':
        return 'text-blue-400 border-blue-400';
      case 'epic':
        return 'text-purple-400 border-purple-400';
      case 'legendary':
        return 'text-yellow-400 border-yellow-400';
      default:
        return 'text-gray-400 border-gray-400';
    }
  };

  const getRarityGlow = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'rare':
        return 'shadow-blue-400/50';
      case 'epic':
        return 'shadow-purple-400/50';
      case 'legendary':
        return 'shadow-yellow-400/50';
      default:
        return '';
    }
  };

  if (!userStats) return null;

  return (
    <div className={className}>
      {/* Level Up Animation */}
      {showLevelUp && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <HoloCard className="p-8 text-center animate-bounce">
            <SparkleEffect count={20} size="large" />
            <HoloText variant="title" glow className="mb-4">
              🎉 LEVEL UP! 🎉
            </HoloText>
            <HoloText variant="subtitle">You reached Level {userStats.level}!</HoloText>
            <FloatingSkull className="mt-4" size="large" />
          </HoloCard>
        </div>
      )}

      {/* Recent Achievement Unlocks */}
      {recentUnlocks.map((achievement, index) => (
        <div
          key={achievement.id}
          className="fixed top-20 right-4 z-40 animate-slide-in-right"
          style={{ animationDelay: `${index * 0.5}s` }}
        >
          <HoloCard
            className={`p-4 border-2 ${getRarityColor(achievement.rarity)} ${getRarityGlow(achievement.rarity)}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 ${getRarityColor(achievement.rarity)}`}
              >
                {achievement.icon}
              </div>
              <div>
                <HoloText variant="subtitle" glow>
                  Achievement Unlocked! ✨
                </HoloText>
                <HoloText className="text-sm">{achievement.title}</HoloText>
                <HoloText className="text-xs text-white/70">+{achievement.points} points</HoloText>
              </div>
            </div>
            <SparkleEffect count={8} size="small" />
          </HoloCard>
        </div>
      ))}

      {/* Main Stats Display */}
      <HoloCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-2xl font-bold">
                {userStats.level}
              </div>
              <FloatingSkull className="absolute -top-2 -right-2" size="small" />
            </div>
            <div>
              <HoloText variant="title" glow>
                {userStats.title}
              </HoloText>
              <HoloText className="text-sm text-white/70">
                Level {userStats.level} • {userStats.totalPoints} points
              </HoloText>
            </div>
          </div>

          <HoloButton
            onClick={() => setShowAchievements(!showAchievements)}
            className="flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            Achievements
          </HoloButton>
        </div>

        {/* Progress to Next Level */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <HoloText className="text-sm">Progress to Level {userStats.level + 1}</HoloText>
            <HoloText className="text-sm">{userStats.pointsToNextLevel} points to go</HoloText>
          </div>
          <RainbowProgress value={userStats.totalPoints % 100} max={100} showSparkles />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-glass-pink rounded-lg">
            <HoloText variant="subtitle" glow>
              {userStats.totalPosts}
            </HoloText>
            <HoloText className="text-xs">Posts Created</HoloText>
          </div>
          <div className="text-center p-3 bg-glass-purple rounded-lg">
            <HoloText variant="subtitle" glow>
              {userStats.currentStreak}
            </HoloText>
            <HoloText className="text-xs">Current Streak</HoloText>
          </div>
          <div className="text-center p-3 bg-glass-cyan rounded-lg">
            <HoloText variant="subtitle" glow>
              {userStats.totalEngagement}
            </HoloText>
            <HoloText className="text-xs">Total Engagement</HoloText>
          </div>
          <div className="text-center p-3 bg-glass-purple rounded-lg">
            <HoloText variant="subtitle" glow>
              {userStats.achievements.filter((a) => a.unlocked).length}
            </HoloText>
            <HoloText className="text-xs">Achievements</HoloText>
          </div>
        </div>
      </HoloCard>

      {/* Achievements Panel */}
      {showAchievements && (
        <HoloCard className="mt-4 p-6">
          <div className="flex items-center justify-between mb-6">
            <HoloText variant="title" glow>
              🏆 Achievements
            </HoloText>
            <div className="flex gap-2">
              {['all', 'content', 'engagement', 'consistency', 'special'].map((category) => (
                <button
                  key={category}
                  className="px-3 py-1 text-xs rounded-full bg-white/10 hover:bg-white/20 transition-colors capitalize"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userStats.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                  achievement.unlocked
                    ? `${getRarityColor(achievement.rarity)} bg-white/5 ${getRarityGlow(achievement.rarity)}`
                    : 'border-gray-600 bg-gray-800/50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`p-2 rounded-lg ${
                      achievement.unlocked
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500'
                        : 'bg-gray-700'
                    }`}
                  >
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <HoloText className="font-medium mb-1">{achievement.title}</HoloText>
                    <HoloText className="text-xs text-white/70 mb-2">
                      {achievement.description}
                    </HoloText>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getRarityColor(achievement.rarity)} bg-current/20`}
                      >
                        {achievement.rarity}
                      </span>
                      <span className="text-xs text-yellow-400">{achievement.points} pts</span>
                    </div>
                  </div>
                </div>

                {!achievement.unlocked && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-white/60">Progress</span>
                      <span className="text-xs text-white/60">
                        {achievement.progress}/{achievement.maxProgress}
                      </span>
                    </div>
                    <RainbowProgress
                      value={achievement.progress}
                      max={achievement.maxProgress}
                      className="h-2"
                    />
                  </div>
                )}

                {achievement.unlocked && achievement.unlockedAt && (
                  <div className="text-xs text-green-400 mt-2">
                    ✅ Unlocked {achievement.unlockedAt.toLocaleDateString()}
                  </div>
                )}

                {achievement.unlocked && <SparkleEffect count={3} size="small" />}
              </div>
            ))}
          </div>
        </HoloCard>
      )}

      {/* Expose tracking methods */}
      <div style={{ display: 'none' }}>
        {/* These would be called from parent components */}
        <button onClick={trackPostCreated}>Track Post</button>
        <button onClick={() => trackEngagement(100)}>Track Engagement</button>
        <button onClick={trackVoiceCommand}>Track Voice</button>
        <button onClick={trackThemeUsage}>Track Theme</button>
      </div>
    </div>
  );
};

export default GamificationSystem;
