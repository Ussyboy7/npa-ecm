/**
 * Routing utility functions
 * Extracted from modals for reusability and consistency
 */

import {
  GRADE_LEVELS,
  getDivisionById,
  getDepartmentById,
  type User,
  type Correspondence,
  type Minute,
} from './npa-structure';
import type { Office, OfficeMembership } from './npa-structure';

export interface RoutingOptions {
  currentUser: User;
  direction: 'upward' | 'downward';
  correspondence: Correspondence;
  existingMinutes: Minute[];
  offices: Office[];
  officeMemberships: OfficeMembership[];
  activeUsers: User[];
  excludeUsers?: Set<string>;
}

/**
 * Get suggested approvers based on hierarchy and organizational structure
 */
export function getSuggestedApprovers(options: RoutingOptions): User[] {
  const {
    currentUser,
    direction,
    correspondence,
    existingMinutes,
    offices,
    officeMemberships,
    activeUsers,
    excludeUsers = new Set(),
  } = options;

  // Get all users who have already acted on this correspondence (to prevent routing back to them)
  // Exclude recalled minutes - users who only received recalled minutes can receive again
  const usersWhoAlreadyActed = new Set(
    existingMinutes
      .filter((minute) => !minute.isRecalled) // Exclude recalled minutes
      .map((minute) => minute.userId)
      .filter(Boolean)
  );

  // Also exclude the current approver if they've already acted (and their minute wasn't recalled)
  if (correspondence.currentApproverId) {
    const currentApproverMinutes = existingMinutes.filter(
      (m) => m.userId === correspondence.currentApproverId
    );
    const hasNonRecalledMinute = currentApproverMinutes.some((m) => !m.isRecalled);
    if (hasNonRecalledMinute) {
      usersWhoAlreadyActed.add(correspondence.currentApproverId);
    }
  }

  // Merge with explicitly excluded users
  excludeUsers.forEach((id) => usersWhoAlreadyActed.add(id));

  // Get current user's office and check lateral routing permission
  const primaryOfficeMembership = officeMemberships.find(
    (m) => m.userId === currentUser.id && m.isPrimary && m.isActive
  );
  const currentUserOffice = primaryOfficeMembership
    ? offices.find((o) => o.id === primaryOfficeMembership.officeId)
    : null;
  const canRouteLaterally = currentUserOffice?.allowLateralRouting ?? true; // Default to true if office not found

  // Get grade levels sorted by level (higher level = more authority)
  const gradeOrder = [...GRADE_LEVELS].sort((a, b) => b.level - a.level).map((g) => g.code);
  const currentGradeIndex = currentUser?.gradeLevel ? gradeOrder.indexOf(currentUser.gradeLevel) : -1;

  // Get current user's division, department, and directorate info
  const division = currentUser?.division ? getDivisionById(currentUser.division) : null;
  const currentDirectorate = division?.directorateId ?? currentUser?.directorate ?? null;
  const currentDivisionId = currentUser?.division;

  const candidates = new Map<string, User>();

  const addCandidate = (user?: User) => {
    if (!user) return;
    if (user.id === currentUser?.id) return;
    if (user.active === false) return;
    // Exclude users who have already acted on this correspondence
    if (usersWhoAlreadyActed.has(user.id)) return;
    candidates.set(user.id, user);
  };

  // Check if user is MD
  const isMD = currentUser?.gradeLevel === 'MDCS';

  if (direction === 'downward') {
    const lowerGrades = gradeOrder.slice(currentGradeIndex + 1);

    if (isMD) {
      // MD can route to anyone below
      activeUsers
        .filter((user) => lowerGrades.includes(user.gradeLevel))
        .sort((a, b) => {
          const aGradeIndex = gradeOrder.indexOf(a.gradeLevel);
          const bGradeIndex = gradeOrder.indexOf(b.gradeLevel);
          if (aGradeIndex !== bGradeIndex) return aGradeIndex - bGradeIndex;
          return a.name.localeCompare(b.name);
        })
        .forEach(addCandidate);
    } else {
      // Non-MD downward routing: same division/directorate + lateral routing if allowed
      activeUsers
        .filter((user) => {
          if (!lowerGrades.includes(user.gradeLevel)) return false;

          // Same division (hierarchical routing)
          if (user.division === currentDivisionId) return true;

          // Same directorate (hierarchical routing) - e.g., ED Finance → GM Finance
          const userDivision = user.division ? getDivisionById(user.division) : null;
          const userDirectorateId = userDivision?.directorateId ?? user.directorate ?? null;
          if (currentDirectorate && userDirectorateId && userDirectorateId === currentDirectorate) {
            return true;
          }

          // Lateral routing: same grade level, can be different department/division/directorate
          // Examples: AGM SA&DM → AGM Procurement (different departments, divisions, or directorates)
          //           GM ICT → GM Servicom (different divisions or directorates)
          if (canRouteLaterally && user.gradeLevel === currentUser?.gradeLevel) {
            // AGM to AGM, GM to GM (peer-to-peer across any organizational boundaries)
            return true;
          }

          // Cross-tier routing: AGM can route to GM (one level up in hierarchy)
          // Can be different departments, divisions, or directorates
          if (canRouteLaterally && currentUser?.gradeLevel === 'AGMCS' && user.gradeLevel === 'GMCS') {
            return true;
          }

          return false;
        })
        .forEach(addCandidate);
    }
  } else {
    // Upward routing
    const higherGrades = gradeOrder.slice(0, currentGradeIndex);

    activeUsers
      .filter((user) => {
        // Standard upward routing (higher grades in same division/directorate)
        if (higherGrades.includes(user.gradeLevel)) {
          const userDivision = user.division ? getDivisionById(user.division) : null;
          const userDirectorate = userDivision?.directorateId ?? user.directorate ?? null;

          const currentDivision = currentUser?.division;
          const userBelongsToDivision = Boolean(
            user.division && currentDivision && user.division === currentDivision
          );
          const userBelongsToDirectorate =
            Boolean(
              currentDirectorate && userDirectorate && userDirectorate === currentDirectorate
            ) ||
            Boolean(
              currentUser?.directorate && userDirectorate && userDirectorate === currentUser.directorate
            );

          const isExecutiveGrade = ['MDCS', 'EDCS'].includes(user.gradeLevel);

          if (userBelongsToDivision || userBelongsToDirectorate || isExecutiveGrade) {
            return true;
          }
        }

        // Lateral routing: same grade level, can be different department/division/directorate (if allowed)
        // Examples: AGM SA&DM → AGM Procurement (different departments, divisions, or directorates)
        //           GM ICT → GM Servicom (different divisions or directorates)
        if (canRouteLaterally && user.gradeLevel === currentUser?.gradeLevel) {
          // AGM to AGM, GM to GM (peer-to-peer across any organizational boundaries)
          return true;
        }

        // Cross-tier routing: AGM can route to GM (one level up)
        // Can be different departments, divisions, or directorates
        if (canRouteLaterally && currentUser?.gradeLevel === 'AGMCS' && user.gradeLevel === 'GMCS') {
          return true;
        }

        return false;
      })
      .forEach(addCandidate);
  }

  return Array.from(candidates.values());
}

