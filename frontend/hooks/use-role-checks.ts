import { useMemo } from 'react';
import { getGradeInfo } from '@/lib/grade-catalog';
import { useCurrentUser } from './use-current-user';
import { useGradeCatalog } from './use-grade-catalog';

export interface RoleChecks {
  isMD: boolean;
  isED: boolean;
  isGM: boolean;
  isAGM: boolean;
  isPrincipalManager: boolean;
  isManagement: boolean;
  isSecretary: boolean;
  isRegistry: boolean;
  isSuperAdmin: boolean;
  isSystemAdmin: boolean;
  isPortManager: boolean;
  isChiefPortHRO: boolean;
}

/**
 * Hook to check user's role and grade level
 * Returns boolean flags for role-based visibility checks
 */
export function useRoleChecks(): RoleChecks {
  const { currentUser } = useCurrentUser();
  const gradeCatalog = useGradeCatalog();

  return useMemo(() => {
    if (!currentUser) {
      return {
        isMD: false,
        isED: false,
        isGM: false,
        isAGM: false,
        isPrincipalManager: false,
        isManagement: false,
        isSecretary: false,
        isRegistry: false,
        isSuperAdmin: false,
        isSystemAdmin: false,
        isPortManager: false,
        isChiefPortHRO: false,
      };
    }

    const grade = currentUser.gradeLevel;
    const roleName = (currentUser.systemRole || '').toLowerCase();
    const isSuperuser = currentUser.isSuperuser || false;

    // Grade-based checks, read from the served catalogue so a re-tiered grade
    // reaches this hook without a second list being edited here.
    const gradeInfo = getGradeInfo(gradeCatalog, grade);
    const isMD = grade === 'MDCS';
    // The MD heads every directorate too, but is reported on their own line.
    const isED = Boolean(gradeInfo?.directorateLeadership) && grade !== 'MDCS';
    const isGM = Boolean(gradeInfo?.divisionLeadership);
    const isAGM = Boolean(gradeInfo?.departmentLeadership);
    const isPrincipalManager = grade === 'MSS3';
    const isManagement = Boolean(gradeInfo?.seniorManagement);

    // Role-based checks
    const isSecretary = roleName === 'secretary';
    const isRegistry = roleName === 'registry officer';
    const isSystemAdmin = roleName === 'system administrator';
    const isPortManager = roleName === 'port manager';
    const isChiefPortHRO = roleName === 'chief port hro officer';
    const isSuperAdmin = isSuperuser || roleName === 'super admin';

    return {
      isMD,
      isED,
      isGM,
      isAGM,
      isPrincipalManager,
      isManagement,
      isSecretary,
      isRegistry,
      isSuperAdmin,
      isSystemAdmin,
      isPortManager,
      isChiefPortHRO,
    };
  }, [currentUser, gradeCatalog]);
}

