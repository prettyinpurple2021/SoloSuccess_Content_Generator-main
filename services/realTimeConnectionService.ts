/**
 * Real-Time Connection Service
 *
 * Production-quality solution for handling real-time feature dependencies
 * with graceful degradation, offline support, and connection recovery.
 */

interface ConnectionConfig {
  maxReconnectAttempts: number;
  reconnectInterval: number;
  maxReconnectInterval: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  enableOfflineMode: boolean;
  enablePollingFallback: boolean;
  pollingInterval: number;
}

interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'offline';
  lastConnected: Date | null;
  reconnectAttempts: number;
  latency: number;
  isOnline: boolean;
  supportsWebSockets: boolean;
  supportsServerSentEvents: boolean;
}

interface RealTimeEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: Date;
  userId?: string;
  retry?: boolean;
}

interface OfflineAction {
  id: string;
  type: string;
  data: unknown;
  timestamp: Date;
  userId: string;
  retryCount: number;
  maxRetries: number;
}

type ConnectionMethod = 'websocket' | 'sse' | 'polling' | 'offline';

class RealTimeConnectionService {
  private config: ConnectionConfig;
  private state: ConnectionState;
  private websocket: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private eventListeners = new Map<string, Set<(event: RealTimeEvent) => void>>();
  private connectionListeners = new Set<(state: ConnectionState) => void>();
  private offlineQueue: OfflineAction[] = [];
  private eventBuffer: RealTimeEvent[] = [];

  private currentMethod: ConnectionMethod = 'offline';
  private preferredMethods: ConnectionMethod[] = ['websocket', 'sse', 'polling'];

  constructor(config?: Partial<ConnectionConfig>) {
    this.config = {
      maxReconnectAttempts: 10,
      reconnectInterval: 1000,
      maxReconnectInterval: 30000,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      enableOfflineMode: true,
      enablePollingFallback: true,
      pollingInterval: 5000,
      ...config,
    };

    this.state = {
      status: 'disconnected',
      lastConnected: null,
      reconnectAttempts: 0,
      latency: 0,
      isOnline: navigator?.onLine ?? true,
      supportsWebSockets: typeof WebSocket !== 'undefined',
      supportsServerSentEvents: typeof EventSource !== 'undefined',
    };

    this.initialize();
  }

  /**
   * Initialize the connection service
   */
  private initialize(): void {
    // Detect browser capabilities
    this.detectCapabilities();

    // Setup network status monitoring
    this.setupNetworkMonitoring();

    // Setup visibility change handling
    this.setupVisibilityHandling();

    // Start connection attempt
    this.connect();
  }

  /**
   * Detect browser capabilities for real-time features
   */
  private detectCapabilities(): void {
    // Check WebSocket support
    this.state.supportsWebSockets =
      typeof WebSocket !== 'undefined' && WebSocket.CONNECTING !== undefined;

    // Check Server-Sent Events support
    this.state.supportsServerSentEvents = typeof EventSource !== 'undefined';

    // Update preferred methods based on capabilities
    this.preferredMethods = [];

    if (this.state.supportsWebSockets) {
      this.preferredMethods.push('websocket');
    }

    if (this.state.supportsServerSentEvents) {
      this.preferredMethods.push('sse');
    }

    if (this.config.enablePollingFallback) {
      this.preferredMethods.push('polling');
    }

    console.log(
      `🔍 Detected capabilities: WebSocket=${this.state.supportsWebSockets}, SSE=${this.state.supportsServerSentEvents}`
    );
  }

