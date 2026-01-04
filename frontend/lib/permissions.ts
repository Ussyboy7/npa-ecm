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
  const isAssistantManager = grade === "SSS1";
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

  const canRegisterByGrade =
    isSuperAdmin ||
    role === "Secretary" ||
    isSeniorOfficer ||
    isOfficerI ||
    isOfficerII ||
    isStaffI ||
    isStaffII ||
    isStaffIII;

  // Prefer backend-driven permission when available (Role.permissions["can_register_correspondence"]).
  // Fall back to legacy grade-based behavior if the backend hasn't been updated yet.
  if (typeof user.rolePermissions?.can_register_correspondence === "boolean") {
    profile.canRegisterCorrespondence = user.rolePermissions.can_register_correspondence;
  } else {
    profile.canRegisterCorrespondence = canRegisterByGrade;
  }

  // Disallow registration for AssistantManager and management grades, but allow superadmin
  // Also check for common superadmin indicators as additional fallback
  const isSuperAdminFallback = 
    isSuperAdmin || 
    user.username?.toLowerCase() === 'superadmin' ||
    user.username?.toLowerCase() === 'admin' ||
    role?.toLowerCase().includes('super') ||
    role?.toLowerCase().includes('admin');
  
  // If backend is driving registration permission, do not apply legacy grade restrictions.
  if (typeof user.rolePermissions?.can_register_correspondence !== "boolean") {
    if (!isSuperAdminFallback && (isAssistantManager || managementGrades)) {
      profile.canRegisterCorrespondence = false;
    }
  }
  
  // Ensure superadmin always has registration permission
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

