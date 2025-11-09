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
  allowedArchiveLevels: ArchiveLevel[];
};

const defaultProfile: PermissionProfile = {
  canAccessApprovals: false,
  canAccessAnalytics: false,
  canAccessExecutiveDashboard: false,
  canAccessAdministration: false,
  canAccessReports: false,
  canRegisterCorrespondence: true,
  canAccessDocumentManagement: true,
  canDistribute: false,
  allowedArchiveLevels: ["department"],
};

export const getPermissionProfile = (user?: User | null): PermissionProfile => {
  if (!user) {
    return { ...defaultProfile };
  }

  const profile: PermissionProfile = { ...defaultProfile };

  const grade = user.gradeLevel;
  const role = user.systemRole;

  const isSuperAdmin = role === "Super Admin";
  const isMD = grade === "MDCS";
  const isED = grade === "EDCS";
  const isGM = grade === "MSS1";
  const isAGM = grade === "MSS2";
  const isPrincipalManager = grade === "MSS3";
  const isSeniorManager = grade === "MSS4";

  const managementGrades = isMD || isED || isGM || isAGM || isPrincipalManager;

  if (managementGrades || isSeniorManager || isSuperAdmin) {
    profile.canAccessApprovals = true;
  }

  if (isMD || isED || isGM || isAGM || isSuperAdmin) {
    profile.canAccessAnalytics = true;
    profile.canAccessReports = true;
  }

  if (isMD || isED || isSuperAdmin) {
    profile.canAccessExecutiveDashboard = true;
  }

  if (isMD || isED || isGM || isSuperAdmin) {
    profile.canAccessAdministration = true;
  }

  if (managementGrades || isSuperAdmin) {
    profile.canDistribute = true;
  }

  const allowedLevels: ArchiveLevel[] = ["department"];
  if (isGM || isMD || isED || isSuperAdmin) {
    allowedLevels.push("division");
  }
  if (isMD || isED || isSuperAdmin) {
    allowedLevels.push("directorate");
  }
  profile.allowedArchiveLevels = Array.from(new Set(allowedLevels));

  return profile;
};

