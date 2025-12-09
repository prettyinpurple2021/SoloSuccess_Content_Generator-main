import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Integration,
  IntegrationMetrics,
  IntegrationLog,
  IntegrationAlert,
  WebhookDelivery,
} from '../../types';
// import { monitoringService } from '../../services/monitoringService';
// import { webhookService } from '../../services/webhookService';

interface RealTimeMonitoringDashboardProps {
  integrations: Integration[];
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}

const RealTimeMonitoringDashboard: React.FC<RealTimeMonitoringDashboardProps> = ({
  integrations,
  onRefresh,
  isLoading,
}) => {
  const [metrics, setMetrics] = useState<IntegrationMetrics[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [alerts, setAlerts] = useState<IntegrationAlert[]>([]);
  const [webhookDeliveries, setWebhookDeliveries] = useState<WebhookDelivery[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket connection management
  useEffect(() => {
    if (isRealTimeEnabled) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isRealTimeEnabled]);

  // Load initial data
  useEffect(() => {
    loadMonitoringData();
  }, [selectedIntegration, timeRange]);

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');

    try {
      const wsUrl = process.env.VITE_WS_URL || 'ws://localhost:3001';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;

        // Subscribe to integration events
        wsRef.current?.send(
          JSON.stringify({
            type: 'subscribe',
            channels: [
              'integration_metrics',
              'integration_logs',
              'integration_alerts',
              'webhook_deliveries',
            ],
          })
        );
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');

        if (isRealTimeEnabled && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionStatus('disconnected');
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus('disconnected');
  };

  const scheduleReconnect = () => {
    reconnectAttempts.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isRealTimeEnabled) {
        connectWebSocket();
      }
    }, delay);
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'integration_metrics':
        setMetrics((prev) => {
          const updated = [...prev];
          const existingIndex = updated.findIndex(
            (m) => m.integrationId === data.metrics.integrationId
          );
          if (existingIndex >= 0) {
            updated[existingIndex] = data.metrics;
          } else {
            updated.push(data.metrics);
          }
          return updated.slice(-100); // Keep last 100 metrics
        });
        break;

      case 'integration_log':
        setLogs((prev) => [data.log, ...prev.slice(0, 999)]);
        break;

      case 'integration_alert':
        setAlerts((prev) => [data.alert, ...prev.slice(0, 99)]);
        break;

      case 'webhook_delivery':
        setWebhookDeliveries((prev) => [data.delivery, ...prev.slice(0, 199)]);
        break;

      case 'ping':
        wsRef.current?.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  };

  const loadMonitoringData = async () => {
    setIsLoadingData(true);
    try {
      const integrationIds =
        selectedIntegration === 'all' ? integrations.map((i) => i.id) : [selectedIntegration];

      // Load metrics
      const metricsPromises = integrationIds.map((id) =>
        monitoringService.getIntegrationMetrics(id, timeRange)
      );
      const metricsResults = await Promise.allSettled(metricsPromises);
      const allMetrics = metricsResults
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => (result as PromiseFulfilledResult<IntegrationMetrics[]>).value);
      setMetrics(allMetrics);

      // Load logs
      const logsPromises = integrationIds.map((id) =>
        monitoringService.getIntegrationLogs(id, timeRange)
      );
      const logsResults = await Promise.allSettled(logsPromises);
      const allLogs = logsResults
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => (result as PromiseFulfilledResult<IntegrationLog[]>).value);
      setLogs(allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));

      // Load alerts
      const alertsPromises = integrationIds.map((id) => monitoringService.getIntegrationAlerts(id));
      const alertsResults = await Promise.allSettled(alertsPromises);
      const allAlerts = alertsResults
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => (result as PromiseFulfilledResult<IntegrationAlert[]>).value);
      setAlerts(allAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Calculate summary statistics
  const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
  const successfulRequests = metrics.reduce((sum, m) => sum + m.successfulRequests, 0);
  const failedRequests = metrics.reduce((sum, m) => sum + m.failedRequests, 0);
  const avgResponseTime =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length
      : 0;
  const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'syncing':
        return 'text-blue-600';
      case 'maintenance':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get log level color
  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'debug':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Get delivery status color
  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'delivering':
        return 'text-blue-600 bg-blue-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-time Monitoring Dashboard</h2>
          <p className="text-sm text-gray-600">
            Live monitoring and analytics for your integrations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Real-time Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Real-time</span>
            <button
              onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isRealTimeEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isRealTimeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-500'
                  : connectionStatus === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            ></div>
          </div>

          <select
            value={selectedIntegration}
            onChange={(e) => setSelectedIntegration(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Integrations</option>
            {integrations.map((integration) => (
              <option key={integration.id} value={integration.id}>
                {integration.name}
              </option>
            ))}
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={onRefresh}
            disabled={isLoading || isLoadingData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <span className="mr-2">🔄</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Real-time Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{totalRequests.toLocaleString()}</p>
            </div>
            <div className="text-blue-500 text-2xl">📊</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</p>
            </div>
            <div className="text-green-500 text-2xl">✅</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-blue-600">{avgResponseTime.toFixed(0)}ms</p>
            </div>
            <div className="text-blue-500 text-2xl">⚡</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-red-600">{errorRate.toFixed(1)}%</p>
            </div>
            <div className="text-red-500 text-2xl">⚠️</div>
          </div>
        </motion.div>
      </div>

      {/* Real-time Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg border border-gray-200 shadow-sm"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Real-time Alerts</h3>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isRealTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}
              ></div>
              <span className="text-sm text-gray-600">{isRealTimeEnabled ? 'Live' : 'Static'}</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🔔</div>
              <p>No alerts in the selected time range</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(alert.severity)}`}
                    >
                      {alert.severity}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{alert.title}</div>
                      <div className="text-sm text-gray-600">{alert.message}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">{alert.createdAt.toLocaleString()}</div>
                    {alert.isResolved && <div className="text-xs text-green-600">Resolved</div>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Real-time Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg border border-gray-200 shadow-sm"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Real-time Logs</h3>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isRealTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}
              ></div>
              <span className="text-sm text-gray-600">{isRealTimeEnabled ? 'Live' : 'Static'}</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          {isLoadingData ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <p>No logs in the selected time range</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {logs.slice(0, 50).map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}
                      >
                        {log.level.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-900">{log.message}</div>
                    </div>
                    <div className="text-xs text-gray-500">{log.timestamp.toLocaleString()}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      {/* Webhook Deliveries */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-lg border border-gray-200 shadow-sm"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Webhook Deliveries</h3>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isRealTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}
              ></div>
              <span className="text-sm text-gray-600">{isRealTimeEnabled ? 'Live' : 'Static'}</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          {webhookDeliveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🔗</div>
              <p>No webhook deliveries in the selected time range</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {webhookDeliveries.slice(0, 50).map((delivery) => (
                  <motion.div
                    key={delivery.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${getDeliveryStatusColor(delivery.status)}`}
                      >
                        {delivery.status.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-900">
                        {delivery.event} → {delivery.webhookId.slice(0, 8)}...
                      </div>
                      {delivery.attempts > 1 && (
                        <div className="text-xs text-gray-500">
                          Attempt {delivery.attempts}/{delivery.maxAttempts}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {delivery.createdAt.toLocaleString()}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RealTimeMonitoringDashboard;
