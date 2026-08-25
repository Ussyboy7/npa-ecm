"use client";

import { Suspense } from "react";
import { HubTabList, type HubTabLink } from "@/components/admin/HubTabList";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

function orgTabActive(section: string) {
  return (pathname: string, searchTab: string | null) => {
    if (pathname.startsWith("/admin/organization/acting")) return section === "acting";
    if (pathname.startsWith("/admin/organization/entities")) return section === "entities";
    if (pathname === "/admin/organization" || pathname.startsWith("/admin/organization?")) {
      const current = searchTab || "structure";
      return current === section;
    }
    return false;
  };
}

function OrganizationTabListInner() {
  const visibility = useSidebarVisibility();
  const tabs: HubTabLink[] = [];
  if (visibility.showOrganizationOffices) {
    tabs.push(
      {
        href: "/admin/organization?tab=structure",
        label: "Structure",
        isActive: orgTabActive("structure"),
      },
      {
        href: "/admin/organization?tab=offices",
        label: "Offices",
        isActive: orgTabActive("offices"),
      },
      {
        href: "/admin/organization?tab=memberships",
        label: "Memberships",
        isActive: orgTabActive("memberships"),
      },
      {
        href: "/admin/organization?tab=locations",
        label: "Locations",
        isActive: orgTabActive("locations"),
      },
      {
        href: "/admin/organization/acting",
        label: "Acting",
        isActive: orgTabActive("acting"),
      },
    );
  }
  if (visibility.showExternalEntities) {
    tabs.push({
      href: "/admin/organization/entities",
      label: "External entities",
      isActive: orgTabActive("entities"),
    });
  }
  if (tabs.length === 0) return null;
  return <HubTabList tabs={tabs} />;
}

export function OrganizationTabList() {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <OrganizationTabListInner />
    </Suspense>
  );
}
