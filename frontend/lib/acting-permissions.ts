import type { OfficeMembership } from "@/lib/organization-types";
import type { User } from "@/lib/npa-structure";
import { hasAnyRolePermission } from "@/lib/permissions";

const ACTING_ADMIN_PERMISSIONS = ["can_manage_org_structure", "can_manage_users"] as const;

export interface OrganizationActingCapabilities {
  canAccess: boolean;
  canManageAppointments: boolean;
  canResolveRequests: boolean;
}

/** Match user_can_manage_acting/user_can_resolve_acting_requests on the backend. */
export function getOrganizationActingCapabilities(
  user: Pick<User, "isSuperuser" | "rolePermissions"> | null | undefined,
): OrganizationActingCapabilities {
  const canAdminister = Boolean(
    user?.isSuperuser ||
    hasAnyRolePermission(user, ACTING_ADMIN_PERMISSIONS),
  );

  return {
    canAccess: canAdminister,
    canManageAppointments: canAdminister,
    canResolveRequests: canAdminister,
  };
}

export interface ActingOfficeScope {
  /** Active offices the user belongs to in any assignment role. */
  memberOffices: OfficeMembership[];
  /** Active offices where the user holds the principal seat. */
  principalOffices: OfficeMembership[];
}

/** Offices a user may act for or request help with, derived from active memberships. */
export function getActingOfficeScope(
  userId: string | null | undefined,
  officeMemberships: OfficeMembership[],
): ActingOfficeScope {
  const memberOffices = officeMemberships.filter(
    (membership) => membership.isActive && String(membership.userId) === String(userId),
  );
  return {
    memberOffices,
    principalOffices: memberOffices.filter((membership) => membership.assignmentRole === "principal"),
  };
}
