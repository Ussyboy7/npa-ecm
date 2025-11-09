"use client";

import { useMemo } from "react";
import type { User } from "@/lib/npa-structure";
import { getPermissionProfile, type PermissionProfile } from "@/lib/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";

export const useUserPermissions = (user?: User | null): PermissionProfile => {
  const { assistantAssignments } = useOrganization();

  return useMemo(() => {
    const baseProfile = getPermissionProfile(user ?? undefined);

    if (!user) {
      return baseProfile;
    }

    const assignmentsForUser = assistantAssignments.filter((assignment) => assignment.assistantId === user.id);

    if (assignmentsForUser.length === 0) {
      return baseProfile;
    }

    const enhancedProfile: PermissionProfile = {
      ...baseProfile,
      allowedArchiveLevels: [...baseProfile.allowedArchiveLevels],
    };

    if (assignmentsForUser.some((assignment) => assignment.permissions.includes("forward"))) {
      enhancedProfile.canDistribute = true;
      enhancedProfile.canAccessApprovals = true;
    }

    if (assignmentsForUser.some((assignment) => assignment.permissions.includes("draft"))) {
      enhancedProfile.canRegisterCorrespondence = true;
    }

    if (assignmentsForUser.some((assignment) => assignment.permissions.includes("view") || assignment.permissions.includes("coordinate"))) {
      enhancedProfile.canAccessDocumentManagement = true;
    }

    return enhancedProfile;
  }, [assistantAssignments, user?.id, user?.gradeLevel, user?.systemRole]);
};

