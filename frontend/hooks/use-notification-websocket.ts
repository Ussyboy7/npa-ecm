"use client";

import { logError, logInfo, logWarn } from '@/lib/client-logger';
import { useEffect, useState, useCallback } from 'react';
import { useCurrentUser } from './use-current-user';
import type { User } from '@/lib/npa-structure';
import { getStoredAccessToken } from '@/lib/api-client';
import { type Notification } from '@/lib/notifications-storage';
import {
  NOTIFICATION_WS_MAX_RECONNECT_ATTEMPTS,
  NOTIFICATION_WS_PING_INTERVAL_MS,
  NOTIFICATION_WS_RECONNECT_DELAY_MS,
} from '@/lib/constants';

interface UseNotificationWebSocketOptions {
  enabled?: boolean;
  onNotification?: (notification: Notification) => void;
  onUnreadCountChange?: (count: number) => void;
}

const WS_DISABLED =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_NOTIFICATIONS_WS_DISABLED === 'true';

// Global WebSocket connection singleton to prevent multiple connections
// This ensures only one WebSocket connection exists across all hook instances
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxAttemptsReached = false;
  private isConnecting = false;
  private subscribers = new Set<{
    onNotification?: (notification: Notification) => void;
    onUnreadCountChange?: (count: number) => void;
  }>();
  private unreadCount = 0;
  private isConnected = false;
  private currentUser: User | null = null;
  private enabled = true;

  private getWebSocketUrl(): string {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
      if (wsUrl) {
        let cleanUrl = wsUrl.endsWith('/') ? wsUrl.slice(0, -1) : wsUrl;
        if (cleanUrl.endsWith('/ws/notifications')) {
          return `${cleanUrl}/`;
        } else if (cleanUrl.endsWith('/ws')) {
          return `${cleanUrl}/notifications/`;
        } else {
          return `${cleanUrl}/ws/notifications/`;
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (apiUrl) {
        const protocol = apiUrl.startsWith('https://') ? 'wss' : 'ws';
        let host = apiUrl.replace(/^https?:\/\//, '').replace(/\/api(\/v\d+)?\/?$/, '').split('/')[0];
        if (host) {
          return `${protocol}://${host}/ws/notifications/`;
        }
      }

      if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        return `${protocol}://${window.location.host}/ws/notifications/`;
      }

      throw new Error('WebSocket URL cannot be determined');
    } catch (error: unknown) {
      logError('Error constructing WebSocket URL:', error);
      throw error;
    }
  }

  connect(user: Record<string, unknown>) {
    if (!this.enabled || !user || this.maxAttemptsReached || this.isConnecting) {
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.currentUser = user;
    this.isConnecting = true;

    try {
      let url = this.getWebSocketUrl();
      const token = getStoredAccessToken();
      if (token) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}token=${encodeURIComponent(token)}`;
      }

      const maskedUrl = url.replace(/token=[^&]+/, 'token=***');
      logInfo('Attempting WebSocket connection', { url: maskedUrl, hasToken: !!token });

      const ws = new WebSocket(url);

      ws.onopen = () => {
        logInfo('WebSocket connected for notifications');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.maxAttemptsReached = false;
        this.isConnecting = false;

        // Request initial unread count
        ws.send(JSON.stringify({ type: 'get_unread_count' }));

        // Start ping interval to keep connection alive
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, NOTIFICATION_WS_PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'unread_count') {
            this.unreadCount = typeof data.count === 'number' ? data.count : 0;
            this.subscribers.forEach(sub => {
              sub.onUnreadCountChange?.(this.unreadCount);
            });
          } else if (data.type === 'notification' && data.notification) {
            this.subscribers.forEach(sub => {
              sub.onNotification?.(data.notification);
            });
          } else if (data.type === 'notification_updated' && data.notification) {
            this.subscribers.forEach(sub => {
              sub.onNotification?.(data.notification);
            });
          } else if (data.type === 'pong') {
            // Response to ping - connection is alive
          }
        } catch (error: unknown) {
          logError('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        logWarn('Notifications WebSocket error; falling back to polling.', { error });
        this.isConnected = false;
        this.isConnecting = false;
      };

      ws.onclose = (event) => {
        logInfo('WebSocket disconnected', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
        });
        this.isConnected = false;
        this.ws = null;
        this.isConnecting = false;

        // Clear ping interval
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        if (this.enabled && this.reconnectAttempts < NOTIFICATION_WS_MAX_RECONNECT_ATTEMPTS && !this.maxAttemptsReached) {
          this.reconnectAttempts += 1;
          const delay = NOTIFICATION_WS_RECONNECT_DELAY_MS * this.reconnectAttempts;
          logInfo(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${NOTIFICATION_WS_MAX_RECONNECT_ATTEMPTS})`);
          
          this.reconnectTimeout = setTimeout(() => {
            if (!this.maxAttemptsReached && this.reconnectAttempts <= NOTIFICATION_WS_MAX_RECONNECT_ATTEMPTS) {
              this.connect(this.currentUser);
            }
          }, delay);
        } else if (this.reconnectAttempts >= NOTIFICATION_WS_MAX_RECONNECT_ATTEMPTS && !this.maxAttemptsReached) {
          this.maxAttemptsReached = true;
          logWarn('Max WebSocket reconnection attempts reached; continuing with polling only.');
          this.subscribers.forEach(sub => {
            sub.onUnreadCountChange?.(-1);
          });
        }
      };

      this.ws = ws;
    } catch (error: unknown) {
      logWarn('Failed to create WebSocket connection; continuing with polling only.', error);
      this.isConnected = false;
      this.isConnecting = false;
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      if (this.ws.readyState !== WebSocket.CLOSED && this.ws.readyState !== WebSocket.CLOSING) {
        this.ws.close();
      }
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

  subscribe(callbacks: { onNotification?: (notification: Notification) => void; onUnreadCountChange?: (count: number) => void }) {
    this.subscribers.add(callbacks);
    // Immediately send current unread count to new subscriber
    if (this.isConnected) {
      callbacks.onUnreadCountChange?.(this.unreadCount);
    }
    return () => {
      this.subscribers.delete(callbacks);
    };
  }

  sendMessage(message: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      logWarn('WebSocket is not connected');
    }
  }

  getIsConnected() {
    return this.isConnected;
  }

  getUnreadCount() {
    return this.unreadCount;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.disconnect();
    }
  }
}

