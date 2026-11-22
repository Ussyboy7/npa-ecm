import type { SidebarVisibility } from "@/hooks/use-sidebar-visibility";

import { APP_ROUTES } from "./app-routes";

/**
 * Pick the Organization landing page the user can actually open.
 *
 * The main hub needs structure/people access. Acting-only users go to the
 * Acting workspace, and external-entity-only users go to External entities.
 * Keep this in sync with the Organization route guards.
 */
export function getOrganizationHomePath(visibility: SidebarVisibility): string {
  if (visibility.showOrganizationOffices || visibility.showUsersRoles) {
    return APP_ROUTES.adminOrganization;
  }
  if (visibility.showOrganizationActing) {
    return APP_ROUTES.adminActingAppointments;
  }
  if (visibility.showExternalEntities) {
    return APP_ROUTES.adminOrganizationEntities;
  }
  return APP_ROUTES.adminOrganization;
}
