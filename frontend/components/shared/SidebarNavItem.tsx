"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface SidebarNavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
  isActive: boolean;
  badge?: number;
  badgeVariant?: "default" | "secondary" | "destructive";
  description?: string;
}

export function SidebarNavItem({
  href,
  icon: Icon,
  label,
  isCollapsed,
  isActive,
  badge,
  badgeVariant = "default",
  description,
}: SidebarNavItemProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showBadge = mounted && badge != null && badge > 0;
  const badgeContent = showBadge ? (
    <Badge variant={badgeVariant} className="ml-auto shrink-0">
      {badge! > 99 ? "99+" : badge}
    </Badge>
  ) : null;

  const badgeOverlay = showBadge ? (
    <Badge
      variant={badgeVariant}
      className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
    >
      {badge! > 99 ? "99+" : badge}
    </Badge>
  ) : null;

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link href={href} className="relative" suppressHydrationWarning>
                <Icon className="h-4 w-4" />
                {badgeOverlay}
                <span className="sr-only">{label}</span>
              </Link>
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}{badge != null && badge > 0 ? ` (${badge})` : ""}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} suppressHydrationWarning>
        <Link href={href} className="flex items-center justify-between w-full" suppressHydrationWarning>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </div>
          {badgeContent}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

interface AdminNavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
}

export function AdminNavItem({ href, icon: Icon, label, isActive, isCollapsed }: AdminNavItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={href}>
          <Icon className="h-4 w-4" />
          {!isCollapsed && <span>{label}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
