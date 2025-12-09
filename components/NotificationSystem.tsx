import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader } from 'lucide-react';
import { SparkleEffect, FloatingSkull } from './HolographicTheme';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? (notification.type === 'loading' ? 0 : 5000),
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Auto-remove after duration (if not persistent)
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === id);
      if (notification?.onClose) {
        notification.onClose();
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, ...updates } : notification
      )
    );
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAll,
        updateNotification,
      }}
    >
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
};

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { removeNotification } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      removeNotification(notification.id);
    }, 300); // Match animation duration
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'loading':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'notification-glass border-green-400/30 bg-glass-cyan';
      case 'error':
        return 'notification-glass border-red-400/30 bg-glass-pink';
      case 'warning':
        return 'notification-glass border-yellow-400/30 bg-glass-purple';
      case 'info':
        return 'notification-glass border-blue-400/30 bg-glass-cyan';
      case 'loading':
        return 'notification-glass border-purple-400/30 bg-glass-purple';
      default:
        return 'notification-glass border-white/20';
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getBackgroundColor()}
        rounded-lg p-4 relative sparkles neon-glow
      `}
    >
      <SparkleEffect count={3} size="small" />
      {notification.type === 'success' && (
        <FloatingSkull className="absolute -top-2 -right-2" size="small" />
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{getIcon()}</div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white mb-1 holo-text">{notification.title}</h4>

          {notification.message && (
            <p className="text-sm text-white/80 mb-2">{notification.message}</p>
          )}

          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="text-sm font-medium text-pink-300 hover:text-pink-200 transition-colors sparkles"
            >
              {notification.action.label} ✨
            </button>
          )}
        </div>

        {notification.type !== 'loading' && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Rainbow progress bar for timed notifications */}
      {notification.duration && notification.duration > 0 && notification.type !== 'loading' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50 rounded-b-lg overflow-hidden">
          <div
            className="h-full rainbow-progress transition-all ease-linear"
            style={{
              animation: `shrink ${notification.duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

/**
 * Convenience hooks for different notification types
 */
export const useNotificationHelpers = () => {
  const { addNotification, updateNotification, removeNotification } = useNotifications();

  const showSuccess = useCallback(
    (title: string, message?: string, options?: Partial<Notification>) => {
      return addNotification({
        type: 'success',
        title,
        message,
        ...options,
      });
    },
    [addNotification]
  );

  const showError = useCallback(
    (title: string, message?: string, options?: Partial<Notification>) => {
      return addNotification({
        type: 'error',
        title,
        message,
        duration: 0, // Errors persist by default
        ...options,
      });
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (title: string, message?: string, options?: Partial<Notification>) => {
      return addNotification({
        type: 'warning',
        title,
        message,
        ...options,
      });
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (title: string, message?: string, options?: Partial<Notification>) => {
      return addNotification({
        type: 'info',
        title,
        message,
        ...options,
      });
    },
    [addNotification]
  );

  const showLoading = useCallback(
    (title: string, message?: string) => {
      return addNotification({
        type: 'loading',
        title,
        message,
        duration: 0, // Loading notifications persist until manually removed
      });
    },
    [addNotification]
  );

  const hideLoading = useCallback(
    (id: string) => {
      removeNotification(id);
    },
    [removeNotification]
  );

  const updateLoading = useCallback(
    (id: string, title: string, message?: string) => {
      updateNotification(id, { title, message });
    },
    [updateNotification]
  );

  const showAsyncOperation = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      messages: {
        loading: { title: string; message?: string };
        success: { title: string; message?: string };
        error: { title: string; message?: string };
      }
    ): Promise<T> => {
      const loadingId = showLoading(messages.loading.title, messages.loading.message);

      try {
        const result = await operation();
        hideLoading(loadingId);
        showSuccess(messages.success.title, messages.success.message);
        return result;
      } catch (error) {
        hideLoading(loadingId);
        const errorMessage =
          error instanceof Error ? error.message : 'An unexpected error occurred';
        showError(messages.error.title, messages.error.message || errorMessage);
        throw error;
      }
    },
    [showLoading, hideLoading, showSuccess, showError]
  );

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    hideLoading,
    updateLoading,
    showAsyncOperation,
  };
};

/**
 * Toast notification component for simple messages
 */
export const Toast: React.FC<{
  type: NotificationType;
  title: string;
  message?: string;
  onClose: () => void;
}> = ({ type, title, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{title}</h4>
          {message && <p className="text-sm text-gray-600 mt-1">{message}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Progress notification for long-running operations
 */
export const ProgressNotification: React.FC<{
  title: string;
  progress: number; // 0-100
  message?: string;
  onCancel?: () => void;
}> = ({ title, progress, message, onCancel }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          {message && <p className="text-sm text-gray-600">{message}</p>}
        </div>
        {onCancel && (
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div className="text-xs text-gray-500 text-right">{Math.round(progress)}%</div>
    </div>
  );
};

export default NotificationProvider;
