"use client";

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
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarNavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
  isActive: boolean;
  badge?: number;
  badgeVariant?: "default" | "secondary" | "destructive";
  description?: string;
  countsLoading?: boolean;
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
  countsLoading,
}: SidebarNavItemProps) {
  const badgeContent = badge != null && badge > 0 && (
    <Badge variant={badgeVariant} className="ml-auto shrink-0">
      {badge > 99 ? "99+" : badge}
    </Badge>
  );

  const badgeOverlay = badge != null && badge > 0 && (
    <Badge
      variant={badgeVariant}
      className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
    >
      {badge > 99 ? "99+" : badge}
    </Badge>
  );

  const badgeSkeleton = badge != null && countsLoading ? (
    <Skeleton className="h-5 w-8" />
  ) : null;

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link href={href} className="relative">
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
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={href} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </div>
          {badgeSkeleton || badgeContent}
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
