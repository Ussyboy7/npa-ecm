"use client";

import { Suspense } from "react";
import { HubTabList, type HubTabLink } from "@/components/admin/HubTabList";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

function RegistryTabListInner() {
  const visibility = useSidebarVisibility();
  const tabs: HubTabLink[] = [];

  if (visibility.showRegisteredCorrespondence) {
    tabs.push({
      href: "/correspondence/registered",
      label: "Registered",
      isActive: (pathname) =>
        pathname === "/correspondence/registered" || pathname.startsWith("/correspondence/registered/"),
    });
  }
  if (visibility.showPhysicalRecords) {
    tabs.push({
      href: "/physical-documents",
      label: "Physical",
      isActive: (pathname) =>
        pathname === "/physical-documents" || pathname.startsWith("/physical-documents/"),
    });
  }

  if (tabs.length < 2) return null;
  return <HubTabList tabs={tabs} />;
}

/** Sibling tabs: Registered correspondence | Physical check-in/out. */
export function RegistryTabList() {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <RegistryTabListInner />
    </Suspense>
  );
}
