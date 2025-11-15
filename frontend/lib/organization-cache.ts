import type { Department, Directorate, Division, Office, OfficeMembership, User } from './npa-structure';

export type OrganizationSnapshot = {
  directorates: Directorate[];
  divisions: Division[];
  departments: Department[];
  offices: Office[];
  officeMemberships: OfficeMembership[];
  users: User[];
};

let snapshot: OrganizationSnapshot = {
  directorates: [],
  divisions: [],
  departments: [],
  offices: [],
  officeMemberships: [],
  users: [],
};

export const updateOrganizationCache = (data: Partial<OrganizationSnapshot>) => {
  snapshot = {
    directorates: data.directorates ?? snapshot.directorates,
    divisions: data.divisions ?? snapshot.divisions,
    departments: data.departments ?? snapshot.departments,
    offices: data.offices ?? snapshot.offices,
    officeMemberships: data.officeMemberships ?? snapshot.officeMemberships,
    users: data.users ?? snapshot.users,
  };
};

export const getOrganizationSnapshot = (): OrganizationSnapshot => snapshot;

export const getDirectorateById = (id?: string | null) => {
  if (!id) return undefined;
  return snapshot.directorates.find((item) => item.id === id);
};

export const getDivisionById = (id?: string | null) => {
  if (!id) return undefined;
  return snapshot.divisions.find((item) => item.id === id);
};

export const getDepartmentById = (id?: string | null) => {
  if (!id) return undefined;
  return snapshot.departments.find((item) => item.id === id);
};

export const getUserById = (id?: string | null) => {
  if (!id) return undefined;
  return snapshot.users.find((item) => item.id === id);
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
