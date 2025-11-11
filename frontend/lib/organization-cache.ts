import type { Department, Directorate, Division, User } from './npa-structure';

export type OrganizationSnapshot = {
  directorates: Directorate[];
  divisions: Division[];
  departments: Department[];
  users: User[];
};

let snapshot: OrganizationSnapshot = {
  directorates: [],
  divisions: [],
  departments: [],
  users: [],
};

export const updateOrganizationCache = (data: Partial<OrganizationSnapshot>) => {
  snapshot = {
    directorates: data.directorates ?? snapshot.directorates,
    divisions: data.divisions ?? snapshot.divisions,
    departments: data.departments ?? snapshot.departments,
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
