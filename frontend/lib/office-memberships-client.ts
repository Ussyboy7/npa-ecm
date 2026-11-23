import { apiFetch } from '@/lib/api-client';
import { mapApiOfficeMembership } from '@/lib/organization-data';
import type { OfficeMembership } from '@/lib/organization-types';

export interface MembershipFilters {
  user?: string;
  office?: string;
  role?: string;
  isActive?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  pageSize?: number;
}

export interface MembershipPage {
  count: number;
  results: OfficeMembership[];
}

export interface MembershipQualityFinding {
  count: number;
  memberships: OfficeMembership[];
  officeId?: string;
  officeName?: string;
  userId?: string;
  userName?: string;
}

export interface MembershipQualitySummary {
  counts: {
    multipleActivePrincipals: number;
    multiplePrimaryAssignments: number;
    duplicateOfficeAssignments: number;
  };
  multipleActivePrincipals: MembershipQualityFinding[];
  multiplePrimaryAssignments: MembershipQualityFinding[];
  duplicateOfficeAssignments: MembershipQualityFinding[];
}

type ApiQualityMembership = {
  id: string;
  officeId: string;
  officeName: string;
  userId: string;
  userName: string;
  role: string;
  isPrimary: boolean;
};

type ApiQualityFinding = Omit<MembershipQualityFinding, 'memberships'> & {
  memberships: ApiQualityMembership[];
};

type ApiQualityResponse = Pick<MembershipQualitySummary, 'counts'> & {
  multipleActivePrincipals: ApiQualityFinding[];
  multiplePrimaryAssignments: ApiQualityFinding[];
  duplicateOfficeAssignments: ApiQualityFinding[];
};

type MembershipPayload = Record<string, unknown>;

const mapPage = (response: unknown): MembershipPage => {
  const page = Array.isArray(response)
    ? { count: response.length, results: response }
    : response && typeof response === 'object'
      ? response as { count?: unknown; results?: unknown }
      : {};
  const rows = Array.isArray(page.results) ? page.results : [];
  const results = rows.filter((item): item is MembershipPayload =>
    item !== null && typeof item === 'object' && !Array.isArray(item),
  );
  return {
    count: typeof page.count === 'number' ? page.count : results.length,
    results: results.map(mapApiOfficeMembership),
  };
};

export const listOfficeMemberships = async (
  filters: MembershipFilters = {},
): Promise<MembershipPage> => {
  const query = new URLSearchParams();
  if (filters.user) query.set('user', filters.user);
  if (filters.office) query.set('office', filters.office);
  if (filters.role) query.set('assignment_role', filters.role);
  if (filters.isActive !== undefined) query.set('is_active', String(filters.isActive));
  if (filters.search?.trim()) query.set('search', filters.search.trim());
  if (filters.ordering) query.set('ordering', filters.ordering);
  if (filters.page) query.set('page', String(filters.page));
  if (filters.pageSize) query.set('page_size', String(filters.pageSize));
  const suffix = query.size ? `?${query.toString()}` : '';
  return mapPage(await apiFetch<unknown>(`/organization/office-memberships/${suffix}`));
};

const listAllInScope = async (filters: Omit<MembershipFilters, 'page'>): Promise<OfficeMembership[]> => {
  const pageSize = filters.pageSize ?? 100;
  const firstPage = await listOfficeMemberships({ ...filters, page: 1, pageSize });
  const results = [...firstPage.results];
  for (let page = 2; results.length < firstPage.count; page += 1) {
    const nextPage = await listOfficeMemberships({ ...filters, page, pageSize });
    results.push(...nextPage.results);
    if (nextPage.results.length === 0) break;
  }
  return results;
};

/**
 * Roles that act for an office — mirrors OFFICE_QUEUE_ROLES in
 * backend/organization/office_access.py. A record addressed to an office
 * belongs to these, not to every member posted in it.
 */
export const OFFICE_QUEUE_ROLES = ['principal', 'acting', 'secretariat'] as const;

/** The person who holds the office today, in seat precedence order. */
export const findOfficeSeatHolder = (
  memberships: OfficeMembership[],
): OfficeMembership | undefined => {
  const active = memberships.filter((membership) => membership.isActive);
  for (const role of OFFICE_QUEUE_ROLES) {
    const holder = active.find((membership) => membership.assignmentRole === role);
    if (holder) return holder;
  }
  return undefined;
};

export const listOfficeMembershipsForUser = async (userId: string) =>
  listAllInScope({ user: userId, ordering: 'office__name', pageSize: 100 });

export const listOfficeMembershipsForOffice = async (officeId: string) =>
  listAllInScope({ office: officeId, ordering: 'user__last_name,user__first_name', pageSize: 100 });

export const fetchMembershipQuality = async (): Promise<MembershipQualitySummary> => {
  const response = await apiFetch<ApiQualityResponse>('/organization/office-memberships/quality/');
  const mapFindings = (findings: ApiQualityFinding[]): MembershipQualityFinding[] =>
    findings.map((finding) => ({
      ...finding,
      memberships: finding.memberships.map((membership) => mapApiOfficeMembership({
        id: membership.id,
        office: membership.officeId,
        office_name: membership.officeName,
        user: membership.userId,
        user_name: membership.userName,
        assignment_role: membership.role,
        is_primary: membership.isPrimary,
        is_active: true,
      })),
    }));
  return {
    ...response,
    multipleActivePrincipals: mapFindings(response.multipleActivePrincipals),
    multiplePrimaryAssignments: mapFindings(response.multiplePrimaryAssignments),
    duplicateOfficeAssignments: mapFindings(response.duplicateOfficeAssignments),
  };
};
