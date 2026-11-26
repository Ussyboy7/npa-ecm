import { logError, logInfo } from '@/lib/client-logger';
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo, useSyncExternalStore } from 'react';
import { subscribeToStore, getCurrentUserSnapshot } from '@/hooks/use-current-user';
import { apiFetch, hasTokens } from '@/lib/api-client';
import { isRecord } from '@/lib/type-utils';
import { DEFAULT_CATALOG_PAGE_SIZE, MAX_CATALOG_PAGE_SIZE } from '@/lib/pagination-constants';
import { fetchAllCatalogPaginated } from '@/lib/pagination-utils';
import { listOfficeMemberships, listOfficeMembershipsForUser } from '@/lib/office-memberships-client';
import { updateOrganizationCache, resetOrgCache } from '@/lib/npa-structure';
import { invalidatePagePermissionsCache } from '@/lib/page-permissions-cache';
import { clearIdentityCaches } from '@/lib/identity-cache';
import type {
  Directorate, Division, Department, Office, OfficeMembership,
  AssistantAssignment, Role, OrganizationContextType, OrganizationCatalogKey, AssistantAssignmentScope,
  CreateRoleInput, UpdateRoleInput,
  CreateDirectorateInput, UpdateDirectorateInput,
  CreateDivisionInput, UpdateDivisionInput,
  CreateDepartmentInput, UpdateDepartmentInput,
  CreateUserInput, UpdateUserInput,
} from '@/lib/organization-types';
import {
  mapApiUserToUser, mapApiDirectorate, mapApiDivision,
  mapApiDepartment, mapApiOffice, mapApiOfficeMembership,
  mapApiRole, mapApiDelegation, buildDelegationPayload,
  cleanPayload, sortByName, upsertById,
} from '@/lib/organization-data';

// Backward-compatible re-exports for files importing types from OrganizationContext
export type {
  Directorate, Division, Department, Office, OfficeMembership,
  AssistantAssignment, Role,
} from '@/lib/organization-types';

