"use client";

import { Suspense } from "react";
import { HubTabList, type HubTabLink } from "@/components/admin/HubTabList";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

function AnalyticsTabListInner() {
  const visibility = useSidebarVisibility();
  const tabs: HubTabLink[] = [];

  if (visibility.showExecutiveDashboard) {
    tabs.push({
      href: "/analytics/executive",
      label: "Executive",
      isActive: (pathname) => pathname.startsWith("/analytics/executive"),
    });
  }
  if (visibility.showPerformanceAnalytics) {
    tabs.push({
      href: "/analytics/performance",
      label: "Performance",
      isActive: (pathname) => pathname.startsWith("/analytics/performance"),
    });
  }
  if (visibility.showDivisionAnalytics) {
    tabs.push({
      href: "/analytics/divisions",
      label: "Divisions",
      isActive: (pathname) => pathname.startsWith("/analytics/divisions"),
    });
  }
  if (visibility.showCaseAnalytics) {
    tabs.push({
      href: "/analytics/cases",
      label: "Cases",
      isActive: (pathname) => pathname.startsWith("/analytics/cases"),
    });
  }

  if (tabs.length <= 1) return null;
  return <HubTabList tabs={tabs} />;
}

export function AnalyticsTabList() {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <AnalyticsTabListInner />
    </Suspense>
  );
}
