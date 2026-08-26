import { ERROR_UNKNOWN } from '@/lib/constants';
import { logError, logInfo } from '@/lib/client-logger';
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo, useSyncExternalStore } from 'react';
import { subscribeToStore, getCurrentUserSnapshot } from '@/hooks/use-current-user';
import { apiFetch, hasTokens } from '@/lib/api-client';
import { isRecord } from '@/lib/type-utils';
import { DEFAULT_CATALOG_PAGE_SIZE } from '@/lib/pagination-constants';
import { fetchAllCatalogPaginated } from '@/lib/pagination-utils';
import { updateOrganizationCache, resetOrgCache } from '@/lib/npa-structure';
import type { User } from '@/lib/npa-structure';
import type {
  Directorate, Division, Department, Office, OfficeMembership,
  AssistantAssignment, Role, OrganizationContextType,
  CreateRoleInput, UpdateRoleInput,
  CreateDirectorateInput, UpdateDirectorateInput,
  CreateDivisionInput, UpdateDivisionInput,
  CreateDepartmentInput, UpdateDepartmentInput,
  CreateUserInput, UpdateUserInput,
} from '@/lib/organization-types';
import {
  mapApiUserToUser, mapApiDirectorate, mapApiDivision,
  mapApiDepartment, mapApiOffice, mapApiOfficeMembership,
  mapApiRole, mapApiDelegation,
  cleanPayload, dedupeUsers, sortByName, upsertById,
} from '@/lib/organization-data';

