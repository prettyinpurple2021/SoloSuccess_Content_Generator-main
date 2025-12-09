import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Integration,
  UpdateIntegrationData,
  ConnectionTestResult,
  SyncResult,
  HealthCheckResult,
} from '../../types';

interface ConfigureIntegrationProps {
  integration: Integration | null;
  onUpdateIntegration: (id: string, updates: UpdateIntegrationData) => Promise<void>;
  onTestConnection: (id: string) => Promise<ConnectionTestResult>;
  onSync: (id: string) => Promise<SyncResult>;
  onCheckHealth: (id: string) => Promise<HealthCheckResult>;
  onBack: () => void;
  isLoading: boolean;
}

const ConfigureIntegration: React.FC<ConfigureIntegrationProps> = ({
  integration,
  onUpdateIntegration,
  onTestConnection,
  onSync,
  onCheckHealth,
  onBack,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'sync' | 'webhooks' | 'monitoring'>(
    'general'
  );
  const [formData, setFormData] = useState<UpdateIntegrationData>({});
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);

  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name,
        syncFrequency: integration.syncFrequency,
        isActive: integration.isActive,
        configuration: integration.configuration,
      });
    }
  }, [integration]);

  if (!integration) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-2xl font-semibold text-white mb-2">No Integration Selected</h3>
        <p className="text-white/70 mb-6">Please select an integration to configure</p>
        <button
          onClick={onBack}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
        >
          Go Back
        </button>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await onUpdateIntegration(integration.id, formData);
    } catch (error) {
      console.error('Failed to update integration:', error);
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await onTestConnection(integration.id);
      setTestResult(result);
    } catch (error) {
      console.error('Failed to test connection:', error);
    }
  };

  const handleSync = async () => {
    try {
      const result = await onSync(integration.id);
      setSyncResult(result);
    } catch (error) {
      console.error('Failed to sync:', error);
    }
  };

  const handleHealthCheck = async () => {
    try {
      const result = await onCheckHealth(integration.id);
      setHealthResult(result);
    } catch (error) {
      console.error('Failed to check health:', error);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: { [key: string]: string } = {
      twitter: '🐦',
      linkedin: '💼',
      facebook: '📘',
      instagram: '📷',
      tiktok: '🎵',
      google_analytics: '📊',
      facebook_analytics: '📈',
      twitter_analytics: '📊',
      openai: '🤖',
      claude: '🧠',
    };
    return icons[platform] || '🔗';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-400 bg-green-400/20 border-green-400/50';
      case 'disconnected':
        return 'text-gray-400 bg-gray-400/20 border-gray-400/50';
      case 'error':
        return 'text-red-400 bg-red-400/20 border-red-400/50';
      case 'syncing':
        return 'text-blue-400 bg-blue-400/20 border-blue-400/50';
      default:
        return 'text-gray-400 bg-gray-400/20 border-gray-400/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-white/60 hover:text-white text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all duration-300"
          >
            ←
          </button>
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{getPlatformIcon(integration.platform)}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{integration.name}</h2>
              <p className="text-white/70 capitalize">
                {integration.platform} • {integration.type.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
        <div
          className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(integration.status)}`}
        >
          {integration.status}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/20">
        {[
          { key: 'general', label: 'General', icon: '⚙️' },
          { key: 'sync', label: 'Sync Settings', icon: '🔄' },
          { key: 'webhooks', label: 'Webhooks', icon: '🔗' },
          { key: 'monitoring', label: 'Monitoring', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === tab.key
                ? 'border-purple-400 text-white bg-white/10'
                : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'general' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Integration Name
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Sync Frequency
                  </label>
                  <select
                    value={formData.syncFrequency || 'hourly'}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, syncFrequency: e.target.value as any }))
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  >
                    <option value="realtime">Real-time</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="manual">Manual Only</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive ?? true}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-white/80">
                    Integration is active
                  </label>
                </div>
              </div>
            </div>

            {/* Connection Test */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Connection Test</h3>
              <div className="space-y-4">
                <button
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="bg-blue-500/20 text-blue-300 px-6 py-3 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>🔍</span>
                  <span>Test Connection</span>
                </button>
                {testResult && (
                  <div
                    className={`p-4 rounded-lg ${
                      testResult.success
                        ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                        : 'bg-red-500/20 border border-red-500/50 text-red-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span>{testResult.success ? '✅' : '❌'}</span>
                      <span className="font-medium">
                        {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                      </span>
                    </div>
                    {testResult.error && <p className="text-sm">{testResult.error}</p>}
                    {testResult.details && (
                      <div className="text-sm mt-2">
                        <p>Response Time: {testResult.responseTime}ms</p>
                        <pre className="mt-2 text-xs bg-black/20 p-2 rounded">
                          {JSON.stringify(testResult.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'sync' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Sync Settings</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Auto Sync
                    </label>
                    <input
                      type="checkbox"
                      checked={formData.configuration?.syncSettings?.autoSync ?? true}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            syncSettings: {
                              ...prev.configuration?.syncSettings,
                              autoSync: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500 focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Sync Interval (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.configuration?.syncSettings?.syncInterval || 60}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            syncSettings: {
                              ...prev.configuration?.syncSettings,
                              syncInterval: parseInt(e.target.value),
                            },
                          },
                        }))
                      }
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Batch Size
                    </label>
                    <input
                      type="number"
                      value={formData.configuration?.syncSettings?.batchSize || 100}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            syncSettings: {
                              ...prev.configuration?.syncSettings,
                              batchSize: parseInt(e.target.value),
                            },
                          },
                        }))
                      }
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      value={formData.configuration?.syncSettings?.retryAttempts || 3}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            syncSettings: {
                              ...prev.configuration?.syncSettings,
                              retryAttempts: parseInt(e.target.value),
                            },
                          },
                        }))
                      }
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Sync */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Manual Sync</h3>
              <div className="space-y-4">
                <button
                  onClick={handleSync}
                  disabled={isLoading}
                  className="bg-green-500/20 text-green-300 px-6 py-3 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>🔄</span>
                  <span>Sync Now</span>
                </button>
                {syncResult && (
                  <div
                    className={`p-4 rounded-lg ${
                      syncResult.success
                        ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                        : 'bg-red-500/20 border border-red-500/50 text-red-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span>{syncResult.success ? '✅' : '❌'}</span>
                      <span className="font-medium">
                        {syncResult.success ? 'Sync Completed' : 'Sync Failed'}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>Records Processed: {syncResult.recordsProcessed}</p>
                      <p>Records Created: {syncResult.recordsCreated}</p>
                      <p>Records Updated: {syncResult.recordsUpdated}</p>
                      <p>Duration: {syncResult.duration}ms</p>
                      {syncResult.errors.length > 0 && (
                        <div>
                          <p className="font-medium">Errors:</p>
                          <ul className="list-disc list-inside">
                            {syncResult.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'webhooks' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Webhooks</h3>
              <p className="text-white/70 mb-4">
                Configure webhooks to receive real-time notifications about integration events.
              </p>
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔗</div>
                <p className="text-white/70">Webhook management coming soon</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'monitoring' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Health Monitoring</h3>
              <div className="space-y-4">
                <button
                  onClick={handleHealthCheck}
                  disabled={isLoading}
                  className="bg-purple-500/20 text-purple-300 px-6 py-3 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>🏥</span>
                  <span>Check Health</span>
                </button>
                {healthResult && (
                  <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-2xl">🏥</span>
                      <div>
                        <p className="font-medium text-white">
                          Health Score: {healthResult.healthScore}%
                        </p>
                        <p className="text-sm text-white/70">
                          Last checked: {healthResult.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {healthResult.checks.map((check, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span>{check.success ? '✅' : '❌'}</span>
                          <span className="text-sm text-white/80 capitalize">{check.check}</span>
                          {check.error && (
                            <span className="text-sm text-red-400">({check.error})</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {healthResult.recommendations.length > 0 && (
                      <div className="mt-4">
                        <p className="font-medium text-white mb-2">Recommendations:</p>
                        <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                          {healthResult.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default ConfigureIntegration;