export const ALL_ORGANIZATION_CATALOGS: OrganizationCatalogKey[] = [
  'offices',
  'directorates',
  'divisions',
  'departments',
];

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assistantAssignments, setAssistantAssignments] = useState<AssistantAssignment[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeCatalogLoadedFor, setOfficeCatalogLoadedFor] = useState<string | null>(null);
  const [officeMemberships, setOfficeMemberships] = useState<OfficeMembership[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [officeMembershipsLoadedFor, setOfficeMembershipsLoadedFor] = useState<string | null>(null);
  const [organizationReadyFor, setOrganizationReadyFor] = useState<string | null>(null);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const catalogPromisesRef = useRef<Map<string, Promise<void>>>(new Map());
  const assignmentPromisesRef = useRef<Map<string, Promise<void>>>(new Map());
  const allAssignmentsLoadedForRef = useRef<string | null>(null);
  const currentUser = useSyncExternalStore(subscribeToStore, getCurrentUserSnapshot, getCurrentUserSnapshot);
  const organizationRefreshPromiseRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);
  const currentUserIdRef = useRef<string | null>(currentUser?.id ?? null);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? null;
    clearIdentityCaches();
    setDirectorates([]);
    setDivisions([]);
    setDepartments([]);
    setAssistantAssignments([]);
    setOffices([]);
    setOfficeCatalogLoadedFor(null);
    setOfficeMemberships([]);
    setRoles([]);
    setOfficeMembershipsLoadedFor(null);
    setOrganizationReadyFor(null);
    setCatalogsLoading(false);
    catalogPromisesRef.current.clear();
    assignmentPromisesRef.current.clear();
    allAssignmentsLoadedForRef.current = null;
  }, [currentUser?.id]);

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

  const applyRoleUpdate = useCallback(
    (role: Role) => {
      setRoles((prev) => {
        const next = upsertById(prev, role, sortByName);
        return next;
      });
      // Role permissions feed the sidebar, so cached page access is stale.
      invalidatePagePermissionsCache();
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

  const ensureAssistantAssignments = useCallback(async (scope: AssistantAssignmentScope = 'mine'): Promise<void> => {
    const userId = currentUser?.id;
    if (!userId || !hasTokens()) return;
    if (scope !== 'all' && allAssignmentsLoadedForRef.current === userId) return;

    const key = `${userId}:${scope}`;
    const existing = assignmentPromisesRef.current.get(key);
    if (existing) return existing;

    const path = scope === 'all'
      ? '/correspondence/delegations/'
      : `/correspondence/delegations/?${scope === 'mine' ? 'assistant' : 'principal'}=${encodeURIComponent(userId)}${scope === 'mine' ? '&active=true' : ''}`;
    const promise = fetchFirstPage(path)
      .then((rows) => {
        if (currentUserIdRef.current !== userId) return;
        if (scope !== 'all' && allAssignmentsLoadedForRef.current === userId) return;
        const assignments = rows.filter(isRecord).map(mapApiDelegation);
        if (scope === 'all') {
          allAssignmentsLoadedForRef.current = userId;
          setAssistantAssignments(assignments);
        } else {
          setAssistantAssignments((current) => [
            ...current.filter((assignment) => scope === 'mine'
              ? assignment.assistantId !== userId
              : assignment.executiveId !== userId),
            ...assignments,
          ]);
        }
      })
      .catch((error: unknown) => {
        logError(`Failed to load ${scope === 'all' ? 'all' : scope === 'mine' ? 'assistant' : 'principal'} delegations`, error);
        assignmentPromisesRef.current.delete(key);
      });

    assignmentPromisesRef.current.set(key, promise);
    return promise;
  }, [currentUser?.id, fetchFirstPage]);

  const fetchAllOrgData = useCallback(async () => {
    const membershipUserId = currentUser?.id ?? null;

    // Sidebar access depends on this request. Publish it as soon as it resolves
    // instead of waiting for the much slower full organization/user catalog.
    const officeMembershipsRequest = (membershipUserId
      ? listOfficeMembershipsForUser(membershipUserId)
      : Promise.resolve([]))
      .then((rows) => {
        if (membershipUserId && currentUserIdRef.current === membershipUserId) {
          setOfficeMemberships(rows);
          updateOrganizationCache({ officeMemberships: rows });
        }
        return rows;
      })
      .catch((error: unknown) => {
        logError('Failed to load office memberships', error);
        if (membershipUserId && currentUserIdRef.current === membershipUserId) {
          setOfficeMemberships([]);
        }
        return [];
      });

    const rolesRequest = fetchFirstPage('/organization/roles/?ordering=name');

    void Promise.allSettled([rolesRequest, officeMembershipsRequest])
      .then(([rolesResult, officeMembershipsResult]) => {
        if (!membershipUserId || currentUserIdRef.current !== membershipUserId) return;

        if (rolesResult.status === 'fulfilled') {
          setRoles(sortByName(rolesResult.value.map(mapApiRole)));
        } else {
          logError('Failed to load role permissions', rolesResult.reason);
        }
        if (officeMembershipsResult.status === 'fulfilled') {
          setOfficeMemberships(officeMembershipsResult.value);
        }
        setOfficeMembershipsLoadedFor(membershipUserId);
      });

    try {
      const [rolesRows, officeMembershipsRows] = await Promise.all([
        rolesRequest,
        officeMembershipsRequest,
      ]);

      const apiRoles = rolesRows.map(mapApiRole);
      const apiOfficeMemberships = officeMembershipsRows;

      // The user may have switched while these requests were in flight. Drop
      // the entire result instead of showing one identity's organization under
      // another identity.
      if (!membershipUserId || currentUserIdRef.current !== membershipUserId) return;

      const sortedRoles = sortByName(apiRoles);

      setOfficeMemberships(apiOfficeMemberships);
      setRoles(sortedRoles);

      updateOrganizationCache({ officeMemberships: apiOfficeMemberships });

      logInfo('Organization access data loaded successfully:', {
        roles: sortedRoles.length,
      });

      // Defer delegations fetch — they feed delegated permissions, not page
      // content, so the sidebar can paint first.
      void ensureAssistantAssignments('mine');
    } catch (error: unknown) {
      logError('Failed to load organization data from API', error);
      if (error instanceof Error) {
        logError('Error details:', { message: error.message, stack: error.stack });
      }
    } finally {
      if (membershipUserId && currentUserIdRef.current === membershipUserId) {
        setOrganizationReadyFor(membershipUserId);
      }
    }
  }, [currentUser?.id, fetchFirstPage, ensureAssistantAssignments]);

  /**
   * Load organization catalogs on first use. Routes that never render a catalog
   * (for example a document detail) no longer pay for the office/directorate
   * catalogs at startup. Each catalog is fetched once per signed-in user.
   */
  const loadCatalogs = useCallback(async (...catalogs: OrganizationCatalogKey[]): Promise<void> => {
    const userId = currentUser?.id;
    if (!userId || !hasTokens()) return;

    const requested = catalogs.length > 0 ? catalogs : ALL_ORGANIZATION_CATALOGS;
    const pending: Promise<void>[] = [];
    setCatalogsLoading(true);

    for (const catalog of requested) {
      const key = `${userId}:${catalog}`;
      const inFlight = catalogPromisesRef.current.get(key);
      if (inFlight) {
        pending.push(inFlight);
        continue;
      }

      const promise = (async () => {
        try {
          if (catalog === 'offices') {
            const rows = await fetchFirstPage('/organization/offices/?ordering=name', MAX_CATALOG_PAGE_SIZE);
            if (currentUserIdRef.current !== userId) return;
            const sorted = sortByName(rows.map(mapApiOffice));
            setOffices(sorted);
            setOfficeCatalogLoadedFor(userId);
            updateOrganizationCache({ offices: sorted });
            return;
          }
          if (catalog === 'directorates') {
            const rows = await fetchFirstPage('/organization/directorates/?ordering=name');
            if (currentUserIdRef.current !== userId) return;
            const sorted = sortByName(rows.map(mapApiDirectorate));
            setDirectorates(sorted);
            updateOrganizationCache({ directorates: sorted });
            return;
          }
          if (catalog === 'divisions') {
            const rows = await fetchFirstPage('/organization/divisions/?ordering=name');
            if (currentUserIdRef.current !== userId) return;
            const sorted = sortByName(rows.map(mapApiDivision));
            setDivisions(sorted);
            updateOrganizationCache({ divisions: sorted });
            return;
          }
          const rows = await fetchFirstPage('/organization/departments/?ordering=name');
          if (currentUserIdRef.current !== userId) return;
          const sorted = sortByName(rows.map(mapApiDepartment));
          setDepartments(sorted);
          updateOrganizationCache({ departments: sorted });
        } catch (error: unknown) {
          logError(`Failed to load ${catalog} catalog`, error);
          // Let a later render retry instead of caching the failure forever.
          catalogPromisesRef.current.delete(key);
          if (catalog === 'offices' && currentUserIdRef.current === userId) {
            setOfficeCatalogLoadedFor(userId);
          }
        }
      })();

      catalogPromisesRef.current.set(key, promise);
      pending.push(promise);
    }

    await Promise.all(pending);
    if (currentUserIdRef.current === userId) setCatalogsLoading(false);
  }, [currentUser?.id, fetchFirstPage]);

  const refreshOrganizationData = useCallback(async () => {
    if (!currentUser?.id || !hasTokens()) {
      logInfo('Skipping organization data refresh:', { hasCurrentUser: !!currentUser?.id, hasTokens: hasTokens() });
      return;
    }

    if (organizationRefreshPromiseRef.current?.userId === currentUser.id) {
      return organizationRefreshPromiseRef.current.promise;
    }

    logInfo('Refreshing organization data...');
    setIsSyncing(true);

    const userId = currentUser.id;
    const promise = (async () => {
      await fetchAllOrgData();
      // Refresh only the catalogs a page already asked for.
      const prefix = `${userId}:`;
      const loaded = [...catalogPromisesRef.current.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.slice(prefix.length) as OrganizationCatalogKey);
      if (loaded.length === 0) return;
      for (const catalog of loaded) catalogPromisesRef.current.delete(`${prefix}${catalog}`);
      await loadCatalogs(...loaded);
    })();
    const entry = { userId, promise };
    promise.finally(() => {
      if (organizationRefreshPromiseRef.current === entry) {
        setIsSyncing(false);
        organizationRefreshPromiseRef.current = null;
      }
    });

    organizationRefreshPromiseRef.current = entry;
    return promise;
  }, [currentUser?.id, fetchAllOrgData, loadCatalogs]);

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
      middle_name: input.middleName,
      last_name: input.lastName,
      honorific: input.honorific,
      designation: input.designation,
      system_role: input.systemRole,
      grade_level: input.gradeLevel || undefined,
      directorate: input.directorateId === undefined ? undefined : input.directorateId || null,
      division: input.divisionId === undefined ? undefined : input.divisionId || null,
      department: input.departmentId === undefined ? undefined : input.departmentId || null,
      is_active: input.isActive,
      email: input.email,
      employee_id: input.employeeId === undefined ? undefined : input.employeeId || undefined,
      personnel_number:
        input.personnelNumber === undefined ? undefined : input.personnelNumber || undefined,
      password: input.password,
    });

  const buildCreateUserPayload = (input: CreateUserInput) =>
    cleanPayload({
      username: input.username,
      email: input.email,
      first_name: input.firstName,
      middle_name: input.middleName,
      last_name: input.lastName,
      honorific: input.honorific,
      designation: input.designation,
      password: input.password,
      system_role: input.systemRole,
      grade_level: input.gradeLevel || undefined,
      directorate: input.directorateId === undefined ? undefined : input.directorateId || null,
      division: input.divisionId === undefined ? undefined : input.divisionId || null,
      department: input.departmentId === undefined ? undefined : input.departmentId || null,
      is_active: input.isActive !== undefined ? input.isActive : true,
      employee_id: input.employeeId === undefined ? undefined : input.employeeId || undefined,
      personnel_number:
        input.personnelNumber === undefined ? undefined : input.personnelNumber || undefined,
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
    return mapApiUserToUser(response);
  }, []);

  const updateUser = useCallback(async (id: string, updates: UpdateUserInput) => {
    const response = await apiFetch<Record<string, unknown>>(`/accounts/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(buildUserPayload(updates)),
    });

    if (updates.systemRole !== undefined && id === currentUser?.id) {
      invalidatePagePermissionsCache();
    }
    return mapApiUserToUser(response);
  }, [currentUser?.id]);

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
    if (membership.userId !== currentUser?.id) return;
    setOfficeMemberships((prev) => upsertById(prev, membership));
  }, [currentUser?.id]);

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

  const updateRolePermission = useCallback(
    async (id: string, permissionId: string, enabled: boolean): Promise<Role> => {
      const response = await apiFetch<Record<string, unknown>>(
        `/organization/roles/${id}/permissions/${encodeURIComponent(permissionId)}/`,
        {
          method: 'PATCH',
          body: JSON.stringify({ enabled }),
        },
      );
      const updated = mapApiRole(response);
      applyRoleUpdate(updated);
      return updated;
    },
    [applyRoleUpdate],
  );

  const updateRolePermissions = useCallback(
    async (id: string, permissions: Record<string, boolean>): Promise<Role> => {
      const response = await apiFetch<Record<string, unknown>>(
        `/organization/roles/${id}/permissions/`,
        {
          method: 'PATCH',
          body: JSON.stringify({ permissions }),
        },
      );
      const updated = mapApiRole(response);
      applyRoleUpdate(updated);
      return updated;
    },
    [applyRoleUpdate],
  );

  const deleteRole = useCallback(async (id: string): Promise<void> => {
    await apiFetch(`/organization/roles/${id}/`, {
      method: 'DELETE',
    });
    setRoles((prev) => prev.filter((role) => role.id !== id));
    invalidatePagePermissionsCache();
  }, []);

  const resetOrganizationData = useCallback(() => {
    setDirectorates([]);
    setDivisions([]);
    setDepartments([]);
    setAssistantAssignments([]);
    setOffices([]);
    setOfficeCatalogLoadedFor(null);
    setOfficeMemberships([]);
    setOfficeMembershipsLoadedFor(null);
    setOrganizationReadyFor(null);
    currentUserIdRef.current = null;
    setRoles([]);
    catalogPromisesRef.current.clear();
    assignmentPromisesRef.current.clear();
    allAssignmentsLoadedForRef.current = null;
    resetOrgCache();
  }, []);

  const myOfficeMemberships = useMemo(
    () => officeMemberships.filter((membership) => membership.userId === currentUser?.id),
    [officeMemberships, currentUser?.id],
  );
  const myOfficeMembershipsLoaded = Boolean(
    currentUser?.id && officeMembershipsLoadedFor === currentUser.id,
  );
  const officeCatalogLoaded = Boolean(
    currentUser?.id && officeCatalogLoadedFor === currentUser.id,
  );
  const isOrganizationReady = Boolean(
    currentUser?.id && organizationReadyFor === currentUser.id,
  );
  const fetchOfficeMemberships = useCallback((filters: Parameters<typeof listOfficeMemberships>[0]) =>
    listOfficeMemberships(filters), []);

  const contextValue = useMemo(() => ({
    directorates,
    divisions,
    departments,
    assistantAssignments,
    offices,
    officeMemberships,
    myOfficeMemberships,
    myOfficeMembershipsLoaded,
    officeCatalogLoaded,
    isOrganizationReady,
    fetchOfficeMemberships,
    roles,
    addRole,
    updateRole,
    updateRolePermission,
    updateRolePermissions,
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
    ensureCatalogs: loadCatalogs,
    catalogsLoading,
    ensureAssistantAssignments,
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
    myOfficeMemberships,
    myOfficeMembershipsLoaded,
    officeCatalogLoaded,
    isOrganizationReady,
    fetchOfficeMemberships,
    roles,
    addRole,
    updateRole,
    updateRolePermission,
    updateRolePermissions,
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
    loadCatalogs,
    catalogsLoading,
    ensureAssistantAssignments,
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
