"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getUnreadCount, type Notification } from '@/lib/notifications-storage';
import { NotificationList } from './NotificationList';
import { useNotificationWebSocket } from '@/hooks/use-notification-websocket';
import { usePolling } from '@/hooks/use-polling';
import { NOTIFICATION_POLL_INTERVAL_MS } from '@/lib/constants';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { logError, logInfo } from '@/lib/client-logger';

export const NotificationBell = () => {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasShownConnectionFailureToast = useRef(false);
  const isFetchingRef = useRef(false);

  // Use WebSocket for real-time updates
  const { unreadCount: wsUnreadCount, isConnected, sendMessage } = useNotificationWebSocket({
    enabled: true,
    onNotification: (notification) => {
      // Show toast notification if dropdown is closed
      if (!isOpen) {
        toast.info(notification.title, {
          description: notification.message,
          action: notification.actionUrl ? {
            label: 'View',
            onClick: () => {
              if (notification.actionUrl?.startsWith('http')) {
                window.open(notification.actionUrl, '_blank');
              } else if (notification.actionUrl) {
                router.push(notification.actionUrl);
              }
            },
          } : undefined,
        });
      }
      // Count will be updated via onUnreadCountChange
    },
    onUnreadCountChange: (count) => {
      // Handle connection failure signal (-1)
      if (count === -1) {
        // Only show toast once per connection failure
        if (!hasShownConnectionFailureToast.current) {
          toast.warning('WebSocket connection failed. Using polling mode for notifications.', {
            duration: 5000,
          });
          hasShownConnectionFailureToast.current = true;
        }
        setError('Connection issue');
        return;
      }
      // Reset the flag when connection is restored
      if (hasShownConnectionFailureToast.current && count >= 0) {
        hasShownConnectionFailureToast.current = false;
      }
      setUnreadCount(count);
      setError(null);
    },
  });

  // Fetch unread count only when WebSocket is disconnected
  // Use refs to keep callback stable and prevent polling restarts
  const isConnectedRef = useRef(isConnected);
  const isOpenRef = useRef(isOpen);
  
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);
  
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const fetchUnreadCount = useCallback(async () => {
    // Don't fetch if WebSocket is connected
    if (isConnectedRef.current) return;
    // Prevent concurrent requests
    if (isFetchingRef.current) return;
    // Don't poll when dropdown is open (NotificationList handles it)
    if (isOpenRef.current) return;
    
    isFetchingRef.current = true;
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      logError('Failed to fetch unread notification count', err);
      setError('Failed to load notifications');
      setUnreadCount(0);
    } finally {
      isFetchingRef.current = false;
    }
  }, []); // Empty dependency array - use refs for dynamic values

  // Only poll when WebSocket is disconnected AND dropdown is closed
  // When dropdown is open, NotificationList handles its own polling
  usePolling(fetchUnreadCount, NOTIFICATION_POLL_INTERVAL_MS, {
    enabled: !isConnected && !isOpen,
    runImmediately: !isConnected && !isOpen, // Fetch immediately when disconnected and closed
  });

  // Use WebSocket count when connected
  useEffect(() => {
    if (isConnected) {
      setUnreadCount(wsUnreadCount);
      setError(null);
      // Reset the toast flag when connection is restored
      hasShownConnectionFailureToast.current = false;
    }
    // When disconnected, polling handles all fetching - no duplicate fetch needed
  }, [isConnected, wsUnreadCount]);

  // Resync badge after closing the panel (REST mark-read used to leave WS count stale)
  useEffect(() => {
    if (isOpen) return;
    if (isConnected) {
      sendMessage({ type: 'get_unread_count' });
    } else {
      void getUnreadCount(true).then((count) => setUnreadCount(count));
    }
  }, [isOpen, isConnected, sendMessage]);

  const ariaLabel = unreadCount > 0 
    ? `Notifications, ${unreadCount} unread` 
    : 'Notifications';

  const tooltipText = error && !isConnected ? 'Connection issue: Using polling' : ariaLabel;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative pointer-events-auto"
          aria-label={ariaLabel}
          title={tooltipText}
          type="button"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs pointer-events-none"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {error && !isConnected && (
            <AlertCircle className="absolute -bottom-1 -right-1 h-3 w-3 text-warning pointer-events-none" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[600px] overflow-hidden z-50">
        <NotificationList onClose={() => setIsOpen(false)} isOpen={isOpen} isConnected={isConnected} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

