"use client";

import { Suspense } from "react";
import { HubTabList, type HubTabLink } from "@/components/admin/HubTabList";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { APP_ROUTES } from "@/lib/app-routes";

function orgTabActive(section: string) {
  return (pathname: string, searchTab: string | null) => {
    if (pathname.startsWith(APP_ROUTES.adminActingAppointments)) return section === "acting";
    if (pathname.startsWith(APP_ROUTES.adminOrganizationEntities)) return section === "entities";
    if (pathname === APP_ROUTES.adminOrganization || pathname.startsWith(`${APP_ROUTES.adminOrganization}?`)) {
      const current = searchTab === "memberships" ? "offices" : searchTab || "structure";
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
        href: `${APP_ROUTES.adminOrganization}?tab=structure`,
        label: "Structure",
        isActive: orgTabActive("structure"),
      },
      {
        href: `${APP_ROUTES.adminOrganization}?tab=offices`,
        label: "Offices",
        isActive: orgTabActive("offices"),
      },
      {
        href: `${APP_ROUTES.adminOrganization}?tab=locations`,
        label: "Locations",
        isActive: orgTabActive("locations"),
      },
    );
  }
  if (visibility.showOrganizationActing) {
    tabs.push({
      href: APP_ROUTES.adminActingAppointments,
      label: "Acting",
      isActive: orgTabActive("acting"),
    });
  }
  if (visibility.showUsersRoles) {
    tabs.push({
      href: `${APP_ROUTES.adminOrganization}?tab=people`,
      label: "People & access",
      isActive: orgTabActive("people"),
    });
  }
  if (visibility.showExternalEntities) {
    tabs.push({
      href: APP_ROUTES.adminOrganizationEntities,
      label: "External entities",
      isActive: orgTabActive("entities"),
    });
  }
  if (tabs.length === 0) return null;
  return <HubTabList tabs={tabs} appearance="outlined" />;
}

export function OrganizationTabList() {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <OrganizationTabListInner />
    </Suspense>
  );
}
