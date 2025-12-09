import React, { useState, useEffect } from 'react';
import {
  PerformanceReport,
  AnalyticsData,
  ContentInsight,
  PerformanceTrend,
  PlatformMetrics,
  LoadingState,
} from '../types';
// import { analyticsService } from '../services/analyticsService';
import { Spinner } from '../constants';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  loading: LoadingState;
  setLoading: (loading: LoadingState) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  isOpen,
  onClose,
  loading,
  setLoading,
}) => {
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter' | 'year'>(
    'month'
  );
  const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'reach' | 'rate'>(
    'engagement'
  );
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadPerformanceReport();
    }
  }, [isOpen, selectedTimeframe]);

  const loadPerformanceReport = async () => {
    try {
      setLoading({ ...loading, performanceReport: true });
      setError('');

      const report = await analyticsService.generatePerformanceReport(selectedTimeframe);
      setPerformanceReport(report);
    } catch (error) {
      console.error('Error loading performance report:', error);
      setError('Failed to load performance report. Please try again.');
    } finally {
      setLoading({ ...loading, performanceReport: false });
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return num.toFixed(1) + '%';
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'stable'): string => {
    switch (direction) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      case 'stable':
        return '→';
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'stable'): string => {
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
    }
  };

  const renderMetricCard = (title: string, value: string, trend?: PerformanceTrend) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 ${getTrendColor(trend.direction)}`}>
            <span className="text-lg">{getTrendIcon(trend.direction)}</span>
            <span className="text-sm font-medium">{formatPercentage(trend.percentage)}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderPlatformChart = () => {
    if (!performanceReport?.platformBreakdown) return null;

    const platforms = Object.entries(performanceReport.platformBreakdown);
    const maxEngagement = Math.max(
      ...platforms.map(
        ([, metrics]) => metrics.totalLikes + metrics.totalShares + metrics.totalComments
      )
    );

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Performance</h3>
        <div className="space-y-4">
          {platforms.map(([platform, metrics]) => {
            const totalEngagement =
              metrics.totalLikes + metrics.totalShares + metrics.totalComments;
            const percentage = maxEngagement > 0 ? (totalEngagement / maxEngagement) * 100 : 0;

            return (
              <div key={platform} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 capitalize">{platform}</span>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatNumber(totalEngagement)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPercentage(metrics.avgEngagementRate)} rate
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTopContent = () => {
    if (!performanceReport?.topContent?.length) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Content</h3>
        <div className="space-y-3">
          {performanceReport.topContent.slice(0, 5).map((content, index) => (
            <div
              key={content.postId}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{content.title}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-gray-500 capitalize">{content.platform}</span>
                  <span className="text-xs text-gray-500">{content.contentType}</span>
                  <span className="text-xs font-medium text-blue-600">
                    Score: {content.engagementScore.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTrendsChart = () => {
    if (!performanceReport?.trends?.length) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {performanceReport.trends.map((trend, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-2xl mb-2 ${getTrendColor(trend.direction)}`}>
                {getTrendIcon(trend.direction)}
              </div>
              <p className="text-sm font-medium text-gray-900">{trend.metric}</p>
              <p className={`text-lg font-bold ${getTrendColor(trend.direction)}`}>
                {formatPercentage(trend.percentage)}
              </p>
              <p className="text-xs text-gray-500">vs {trend.timeframe}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
            <p className="text-sm text-gray-600">Performance insights and metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Timeframe Selector */}
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
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
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading.performanceReport ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-2 text-gray-600">Loading analytics...</span>
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
                onClick={loadPerformanceReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : performanceReport ? (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {renderMetricCard('Total Posts', performanceReport.totalPosts.toString())}
                {renderMetricCard(
                  'Total Engagement',
                  formatNumber(performanceReport.totalEngagement),
                  performanceReport.trends.find((t) => t.metric === 'Total Engagement')
                )}
                {renderMetricCard(
                  'Avg Engagement Rate',
                  formatPercentage(performanceReport.avgEngagementRate),
                  performanceReport.trends.find((t) => t.metric === 'Engagement Rate')
                )}
                {renderMetricCard(
                  'Total Reach',
                  formatNumber(
                    Object.values(performanceReport.platformBreakdown).reduce(
                      (sum, metrics) =>
                        sum + (metrics.totalLikes + metrics.totalShares + metrics.totalComments),
                      0
                    )
                  ),
                  performanceReport.trends.find((t) => t.metric === 'Total Reach')
                )}
              </div>

              {/* Charts and Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderPlatformChart()}
                {renderTopContent()}
              </div>

              {/* Trends */}
              {renderTrendsChart()}

              {/* Quick Actions */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTimeframe('week')}
                    className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    View Weekly Report
                  </button>
                  <button
                    onClick={() => setSelectedTimeframe('month')}
                    className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    View Monthly Report
                  </button>
                  <button
                    onClick={loadPerformanceReport}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Refresh Data
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
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
              <p className="text-gray-600 mb-4">No analytics data available</p>
              <p className="text-sm text-gray-500">
                Start creating and publishing content to see performance insights
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
