"use client";

import { Suspense } from "react";
import { HubTabList, type HubTabLink } from "@/components/admin/HubTabList";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { getPlatformHomePath } from "@/lib/platform-navigation";

function AdminHubTabListInner() {
  const visibility = useSidebarVisibility();
  const platformHome = getPlatformHomePath(visibility);
  const tabs: HubTabLink[] = [];

  if (visibility.showAdminDashboard) {
    tabs.push({
      href: "/admin",
      label: "Overview",
      isActive: (pathname) => pathname === "/admin",
    });
  }
  if (platformHome) {
    tabs.push({
      href: platformHome,
      label: "Platform",
      isActive: (pathname) => pathname.startsWith("/admin/platform"),
    });
  }

  if (tabs.length <= 1) return null;
  return <HubTabList tabs={tabs} appearance="outlined" />;
}

export function AdminHubTabList() {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <AdminHubTabListInner />
    </Suspense>
  );
}
