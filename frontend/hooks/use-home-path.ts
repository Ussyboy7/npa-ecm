"use client";

import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getDefaultHomePath } from '@/lib/home-route';

export function useHomePath(): '/dashboard' | '/inbox' {
  const { currentUser } = useCurrentUser();
  const { officeMemberships, offices } = useOrganization();

  return useMemo(() => {
    if (!currentUser) return '/inbox';

    const userOfficeIds = officeMemberships
      .filter((membership) => membership.userId === currentUser.id && membership.isActive)
      .map((membership) => membership.officeId);

    const officeTypes = userOfficeIds
      .map((officeId) => offices.find((office) => office.id === officeId)?.officeType)
      .filter((officeType): officeType is string => Boolean(officeType));

    return getDefaultHomePath({
      gradeLevel: currentUser.gradeLevel,
      systemRole: currentUser.systemRole,
      isSuperuser: currentUser.isSuperuser,
      officeTypes,
    });
  }, [currentUser, officeMemberships, offices]);
}
