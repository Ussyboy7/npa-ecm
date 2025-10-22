"use client";

import { useState } from "react";
import { 
  Bell, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  ExternalLink
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { getNotificationColor, getPriorityColor } from "@/lib/notifications/mockNotifications";

interface NotificationWidgetProps {
  userRole: string;
  maxItems?: number;
  showAllButton?: boolean;
  className?: string;
}

export default function NotificationWidget({ 
  userRole, 
  maxItems = 5, 
  showAllButton = true,
  className = "" 
}: NotificationWidgetProps) {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markNotificationAsRead,
    getActionRequiredNotifications 
  } = useNotifications(userRole);

  const [expanded, setExpanded] = useState(false);

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
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

  const displayNotifications = expanded ? notifications : notifications.slice(0, maxItems);
  const actionRequiredCount = getActionRequiredNotifications().length;

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          {actionRequiredCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">
              {actionRequiredCount} Action Required
            </span>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Bell className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm">No notifications</p>
            <p className="text-xs">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {displayNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getTypeIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`text-sm font-medium ${
                          notification.read ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h4>
                        <p className={`text-sm mt-1 line-clamp-2 ${
                          notification.read ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                          {notification.message}
                        </p>
                      </div>
                      
                      {!notification.read && (
                        <button
                          onClick={() => markNotificationAsRead(notification.id)}
                          className="ml-2 p-1 hover:bg-gray-200 rounded-md"
                          title="Mark as read"
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </button>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          getPriorityColor(notification.priority)
                        }`}>
                          {notification.priority.toUpperCase()}
                        </span>
                        
                        {notification.actionRequired && (
                          <span className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">
                            Action Required
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(notification.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > maxItems && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <span>{expanded ? 'Show Less' : `Show All ${notifications.length} Notifications`}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
