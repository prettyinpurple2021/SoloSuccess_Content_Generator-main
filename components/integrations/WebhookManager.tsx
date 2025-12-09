import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WebhookConfig, WebhookEvent } from '../../types';
// import { integrationService } from '../../services/integrationService';

interface WebhookManagerProps {
  integrationId: string;
}

const WebhookManager: React.FC<WebhookManagerProps> = ({ integrationId }) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load webhooks on component mount
  useEffect(() => {
    loadWebhooks();
  }, [integrationId]);

  // Load webhooks
  const loadWebhooks = async () => {
    try {
      setIsLoading(true);
      setError('');
      // const data = await integrationService.getWebhooks(integrationId);
      const data: WebhookConfig[] = []; // Temporary placeholder
      setWebhooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  // Add webhook
  const handleAddWebhook = async (webhookData: Omit<WebhookConfig, 'id'>) => {
    try {
      setIsLoading(true);
      setError('');
      // const newWebhook = await integrationService.addWebhook(integrationId, webhookData);
      const newWebhook: WebhookConfig = { id: 'temp', ...webhookData }; // Temporary placeholder
      setWebhooks((prev) => [...prev, newWebhook]);
      setShowAddWebhook(false);
      setSuccess('Webhook added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add webhook');
    } finally {
      setIsLoading(false);
    }
  };

  // Update webhook
  const handleUpdateWebhook = async (webhookId: string, updates: Partial<WebhookConfig>) => {
    try {
      setIsLoading(true);
      setError('');
      // const updatedWebhook = await integrationService.updateWebhook(webhookId, updates);
      const updatedWebhook: WebhookConfig = { id: webhookId, ...updates } as WebhookConfig; // Temporary placeholder
      setWebhooks((prev) => prev.map((w) => (w.id === webhookId ? updatedWebhook : w)));
      setSuccess('Webhook updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update webhook');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete webhook
  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      // await integrationService.deleteWebhook(webhookId);
      // Temporary placeholder - just remove from local state
      setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
      setSuccess('Webhook deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    } finally {
      setIsLoading(false);
    }
  };

  // Test webhook
  const handleTestWebhook = async (webhookId: string) => {
    try {
      setIsLoading(true);
      setError('');

      const webhook = webhooks.find((w) => w.id === webhookId);
      if (!webhook) {
        throw new Error('Webhook not found');
      }

      // Create test payload
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        message: 'This is a test webhook delivery from SoloSuccess AI Content Planner',
        test: true,
      };

      // Create signature for verification
      const crypto = await import('crypto');
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(testPayload))
        .digest('hex');

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': 'test',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': Date.now().toString(),
        ...webhook.headers,
      };

      // Make actual HTTP request to webhook URL
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(webhook.timeout || 30000),
      });

      if (response.ok) {
        setSuccess(`Webhook test completed successfully (HTTP ${response.status})`);
      } else {
        throw new Error(`Webhook test failed: HTTP ${response.status} ${response.statusText}`);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webhook test failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Webhooks</h3>
          <p className="text-sm text-gray-600">
            Configure webhooks to receive real-time notifications
          </p>
        </div>
        <button
          onClick={() => setShowAddWebhook(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <span className="mr-2">➕</span>
          Add Webhook
        </button>
      </div>

      {/* Alert Messages */}
      {(error || success) && (
        <div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              {success}
            </div>
          )}
        </div>
      )}

      {/* Webhooks List */}
      {isLoading && webhooks.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading webhooks...</p>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">🔗</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks configured</h3>
          <p className="text-gray-600 mb-4">Add a webhook to receive real-time notifications</p>
          <button
            onClick={() => setShowAddWebhook(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook, index) => (
            <motion.div
              key={webhook.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">{webhook.url}</h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        webhook.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {webhook.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Events: {webhook.events.join(', ')}
                  </div>
                  <div className="text-xs text-gray-500">
                    Max Retries: {webhook.retryPolicy.maxRetries} • Timeout:{' '}
                    {webhook.timeout || 30000}ms
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTestWebhook(webhook.id)}
                    disabled={isLoading}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => handleUpdateWebhook(webhook.id, { isActive: !webhook.isActive })}
                    disabled={isLoading}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      webhook.isActive
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {webhook.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(webhook.id)}
                    disabled={isLoading}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Webhook Modal */}
      <AnimatePresence>
        {showAddWebhook && (
          <AddWebhookModal
            onClose={() => setShowAddWebhook(false)}
            onAdd={handleAddWebhook}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Add Webhook Modal Component
interface AddWebhookModalProps {
  onClose: () => void;
  onAdd: (webhook: Omit<WebhookConfig, 'id'>) => Promise<void>;
  isLoading: boolean;
}

const AddWebhookModal: React.FC<AddWebhookModalProps> = ({ onClose, onAdd, isLoading }) => {
  const [formData, setFormData] = useState({
    url: '',
    events: [] as WebhookEvent[],
    secret: '',
    isActive: true,
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 30000,
    },
    headers: {} as Record<string, string>,
    timeout: 30000,
  });

  const availableEvents: WebhookEvent[] = [
    'post_created',
    'post_updated',
    'post_published',
    'analytics_updated',
    'error_occurred',
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRetryPolicyChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      retryPolicy: {
        ...prev.retryPolicy,
        [field]: value,
      },
    }));
  };

  const handleEventToggle = (event: WebhookEvent) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.url && formData.events.length > 0) {
      await onAdd(formData);
    }
  };

  return (
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
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Webhook</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL *</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                placeholder="https://your-domain.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Events *</label>
              <div className="space-y-2">
                {availableEvents.map((event) => (
                  <label key={event} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event)}
                      onChange={() => handleEventToggle(event)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-900 capitalize">
                      {event.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secret</label>
              <input
                type="password"
                value={formData.secret}
                onChange={(e) => handleInputChange('secret', e.target.value)}
                placeholder="Webhook secret for verification"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Retries</label>
                <input
                  type="number"
                  value={formData.retryPolicy.maxRetries}
                  onChange={(e) => handleRetryPolicyChange('maxRetries', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timeout (ms)</label>
                <input
                  type="number"
                  value={formData.timeout}
                  onChange={(e) => handleInputChange('timeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.url || formData.events.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Adding...' : 'Add Webhook'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WebhookManager;
