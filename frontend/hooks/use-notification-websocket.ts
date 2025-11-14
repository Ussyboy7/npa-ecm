"use client";

import { logError, logInfo, logWarn } from '@/lib/client-logger';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useCurrentUser } from './use-current-user';
import { getStoredAccessToken } from '@/lib/api-client';
import { getUnreadNotificationCount, type Notification } from '@/lib/notifications-storage';
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

export const useNotificationWebSocket = (options: UseNotificationWebSocketOptions = {}) => {
  const { enabled = true, onNotification, onUnreadCountChange } = options;
  const { currentUser } = useCurrentUser();
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = NOTIFICATION_WS_MAX_RECONNECT_ATTEMPTS;
  const reconnectDelay = NOTIFICATION_WS_RECONNECT_DELAY_MS;

  const getWebSocketUrl = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    // Remove protocol and trailing /api or /api/vX suffix
    let wsUrl = apiUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/api(\/v\d+)?\/?$/, '');
    const protocol = apiUrl.startsWith('https') ? 'wss' : 'ws';

    // WebSocket URL format: ws://host:port/ws/notifications/
    if (!wsUrl.includes(':') && !apiUrl.includes('localhost')) {
      wsUrl = `${wsUrl}:8000`;
    }

    return `${protocol}://${wsUrl}/ws/notifications/`;
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !currentUser || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      let url = getWebSocketUrl();
      // Add JWT token to query string for authentication
      const token = getStoredAccessToken();
      if (token) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}token=${encodeURIComponent(token)}`;
      }
      const ws = new WebSocket(url);

      ws.onopen = () => {
        logInfo('WebSocket connected for notifications');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Send authentication token if available
        const token = getStoredAccessToken();
        if (token) {
          // Note: WebSocket authentication is handled by Django Channels AuthMiddlewareStack
          // Token should be sent via query parameter or cookie
        }

        // Request initial unread count
        ws.send(JSON.stringify({ type: 'get_unread_count' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'notification':
              if (data.notification && onNotification) {
                onNotification(data.notification as Notification);
              }
              // Refresh unread count
              getUnreadNotificationCount().then(setUnreadCount);
              break;

            case 'unread_count':
              setUnreadCount(data.count || 0);
              if (onUnreadCountChange) {
                onUnreadCountChange(data.count || 0);
              }
              break;

            case 'notification_updated':
              // Handle notification update
              if (onNotification && data.notification) {
                onNotification(data.notification as Notification);
              }
              break;

            case 'pong':
              // Response to ping - connection is alive
              break;

            default:
              logInfo('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          logError('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        logError('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        logInfo('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = reconnectDelay * reconnectAttemptsRef.current;
          logInfo(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          logError('Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      logError('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [enabled, currentUser, getWebSocketUrl, onNotification, onUnreadCountChange]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      logWarn('WebSocket is not connected');
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    sendMessage({ type: 'mark_read', notification_id: notificationId });
  }, [sendMessage]);

  // Ping to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, NOTIFICATION_WS_PING_INTERVAL_MS);

    return () => clearInterval(pingInterval);
  }, [isConnected, sendMessage]);

  // Initial connection and cleanup
  useEffect(() => {
    if (enabled && currentUser) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, currentUser, connect, disconnect]);

  // Load initial unread count
  useEffect(() => {
    if (currentUser) {
      getUnreadNotificationCount().then(setUnreadCount);
    }
  }, [currentUser]);

  return {
    isConnected,
    unreadCount,
    connect,
    disconnect,
    sendMessage,
    markAsRead,
  };
};
