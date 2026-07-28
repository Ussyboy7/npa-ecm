import type { User } from "@/lib/npa-structure";

export type ArchiveLevel = "department" | "division" | "directorate";

export type PermissionProfile = {
  canAccessApprovals: boolean;
  canAccessAnalytics: boolean;
  canAccessExecutiveDashboard: boolean;
  canAccessAdministration: boolean;
  canAccessReports: boolean;
  canRegisterCorrespondence: boolean;
  canAccessDocumentManagement: boolean;
  canAccessAssistantCalendar: boolean;
  canDistribute: boolean;
  canViewCorrespondenceRegistry: boolean;
  canAccessSystemHealth: boolean;
  canManageDrmPolicies: boolean;
  canAccessRecordsGovernance: boolean;
  canAccessAuditCompliance: boolean;
  canManageIntegration: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageOrgStructure: boolean;
  allowedArchiveLevels: ArchiveLevel[];
};

const defaultProfile: PermissionProfile = {
  canAccessApprovals: false,
  canAccessAnalytics: false,
  canAccessExecutiveDashboard: false,
  canAccessAdministration: false,
  canAccessReports: false,
  canRegisterCorrespondence: false,
  canAccessDocumentManagement: false,
  canAccessAssistantCalendar: false,
  canDistribute: false,
  canViewCorrespondenceRegistry: false,
  canAccessSystemHealth: false,
  canManageDrmPolicies: false,
  canAccessRecordsGovernance: false,
  canAccessAuditCompliance: false,
  canManageIntegration: false,
  canManageUsers: false,
  canManageRoles: false,
  canManageOrgStructure: false,
  allowedArchiveLevels: [],
};

const SUPERUSER_PROFILE: PermissionProfile = {
  canAccessApprovals: true,
  canAccessAnalytics: true,
  canAccessExecutiveDashboard: true,
  canAccessAdministration: true,
  canAccessReports: true,
  canRegisterCorrespondence: true,
  canAccessDocumentManagement: true,
  canAccessAssistantCalendar: true,
  canDistribute: true,
  canViewCorrespondenceRegistry: true,
  canAccessSystemHealth: true,
  canManageDrmPolicies: true,
  canAccessRecordsGovernance: true,
  canAccessAuditCompliance: true,
  canManageIntegration: true,
  canManageUsers: true,
  canManageRoles: true,
  canManageOrgStructure: true,
  allowedArchiveLevels: ["department", "division", "directorate"],
};

function perm(user: User | null | undefined, key: string): boolean {
  return Boolean(user?.rolePermissions?.[key]);
}

function buildArchiveLevels(user: User | null | undefined): ArchiveLevel[] {
  const levels: ArchiveLevel[] = [];
  if (perm(user, "can_archive_department") || perm(user, "can_archive")) {
    levels.push("department");
  }
  if (perm(user, "can_archive_division") || perm(user, "can_archive")) {
    levels.push("division");
  }
  if (perm(user, "can_archive_directorate") || perm(user, "can_archive")) {
    levels.push("directorate");
  }
  return levels;
}

export function hasRolePermission(user: User | null | undefined, key: string): boolean {
  return perm(user, key);
}

export const getPermissionProfile = (user?: User | null): PermissionProfile => {
  if (!user) {
    return { ...defaultProfile };
  }

  const isSuperAdmin =
    user.isSuperuser ||
    user.systemRole === "Super Admin" ||
    user.username?.toLowerCase() === "superadmin";

  if (isSuperAdmin) {
    return { ...SUPERUSER_PROFILE };
  }

  return {
    canAccessApprovals: perm(user, "can_access_approvals"),
    canAccessAnalytics: perm(user, "can_access_analytics"),
    canAccessExecutiveDashboard: perm(user, "can_access_executive_dashboard"),
    canAccessAdministration: perm(user, "can_access_administration"),
    canAccessReports: perm(user, "can_access_reports"),
    canRegisterCorrespondence: perm(user, "can_register_correspondence"),
    canAccessDocumentManagement: perm(user, "can_access_document_management"),
    canAccessAssistantCalendar: false,
    canDistribute: perm(user, "can_distribute"),
    canViewCorrespondenceRegistry: perm(user, "can_view_registry"),
    canAccessSystemHealth: perm(user, "can_access_system_health"),
    canManageDrmPolicies: perm(user, "can_manage_drm_policies"),
    canAccessRecordsGovernance: perm(user, "can_access_records_governance"),
    canAccessAuditCompliance: perm(user, "can_access_audit_compliance"),
    canManageIntegration: perm(user, "can_manage_integration"),
    canManageUsers: perm(user, "can_manage_users"),
    canManageRoles: perm(user, "can_manage_roles"),
    canManageOrgStructure: perm(user, "can_manage_org_structure"),
    allowedArchiveLevels: buildArchiveLevels(user),
  };
};

/** Map PermissionProfile field to backend permission key */
export const PERMISSION_KEY_MAP: Record<keyof Omit<PermissionProfile, "allowedArchiveLevels">, string> = {
  canAccessApprovals: "can_access_approvals",
  canAccessAnalytics: "can_access_analytics",
  canAccessExecutiveDashboard: "can_access_executive_dashboard",
  canAccessAdministration: "can_access_administration",
  canAccessReports: "can_access_reports",
  canRegisterCorrespondence: "can_register_correspondence",
  canAccessDocumentManagement: "can_access_document_management",
  canAccessAssistantCalendar: "can_access_assistant_calendar",
  canDistribute: "can_distribute",
  canViewCorrespondenceRegistry: "can_view_registry",
  canAccessSystemHealth: "can_access_system_health",
  canManageDrmPolicies: "can_manage_drm_policies",
  canAccessRecordsGovernance: "can_access_records_governance",
  canAccessAuditCompliance: "can_access_audit_compliance",
  canManageIntegration: "can_manage_integration",
  canManageUsers: "can_manage_users",
  canManageRoles: "can_manage_roles",
  canManageOrgStructure: "can_manage_org_structure",
};
