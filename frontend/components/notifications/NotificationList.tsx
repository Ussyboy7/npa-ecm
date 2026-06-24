"use client";

import { logError, logInfo } from '@/lib/client-logger';
import { useCallback, useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markNotificationAsArchived,
  type Notification,
} from '@/lib/notifications-storage';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { Check, CheckCheck, Archive, ExternalLink, Settings, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { useNotificationWebSocket } from '@/hooks/use-notification-websocket';

interface NotificationListProps {
  onClose?: () => void;
  isOpen?: boolean;
}

export const NotificationList = ({ onClose, isOpen = false }: NotificationListProps) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const allData = await getNotifications();
      logInfo('[NotificationList] Loaded notifications:', { count: allData.length });

      const filtered = allData
        .filter((n) => n.status !== 'archived')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50);

      setNotifications(filtered);
    } catch (error: unknown) {
      logError('Failed to load notifications', error);
      toast.error('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useNotificationWebSocket({
    enabled: isOpen,
    onNotification: () => {
      void loadNotifications();
    },
  });

  useEffect(() => {
    if (isOpen) {
      void loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  const debouncedUpdateNotifications = useCallback((updater: (prev: Notification[]) => Notification[]) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setNotifications(updater);
    }, 100);
  }, []);

  const handleMarkRead = async (notification: Notification) => {
    if (markingRead === notification.id) return;

    setMarkingRead(notification.id);
    try {
      await markNotificationAsRead(notification.id);
      debouncedUpdateNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, status: 'read' as const, readAt: new Date().toISOString() }
            : n
        )
      );
    } catch (error: unknown) {
      logError('Failed to mark notification as read', error);
      toast.error('Failed to mark notification as read');
    } finally {
      setMarkingRead(null);
    }
  };

  const handleMarkAllRead = useCallback(async () => {
    if (markingAllRead) return;

    setMarkingAllRead(true);
    try {
      await markAllNotificationsAsRead();
      await loadNotifications();
      toast.success('All notifications marked as read');
    } catch (error: unknown) {
      logError('Failed to mark all notifications as read', error);
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAllRead(false);
    }
  }, [markingAllRead, loadNotifications]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        const unreadCount = notifications.filter((n) => n.status === 'unread').length;
        if (unreadCount > 0 && !markingAllRead) {
          void handleMarkAllRead();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, notifications, markingAllRead, handleMarkAllRead]);

  const handleArchive = async (notification: Notification) => {
    if (archiving === notification.id) return;

    setArchiving(notification.id);
    try {
      await markNotificationAsArchived(notification.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      toast.success('Notification archived');
    } catch (error: unknown) {
      logError('Failed to archive notification', error);
      toast.error('Failed to archive notification');
    } finally {
      setArchiving(null);
    }
  };

  const handleClick = async (notification: Notification) => {
    if (notification.status === 'unread') {
      await handleMarkRead(notification);
    }

    if (notification.actionUrl) {
      if (notification.actionUrl.startsWith('http')) {
        window.open(notification.actionUrl, '_blank');
      } else {
        router.push(notification.actionUrl);
        onClose?.();
      }
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'normal':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const sanitizeContent = (content: string): string => {
    if (!content) return '';
    const div = document.createElement('div');
    div.textContent = content;
    return div.textContent || '';
  };

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">Loading notifications...</div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="text-xs h-7"
              title="Mark all as read (Ctrl+Shift+M / Cmd+Shift+M)"
            >
              {markingAllRead ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild className="text-xs h-7">
            <Link href="/settings#notifications">
              <Settings className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1" style={{ maxHeight: '500px' }}>
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <p>No notifications</p>
            <p className="text-xs mt-2">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                  notification.status === 'unread' ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                }`}
                onClick={() => handleClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                        {notification.priority}
                      </Badge>
                      {notification.status === 'unread' && (
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm mb-1">{sanitizeContent(notification.title)}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{sanitizeContent(notification.message)}</p>
                    {notification.actionUrl && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                        <ExternalLink className="h-3 w-3" />
                        <span>View details</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {notification.status === 'unread' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={markingRead === notification.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(notification);
                        }}
                        aria-label="Mark as read"
                      >
                        {markingRead === notification.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={archiving === notification.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(notification);
                      }}
                      aria-label="Archive notification"
                    >
                      {archiving === notification.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Archive className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {notifications.length > 0 && (
        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      )}
    </div>
  );
};
