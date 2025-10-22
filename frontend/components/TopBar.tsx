"use client";

import { Bell, Search, User, LogOut, Menu, FileText, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import NotificationCenter from "./notifications/NotificationCenter";
import { getUnreadCount } from "@/lib/notifications/mockNotifications";

interface TopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function TopBar({ onMenuClick, showMenuButton = false }: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRole, setUserRole] = useState("MD"); // Default role for testing
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Get user role from localStorage or context
    const role = localStorage.getItem('mockUserRole') || 'MD';
    setUserRole(role);
    
    // Get unread notification count
    const count = getUnreadCount(role);
    setUnreadCount(count);

    // Get dark mode preference from localStorage
    const darkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(darkMode);
    
    // Apply dark mode to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center shadow-sm h-16">
      {/* Left side - Logo/Brand (fixed width to match sidebar) */}
      <div className="w-64 px-4 flex items-center space-x-2 border-r border-gray-200 dark:border-gray-700 h-full">
        <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">NPA ECM</h1>
      </div>

      {/* Center/Right - Search and actions */}
      <div className="flex-1 flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            >
              <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
          
          {/* Search bar */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search documents, workflows..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-96 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Right side - Notifications and user menu */}
        <div className="flex items-center space-x-4">
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleDarkMode}
          className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? (
            <Sun className="h-5 w-5 text-yellow-500" />
          ) : (
            <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Notifications */}
        <button 
          onClick={() => setNotificationCenterOpen(true)}
          className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
              John Doe
            </span>
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">John Doe</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Operations Manager</p>
                </div>
                <a
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Profile
                </a>
                <a
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Settings
                </a>
                <button className="block w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <LogOut className="inline h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Notification Center */}
      <NotificationCenter
        userRole={userRole}
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />
    </header>
  );
}