  /**
   * Setup network status monitoring
   */
  private setupNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('🌐 Network came online');
      this.state.isOnline = true;
      this.handleNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      console.log('📴 Network went offline');
      this.state.isOnline = false;
      this.handleNetworkChange(false);
    });
  }

  /**
   * Setup page visibility handling
   */
  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page became visible');
        this.handleVisibilityChange(true);
      } else {
        console.log('🙈 Page became hidden');
        this.handleVisibilityChange(false);
      }
    });
  }

  /**
   * Handle network status changes
   */
  private handleNetworkChange(isOnline: boolean): void {
    if (isOnline) {
      // Network came back online
      if (this.state.status === 'offline') {
        this.connect();
        this.processOfflineQueue();
      }
    } else {
      // Network went offline
      this.disconnect();
      if (this.config.enableOfflineMode) {
        this.enterOfflineMode();
      }
    }
  }

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange(isVisible: boolean): void {
    if (isVisible) {
      // Page became visible - reconnect if needed
      if (this.state.status === 'disconnected' && this.state.isOnline) {
        this.connect();
      }
    } else {
      // Page became hidden - reduce connection activity
      this.stopHeartbeat();
    }
  }

  /**
   * Connect using the best available method
   */
  async connect(): Promise<void> {
    if (!this.state.isOnline) {
      this.enterOfflineMode();
      return;
    }

    this.updateState({ status: 'connecting' });

    for (const method of this.preferredMethods) {
      try {
        console.log(`🔄 Attempting connection via ${method}`);

        const success = await this.connectWithMethod(method);

        if (success) {
          this.currentMethod = method;
          this.onConnectionSuccess();
          return;
        }
      } catch (error) {
        console.error(`❌ Connection failed via ${method}:`, error);
      }
    }

    // All methods failed
    this.onConnectionFailure();
  }

  /**
   * Connect using a specific method
   */
  private async connectWithMethod(method: ConnectionMethod): Promise<boolean> {
    switch (method) {
      case 'websocket':
        return this.connectWebSocket();
      case 'sse':
        return this.connectServerSentEvents();
      case 'polling':
        return this.connectPolling();
      default:
        return false;
    }
  }

  /**
   * Connect via WebSocket
   */
  private async connectWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const wsUrl = this.getWebSocketUrl();
        this.websocket = new WebSocket(wsUrl);

        const timeout = setTimeout(() => {
          this.websocket?.close();
          resolve(false);
        }, this.config.connectionTimeout);

        this.websocket.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ WebSocket connected');
          this.startHeartbeat();
          resolve(true);
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.websocket.onclose = (event) => {
          clearTimeout(timeout);
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.handleDisconnection();
          resolve(false);
        };

        this.websocket.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket error:', error);
          resolve(false);
        };
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        resolve(false);
      }
    });
  }

  /**
   * Connect via Server-Sent Events
   */
  private async connectServerSentEvents(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const sseUrl = this.getServerSentEventsUrl();
        this.eventSource = new EventSource(sseUrl);

        const timeout = setTimeout(() => {
          this.eventSource?.close();
          resolve(false);
        }, this.config.connectionTimeout);

        this.eventSource.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ Server-Sent Events connected');
          this.startHeartbeat();
          resolve(true);
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.eventSource.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ Server-Sent Events error:', error);
          this.handleDisconnection();
          resolve(false);
        };
      } catch (error) {
        console.error('❌ Server-Sent Events connection failed:', error);
        resolve(false);
      }
    });
  }

  /**
   * Connect via polling
   */
  private async connectPolling(): Promise<boolean> {
    try {
      // Test polling endpoint
      const response = await fetch(this.getPollingUrl(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        console.log('✅ Polling connection established');
        this.startPolling();
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Polling connection failed:', error);
      return false;
    }
  }

  /**
   * Start polling for updates
   */
  private startPolling(): void {
    this.stopPolling();

    this.pollingTimer = setInterval(async () => {
      try {
        const response = await fetch(this.getPollingUrl());

        if (response.ok) {
          const events = await response.json();

          if (Array.isArray(events)) {
            events.forEach((event) => this.handleMessage(JSON.stringify(event)));
          }
        } else {
          console.error('❌ Polling request failed:', response.status);
          this.handleDisconnection();
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
        this.handleDisconnection();
      }
    }, this.config.pollingInterval);
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Handle successful connection
   */
  private onConnectionSuccess(): void {
    this.updateState({
      status: 'connected',
      lastConnected: new Date(),
      reconnectAttempts: 0,
    });

    // Process any buffered events
    this.processEventBuffer();

    // Process offline queue if coming back online
    if (this.offlineQueue.length > 0) {
      this.processOfflineQueue();
    }

    console.log(`✅ Real-time connection established via ${this.currentMethod}`);
  }

  /**
   * Handle connection failure
   */
  private onConnectionFailure(): void {
    console.error('❌ All connection methods failed');

    if (this.config.enableOfflineMode) {
      this.enterOfflineMode();
    } else {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(): void {
    this.cleanup();

    if (this.state.isOnline) {
      this.scheduleReconnect();
    } else {
      this.enterOfflineMode();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.enterOfflineMode();
      return;
    }

    this.updateState({
      status: 'reconnecting',
      reconnectAttempts: this.state.reconnectAttempts + 1,
    });

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.state.reconnectAttempts),
      this.config.maxReconnectInterval
    );

    console.log(
      `🔄 Scheduling reconnection in ${delay}ms (attempt ${this.state.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Enter offline mode
   */
  private enterOfflineMode(): void {
    this.updateState({ status: 'offline' });
    this.currentMethod = 'offline';

    console.log('📴 Entered offline mode');
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.cleanup();
    this.updateState({ status: 'disconnected' });
  }

  /**
   * Cleanup connections and timers
   */
  private cleanup(): void {
    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    // Close EventSource
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Stop polling
    this.stopPolling();

    // Stop timers
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send heartbeat ping
   */
  private sendHeartbeat(): void {
    const startTime = Date.now();

    try {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'ping', timestamp: startTime }));
      } else if (this.currentMethod === 'polling') {
        // For polling, heartbeat is implicit in the regular requests
        this.updateState({ latency: Date.now() - startTime });
      }
    } catch (error) {
      console.error('❌ Heartbeat failed:', error);
      this.handleDisconnection();
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle heartbeat response
      if (message.type === 'pong') {
        const latency = Date.now() - message.timestamp;
        this.updateState({ latency });
        return;
      }

      // Handle regular events
      const event: RealTimeEvent = {
        id: message.id || this.generateEventId(),
        type: message.type,
        data: message.data,
        timestamp: new Date(message.timestamp || Date.now()),
        userId: message.userId,
      };

      this.emitEvent(event);
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: RealTimeEvent): void {
    const listeners = this.eventListeners.get(event.type);

    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('❌ Event listener error:', error);
        }
      });
    }

    // Also emit to wildcard listeners
    const wildcardListeners = this.eventListeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('❌ Wildcard event listener error:', error);
        }
      });
    }
  }

  /**
   * Process offline queue when connection is restored
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    console.log(`🔄 Processing ${this.offlineQueue.length} offline actions`);

    const actionsToProcess = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const action of actionsToProcess) {
      try {
        await this.sendAction(action);
        console.log(`✅ Processed offline action: ${action.type}`);
      } catch (error) {
        console.error(`❌ Failed to process offline action:`, error);

        // Re-queue if retries available
        if (action.retryCount < action.maxRetries) {
          action.retryCount++;
          this.offlineQueue.push(action);
        }
      }
    }
  }

  /**
   * Process buffered events
   */
  private processEventBuffer(): void {
    if (this.eventBuffer.length === 0) return;

    console.log(`🔄 Processing ${this.eventBuffer.length} buffered events`);

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    events.forEach((event) => this.emitEvent(event));
  }

  /**
   * Send action to server
   */
  private async sendAction(action: OfflineAction): Promise<void> {
    const payload = {
      id: action.id,
      type: action.type,
      data: action.data,
      timestamp: action.timestamp.toISOString(),
      userId: action.userId,
    };

    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(payload));
    } else {
      // Fallback to HTTP request
      const response = await fetch('/api/realtime/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
  }

  /**
   * Update connection state and notify listeners
   */
  private updateState(updates: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...updates };

    this.connectionListeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('❌ Connection state listener error:', error);
      }
    });
  }

  /**
   * Get connection URLs (these would be configured based on your backend)
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/realtime/ws`;
  }

  private getServerSentEventsUrl(): string {
    return '/api/realtime/events';
  }

  private getPollingUrl(): string {
    return '/api/realtime/poll';
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API methods
   */

  /**
   * Subscribe to real-time events
   */
  subscribe(eventType: string, listener: (event: RealTimeEvent) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionChange(listener: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Send data to server (with offline queuing)
   */
  async send(type: string, data: unknown, userId: string): Promise<void> {
    const action: OfflineAction = {
      id: this.generateEventId(),
      type,
      data,
      timestamp: new Date(),
      userId,
      retryCount: 0,
      maxRetries: 3,
    };

    if (this.state.status === 'connected') {
      try {
        await this.sendAction(action);
      } catch (error) {
        console.error('❌ Failed to send action, queuing for retry:', error);
        this.offlineQueue.push(action);
      }
    } else {
      // Queue for later when connection is restored
      this.offlineQueue.push(action);
      console.log(`📝 Queued action for offline processing: ${type}`);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Get connection method
   */
  getConnectionMethod(): ConnectionMethod {
    return this.currentMethod;
  }

  /**
   * Get offline queue size
   */
  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }

  /**
   * Force reconnection
   */
  forceReconnect(): void {
    console.log('🔄 Forcing reconnection...');
    this.disconnect();
    this.state.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Clear offline queue
   */
  clearOfflineQueue(): void {
    this.offlineQueue = [];
    console.log('🧹 Offline queue cleared');
  }
}

// Create singleton instance
const realTimeConnectionService = new RealTimeConnectionService();

export { RealTimeConnectionService, realTimeConnectionService };
export type { ConnectionConfig, ConnectionState, RealTimeEvent, ConnectionMethod };
