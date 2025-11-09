import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { useCorrespondence } from '@/contexts/CorrespondenceContext';

export const NotificationBadge = () => {
  const { correspondence, minutes, getMinutesByCorrespondenceId } = useCorrespondence();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Generate notifications from correspondence data
    const notifs: any[] = [];
    const now = new Date();

    correspondence.forEach(item => {
      // Check for urgent items
      if (item.priority === 'urgent' && item.status === 'pending') {
        notifs.push({
          id: `urgent-${item.id}`,
          type: 'urgent',
          title: 'Urgent Correspondence',
          message: `${item.referenceNumber}: ${item.subject}`,
          timestamp: item.receivedDate,
          correspondenceId: item.id,
        });
      }

      // Check for in-progress items
      if (item.status === 'in-progress') {
        const itemMinutes = getMinutesByCorrespondenceId(item.id);
        if (itemMinutes.length > 0) {
          notifs.push({
            id: `progress-${item.id}`,
            type: 'progress',
            title: 'In Progress',
            message: `${item.referenceNumber}: Action required`,
            timestamp: itemMinutes[itemMinutes.length - 1].timestamp,
            correspondenceId: item.id,
          });
        }
      }

      // Check for new minutes (last 24 hours)
      const itemMinutes = getMinutesByCorrespondenceId(item.id);
      if (itemMinutes.length > 0) {
        const recentMinutes = itemMinutes.filter(m => {
          const minuteDate = new Date(m.timestamp);
          return (now.getTime() - minuteDate.getTime()) < (24 * 60 * 60 * 1000);
        });
        
        if (recentMinutes.length > 0) {
          notifs.push({
            id: `minute-${item.id}`,
            type: 'minute',
            title: 'New Minute Added',
            message: `${item.referenceNumber}: ${recentMinutes.length} new minute${recentMinutes.length === 1 ? '' : 's'}`,
            timestamp: recentMinutes[0].timestamp,
            correspondenceId: item.id,
          });
        }
      }
    });

    // Sort by timestamp (newest first)
    notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setNotifications(notifs.slice(0, 10)); // Keep only latest 10
    setUnreadCount(notifs.length);
  }, [correspondence, minutes, getMinutesByCorrespondenceId]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return '🚨';
      case 'progress':
        return '⚡';
      case 'minute':
        return '📝';
      default:
        return '📬';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'text-destructive';
      case 'progress':
        return 'text-warning';
      case 'minute':
        return 'text-info';
      default:
        return 'text-muted-foreground';
    }
  };

  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="font-semibold text-foreground">Notifications</h4>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              Clear all
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getNotificationIcon(notif.type)}</span>
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm font-medium ${getNotificationColor(notif.type)}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-foreground">{notif.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(notif.timestamp), 'PPp')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
