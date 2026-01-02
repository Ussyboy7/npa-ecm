import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';

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
    const roleName = currentUser.systemRole?.name?.toLowerCase() || '';
    const isSuperuser = currentUser.isSuperuser || false;

    // Grade-based checks
    const isMD = grade === 'MDCS';
    const isED = grade === 'EDCS';
    const isGM = grade === 'MSS1';
    const isAGM = grade === 'MSS2';
    const isPrincipalManager = grade === 'MSS3';
    
    // Management grades: MDCS, EDCS, MSS1, MSS2, MSS3
    const isManagement = ['MDCS', 'EDCS', 'MSS1', 'MSS2', 'MSS3'].includes(grade);

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
  }, [currentUser]);
}