/**
 * Get forwarding options for treatment/response
 */
export function getForwardingOptions(options: {
  currentUser: User;
  activeUsers: User[];
  divisions: ReturnType<typeof getDivisionById>[];
}): User[] {
  const { currentUser, activeUsers, divisions } = options;

  const gradeOrder = [...GRADE_LEVELS].sort((a, b) => b.level - a.level).map((g) => g.code);
  const currentGradeIndex = gradeOrder.indexOf(currentUser.gradeLevel);
  if (currentGradeIndex === -1) return [];
  const currentDivision = currentUser.division
    ? (divisions.find((div) => div && div.id === currentUser.division) ?? undefined)
    : undefined;
  const currentDirectorateId = currentUser.directorate ?? (currentDivision?.directorateId ?? undefined);

  const candidates = activeUsers.filter((user) => {
    if (user.id === currentUser.id) return false;

    if (user.systemRole === 'Managing Director' || user.gradeLevel === 'MDCS') {
      return true;
    }

    const targetGradeIndex = gradeOrder.indexOf(user.gradeLevel);
    const isHigherGrade = targetGradeIndex !== -1 && targetGradeIndex < currentGradeIndex;

    if (user.division && currentUser.division && user.division === currentUser.division) {
      return true;
    }

    const userDivision = user.division ? (divisions.find((div) => div && div.id === user.division) ?? undefined) : undefined;
    const userDirectorateId = user.directorate ?? (userDivision?.directorateId ?? undefined);

    if (currentDirectorateId && userDirectorateId === currentDirectorateId && isHigherGrade) {
      return true;
    }

    if (!user.division && isHigherGrade) {
      return true;
    }

    return false;
  });

  if (candidates.length === 0) {
    return activeUsers;
  }

  return candidates;
}

/**
 * Filter users by search query
 */
export function filterUsersBySearch(
  users: User[],
  searchQuery: string,
  options?: {
    includeDivision?: boolean;
    includeDepartment?: boolean;
    includeEmail?: boolean;
  }
): User[] {
  if (!searchQuery.trim()) return users;

  const query = searchQuery.toLowerCase();
  const {
    includeDivision = true,
    includeDepartment = true,
    includeEmail = true,
  } = options || {};

  return users.filter((user) => {
    const nameMatch = user.name.toLowerCase().includes(query);
    const emailMatch = includeEmail && user.email.toLowerCase().includes(query);
    const roleMatch = user.systemRole.toLowerCase().includes(query);
    const division = user.division ? getDivisionById(user.division) : null;
    const divisionMatch = includeDivision && (division?.name.toLowerCase().includes(query) || false);
    const department = user.department ? getDepartmentById(user.department) : null;
    const departmentMatch = includeDepartment && (department?.name.toLowerCase().includes(query) || false);

    return nameMatch || emailMatch || roleMatch || divisionMatch || departmentMatch;
  });
}

/**
 * Get user's primary office
 */
export function getUserPrimaryOffice(
  userId: string,
  officeMemberships: OfficeMembership[],
  offices: Office[]
): Office | undefined {
  const membership = officeMemberships.find(
    (m) => m.userId === userId && m.isPrimary && m.isActive
  );
  return membership ? offices.find((o) => o.id === membership.officeId) : undefined;
}

