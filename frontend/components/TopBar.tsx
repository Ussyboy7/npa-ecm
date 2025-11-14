"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RoleSwitcher } from "./RoleSwitcher";
import { NotificationBell } from "./notifications/NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
import { hasTokens, logout } from "@/lib/api-client";

export const TopBar = () => {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(hasTokens());
  }, []);

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Logo & Title */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-lg shadow-soft ring-1 ring-primary/20 bg-white">
            <Image
              src={NPA_LOGO_URL}
              alt={`${NPA_BRAND_NAME} crest`}
              fill
              className="object-contain"
              sizes="40px"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{NPA_BRAND_NAME}</span>
            <span className="text-xs text-muted-foreground">Enterprise Content Management</span>
          </div>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <NotificationBell />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Role Switcher */}
          <RoleSwitcher />

          {authenticated ? (
            <button
              onClick={handleLogout}
              className="rounded-md border border-border px-3 py-1 text-sm transition-colors hover:bg-muted"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-border px-3 py-1 text-sm transition-colors hover:bg-muted"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
