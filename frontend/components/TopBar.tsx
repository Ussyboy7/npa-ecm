"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogOut, Shield, Bell, HelpCircle, UserCog, Clock, Calendar, Settings, User, Inbox } from "lucide-react";
import { NotificationBell } from "./notifications/NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
import { hasTokens, logout } from "@/lib/api-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SimplifiedRoleSwitcher } from "./SimplifiedRoleSwitcher";

export const TopBar = () => {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const { currentUser, hydrated } = useCurrentUser();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setAuthenticated(hasTokens());
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    router.push("/login");
  };

  const handleRoleSwitcherOpenChange = useCallback((open: boolean) => {
    setRoleSwitcherOpen(open);
  }, []);

  // Handle Escape key to close the role switcher panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && roleSwitcherOpen) {
        setRoleSwitcherOpen(false);
      }
    };
    
    if (roleSwitcherOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [roleSwitcherOpen]);

  const getUserInitials = () => {
    if (!currentUser?.name) return 'U';
    return currentUser.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserRoleDisplay = () => {
    if (!currentUser) return 'User';
    if (currentUser.systemRole) return currentUser.systemRole;
    return 'Staff';
  };

  // Format time as HH:MM AM/PM
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format date as "Day, Month Date"
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric'
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-sidebar-border bg-sidebar overflow-hidden">
      <div className="flex h-12 items-center gap-2 md:gap-3 px-3 md:px-4">
        {/* Mobile Sidebar Toggle */}
        <SidebarTrigger className="md:hidden h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent" />

        {/* Logo & Title - Only show on mobile */}
        <Link href="/" className="flex items-center gap-2 md:hidden min-w-0">
          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-sidebar-primary/30 bg-white">
            <Image
              src={NPA_LOGO_URL}
              alt={`${NPA_BRAND_NAME} crest`}
              fill
              className="object-contain p-0.5"
              sizes="32px"
              priority
            />
          </div>
          <span className="text-sm font-semibold truncate text-sidebar-foreground">{NPA_BRAND_NAME}</span>
        </Link>

        {/* Date & Time - Desktop */}
        <div className="hidden md:flex items-center gap-3 text-xs text-sidebar-foreground/70">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium tabular-nums text-sidebar-foreground">{formatTime(currentTime)}</span>
          </div>
          <div className="h-4 w-px bg-sidebar-border" />
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(currentTime)}</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-1 md:gap-1.5">
          {/* User Info - Desktop only */}
          {hydrated && currentUser && (
            <div className="hidden lg:flex items-center gap-2 text-xs min-w-0 max-w-[140px] mr-1">
              <div className="text-right min-w-0">
                <div className="font-medium text-sidebar-foreground truncate">
                  {currentUser.name || 'User'}
                </div>
                <div className="flex items-center justify-end gap-1 text-sidebar-foreground/60">
                  <Shield className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{getUserRoleDisplay()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          <NotificationBell />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Profile Dropdown - Only render after hydration to prevent flash */}
          {!hydrated ? (
            <div className="h-8 w-8 rounded-full bg-sidebar-accent animate-pulse" />
          ) : authenticated && currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 hover:bg-sidebar-accent">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center text-sidebar-primary-foreground font-medium text-xs ring-2 ring-sidebar-primary/30">
                    {getUserInitials()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {/* User Info Header */}
                <DropdownMenuLabel className="font-normal pb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-medium text-sm flex-shrink-0">
                      {getUserInitials()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-semibold leading-none truncate">{currentUser.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{currentUser.email}</p>
                      {currentUser.systemRole && (
                        <Badge variant="secondary" className="w-fit mt-1.5 text-[10px]">
                          <Shield className="h-3 w-3 mr-1" />
                          {currentUser.systemRole}
                        </Badge>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Quick Actions */}
                <DropdownMenuItem asChild>
                  <Link href="/inbox" className="flex items-center cursor-pointer">
                    <Inbox className="h-4 w-4 mr-2" />
                    My Inbox
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/notifications" className="flex items-center cursor-pointer">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {/* Settings & Admin */}
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {/* Role Switcher - Only show for Super Admins */}
                {currentUser?.systemRole === "Super Admin" && (
                  <DropdownMenuItem onClick={() => setRoleSwitcherOpen(true)} className="cursor-pointer">
                    <UserCog className="h-4 w-4 mr-2" />
                    Switch Role
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/help" className="flex items-center cursor-pointer">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Help & Support
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {/* Logout */}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : authenticated ? (
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-xs h-8 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              Logout
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="text-xs h-8 text-sidebar-foreground hover:bg-sidebar-accent">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Role Switcher - Custom Modal (no Radix UI) */}
      {roleSwitcherOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in-0 p-4" 
          onClick={() => setRoleSwitcherOpen(false)}
        >
          <div 
            className="w-full max-w-2xl max-h-[85vh] bg-background rounded-lg shadow-xl border animate-in zoom-in-95 duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-semibold">Switch Role</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setRoleSwitcherOpen(false)}
                className="h-8 w-8"
              >
                <span className="sr-only">Close</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </Button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <SimplifiedRoleSwitcher onClose={() => setRoleSwitcherOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
