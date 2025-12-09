import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Integration,
  CreateIntegrationData,
  UpdateIntegrationData,
  ConnectionTestResult,
  SyncResult,
  HealthCheckResult,
  IntegrationType,
  SyncFrequency,
} from '../types';
import { apiService } from '../services/clientApiService';
import IntegrationOverview from './integrations/IntegrationOverview';
import AddIntegration from './integrations/AddIntegration';
import ConfigureIntegration from './integrations/ConfigureIntegration';
import MonitorIntegrations from './integrations/MonitorIntegrations';

interface IntegrationManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onIntegrationUpdate?: (integration: Integration) => void;
  userId?: string;
}

type ActiveTab = 'overview' | 'add' | 'configure' | 'monitor';

const IntegrationManager: React.FC<IntegrationManagerProps> = ({
  isOpen,
  onClose,
  onIntegrationUpdate,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load integrations on component mount
  useEffect(() => {
    if (isOpen && userId) {
      loadIntegrations();
    }
  }, [isOpen, userId]);

  // Load all integrations
  const loadIntegrations = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const data = await apiService.getIntegrations(userId);
      setIntegrations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new integration
  const createIntegration = async (data: CreateIntegrationData) => {
    if (!userId) {
      setError('User ID is required');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const newIntegration = await apiService.addIntegration(userId, data);
      setIntegrations((prev) => [...prev, newIntegration]);
      setSuccess('Integration created successfully');
      setActiveTab('overview');
      onIntegrationUpdate?.(newIntegration);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create integration');
    } finally {
      setIsLoading(false);
    }
  };

  // Update existing integration
  const updateIntegration = async (id: string, updates: UpdateIntegrationData) => {
    if (!userId) {
      setError('User ID is required');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const updatedIntegration = await apiService.updateIntegration(userId, id, updates);
      setIntegrations((prev) => prev.map((i) => (i.id === id ? updatedIntegration : i)));
      setSuccess('Integration updated successfully');
      onIntegrationUpdate?.(updatedIntegration);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update integration');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete integration
  const deleteIntegration = async (id: string) => {
    if (!userId) {
      setError('User ID is required');
      return;
    }
    if (
      !confirm('Are you sure you want to delete this integration? This action cannot be undone.')
    ) {
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await apiService.deleteIntegration(userId, id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      setSuccess('Integration deleted successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration');
    } finally {
      setIsLoading(false);
    }
  };

  // Test connection
  const testConnection = async (id: string): Promise<ConnectionTestResult> => {
    if (!userId) {
      setError('User ID is required');
      return {
        success: false,
        error: 'User ID is required',
        responseTime: 0,
        timestamp: new Date(),
      };
    }
    try {
      setIsLoading(true);
      setError('');
      const result = await apiService.testConnection(userId, id);

      if (result.success) {
        setSuccess('Connection test successful');
        // Update integration status
        const integration = integrations.find((i) => i.id === id);
        if (integration) {
          const updatedIntegration = { ...integration, status: 'connected' as const };
          setIntegrations((prev) => prev.map((i) => (i.id === id ? updatedIntegration : i)));
        }
      } else {
        setError(`Connection test failed: ${result.error}`);
      }

      // Clear messages after 3 seconds
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      setError(errorMessage);
      setTimeout(() => setError(''), 3000);
      return {
        success: false,
        error: errorMessage,
        responseTime: 0,
        timestamp: new Date(),
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Sync integration
  const syncIntegration = async (id: string): Promise<SyncResult> => {
    if (!userId) {
      setError('User ID is required');
      return {
        integrationId: id,
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errors: ['User ID is required'],
        duration: 0,
        timestamp: new Date(),
      };
    }
    try {
      setIsLoading(true);
      setError('');
      const result = await apiService.syncIntegration(userId, id);

      if (result.success) {
        setSuccess(`Sync completed: ${result.recordsProcessed} records processed`);
        // Update integration last sync time
        const integration = integrations.find((i) => i.id === id);
        if (integration) {
          const updatedIntegration = { ...integration, lastSync: result.timestamp };
          setIntegrations((prev) => prev.map((i) => (i.id === id ? updatedIntegration : i)));
        }
      } else {
        setError(`Sync failed: ${result.errors.join(', ')}`);
      }

      // Clear messages after 5 seconds
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
      return {
        integrationId: id,
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errors: [errorMessage],
        duration: 0,
        timestamp: new Date(),
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Health check
  const checkHealth = async (id: string): Promise<HealthCheckResult> => {
    if (!userId) {
      setError('User ID is required');
      throw new Error('User ID is required');
    }
    try {
      setIsLoading(true);
      setError('');
      const result = await apiService.checkIntegrationHealth(userId, id);
      setSuccess(`Health check completed: ${result.healthScore}% health score`);
      setTimeout(() => setSuccess(''), 3000);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Health check failed';
      setError(errorMessage);
      setTimeout(() => setError(''), 3000);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Connect integration
  const connectIntegration = async (id: string) => {
    if (!userId) {
      setError('User ID is required');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const result = await apiService.connectIntegration(userId, id);
      const success = result.success;

      if (success) {
        setSuccess('Integration connected successfully');
        // Update integration status
        const integration = integrations.find((i) => i.id === id);
        if (integration) {
          const updatedIntegration = { ...integration, status: 'connected' as const };
          setIntegrations((prev) => prev.map((i) => (i.id === id ? updatedIntegration : i)));
        }
      } else {
        setError('Failed to connect integration');
      }

      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect integration');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect integration
  const disconnectIntegration = async (id: string) => {
    if (!userId) {
      setError('User ID is required');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      await apiService.disconnectIntegration(userId, id);
      setSuccess('Integration disconnected successfully');

      // Update integration status
      const integration = integrations.find((i) => i.id === id);
      if (integration) {
        const updatedIntegration = { ...integration, status: 'disconnected' as const };
        setIntegrations((prev) => prev.map((i) => (i.id === id ? updatedIntegration : i)));
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect integration');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync all integrations
  const syncAllIntegrations = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const results = await Promise.allSettled(
        integrations.map((integration) => apiService.syncIntegration(userId, integration.id))
      );
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const total = results.length;
      setSuccess(`Sync completed: ${successful}/${total} integrations synced successfully`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync all integrations');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Check all health
  const checkAllHealth = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const healthChecks = await Promise.allSettled(
        integrations.map((integration) => apiService.checkIntegrationHealth(userId, integration.id))
      );
      const successful = healthChecks.filter((h) => h.status === 'fulfilled').length;
      const total = healthChecks.length;
      setSuccess(`Health check completed: ${successful}/${total} integrations checked`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check all integrations health');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Export integration data
  const exportIntegrationData = () => {
    try {
      const dataStr = JSON.stringify(integrations, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `integrations-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccess('Integration data exported successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to export integration data');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'add', label: 'Add Integration', icon: '➕' },
    { key: 'configure', label: 'Configure', icon: '⚙️' },
    { key: 'monitor', label: 'Monitor', icon: '📈' },
  ] as const;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden border border-white/20 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-8 border-b border-white/20 bg-white/10 backdrop-blur-sm">
            <div>
              <h2 className="text-4xl font-bold gradient-text">Integration Manager</h2>
              <p className="text-lg text-white/80 mt-2">
                Manage your external platform integrations
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-3xl font-bold w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/20 transition-all duration-300"
            >
              ×
            </button>
          </div>

          {/* Alert Messages */}
          {(error || success) && (
            <div className="px-8 py-4">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-lg flex items-center text-lg">
                  <span className="text-red-400 mr-3 text-xl">⚠️</span>
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-6 py-4 rounded-lg flex items-center text-lg">
                  <span className="text-green-400 mr-3 text-xl">✅</span>
                  {success}
                </div>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-white/20 bg-white/5 backdrop-blur-sm">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-8 py-6 font-medium text-lg border-b-2 transition-all duration-300 flex items-center ${
                  activeTab === tab.key
                    ? 'border-purple-400 text-white bg-white/10'
                    : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="mr-3 text-2xl">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex items-center space-x-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
                <span className="text-white text-xl font-medium">Processing...</span>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="p-8 overflow-y-auto max-h-[calc(95vh-300px)] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && (
                  <IntegrationOverview
                    integrations={integrations}
                    onTestConnection={testConnection}
                    onSync={syncIntegration}
                    onConnect={connectIntegration}
                    onDisconnect={disconnectIntegration}
                    onDelete={deleteIntegration}
                    onConfigure={(integration) => {
                      setSelectedIntegration(integration);
                      setActiveTab('configure');
                    }}
                    onSyncAll={syncAllIntegrations}
                    onCheckAllHealth={checkAllHealth}
                    onExportData={exportIntegrationData}
                    isLoading={isLoading}
                  />
                )}
                {activeTab === 'add' && (
                  <AddIntegration onCreateIntegration={createIntegration} isLoading={isLoading} />
                )}
                {activeTab === 'configure' && (
                  <ConfigureIntegration
                    integration={selectedIntegration}
                    onUpdateIntegration={updateIntegration}
                    onTestConnection={testConnection}
                    onSync={syncIntegration}
                    onCheckHealth={checkHealth}
                    onBack={() => {
                      setSelectedIntegration(null);
                      setActiveTab('overview');
                    }}
                    isLoading={isLoading}
                  />
                )}
                {activeTab === 'monitor' && (
                  <MonitorIntegrations
                    integrations={integrations}
                    onRefresh={loadIntegrations}
                    isLoading={isLoading}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IntegrationManager;
