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

export const resetOrgCache = (): void => {
  snapshot = {
    directorates: [],
    divisions: [],
    departments: [],
    offices: [],
    officeMemberships: [],
  };
};

export const updateOrganizationCache = (data: Partial<OrganizationSnapshot>) => {
  snapshot = {
    directorates: data.directorates ?? snapshot.directorates,
    divisions: data.divisions ?? snapshot.divisions,
    departments: data.departments ?? snapshot.departments,
    offices: data.offices ?? snapshot.offices,
    officeMemberships: data.officeMemberships ?? snapshot.officeMemberships,
  };
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

registerIdentityCacheClearer(resetOrgCache);
