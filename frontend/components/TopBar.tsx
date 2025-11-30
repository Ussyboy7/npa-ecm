"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Shield, Bell, HelpCircle, UserCog } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimplifiedRoleSwitcher } from "./SimplifiedRoleSwitcher";

export const TopBar = () => {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const { currentUser, hydrated } = useCurrentUser();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  useEffect(() => {
    setAuthenticated(hasTokens());
  }, []);

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    router.push("/login");
  };

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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-hidden">
      <div className="flex h-14 items-center gap-2 md:gap-4 px-4 md:px-6">
        {/* Mobile Sidebar Toggle */}
        <SidebarTrigger className="md:hidden" />

        {/* Logo & Title - Only show on mobile */}
        <Link href="/" className="flex items-center gap-3 md:hidden">
          <div className="relative h-10 w-10 overflow-hidden rounded-lg shadow-sm ring-1 ring-primary/20 bg-white dark:bg-gray-900">
            <Image
              src={NPA_LOGO_URL}
              alt={`${NPA_BRAND_NAME} crest`}
              fill
              className="object-contain p-1"
              sizes="40px"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{NPA_BRAND_NAME}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">Enterprise Content Management</span>
          </div>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* User Greeting - Desktop only */}
          {hydrated && currentUser && (
            <div className="hidden lg:flex items-center gap-2 text-sm min-w-0 max-w-[150px]">
              <div className="text-right min-w-0">
                <div className="font-medium text-foreground truncate">
                  {currentUser.name?.split(' ')[0] || 'User'}
                </div>
                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
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

          {/* User Profile Dropdown */}
          {authenticated && hydrated && currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium text-sm">
                    {getUserInitials()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
                    {currentUser.systemRole && (
                      <Badge variant="secondary" className="w-fit mt-1">
                        <Shield className="h-3 w-3 mr-1" />
                        {currentUser.systemRole}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Role Switcher - Only show for Super Admins */}
                {authenticated && currentUser?.systemRole === "Super Admin" && (
                  <>
                    <DropdownMenuItem onClick={() => setRoleSwitcherOpen(true)} className="cursor-pointer">
                      <UserCog className="h-4 w-4 mr-2" />
                      Switch Role
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/notifications" className="flex items-center cursor-pointer">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help" className="flex items-center cursor-pointer">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Help & Support
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-rose-600 dark:text-rose-400 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : authenticated ? (
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="text-sm"
            >
              Logout
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Role Switcher Dialog */}
      <Dialog open={roleSwitcherOpen} onOpenChange={setRoleSwitcherOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Switch Role</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <SimplifiedRoleSwitcher onClose={() => setRoleSwitcherOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};
