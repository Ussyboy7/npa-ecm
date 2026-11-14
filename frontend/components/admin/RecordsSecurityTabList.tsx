"use client";

import { Suspense } from "react";
import { HubTabList, type HubTabLink } from "@/components/admin/HubTabList";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

function recordsTabActive(tab: string) {
  return (pathname: string, searchTab: string | null) => {
    if (pathname.startsWith("/admin/records-governance/drm")) {
      return tab === "drm";
    }
    if (pathname === "/admin/records-governance" || pathname.startsWith("/admin/records-governance?")) {
      const current = searchTab || "overview";
      return current === tab;
    }
    return false;
  };
}

function RecordsSecurityTabListInner() {
  const visibility = useSidebarVisibility();
  const showRecords =
    visibility.showRecordsGovernance || visibility.showDrmPolicies;
  const tabs: HubTabLink[] = [];

  if (showRecords) {
    tabs.push(
      {
        href: "/admin/records-governance?tab=overview",
        label: "Overview",
        isActive: recordsTabActive("overview"),
      },
      {
        href: "/admin/records-governance?tab=retention",
        label: "Retention",
        isActive: recordsTabActive("retention"),
      },
      {
        href: "/admin/records-governance?tab=holds",
        label: "Legal Holds",
        isActive: recordsTabActive("holds"),
      },
      {
        href: "/admin/records-governance?tab=disposal",
        label: "Disposal",
        isActive: recordsTabActive("disposal"),
      },
    );
    if (visibility.showDrmPolicies) {
      tabs.push({
        href: "/admin/records-governance/drm",
        label: "DRM",
        isActive: recordsTabActive("drm"),
      });
    }
  }

  if (visibility.showAuditCompliance) {
    tabs.push({
      href: "/admin/records-governance?tab=audit",
      label: "Audit",
      isActive: recordsTabActive("audit"),
    });
  }

  return <HubTabList tabs={tabs} />;
}

export function RecordsSecurityTabList() {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <RecordsSecurityTabListInner />
    </Suspense>
  );
}
