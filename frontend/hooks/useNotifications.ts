"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { 
  getNotificationsForRole, 
  getUnreadCount, 
  markAsRead,
  type Notification 
} from "@/lib/notifications/mockNotifications";

export function useNotifications(userRole: string) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API call delay
    const timer = setTimeout(() => {
      const roleNotifications = getNotificationsForRole(userRole, pathname);
      const count = getUnreadCount(userRole, pathname);
      
      setNotifications(roleNotifications);
      setUnreadCount(count);
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [userRole, pathname]);

  const markNotificationAsRead = (notificationId: string) => {
    markAsRead(notificationId, userRole);
    
    // Update local state
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.read) {
        markAsRead(notification.id, userRole);
      }
    });
    
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const getNotificationsByCategory = (category: string) => {
    return notifications.filter(notification => notification.category === category);
  };

  const getNotificationsByPriority = (priority: string) => {
    return notifications.filter(notification => notification.priority === priority);
  };

  const getActionRequiredNotifications = () => {
    return notifications.filter(notification => notification.actionRequired);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markNotificationAsRead,
    markAllAsRead,
    getNotificationsByCategory,
    getNotificationsByPriority,
    getActionRequiredNotifications,
  };
}
