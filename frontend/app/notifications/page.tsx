"use client";

import { logError } from '@/lib/client-logger';
import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getNotifications,
  markNotificationAsRead,
  markNotificationAsArchived,
  markAllNotificationsAsRead,
  type Notification,
} from '@/lib/notifications-storage';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { Check, CheckCheck, Archive, ExternalLink, Settings, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { NotificationPreferencesDialog } from '@/components/notifications/NotificationPreferencesDialog';
import { usePolling } from '@/hooks/use-polling';
import { NOTIFICATION_POLL_INTERVAL_MS } from '@/lib/constants';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      let params: { status?: string } = {};
      if (activeTab === 'unread') {
        params.status = 'unread';
      } else if (activeTab === 'read') {
        params.status = 'read';
      } else if (activeTab === 'archived') {
        params.status = 'archived';
      }

      const data = await getNotifications(params);
      setNotifications(data);
    } catch (error) {
      logError('Failed to load notifications', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  usePolling(loadNotifications, NOTIFICATION_POLL_INTERVAL_MS, {
    runImmediately: false,
  });

  const handleMarkRead = async (notification: Notification) => {
    try {
      await markNotificationAsRead(notification.id);
      await loadNotifications();
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      await loadNotifications();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleArchive = async (notification: Notification) => {
    try {
      await markNotificationAsArchived(notification.id);
      await loadNotifications();
      toast.success('Notification archived');
    } catch (error) {
      toast.error('Failed to archive notification');
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

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;
  const readCount = notifications.filter((n) => n.status === 'read').length;
  const archivedCount = notifications.filter((n) => n.status === 'archived').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">Manage your notifications and preferences</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPreferencesOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Preferences
            </Button>
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">
              Read
              {readCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {readCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived
              {archivedCount > 0 && (
                <Badge variant="outline" className="ml-2">
                  {archivedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No notifications</p>
                    <p className="text-sm text-muted-foreground mt-2">You're all caught up!</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
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
                                <Badge variant="outline" className="text-xs">
                                  {notification.notificationType}
                                </Badge>
                                {notification.status === 'unread' && (
                                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(notification.createdAt)}
                                </span>
                              </div>
                              <h4 className="font-medium text-sm mb-1">{notification.title}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                              {notification.actionUrl && (
                                <div className="flex items-center gap-1 text-xs text-primary">
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
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkRead(notification);
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchive(notification);
                                }}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <NotificationPreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
    </DashboardLayout>
  );
}
