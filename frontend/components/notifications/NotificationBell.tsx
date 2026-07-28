"use client";

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationList } from './NotificationList';
import { useNotificationWebSocket } from '@/hooks/use-notification-websocket';
import { getUnreadCount } from '@/lib/api/notifications';
import { toast } from "@/components/ui/sonner";
import { useRouter } from 'next/navigation';

export const NotificationBell = () => {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const { isConnected, sendMessage } = useNotificationWebSocket({
    enabled: true,
    onNotification: (notification) => {
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
    },
    onUnreadCountChange: (count) => {
      if (count >= 0) {
        setUnreadCount(count);
      }
    },
  });

  // Seed badge from REST once on mount; WebSocket takes over for live updates.
  useEffect(() => {
    let cancelled = false;
    void getUnreadCount().then((count) => {
      if (!cancelled) {
        setUnreadCount(count);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isOpen || !isConnected) return;
    sendMessage({ type: 'get_unread_count' });
  }, [isOpen, isConnected, sendMessage]);

  const ariaLabel = unreadCount > 0
    ? `Notifications, ${unreadCount} unread`
    : 'Notifications';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative pointer-events-auto"
          aria-label={ariaLabel}
          title={ariaLabel}
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
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[600px] overflow-hidden z-50">
        <NotificationList onClose={() => setIsOpen(false)} isOpen={isOpen} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
