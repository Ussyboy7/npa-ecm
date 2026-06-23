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
  canDistribute: boolean;
  canViewCorrespondenceRegistry: boolean;
  allowedArchiveLevels: ArchiveLevel[];
};

const defaultProfile: PermissionProfile = {
  canAccessApprovals: false,
  canAccessAnalytics: false,
  canAccessExecutiveDashboard: false,
  canAccessAdministration: false,
  canAccessReports: false,
  canRegisterCorrespondence: false,
  canAccessDocumentManagement: true,
  canDistribute: false,
  canViewCorrespondenceRegistry: false,
  allowedArchiveLevels: ["department"],
};

export const getPermissionProfile = (user?: User | null): PermissionProfile => {
  if (!user) {
    return { ...defaultProfile };
  }

  const profile: PermissionProfile = { ...defaultProfile };

  const grade = user.gradeLevel;
  const role = user.systemRole;

  const isSuperAdmin = user.isSuperuser || role === "Super Admin";
  const isMD = grade === "MDCS";
  const isED = grade === "EDCS";
  const isGM = grade === "MSS1";
  const isAGM = grade === "MSS2";
  const isPrincipalManager = grade === "MSS3";
  const isSeniorManager = grade === "MSS4";
  const isSeniorOfficer = grade === "SSS2";
  const isOfficerI = grade === "SSS3";
  const isOfficerII = grade === "SSS4";
  const isStaffI = grade === "JSS1";
  const isStaffII = grade === "JSS2";
  const isStaffIII = grade === "JSS3";

  const managementGrades = isMD || isED || isGM || isAGM || isPrincipalManager;

  if (managementGrades || isSeniorManager || isSuperAdmin || role === "Secretary") {
    profile.canAccessApprovals = true;
  }

  if (isMD || isED || isGM || isAGM || isSuperAdmin || role === "Secretary") {
    profile.canAccessAnalytics = true;
    profile.canAccessReports = true;
  }

  if (isMD || isED || isSuperAdmin) {
    profile.canAccessExecutiveDashboard = true;
  }

  if (isMD || isED || isGM || isSuperAdmin) {
    profile.canAccessAdministration = true;
  }

  if (managementGrades || isSuperAdmin || role === "Secretary") {
    profile.canDistribute = true;
  }

  if (isSuperAdmin || isMD || isED || isGM || isAGM) {
    profile.canViewCorrespondenceRegistry = true;
  }



  // Use backend-driven permission (Role.permissions["can_register_correspondence"]).
  // No fallback to legacy grade-based behavior.
  profile.canRegisterCorrespondence = user.rolePermissions?.can_register_correspondence ?? false;

  // Ensure superadmin always has registration permission
  const isSuperAdminFallback =
    isSuperAdmin ||
    user.username?.toLowerCase() === 'superadmin' ||
    user.username?.toLowerCase() === 'admin' ||
    role?.toLowerCase().includes('super') ||
    role?.toLowerCase().includes('admin');

  if (isSuperAdminFallback) {
    profile.canRegisterCorrespondence = true;
  }

  const allowedLevels: ArchiveLevel[] = ["department"];
  if (isGM || isMD || isED || isSuperAdmin || role === "Secretary") {
    allowedLevels.push("division");
  }
  if (isMD || isED || isSuperAdmin || role === "Secretary") {
    allowedLevels.push("directorate");
  }
  profile.allowedArchiveLevels = Array.from(new Set(allowedLevels));

  return profile;
};

