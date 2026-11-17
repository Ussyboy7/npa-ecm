import type { Department, Directorate, Division, Office, OfficeMembership } from './npa-structure';
import { registerIdentityCacheClearer } from './identity-cache';

export type OrganizationSnapshot = {
  directorates: Directorate[];
  divisions: Division[];
  departments: Department[];
  offices: Office[];
  officeMemberships: OfficeMembership[];
};

let snapshot: OrganizationSnapshot = {
  directorates: [],
  divisions: [],
  departments: [],
  offices: [],
  officeMemberships: [],
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedAt = 0;

export const isOrgCacheStale = (): boolean => {
  if (cachedAt === 0) return true;
  return Date.now() - cachedAt > CACHE_TTL_MS;
};

export const resetOrgCache = (): void => {
  snapshot = {
    directorates: [],
    divisions: [],
    departments: [],
    offices: [],
    officeMemberships: [],
  };
  cachedAt = 0;
};

export const updateOrganizationCache = (data: Partial<OrganizationSnapshot>) => {
  snapshot = {
    directorates: data.directorates ?? snapshot.directorates,
    divisions: data.divisions ?? snapshot.divisions,
    departments: data.departments ?? snapshot.departments,
    offices: data.offices ?? snapshot.offices,
    officeMemberships: data.officeMemberships ?? snapshot.officeMemberships,
  };
  cachedAt = Date.now();
};

export const getOrganizationSnapshot = (): OrganizationSnapshot => snapshot;

export const getDirectorateById = (id?: string | null) => {
  if (!id) return undefined;
  return snapshot.directorates.find((item) => item.id as string === id);
};

export const getDivisionById = (id?: string | null) => {
  if (!id) return undefined;
  return snapshot.divisions.find((item) => item.id as string === id);
};

export const getDepartmentById = (id?: string | null) => {
  if (!id) return undefined;
  return snapshot.departments.find((item) => item.id as string === id);
};

export const getOfficeById = (id?: string | null) => {
  if (!id) return undefined;
  return snapshot.offices.find((office) => office.id === id);
};

export const getOfficeMembershipsByOffice = (officeId?: string | null) => {
  if (!officeId) return [];
  return snapshot.officeMemberships.filter((membership) => membership.officeId === officeId);
};

export const getOfficeMembershipsByUser = (userId?: string | null) => {
  if (!userId) return [];
  return snapshot.officeMemberships.filter((membership) => membership.userId === userId);
};

registerIdentityCacheClearer(resetOrgCache);
