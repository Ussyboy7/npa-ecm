"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { 
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  User,
  Building
} from "lucide-react";
import { 
  getNotificationsForRole, 
  getUnreadCount, 
  markAsRead,
  getNotificationIcon,
  getNotificationColor,
  getPriorityColor,
  type Notification
} from "@/lib/notifications/mockNotifications";

interface NotificationCenterProps {
  userRole: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ userRole, isOpen, onClose }: NotificationCenterProps) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const roleNotifications = getNotificationsForRole(userRole, pathname);
    setNotifications(roleNotifications);
    setUnreadCount(getUnreadCount(userRole, pathname));
  }, [userRole, pathname]);

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId, userRole);
    const updatedNotifications = getNotificationsForRole(userRole, pathname);
    setNotifications(updatedNotifications);
    setUnreadCount(getUnreadCount(userRole, pathname));
  };

  const handleMarkAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.read) {
        markAsRead(notification.id, userRole);
      }
    });
    const updatedNotifications = getNotificationsForRole(userRole, pathname);
    setNotifications(updatedNotifications);
    setUnreadCount(0);
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-md"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Bell className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      notification.read 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-white border-gray-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getTypeIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`text-sm font-medium ${
                              notification.read ? 'text-gray-600' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </h3>
                            <p className={`text-sm mt-1 ${
                              notification.read ? 'text-gray-500' : 'text-gray-700'
                            }`}>
                              {notification.message}
                            </p>
                          </div>
                          
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="ml-2 p-1 hover:bg-gray-100 rounded-md"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4 text-gray-400" />
                            </button>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              getPriorityColor(notification.priority)
                            }`}>
                              {notification.priority.toUpperCase()}
                            </span>
                            
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              getNotificationColor(notification.type)
                            }`}>
                              {notification.category.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(notification.timestamp)}</span>
                          </div>
                        </div>

                        {/* Sender Info */}
                        {notification.sender && (
                          <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            <span>{notification.sender.name}</span>
                            <Building className="w-3 h-3" />
                            <span>{notification.sender.department}</span>
                          </div>
                        )}

                        {/* Action Required Badge */}
                        {notification.actionRequired && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">
                              Action Required
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Showing notifications for {userRole} role
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Current page: {pathname}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
