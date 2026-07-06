import { isRecord } from '@/lib/type-utils';
import type { BootstrapData } from '@/lib/server-bootstrap';
import type {
  AssistantAssignment,
  Department,
  Directorate,
  Division,
  Office,
  OfficeMembership,
  Role,
} from '@/lib/organization-types';
import type { User } from '@/lib/npa-structure';
import { updateOrganizationCache } from '@/lib/npa-structure';
import {
  dedupeUsers,
  mapApiDelegation,
  mapApiDepartment,
  mapApiDirectorate,
  mapApiDivision,
  mapApiOffice,
  mapApiOfficeMembership,
  mapApiRole,
  mapApiUserToUser,
  sortByName,
} from '@/lib/organization-data';

export type ParsedOrgState = {
  directorates: Directorate[];
  divisions: Division[];
  departments: Department[];
  assistantAssignments: AssistantAssignment[];
  offices: Office[];
  officeMemberships: OfficeMembership[];
  users: User[];
  roles: Role[];
};

const EMPTY_ORG_STATE: ParsedOrgState = {
  directorates: [],
  divisions: [],
  departments: [],
  assistantAssignments: [],
  offices: [],
  officeMemberships: [],
  users: [],
  roles: [],
};

export function parseBootstrapOrgState(data?: BootstrapData | null): ParsedOrgState {
  if (!data) return EMPTY_ORG_STATE;

  const directorates = sortByName(data.directorates.filter(isRecord).map(mapApiDirectorate));
  const divisions = sortByName(data.divisions.filter(isRecord).map(mapApiDivision));
  const departments = sortByName(data.departments.filter(isRecord).map(mapApiDepartment));
  const offices = sortByName(data.offices.filter(isRecord).map(mapApiOffice));
  const roles = sortByName(data.roles.filter(isRecord).map(mapApiRole));
  const officeMemberships = data.officeMemberships.filter(isRecord).map(mapApiOfficeMembership);
  const users = sortByName(dedupeUsers(data.users.filter(isRecord).map(mapApiUserToUser)));
  const assistantAssignments = data.assistantAssignments.filter(isRecord).map(mapApiDelegation);

  updateOrganizationCache({
    directorates,
    divisions,
    departments,
    offices,
    officeMemberships,
    users,
  });

  return {
    directorates,
    divisions,
    departments,
    assistantAssignments,
    offices,
    officeMemberships,
    users,
    roles,
  };
}