// Global singleton instance
const wsManager = new WebSocketManager();

export const useNotificationWebSocket = (options: UseNotificationWebSocketOptions = {}) => {
  const { enabled = true, onNotification, onUnreadCountChange } = options;
  const isWsEnabled = enabled && !WS_DISABLED;
  const { currentUser } = useCurrentUser();
  const [isConnected, setIsConnected] = useState(wsManager.getIsConnected());
  const [unreadCount, setUnreadCount] = useState(wsManager.getUnreadCount());

  // Update enabled state
  useEffect(() => {
    wsManager.setEnabled(isWsEnabled);
  }, [isWsEnabled]);

  // Subscribe to WebSocket manager for updates
  useEffect(() => {
    const unsubscribe = wsManager.subscribe({
      onNotification,
      onUnreadCountChange: (count) => {
        setUnreadCount(count);
        onUnreadCountChange?.(count);
      },
    });

    // Update local state from manager
    setIsConnected(wsManager.getIsConnected());
    setUnreadCount(wsManager.getUnreadCount());

    return unsubscribe;
  }, [onNotification, onUnreadCountChange]);

  // Connect/disconnect based on user and enabled state
  useEffect(() => {
    if (!isWsEnabled) {
      return;
    }

    if (currentUser) {
      wsManager.connect(currentUser);
    } else {
      wsManager.disconnect();
    }
  }, [isWsEnabled, currentUser]);

  // Poll for connection state updates (less frequent than before)
  useEffect(() => {
    const interval = setInterval(() => {
      const newConnected = wsManager.getIsConnected();
      const newCount = wsManager.getUnreadCount();
      if (newConnected !== isConnected) {
        setIsConnected(newConnected);
      }
      if (newCount !== unreadCount) {
        setUnreadCount(newCount);
      }
    }, 2000); // Check every 2 seconds instead of 1

    return () => clearInterval(interval);
  }, [isConnected, unreadCount]);

  const connect = useCallback(() => {
    if (currentUser) {
      wsManager.connect(currentUser);
    }
  }, [currentUser]);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    wsManager.sendMessage(message);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    wsManager.sendMessage({ type: 'mark_read', notification_id: notificationId });
  }, []);

  return {
    isConnected,
    unreadCount,
    connect,
    disconnect,
    sendMessage,
    markAsRead,
  };
};
