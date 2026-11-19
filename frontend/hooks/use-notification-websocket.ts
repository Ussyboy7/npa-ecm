"use client";

import { logError, logInfo, logWarn } from '@/lib/client-logger';
import { useEffect, useState, useCallback } from 'react';
import { useCurrentUser } from './use-current-user';
import type { User } from '@/lib/npa-structure';
import { type Notification } from '@/lib/api/notifications';
import { restoreAuthCookies } from '@/lib/api-client';
import {
  NOTIFICATION_WS_AUTH_CLOSE_CODE,
  NOTIFICATION_WS_MAX_AUTH_RECOVERIES,
  NOTIFICATION_WS_MAX_RECONNECT_ATTEMPTS,
  NOTIFICATION_WS_PING_INTERVAL_MS,
  NOTIFICATION_WS_RECONNECT_DELAY_MS,
  NOTIFICATION_WS_SLOW_RETRY_MS,
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
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxAttemptsReached = false;
  private isConnecting = false;
  private authRecoveryAttempts = 0;
  private recoveringAuth = false;
  private subscribers = new Set<{
    onNotification?: (notification: Notification) => void;
    onUnreadCountChange?: (count: number) => void;
    onConnectionChange?: (connected: boolean) => void;
  }>();
  private unreadCount = 0;
  private isConnected = false;
  private currentUser: User | null = null;
  private enabled = true;

  private getWebSocketUrl(): string {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
      if (wsUrl) {
        const cleanUrl = wsUrl.endsWith('/') ? wsUrl.slice(0, -1) : wsUrl;
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
        const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/api(\/v\d+)?\/?$/, '').split('/')[0];
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

  connect(user: User | null) {
    if (!this.enabled || !user || this.maxAttemptsReached || this.isConnecting) {
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.currentUser = user;
    this.isConnecting = true;

    try {
      const url = this.getWebSocketUrl();
      logInfo('Attempting WebSocket connection', { url });

      const ws = new WebSocket(url);

      ws.onopen = () => {
        logInfo('WebSocket connected for notifications');
        this.isConnecting = false;

        // Authentication comes from the httpOnly session cookie during the
        // handshake, so the token is never readable here. When the cookie is
        // valid the server sends `authenticated` immediately; when it is not,
        // it closes with 4001 and `recoverAuthAndReconnect` refreshes it.
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'authenticated') {
            this.setConnected(true);
            this.reconnectAttempts = 0;
            this.authRecoveryAttempts = 0;
            this.maxAttemptsReached = false;

            // Request initial unread count
            ws.send(JSON.stringify({ type: 'get_unread_count' }));

            // Start ping interval to keep connection alive
            this.pingInterval = setInterval(() => {
              if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
              }
            }, NOTIFICATION_WS_PING_INTERVAL_MS);
            return;
          }

          if (data.type === 'auth_error') {
            logWarn('WebSocket authentication failed', data);
            this.setConnected(false);
            this.isConnecting = false;
            ws.close();
            return;
          }
          
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
        logWarn('Notifications WebSocket error', { error });
        this.setConnected(false);
        this.isConnecting = false;
      };

      ws.onclose = (event) => {
        logInfo('WebSocket disconnected', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
        });
        this.setConnected(false);
        this.ws = null;
        this.isConnecting = false;

        // Clear ping interval
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        // 4001 means no valid credentials reached the handshake. Retrying with
        // the same expired cookies can never succeed, so refresh them first.
        if (event.code === NOTIFICATION_WS_AUTH_CLOSE_CODE) {
          void this.recoverAuthAndReconnect();
          return;
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
          // Do not leave notifications dead until a page reload. Back off to a
          // slow retry so a backend restart is picked up automatically.
          this.maxAttemptsReached = true;
          logWarn(
            `Max WebSocket reconnection attempts reached; retrying in ${NOTIFICATION_WS_SLOW_RETRY_MS}ms`,
          );
          this.reconnectTimeout = setTimeout(() => {
            if (!this.enabled) return;
            this.maxAttemptsReached = false;
            this.reconnectAttempts = 0;
            this.connect(this.currentUser);
          }, NOTIFICATION_WS_SLOW_RETRY_MS);
        }
      };

      this.ws = ws;
    } catch (error: unknown) {
      logWarn('Failed to create WebSocket connection', error);
      this.setConnected(false);
      this.isConnecting = false;
    }
  }

  /**
   * Refresh the httpOnly auth cookies, then reconnect with a clean budget.
   * A rejected handshake is not transient: the old access token stays invalid
   * for every retry, which is what used to exhaust the attempts and leave the
   * socket dead until a page reload.
   */
  private async recoverAuthAndReconnect() {
    if (this.recoveringAuth || !this.enabled) {
      return;
    }
    if (this.authRecoveryAttempts >= NOTIFICATION_WS_MAX_AUTH_RECOVERIES) {
      this.maxAttemptsReached = true;
      logWarn('Notifications WebSocket could not authenticate after refreshing credentials');
      return;
    }

    this.recoveringAuth = true;
    this.authRecoveryAttempts += 1;

    try {
      const restored = await restoreAuthCookies();
      if (!restored) {
        // No session to refresh: the user is signed out, so stop retrying.
        this.maxAttemptsReached = true;
        logWarn('Notifications WebSocket stopped: no session available to refresh');
        return;
      }

      this.reconnectAttempts = 0;
      this.maxAttemptsReached = false;

      if (this.enabled && this.currentUser) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.connect(this.currentUser);
        }, NOTIFICATION_WS_RECONNECT_DELAY_MS);
      }
    } finally {
      this.recoveringAuth = false;
    }
  }

  /** Record connection state and tell every subscriber, so no consumer has
   * to guess from a stale snapshot taken when it mounted. */
  private setConnected(connected: boolean) {
    if (this.isConnected === connected) {
      return;
    }
    this.isConnected = connected;
    this.subscribers.forEach(sub => sub.onConnectionChange?.(connected));
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    // A sign-out (or disabled socket) ends the retry budget: the next sign-in
    // must be able to connect even if the previous session exhausted attempts.
    this.reconnectAttempts = 0;
    this.authRecoveryAttempts = 0;
    this.maxAttemptsReached = false;
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
    this.setConnected(false);
    this.isConnecting = false;
  }

  subscribe(callbacks: {
    onNotification?: (notification: Notification) => void;
    onUnreadCountChange?: (count: number) => void;
    onConnectionChange?: (connected: boolean) => void;
  }) {
    this.subscribers.add(callbacks);
    // Deliver current state immediately so a late subscriber is not blind.
    callbacks.onConnectionChange?.(this.isConnected);
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
      // Normal during connect/reconnect; not worth a warning per call.
      logInfo('WebSocket is not connected; message not sent');
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

  // Subscribe to WebSocket manager for updates. Connection state is pushed by
  // the manager; reading a snapshot here would go stale the moment the socket
  // dropped, which made the bell keep sending on a closed connection.
  useEffect(() => {
    const unsubscribe = wsManager.subscribe({
      onNotification,
      onConnectionChange: setIsConnected,
      onUnreadCountChange: (count) => {
        setUnreadCount(count);
        onUnreadCountChange?.(count);
      },
    });

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

  // Connection state updates are handled by the subscriber callback above

  const connect = useCallback(() => {
    if (currentUser) {
      wsManager.connect(currentUser);
    }
  }, [currentUser]);

  const disconnect = () => {
    wsManager.disconnect();
  };

  // Stable identity: consumers list it in effect dependencies, and a new
  // function every render made those effects re-run and re-send each pass.
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    wsManager.sendMessage(message);
  }, []);

  const markAsRead = (notificationId: string) => {
    wsManager.sendMessage({ type: 'mark_read', notification_id: notificationId });
  };

  return {
    isConnected,
    unreadCount,
    connect,
    disconnect,
    sendMessage,
    markAsRead,
  };
};
