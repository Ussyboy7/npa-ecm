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
