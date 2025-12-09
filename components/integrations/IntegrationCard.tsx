import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Integration, ConnectionTestResult, SyncResult } from '../../types';

interface IntegrationCardProps {
  integration: Integration;
  onTestConnection: (id: string) => Promise<ConnectionTestResult>;
  onSync: (id: string) => Promise<SyncResult>;
  onConnect: (id: string) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
  onConfigure: (integration: Integration) => void;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onTestConnection,
  onSync,
  onConnect,
  onDisconnect,
  onConfigure,
  onDelete,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      twitter: '🐦',
      linkedin: '💼',
      facebook: '📘',
      instagram: '📷',
      tiktok: '🎵',
      youtube: '📺',
      google_analytics: '📊',
      facebook_analytics: '📈',
      openai: '🤖',
      claude: '🧠',
      google_drive: '💾',
      dropbox: '📁',
      hubspot: '🎯',
      salesforce: '☁️',
      mailchimp: '📧',
      sendgrid: '📮',
    };
    return icons[platform] || '🔗';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'syncing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'social_media':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'analytics':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'crm':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'email':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'storage':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'ai_service':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Handle action with loading state
  const handleAction = async (action: () => Promise<any>) => {
    setIsActionLoading(true);
    try {
      await action();
    } finally {
      setIsActionLoading(false);
    }
  };

  // Format last sync time
  const formatLastSync = (lastSync?: Date) => {
    if (!lastSync) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <motion.div
      layout
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getPlatformIcon(integration.platform)}</div>
            <div>
              <h4 className="font-semibold text-gray-900">{integration.name}</h4>
              <p className="text-sm text-gray-600 capitalize">
                {integration.platform.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(integration.status)}`}
            >
              {integration.status}
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                ▼
              </motion.div>
            </button>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`px-2 py-1 rounded text-xs font-medium border ${getTypeColor(integration.type)}`}
          >
            {integration.type.replace('_', ' ')}
          </span>
          <div className="text-xs text-gray-500">
            Last sync: {formatLastSync(integration.lastSync)}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                integration.isActive ? 'bg-green-500' : 'bg-gray-400'
              }`}
            ></div>
            {integration.isActive ? 'Active' : 'Inactive'}
          </div>
          <div>Sync: {integration.syncFrequency}</div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {integration.status === 'connected' ? (
            <>
              <button
                onClick={() => handleAction(() => onSync(integration.id))}
                disabled={isLoading || isActionLoading}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isActionLoading ? '⏳' : '🔄'} Sync
              </button>
              <button
                onClick={() => handleAction(() => onDisconnect(integration.id))}
                disabled={isLoading || isActionLoading}
                className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => handleAction(() => onConnect(integration.id))}
              disabled={isLoading || isActionLoading}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isActionLoading ? '⏳' : '🔗'} Connect
            </button>
          )}

          <button
            onClick={() => handleAction(() => onTestConnection(integration.id))}
            disabled={isLoading || isActionLoading}
            className="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isActionLoading ? '⏳' : '🔍'} Test
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="pt-4 space-y-3">
            {/* Configuration Details */}
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">Configuration</h5>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  Auto Sync: {integration.configuration.syncSettings?.autoSync ? 'Yes' : 'No'}
                </div>
                <div>Batch Size: {integration.configuration.syncSettings?.batchSize || 'N/A'}</div>
                <div>
                  Retry Attempts: {integration.configuration.errorHandling?.maxRetries || 'N/A'}
                </div>
                <div>Timeout: {integration.configuration.syncSettings?.timeoutMs || 'N/A'}ms</div>
              </div>
            </div>

            {/* Rate Limits */}
            {integration.configuration.rateLimits && (
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-2">Rate Limits</h5>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Per Minute: {integration.configuration.rateLimits.requestsPerMinute}</div>
                  <div>Per Hour: {integration.configuration.rateLimits.requestsPerHour}</div>
                  <div>Per Day: {integration.configuration.rateLimits.requestsPerDay}</div>
                  <div>Burst Limit: {integration.configuration.rateLimits.burstLimit}</div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {integration.configuration.notifications && (
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-2">Notifications</h5>
                <div className="flex flex-wrap gap-2">
                  {integration.configuration.notifications.emailNotifications && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      Email
                    </span>
                  )}
                  {integration.configuration.notifications.webhookNotifications && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      Webhook
                    </span>
                  )}
                  {integration.configuration.notifications.slackNotifications && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                      Slack
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onConfigure(integration)}
                className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 transition-colors"
              >
                ⚙️ Configure
              </button>
              <button
                onClick={() => onDelete(integration.id)}
                disabled={isLoading || isActionLoading}
                className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default IntegrationCard;
