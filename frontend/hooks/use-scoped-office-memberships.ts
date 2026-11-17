'use client';

import { useEffect, useMemo, useState } from 'react';
import type { OfficeMembership } from '@/lib/organization-types';
import {
  listOfficeMembershipsForOffice,
  listOfficeMembershipsForUser,
} from '@/lib/office-memberships-client';

interface UseScopedOfficeMembershipsOptions {
  enabled: boolean;
  baseMemberships: OfficeMembership[];
  userId?: string;
  officeId?: string;
}

/**
 * Merge the signed-in user's memberships with those for the selected routing
 * recipient or office, without loading the full membership table.
 */
export function useScopedOfficeMemberships({
  enabled,
  baseMemberships,
  userId,
  officeId,
}: UseScopedOfficeMembershipsOptions): OfficeMembership[] {
  const [scopedMemberships, setScopedMemberships] = useState<OfficeMembership[]>([]);

  useEffect(() => {
    if (!enabled || (!userId && !officeId)) {
      setScopedMemberships([]);
      return;
    }
    let ignore = false;
    const requests: Array<Promise<OfficeMembership[]>> = [];
    if (userId) requests.push(listOfficeMembershipsForUser(userId));
    if (officeId) requests.push(listOfficeMembershipsForOffice(officeId));
    void Promise.all(requests)
      .then((groups) => {
        if (!ignore) setScopedMemberships(groups.flat());
      })
      .catch(() => {
        if (!ignore) setScopedMemberships([]);
      });
    return () => {
      ignore = true;
    };
  }, [enabled, userId, officeId]);

  return useMemo(() => {
    const byId = new Map<string, OfficeMembership>();
    for (const membership of [...baseMemberships, ...scopedMemberships]) {
      byId.set(membership.id, membership);
    }
    return [...byId.values()];
  }, [baseMemberships, scopedMemberships]);
}
