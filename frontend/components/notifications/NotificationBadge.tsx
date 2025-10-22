"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationBadgeProps {
  userRole: string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function NotificationBadge({ 
  userRole, 
  className = "", 
  showIcon = true,
  size = 'md' 
}: NotificationBadgeProps) {
  const { unreadCount, isLoading } = useNotifications(userRole);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        {showIcon && <Bell className="w-4 h-4 text-gray-300" />}
      </div>
    );
  }

  if (unreadCount === 0) {
    return showIcon ? (
      <Bell className={`text-gray-400 ${className}`} />
    ) : null;
  }

  const sizeClasses = {
    sm: 'w-3 h-3 text-xs',
    md: 'w-4 h-4 text-xs',
    lg: 'w-5 h-5 text-sm'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  return (
    <div className="relative inline-flex items-center">
      {showIcon && (
        <Bell className={`text-gray-600 ${iconSizes[size]} ${className}`} />
      )}
      <span className={`absolute -top-1 -right-1 ${sizeClasses[size]} bg-red-500 text-white rounded-full flex items-center justify-center font-medium`}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    </div>
  );
}
