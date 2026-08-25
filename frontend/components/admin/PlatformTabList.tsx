"use client";

import { Suspense } from "react";
import { HubTabList, type HubTabLink } from "@/components/admin/HubTabList";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

function PlatformTabListInner() {
  const visibility = useSidebarVisibility();
  const tabs: HubTabLink[] = [];
  if (visibility.showSystemHealth) {
    tabs.push({
      href: "/admin/platform/health",
      label: "Health",
      isActive: (pathname) => pathname.startsWith("/admin/platform/health"),
    });
  }
  if (visibility.showHelpdeskQueue) {
    tabs.push({
      href: "/admin/platform/support",
      label: "Support",
      isActive: (pathname) => pathname.startsWith("/admin/platform/support"),
    });
  }
  if (visibility.showIntegrationHub) {
    tabs.push({
      href: "/admin/platform/integrations",
      label: "Integrations",
      isActive: (pathname) => pathname.startsWith("/admin/platform/integrations"),
    });
  }
  if (visibility.showLegacyImport) {
    tabs.push({
      href: "/admin/platform/legacy-import",
      label: "Legacy import",
      isActive: (pathname) => pathname.startsWith("/admin/platform/legacy-import"),
    });
  }
  if (tabs.length <= 1) return null;
  return <HubTabList tabs={tabs} />;
}

export function PlatformTabList() {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <PlatformTabListInner />
    </Suspense>
  );
}
