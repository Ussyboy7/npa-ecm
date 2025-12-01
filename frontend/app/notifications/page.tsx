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
import { Check, CheckCheck, Archive, ExternalLink, Settings, Bell, Inbox, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
      setLoading(true);
      let params: { status?: string } = {};
      if (activeTab === 'unread') {
        params.status = 'unread';
      } else if (activeTab === 'read') {
        params.status = 'read';
      } else if (activeTab === 'archived') {
        params.status = 'archived';
      }
      // For 'all' tab, fetch all notifications (no status filter)
      // The backend will return all non-archived by default

      const data = await getNotifications(params);
      // Ensure we're not showing archived notifications in 'all' tab
      const filtered = activeTab === 'all' 
        ? data.filter((n) => n.status !== 'archived')
        : data;
      setNotifications(filtered);
    } catch (error) {
      logError('Failed to load notifications', error);
      toast.error('Failed to load notifications');
      setNotifications([]);
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

  // Count from the current filtered list for display
  const displayCount = notifications.length;
  const unreadInList = notifications.filter((n) => n.status === 'unread').length;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Stay updated on correspondence and system alerts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreferencesOpen(true)}>
              <Settings className="h-4 w-4 mr-1.5" />
              Preferences
            </Button>
            {unreadInList > 0 && (
              <Button size="sm" onClick={handleMarkAllRead}>
                <CheckCheck className="h-4 w-4 mr-1.5" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs sm:text-sm">
              Unread
              {activeTab !== 'unread' && unreadInList > 0 && (
                <span className="ml-1.5 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                  {unreadInList > 99 ? '99+' : unreadInList}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="read" className="text-xs sm:text-sm">
              Read
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-xs sm:text-sm">
              Archived
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 p-3">
                        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-16 px-4 text-center">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Inbox className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-foreground mb-1">No notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      {activeTab === 'unread' 
                        ? "You're all caught up! No unread notifications." 
                        : activeTab === 'archived'
                        ? "No archived notifications yet."
                        : "When you receive notifications, they'll appear here."}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[calc(100vh-280px)]">
                    <div className="divide-y divide-border">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 sm:p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                            notification.status === 'unread' 
                              ? 'bg-primary/5 border-l-2 border-l-primary' 
                              : ''
                          }`}
                          onClick={() => handleClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            {/* Unread indicator */}
                            <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                              notification.status === 'unread' ? 'bg-primary' : 'bg-transparent'
                            }`} />
                            
                            <div className="flex-1 min-w-0">
                              {/* Header row */}
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant={getPriorityColor(notification.priority)} className="text-[10px] h-5">
                                  {notification.priority}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {notification.notificationType.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {formatDateTime(notification.createdAt)}
                                </span>
                              </div>
                              
                              {/* Content */}
                              <h4 className="font-medium text-sm mb-0.5 line-clamp-1">{notification.title}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                              
                              {notification.actionUrl && (
                                <div className="flex items-center gap-1 text-xs text-primary mt-2">
                                  <ExternalLink className="h-3 w-3" />
                                  <span>View details</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {notification.status === 'unread' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Mark as read"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkRead(notification);
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {notification.status !== 'archived' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Archive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchive(notification);
                                  }}
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </Button>
                              )}
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
