"use client";

import { logError } from '@/lib/client-logger';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getNotifications,
  markNotificationAsRead,
  markNotificationAsArchived,
  markAllNotificationsAsRead,
  type Notification,
} from '@/lib/api/notifications';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { Check, CheckCheck, Archive, ExternalLink, Settings, Bell, Inbox, BellRing, MailQuestion, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { toast } from "@/components/ui/sonner";
import { NotificationPreferencesDialog } from '@/components/notifications/NotificationPreferencesDialog';
import { useNotificationWebSocket } from '@/hooks/use-notification-websocket';
import { cn } from '@/lib/utils';
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params: { status?: string; search?: string } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const data = await getNotifications(params);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      logError('Failed to load notifications', error);
      toast.error('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useNotificationWebSocket({
    onNotification: () => {
      void loadNotifications();
    },
  });

  const handleMarkRead = async (notification: Notification) => {
    try {
      await markNotificationAsRead(notification.id);
      await loadNotifications();
    } catch (_error: unknown) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      await loadNotifications();
      toast.success('All notifications marked as read');
    } catch (_error: unknown) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleArchive = async (notification: Notification) => {
    try {
      await markNotificationAsArchived(notification.id);
      await loadNotifications();
      toast.success('Notification archived');
    } catch (_error: unknown) {
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
  const unreadInList = notifications.filter((n) => n.status === 'unread').length;

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
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

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total", value: notifications.length, icon: BellRing, bgClass: "bg-primary/10", iconClass: "text-primary" },
            { label: "Unread", value: notifications.filter((n) => n.status === "unread").length, icon: MailQuestion, bgClass: "bg-blue-500/10", iconClass: "text-blue-600 dark:text-blue-400" },
            { label: "Read", value: notifications.filter((n) => n.status === "read").length, icon: Bell, bgClass: "bg-green-500/10", iconClass: "text-green-600 dark:text-green-400" },
            { label: "Archived", value: notifications.filter((n) => n.status === "archived").length, icon: Archive, bgClass: "bg-slate-500/10", iconClass: "text-slate-600 dark:text-slate-400" },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label}>
              <CardContent className={registryQueueStatCardContentClass}>
                <div className="flex items-center gap-4">
                  <div className={cn(registryQueueStatIconBoxClass, bgClass)}>
                    <Icon className={cn(registryQueueStatIconClass, iconClass)} />
                  </div>
                  <div>
                    <p className={registryQueueStatLabelClass}>{label}</p>
                    <p className={registryQueueStatValueClass}>{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              {(["all", "unread", "read", "archived"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`h-8 rounded-md px-2.5 text-xs font-medium capitalize transition-colors ${
                    statusFilter === status
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {status}
                  {status === "unread" && statusFilter !== "unread" && unreadInList > 0 && (
                    <span className="ml-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] inline-flex items-center justify-center">
                      {unreadInList > 99 ? '99+' : unreadInList}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notification list */}
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
                  {statusFilter === 'unread' 
                    ? "You're all caught up! No unread notifications." 
                    : statusFilter === 'archived'
                    ? "No archived notifications yet."
                    : debouncedSearch
                    ? "No notifications match your search."
                    : "When you receive notifications, they'll appear here."}
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[calc(100vh-280px)]">
                <div className="divide-y divide-border">
                  {notifications.map((notification: Notification) => (
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
      </div>

      <NotificationPreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
    </>
  );
}