// Backward-compatible re-exports for files importing types from OrganizationContext
export type {
  Directorate, Division, Department, Office, OfficeMembership,
  AssistantAssignment, Role,
} from '@/lib/organization-types';

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assistantAssignments, setAssistantAssignments] = useState<AssistantAssignment[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeMemberships, setOfficeMemberships] = useState<OfficeMembership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const [isSyncing, setIsSyncing] = useState(false);
  const currentUser = useSyncExternalStore(subscribeToStore, getCurrentUserSnapshot, getCurrentUserSnapshot);
  const organizationRefreshPromiseRef = useRef<Promise<void> | null>(null);

  const applyDirectorateUpdate = useCallback(
    (directorate: Directorate) => {
      setDirectorates((prev) => {
        const next = upsertById(prev, directorate, sortByName);
        updateOrganizationCache({ directorates: next });
        return next;
      });
    },
    []
  );

  const applyDivisionUpdate = useCallback(
    (division: Division) => {
      setDivisions((prev) => {
        const next = upsertById(prev, division, sortByName);
        updateOrganizationCache({ divisions: next });
        return next;
      });
    },
    []
  );

  const applyDepartmentUpdate = useCallback(
    (department: Department) => {
      setDepartments((prev) => {
        const next = upsertById(prev, department, sortByName);
        updateOrganizationCache({ departments: next });
        return next;
      });
    },
    []
  );

  const applyUserUpdate = useCallback(
    (userRecord: User) => {
      setUsers((prev) => {
        const next = upsertById(prev, userRecord, sortByName);
        updateOrganizationCache({ users: next });
        return next;
      });
    },
    []
  );

  const applyRoleUpdate = useCallback(
    (role: Role) => {
      setRoles((prev) => {
        const next = upsertById(prev, role, sortByName);
        return next;
      });
    },
    []
  );

  /** Fetch all pages of a catalog/list endpoint. */
  const fetchFirstPage = useCallback(
    async (basePath: string, pageSize = DEFAULT_CATALOG_PAGE_SIZE): Promise<Record<string, unknown>[]> => {
      const rows = await fetchAllCatalogPaginated<Record<string, unknown>>(basePath, pageSize);
      return rows.filter(isRecord);
    },
    []
  );

  const fetchAllOrgData = async () => {
    try {
      const [
        directoratesRows,
        divisionsRows,
        departmentsRows,
        rolesRows,
        officesRows,
        officeMembershipsRows,
        usersRows,
      ] = await Promise.all([
        fetchFirstPage('/organization/directorates/?ordering=name'),
        fetchFirstPage('/organization/divisions/?ordering=name'),
        fetchFirstPage('/organization/departments/?ordering=name'),
        fetchFirstPage('/organization/roles/?ordering=name'),
        fetchFirstPage('/organization/offices/?ordering=name'),
        fetchFirstPage('/organization/office-memberships/?ordering=office__name'),
        fetchFirstPage('/accounts/users/?is_active=true&ordering=username', 100),
      ]);

      const apiDirectorates = directoratesRows.map(mapApiDirectorate);
      const apiDivisions = divisionsRows.map(mapApiDivision);
      const apiDepartments = departmentsRows.map(mapApiDepartment);
      const apiRoles = rolesRows.map(mapApiRole);
      const apiOffices = officesRows.map(mapApiOffice);
      const apiOfficeMemberships = officeMembershipsRows.map(mapApiOfficeMembership);
      const apiUsers = dedupeUsers(usersRows.map(mapApiUserToUser));

      const sortedDirectorates = sortByName(apiDirectorates);
      const sortedDivisions = sortByName(apiDivisions);
      const sortedDepartments = sortByName(apiDepartments);
      const sortedRoles = sortByName(apiRoles);

      setDirectorates(sortedDirectorates);
      setDivisions(sortedDivisions);
      setDepartments(sortedDepartments);
      const sortedOffices = sortByName(apiOffices);
      setOffices(sortedOffices);
      setOfficeMemberships(apiOfficeMemberships);
      setRoles(sortedRoles);
      setUsers(apiUsers);

      updateOrganizationCache({
        directorates: sortedDirectorates,
        divisions: sortedDivisions,
        departments: sortedDepartments,
        offices: sortedOffices,
        officeMemberships: apiOfficeMemberships,
        users: apiUsers,
      });

      logInfo('Organization data loaded successfully:', {
        directorates: sortedDirectorates.length,
        divisions: sortedDivisions.length,
        departments: sortedDepartments.length,
        users: apiUsers.length,
      });

      // Defer delegations fetch — only 6 pages need this
      fetchFirstPage('/correspondence/delegations/').then((rows) => {
        const apiDelegations = rows.filter(isRecord).map(mapApiDelegation);
        setAssistantAssignments(apiDelegations);
      }).catch((err) => logError('Failed to load delegations', err));
    } catch (error: unknown) {
      logError('Failed to load organization data from API', error);
      if (error instanceof Error) {
        logError('Error details:', { message: error.message, stack: error.stack });
      }
    }
  };

  const refreshOrganizationData = useCallback(async () => {
    if (!currentUser?.id || !hasTokens()) {
      logInfo('Skipping organization data refresh:', { hasCurrentUser: !!currentUser?.id, hasTokens: hasTokens() });
      return;
    }

    if (organizationRefreshPromiseRef.current) {
      return organizationRefreshPromiseRef.current;
    }

    logInfo('Refreshing organization data...');
    setIsSyncing(true);

    const promise = fetchAllOrgData();
    promise.finally(() => { setIsSyncing(false); organizationRefreshPromiseRef.current = null; });

    organizationRefreshPromiseRef.current = promise;
    return promise;
  }, [currentUser?.id, fetchFirstPage]);

  useEffect(() => {
    if (!currentUser?.id || !hasTokens()) return;
    void refreshOrganizationData();
  }, [currentUser?.id, refreshOrganizationData]);

  const lastUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentUser?.id || !hasTokens()) return;
    if (lastUserIdRef.current !== currentUser.id) {
      lastUserIdRef.current = currentUser.id;
    }
  }, [currentUser?.id]);

  const buildDirectoratePayload = (input: Partial<CreateDirectorateInput>) =>
    cleanPayload({
      name: input.name,
      code: input.code,
      description: input.description,
      executive_director:
        input.executiveDirectorId === undefined
          ? undefined
          : input.executiveDirectorId
          ? input.executiveDirectorId
          : null,
      is_active: input.isActive,
    });

  const buildDivisionPayload = (input: Partial<CreateDivisionInput>) =>
    cleanPayload({
      name: input.name,
      code: input.code,
      directorate: input.directorateId,
      general_manager:
        input.generalManagerId === undefined
          ? undefined
          : input.generalManagerId
          ? input.generalManagerId
          : null,
      is_active: input.isActive,
    });

  const buildDepartmentPayload = (input: Partial<CreateDepartmentInput>) =>
    cleanPayload({
      name: input.name,
      code: input.code,
      division: input.divisionId,
      head_of_department:
        input.assistantGeneralManagerId === undefined
          ? undefined
          : input.assistantGeneralManagerId
          ? input.assistantGeneralManagerId
          : null,
      is_active: input.isActive,
    });

  const buildUserPayload = (input: UpdateUserInput) =>
    cleanPayload({
      username: input.username,
      first_name: input.firstName,
      last_name: input.lastName,
      system_role: input.systemRole,
      grade_level: input.gradeLevel || undefined,
      directorate: input.directorateId === undefined ? undefined : input.directorateId || null,
      division: input.divisionId === undefined ? undefined : input.divisionId || null,
      department: input.departmentId === undefined ? undefined : input.departmentId || null,
      is_active: input.isActive,
      email: input.email,
      employee_id: input.employeeId === undefined ? undefined : input.employeeId || undefined,
      password: input.password,
    });

  const buildCreateUserPayload = (input: CreateUserInput) =>
    cleanPayload({
      username: input.username,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      password: input.password,
      system_role: input.systemRole,
      grade_level: input.gradeLevel || undefined,
      directorate: input.directorateId === undefined ? undefined : input.directorateId || null,
      division: input.divisionId === undefined ? undefined : input.divisionId || null,
      department: input.departmentId === undefined ? undefined : input.departmentId || null,
      is_active: input.isActive !== undefined ? input.isActive : true,
      employee_id: input.employeeId === undefined ? undefined : input.employeeId || undefined,
    });

  const addDirectorate = useCallback(async (directorate: CreateDirectorateInput) => {
    const payload = buildDirectoratePayload(directorate);
    const response = await apiFetch<Record<string, unknown>>('/organization/directorates/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = mapApiDirectorate(response);
    applyDirectorateUpdate(created);
    return created;
  }, [applyDirectorateUpdate]);

  const updateDirectorate = useCallback(async (id: string, updates: UpdateDirectorateInput) => {
    const payload = buildDirectoratePayload(updates);
    if (Object.keys(payload).length === 0) {
      return directorates.find((dir) => dir.id === id) ?? null;
    }
    const response = await apiFetch<Record<string, unknown>>(`/organization/directorates/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    const updated = mapApiDirectorate(response);
    applyDirectorateUpdate(updated);
    return updated;
  }, [directorates, applyDirectorateUpdate]);

  const deleteDirectorate = useCallback(async (id: string) => {
    const response = await apiFetch<Record<string, unknown>>(`/organization/directorates/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
    const updated = mapApiDirectorate(response);
    applyDirectorateUpdate(updated);
    return updated;
  }, [applyDirectorateUpdate]);

  const addDivision = useCallback(async (division: CreateDivisionInput) => {
    const payload = buildDivisionPayload(division);
    const response = await apiFetch<Record<string, unknown>>('/organization/divisions/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = mapApiDivision(response);
    applyDivisionUpdate(created);
    return created;
  }, [applyDivisionUpdate]);

  const updateDivision = useCallback(async (id: string, updates: UpdateDivisionInput) => {
    const payload = buildDivisionPayload(updates);
    if (Object.keys(payload).length === 0) {
      return divisions.find((div) => div.id === id) ?? null;
    }
    const response = await apiFetch<Record<string, unknown>>(`/organization/divisions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    const updated = mapApiDivision(response);
    applyDivisionUpdate(updated);
    return updated;
  }, [divisions, applyDivisionUpdate]);

  const deleteDivision = useCallback(async (id: string) => {
    const response = await apiFetch<Record<string, unknown>>(`/organization/divisions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
    const updated = mapApiDivision(response);
    applyDivisionUpdate(updated);
    return updated;
  }, [applyDivisionUpdate]);

  const addDepartment = useCallback(async (department: CreateDepartmentInput) => {
    const payload = buildDepartmentPayload(department);
    const response = await apiFetch<Record<string, unknown>>('/organization/departments/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = mapApiDepartment(response);
    applyDepartmentUpdate(created);
    return created;
  }, [applyDepartmentUpdate]);

  const updateDepartment = useCallback(async (id: string, updates: UpdateDepartmentInput) => {
    const payload = buildDepartmentPayload(updates);
    if (Object.keys(payload).length === 0) {
      return departments.find((dept) => dept.id === id) ?? null;
    }
    const response = await apiFetch<Record<string, unknown>>(`/organization/departments/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    const updated = mapApiDepartment(response);
    applyDepartmentUpdate(updated);
    return updated;
  }, [departments, applyDepartmentUpdate]);

  const deleteDepartment = useCallback(async (id: string) => {
    const response = await apiFetch<Record<string, unknown>>(`/organization/departments/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
    const updated = mapApiDepartment(response);
    applyDepartmentUpdate(updated);
    return updated;
  }, [applyDepartmentUpdate]);

  const addUser = useCallback(async (user: CreateUserInput) => {
    const payload = buildCreateUserPayload(user);
    const response = await apiFetch<Record<string, unknown>>('/accounts/users/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = mapApiUserToUser(response);
    applyUserUpdate(created);
    return created;
  }, [applyUserUpdate]);

  const updateUser = useCallback(async (id: string, updates: UpdateUserInput) => {
    const payload = buildUserPayload(updates);
    if (Object.keys(payload).length === 0) {
      const existing = users.find((user) => user.id === id);
      if (!existing) {
        throw new Error('User not found in context.');
      }
      return existing;
    }

    const response = await apiFetch<Record<string, unknown>>(`/accounts/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const updatedUser = mapApiUserToUser(response);
    applyUserUpdate(updatedUser);
    return updatedUser;
  }, [users, applyUserUpdate]);

  const applyAssignmentUpdate = useCallback(
    (assignment: AssistantAssignment) => {
      setAssistantAssignments((prev) => {
        const next = upsertById(prev, assignment);
        return next;
      });
    },
    []
  );

  const applyOfficeMembershipUpdate = useCallback((membership: OfficeMembership) => {
    setOfficeMemberships((prev) => upsertById(prev, membership));
  }, []);

  const addOfficeMembership = useCallback(async (
    membership: Omit<OfficeMembership, 'id' | 'officeName'>,
  ): Promise<OfficeMembership> => {
    const response = await apiFetch<Record<string, unknown>>('/organization/office-memberships/', {
      method: 'POST',
      body: JSON.stringify({
        office: membership.officeId,
        user: membership.userId,
        assignment_role: membership.assignmentRole,
        is_primary: membership.isPrimary,
        can_register: membership.canRegister,
        can_route: membership.canRoute,
        can_approve: membership.canApprove,
        starts_at: membership.startsAt,
        ends_at: membership.endsAt,
        is_active: membership.isActive,
      }),
    });
    const created = mapApiOfficeMembership(response);
    applyOfficeMembershipUpdate(created);
    return created;
  }, [applyOfficeMembershipUpdate]);

  const updateOfficeMembership = useCallback(async (
    id: string,
    updates: Partial<Omit<OfficeMembership, 'id' | 'officeName'>>,
  ): Promise<OfficeMembership> => {
    const response = await apiFetch<Record<string, unknown>>(`/organization/office-memberships/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(
        cleanPayload({
          office: updates.officeId,
          user: updates.userId,
          assignment_role: updates.assignmentRole,
          is_primary: updates.isPrimary,
          can_register: updates.canRegister,
          can_route: updates.canRoute,
          can_approve: updates.canApprove,
          starts_at: updates.startsAt,
          ends_at: updates.endsAt,
          is_active: updates.isActive,
        }),
      ),
    });
    const updated = mapApiOfficeMembership(response);
    applyOfficeMembershipUpdate(updated);
    return updated;
  }, [applyOfficeMembershipUpdate]);

  const deleteOfficeMembership = useCallback(async (id: string): Promise<void> => {
    await apiFetch(`/organization/office-memberships/${id}/`, {
      method: 'DELETE',
    });
    setOfficeMemberships((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const buildDelegationPayload = (assignment: Omit<AssistantAssignment, 'id'> | Partial<AssistantAssignment>) => {
    const permissions = ('permissions' in assignment && assignment.permissions) ? assignment.permissions : [];
    const type = 'type' in assignment ? assignment.type : undefined;

    const canApprove = type === 'TA' || (Array.isArray(permissions) && permissions.includes('approve'));
    const canMinute = Array.isArray(permissions) && (permissions.includes('minute') || permissions.includes('view'));
    const canForward = Array.isArray(permissions) && (permissions.includes('forward') || permissions.includes('view'));

    return cleanPayload({
      principal_id: 'executiveId' in assignment ? assignment.executiveId : undefined,
      assistant_id: 'assistantId' in assignment ? assignment.assistantId : undefined,
      can_approve: canApprove,
      can_minute: canMinute,
      can_forward: canForward,
      active: 'permissions' in assignment ? true : undefined,
    });
  };

  const addAssignment = useCallback(async (assignment: Omit<AssistantAssignment, 'id'>) => {
    const payload = buildDelegationPayload(assignment);
    const response = await apiFetch<Record<string, unknown>>('/correspondence/delegations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = mapApiDelegation(response);
    applyAssignmentUpdate(created);
    return created;
  }, [applyAssignmentUpdate]);

  const updateAssignment = useCallback(async (id: string, updates: Partial<AssistantAssignment>) => {
    const existing = assistantAssignments.find((a) => a.id === id);
    if (!existing) {
      throw new Error('Assignment not found');
    }

    const merged = { ...existing, ...updates };
    const payload = buildDelegationPayload(merged);

    const response = await apiFetch<Record<string, unknown>>(`/correspondence/delegations/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    const updated = mapApiDelegation(response);
    applyAssignmentUpdate(updated);
    return updated;
  }, [assistantAssignments, applyAssignmentUpdate]);

  const deleteAssignment = useCallback(async (id: string) => {
    await apiFetch(`/correspondence/delegations/${id}/`, {
      method: 'DELETE',
    });
    setAssistantAssignments((prev) => prev.filter((assign) => assign.id !== id));
  }, []);

  const addRole = useCallback(async (role: CreateRoleInput): Promise<Role> => {
    const response = await apiFetch<Record<string, unknown>>('/organization/roles/', {
      method: 'POST',
      body: JSON.stringify({
        name: role.name,
        description: role.description ?? '',
        is_active: role.isActive ?? true,
        permissions: role.permissions ?? {},
      }),
    });
    const created = mapApiRole(response);
    applyRoleUpdate(created);
    return created;
  }, [applyRoleUpdate]);

  const updateRole = useCallback(async (id: string, updates: UpdateRoleInput): Promise<Role> => {
    const response = await apiFetch<Record<string, unknown>>(`/organization/roles/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: updates.name,
        description: updates.description,
        is_active: updates.isActive,
        permissions: updates.permissions,
      }),
    });
    const updated = mapApiRole(response);
    applyRoleUpdate(updated);
    return updated;
  }, [applyRoleUpdate]);

  const deleteRole = useCallback(async (id: string): Promise<void> => {
    await apiFetch(`/organization/roles/${id}/`, {
      method: 'DELETE',
    });
    setRoles((prev) => prev.filter((role) => role.id !== id));
  }, []);

  const resetOrganizationData = useCallback(() => {
    setDirectorates([]);
    setDivisions([]);
    setDepartments([]);
    setAssistantAssignments([]);
    setOffices([]);
    setOfficeMemberships([]);
    setUsers([]);
    setRoles([]);
    resetOrgCache();
  }, []);

  const contextValue = useMemo(() => ({
    directorates,
    divisions,
    departments,
    assistantAssignments,
    offices,
    officeMemberships,
    users,
    roles,
    addRole,
    updateRole,
    deleteRole,
    addDirectorate,
    updateDirectorate,
    deleteDirectorate,
    addDivision,
    updateDivision,
    deleteDivision,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    addOfficeMembership,
    updateOfficeMembership,
    deleteOfficeMembership,
    resetOrganizationData,
    refreshOrganizationData,
    isSyncing,
    updateUser,
    addUser,
  }), [
    directorates,
    divisions,
    departments,
    assistantAssignments,
    offices,
    officeMemberships,
    users,
    roles,
    addRole,
    updateRole,
    deleteRole,
    addDirectorate,
    updateDirectorate,
    deleteDirectorate,
    addDivision,
    updateDivision,
    deleteDivision,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    addOfficeMembership,
    updateOfficeMembership,
    deleteOfficeMembership,
    resetOrganizationData,
    refreshOrganizationData,
    isSyncing,
    updateUser,
    addUser,
  ]);

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
