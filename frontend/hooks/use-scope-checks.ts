import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';
import { useRoleChecks } from './use-role-checks';

export type CaseScope = 'personal' | 'department' | 'division' | 'directorate' | 'organization';

export interface ScopeChecks {
  caseScope: CaseScope;
  userDepartmentIds: string[];
  userDivisionIds: string[];
  userDirectorateIds: string[];
  hasOfficeMembership: boolean;
}

/**
 * Hook to determine user's scope for hierarchical access
 * Returns scope information for filtering cases and data
 */
export function useScopeChecks(): ScopeChecks {
  const { currentUser } = useCurrentUser();
  const { isMD, isED, isGM, isAGM } = useRoleChecks();

  return useMemo(() => {
    if (!currentUser) {
      return {
        caseScope: 'personal',
        userDepartmentIds: [],
        userDivisionIds: [],
        userDirectorateIds: [],
        hasOfficeMembership: false,
      };
    }

    // Determine case scope based on role hierarchy
    let caseScope: CaseScope = 'personal';
    if (isMD) {
      caseScope = 'organization';
    } else if (isED) {
      caseScope = 'directorate';
    } else if (isGM) {
      caseScope = 'division';
    } else if (isAGM) {
      caseScope = 'department';
    }

    // Get organizational unit IDs for filtering
    const userDepartmentIds: string[] = [];
    const userDivisionIds: string[] = [];
    const userDirectorateIds: string[] = [];

    if (currentUser.department) {
      userDepartmentIds.push(currentUser.department);
    }

    if (currentUser.division) {
      userDivisionIds.push(currentUser.division);
    }

    if (currentUser.directorate) {
      userDirectorateIds.push(currentUser.directorate);
    }

    // Check if user has office membership (will be checked separately in sidebar)
    const hasOfficeMembership = false; // This will be checked in sidebar with officeMemberships

    return {
      caseScope,
      userDepartmentIds,
      userDivisionIds,
      userDirectorateIds,
      hasOfficeMembership,
    };
  }, [currentUser, isMD, isED, isGM, isAGM]);
}

