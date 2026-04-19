import { logError, logInfo } from '@/lib/client-logger';
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import type { User } from '@/lib/npa-structure';
import { updateOrganizationCache } from '@/lib/npa-structure';
import { apiFetch, hasTokens } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { BootstrapData } from '@/lib/server-bootstrap';

// Cache configuration
const CACHE_KEY = 'org_data_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const USERS_CACHE_DURATION = 60 * 60 * 1000;

interface CachedData {
  timestamp: number;
  data: {
    directorates: Directorate[];
    divisions: Division[];
    departments: Department[];
    roles: Role[];
    offices: Office[];
    officeMemberships: OfficeMembership[];
    users: User[];
    assistantAssignments: AssistantAssignment[];
  };
}

const buildCacheKey = (userId?: string | null) => (
  userId ? `${CACHE_KEY}:${userId}` : CACHE_KEY
);

const readCachedData = (userId?: string | null): CachedData | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedData;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.timestamp !== 'number') return null;
    if (!parsed.data || typeof parsed.data !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCachedData = (data: CachedData['data'], userId?: string | null) => {
  if (typeof window === 'undefined') return;
  const payload: CachedData = { timestamp: Date.now(), data };
  try {
    localStorage.setItem(buildCacheKey(userId), JSON.stringify(payload));
  } catch {
    // ignore
  }
};

const isCacheFresh = (cache: CachedData | null, maxAgeMs: number) => {
  if (!cache) return false;
  return Date.now() - cache.timestamp < maxAgeMs;
};

export interface Directorate {
  id: string;
  name: string;
  code: string;
  shortName?: string;
  description?: string;
  executiveDirectorId?: string;
  isActive: boolean;
}

export interface Division {
  id: string;
  name: string;
  code: string;
  shortName?: string;
  directorateId: string;
  generalManagerId?: string | null;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  shortName?: string;
  divisionId: string;
  assistantGeneralManagerId?: string | null;
  isActive: boolean;
}

export interface Office {
  id: string;
  name: string;
  code: string;
  officeType: string;
  directorateId?: string | null;
  divisionId?: string | null;
  departmentId?: string | null;
  parentId?: string | null;
  description?: string;
  isActive: boolean;
  allowExternalIntake: boolean;
  allowLateralRouting: boolean;
}

export interface OfficeMembership {
  id: string;
  officeId: string;
  officeName?: string;
  userId: string;
  assignmentRole: string;
  isPrimary: boolean;
  canRegister: boolean;
  canRoute: boolean;
  canApprove: boolean;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
}

export interface AssistantAssignment {
  id: string;
  executiveId: string;
  assistantId: string;
  type: 'TA' | 'PA';
  specialization?: string;
  permissions: string[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  permissions?: Record<string, boolean>;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

type CreateRoleInput = {
  name: string;
  description?: string;
  isActive?: boolean;
  permissions?: Record<string, boolean>;
};

type UpdateRoleInput = Partial<CreateRoleInput>;

interface OrganizationContextType {
  directorates: Directorate[];
  divisions: Division[];
  departments: Department[];
  assistantAssignments: AssistantAssignment[];
  offices: Office[];
  officeMemberships: OfficeMembership[];
  users: User[];
  roles: Role[];
  addRole: (role: CreateRoleInput) => Promise<Role>;
  updateRole: (id: string, updates: UpdateRoleInput) => Promise<Role | null>;
  deleteRole: (id: string) => Promise<void>;
  addDirectorate: (directorate: CreateDirectorateInput) => Promise<Directorate>;
  updateDirectorate: (id: string, updates: UpdateDirectorateInput) => Promise<Directorate | null>;
  deleteDirectorate: (id: string) => Promise<Directorate | null>;
  addDivision: (division: CreateDivisionInput) => Promise<Division>;
  updateDivision: (id: string, updates: UpdateDivisionInput) => Promise<Division | null>;
  deleteDivision: (id: string) => Promise<Division | null>;
  addDepartment: (department: CreateDepartmentInput) => Promise<Department>;
  updateDepartment: (id: string, updates: UpdateDepartmentInput) => Promise<Department | null>;
  deleteDepartment: (id: string) => Promise<Department | null>;
  addAssignment: (assignment: Omit<AssistantAssignment, 'id'>) => Promise<AssistantAssignment>;
  updateAssignment: (id: string, updates: Partial<AssistantAssignment>) => Promise<AssistantAssignment>;
  deleteAssignment: (id: string) => Promise<void>;
  addOfficeMembership: (membership: Omit<OfficeMembership, 'id' | 'officeName'>) => Promise<OfficeMembership>;
  updateOfficeMembership: (id: string, updates: Partial<Omit<OfficeMembership, 'id' | 'officeName'>>) => Promise<OfficeMembership>;
  deleteOfficeMembership: (id: string) => Promise<void>;
  resetOrganizationData: () => void;
  refreshOrganizationData: () => Promise<void>;
  isSyncing: boolean;
  updateUser: (id: string, updates: UpdateUserInput) => Promise<User>;
  addUser: (user: CreateUserInput) => Promise<User>;
}

type CreateDirectorateInput = {
  name: string;
  code: string;
  description?: string;
  executiveDirectorId?: string | null;
  isActive?: boolean;
};

type UpdateDirectorateInput = Partial<CreateDirectorateInput>;

type CreateDivisionInput = {
  name: string;
  code: string;
  directorateId: string;
  generalManagerId?: string | null;
  isActive?: boolean;
};

type UpdateDivisionInput = Partial<CreateDivisionInput>;

type CreateDepartmentInput = {
  name: string;
  code: string;
  divisionId: string;
  assistantGeneralManagerId?: string | null;
  isActive?: boolean;
};

type UpdateDepartmentInput = Partial<CreateDepartmentInput>;
type CreateUserInput = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  systemRole?: string | null;
  gradeLevel?: string | null;
  directorateId?: string | null;
  divisionId?: string | null;
  departmentId?: string | null;
  isActive?: boolean;
  employeeId?: string | null;
};

type UpdateUserInput = {
  systemRole?: string | null;
  gradeLevel?: string | null;
  directorateId?: string | null;
  divisionId?: string | null;
  departmentId?: string | null;
  isActive?: boolean;
  email?: string;
  employeeId?: string | null;
  password?: string;
};

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const unwrapResults = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload) && 'results' in payload) {
    const results = (payload as { results?: unknown }).results;
    if (Array.isArray(results)) return results;
  }
  return [];
};

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const asStringOptional = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  return String(value);
};

const asBoolean = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback);

const normalizeId = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object') {
    if ('id' in (value as Record<string, unknown>)) {
      return normalizeId((value as Record<string, unknown>).id);
    }
    if ('pk' in (value as Record<string, unknown>)) {
      return normalizeId((value as Record<string, unknown>).pk);
    }
  }
  return String(value);
};

const mapApiUserToUser = (user: Record<string, unknown>): User => {
  const fullName = `${asString(user.first_name, '')} ${asString(user.last_name, '')}`.trim();
  // system_role is now a ForeignKey (UUID), but we need the name for display
  // Backend returns system_role_name for the role name
  // Ensure we never use the UUID as the role name - only use system_role_name
  // system_role is now a ForeignKey (UUID), but we need the name for display
  // Backend returns system_role_name for the role name - ALWAYS use this
  let roleName = asString(user.system_role_name, '');
  
  // UUID pattern to detect if we accidentally got a UUID instead of a name
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // If system_role_name is missing or is a UUID, try to get it from system_role object
  if ((!roleName || uuidPattern.test(roleName)) && isRecord(user.system_role)) {
    roleName = asString(user.system_role.name, '');
  }
  
  // Final check: if roleName is still a UUID or empty, set to empty string
  // We should NEVER display a UUID as the role name
  if (!roleName || uuidPattern.test(roleName)) {
    roleName = '';
  }
  const permissionsRaw = isRecord(user.permissions) ? user.permissions : undefined;
  const rolePermissions =
    permissionsRaw
      ? (Object.fromEntries(
          Object.entries(permissionsRaw).map(([key, value]) => [key, Boolean(value)]),
        ) as Record<string, boolean>)
      : undefined;
  return {
    id: asString(user.id ?? user.username),
    username: asStringOptional(user.username),
    name: fullName.length > 0 ? fullName : asString(user.username, 'User'),
    email: asString(user.email),
    employeeId: asString(user.employee_id),
    gradeLevel: asString(user.grade_level),
    systemRole: roleName, // Use role name for display, never the UUID
    directorate: normalizeId(user.directorate ?? user.directorate_id),
    division: normalizeId(user.division ?? user.division_id),
    department: normalizeId(user.department ?? user.department_id),
    avatar: undefined,
    active: asBoolean(user.is_active, true),
    isSuperuser: asBoolean(user.is_superuser, false),
    rolePermissions,
  };
};

const mapApiDirectorate = (item: Record<string, unknown>): Directorate => ({
  id: asString(item.id),
  name: asString(item.name, 'Directorate'),
  code: asString(item.code, `DIR-${asString(item.id).slice(0, 6).toUpperCase()}`),
  shortName: asStringOptional(item.short_name ?? item.shortName),
  description: asString(item.description),
  executiveDirectorId: normalizeId(item.executive_director ?? item.executive_director_id),
  isActive: asBoolean(item.is_active, true),
});

const mapApiDivision = (item: Record<string, unknown>): Division => ({
  id: asString(item.id),
  name: asString(item.name, 'Division'),
  code: asString(item.code, `DIV-${asString(item.id).slice(0, 6).toUpperCase()}`),
  shortName: asStringOptional(item.short_name ?? item.shortName),
  directorateId: normalizeId(item.directorate ?? item.directorate_id) ?? '',
  generalManagerId:
    item.general_manager === null || item.general_manager === undefined
      ? item.general_manager
      : asString(item.general_manager ?? item.general_manager_id ?? ''),
  isActive: asBoolean(item.is_active, true),
});

const mapApiDepartment = (item: Record<string, unknown>): Department => ({
  id: asString(item.id),
  name: asString(item.name, 'Department'),
  code: asString(item.code, `DEPT-${asString(item.id).slice(0, 6).toUpperCase()}`),
  shortName: asStringOptional(item.short_name ?? item.shortName),
  divisionId: normalizeId(item.division ?? item.division_id) ?? '',
  assistantGeneralManagerId:
    item.head_of_department === null || item.head_of_department === undefined
      ? item.head_of_department
      : asString(item.head_of_department ?? item.head_of_department_id ?? ''),
  isActive: asBoolean(item.is_active, true),
});

const mapApiDelegation = (item: Record<string, unknown>): AssistantAssignment => {
  const permissions: string[] = [];
  if (item.can_minute) permissions.push('minute');
  if (item.can_forward) permissions.push('forward');
  if (item.can_approve) permissions.push('approve');

  const principal = isRecord(item.principal) ? item.principal : undefined;
  const assistant = isRecord(item.assistant) ? item.assistant : undefined;

  return {
    id: asString(item.id),
    executiveId: asString(item.principal_id ?? (principal ? principal.id : undefined)),
    assistantId: asString(item.assistant_id ?? (assistant ? assistant.id : undefined)),
    type: item.can_approve ? 'TA' : 'PA',
    specialization: undefined,
    permissions: permissions.length > 0 ? permissions : ['view'],
  };
};

const mapApiRole = (item: Record<string, unknown>): Role => ({
  id: asString(item.id),
  name: asString(item.name, 'Role'),
  description: asString(item.description),
  isActive: asBoolean(item.is_active, true),
  permissions: (isRecord(item.permissions) ? (item.permissions as Record<string, boolean>) : {}) ?? {},
  userCount: typeof item.user_count === 'number' ? item.user_count : 0,
  createdAt: asStringOptional(item.created_at),
  updatedAt: asStringOptional(item.updated_at),
});

const mapApiOffice = (item: Record<string, unknown>): Office => ({
  id: asString(item.id),
  name: asString(item.name, 'Office'),
  code: asString(item.code, `OFF-${asString(item.id).slice(0, 6).toUpperCase()}`),
  officeType: asString(item.office_type, 'custom'),
  directorateId: normalizeId(item.directorate ?? item.directorate_id),
  divisionId: normalizeId(item.division ?? item.division_id),
  departmentId: normalizeId(item.department ?? item.department_id),
  parentId: normalizeId(item.parent ?? item.parent_id),
  description: asString(item.description),
  isActive: asBoolean(item.is_active, true),
  allowExternalIntake: asBoolean(item.allow_external_intake, true),
  allowLateralRouting: asBoolean(item.allow_lateral_routing, true),
});

const mapApiOfficeMembership = (item: Record<string, unknown>): OfficeMembership => ({
  id: asString(item.id),
  officeId: normalizeId(item.office ?? item.office_id) ?? '',
  officeName: asStringOptional(item.office_name) ?? (isRecord(item.office) ? asStringOptional(item.office.name) : undefined),
  userId: normalizeId(item.user ?? item.user_id) ?? '',
  assignmentRole: asString(item.assignment_role, 'staff'),
  isPrimary: asBoolean(item.is_primary, false),
  canRegister: asBoolean(item.can_register, false),
  canRoute: asBoolean(item.can_route, true),
  canApprove: asBoolean(item.can_approve, false),
  startsAt: asStringOptional(item.starts_at),
  endsAt: asStringOptional(item.ends_at),
  isActive: asBoolean(item.is_active, true),
});

const cleanPayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

const sortByName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

const upsertById = <T extends { id: string }>(items: T[], item: T, comparator?: (items: T[]) => T[]): T[] => {
  const next = items.some((existing) => existing.id === item.id as string)
    ? items.map((existing) => (existing.id === item.id as string ? item : existing))
    : [...items, item];

  return comparator ? comparator(next) : next;
};

const isCanonicalUser = (user: User): boolean => {
  const username = user.username ?? "";
  if (!username) return true;
  if (username === "superadmin") return true;
  return username.startsWith("user-");
};

const userDetailScore = (user: User): number => {
  let score = 0;
  if (user.division) score += 2;
  if (user.department) score += 1;
  if (user.systemRole) score += 1;
  return score;
};

const dedupeUsers = (incoming: User[]): User[] => {
  const byEmail = new Map<string, User>();

  for (const user of incoming) {
    const key = (user.email || user.id).toLowerCase();
    const existing = byEmail.get(key);

    if (!existing) {
      byEmail.set(key, user);
      continue;
    }

    const existingCanonical = isCanonicalUser(existing);
    const candidateCanonical = isCanonicalUser(user);

    if (candidateCanonical && !existingCanonical) {
      byEmail.set(key, user);
      continue;
    }

    if (candidateCanonical === existingCanonical) {
      const existingScore = userDetailScore(existing);
      const candidateScore = userDetailScore(user);
      if (candidateScore > existingScore) {
        byEmail.set(key, user);
      }
    }
  }

  return sortByName(Array.from(byEmail.values()));
};

function applyInitialData(
  data: BootstrapData,
  setters: {
    setDirectorates: (v: Directorate[]) => void;
    setDivisions: (v: Division[]) => void;
    setDepartments: (v: Department[]) => void;
    setAssistantAssignments: (v: AssistantAssignment[]) => void;
    setOffices: (v: Office[]) => void;
    setOfficeMemberships: (v: OfficeMembership[]) => void;
    setUsers: (v: User[]) => void;
    setRoles: (v: Role[]) => void;
  }
) {
  const dirs = data.directorates.filter(isRecord).map(mapApiDirectorate);
  const divs = data.divisions.filter(isRecord).map(mapApiDivision);
  const depts = data.departments.filter(isRecord).map(mapApiDepartment);
  const offs = data.offices.filter(isRecord).map(mapApiOffice);
  const rols = data.roles.filter(isRecord).map(mapApiRole);
  const mems = data.officeMemberships.filter(isRecord).map(mapApiOfficeMembership);
  const usrs = dedupeUsers(data.users.filter(isRecord).map(mapApiUserToUser));
  const dels = data.assistantAssignments.filter(isRecord).map(mapApiDelegation);

  setters.setDirectorates(sortByName(dirs));
  setters.setDivisions(sortByName(divs));
  setters.setDepartments(sortByName(depts));
  setters.setOffices(sortByName(offs));
  setters.setRoles(sortByName(rols));
  setters.setOfficeMemberships(mems);
  setters.setUsers(sortByName(usrs));
  setters.setAssistantAssignments(dels);

  updateOrganizationCache({
    directorates: dirs,
    divisions: divs,
    departments: depts,
    offices: offs,
    officeMemberships: mems,
    users: usrs,
  });
}

export const OrganizationProvider: React.FC<{
  children: ReactNode;
  initialData?: BootstrapData | null;
}> = ({ children, initialData }) => {
  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assistantAssignments, setAssistantAssignments] = useState<AssistantAssignment[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeMemberships, setOfficeMemberships] = useState<OfficeMembership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const { currentUser } = useCurrentUser();
  const appliedInitialRef = useRef(false);

  useEffect(() => {
    if (initialData && !appliedInitialRef.current) {
      appliedInitialRef.current = true;
      applyInitialData(initialData, {
        setDirectorates,
        setDivisions,
        setDepartments,
        setAssistantAssignments,
        setOffices,
        setOfficeMemberships,
        setUsers,
        setRoles,
      });
      setHasSynced(true);
      logInfo('Organization data loaded from server bootstrap');
    }
  }, [initialData]);

  useEffect(() => {
    if (hasSynced) return;
    if (!hasTokens()) return;
    const cached = readCachedData(currentUser?.id);
    if (!isCacheFresh(cached, CACHE_DURATION)) return;
    const data = cached?.data;
    if (!data) return;
    setDirectorates(data.directorates || []);
    setDivisions(data.divisions || []);
    setDepartments(data.departments || []);
    setAssistantAssignments(data.assistantAssignments || []);
    setOffices(data.offices || []);
    setOfficeMemberships(data.officeMemberships || []);
    setUsers(data.users || []);
    setRoles(data.roles || []);
    updateOrganizationCache({
      directorates: data.directorates || [],
      divisions: data.divisions || [],
      departments: data.departments || [],
      offices: data.offices || [],
      officeMemberships: data.officeMemberships || [],
      users: data.users || [],
    });
    setHasSynced(true);
  }, [currentUser?.id, hasSynced]);

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

  /** Fetch first page only (server-side pagination). Use for initial load. */
  const fetchFirstPage = useCallback(
    async (basePath: string, pageSize = 100): Promise<Record<string, unknown>[]> => {
      const separator = basePath.includes('?') ? '&' : '?';
      const response = await apiFetch(`${basePath}${separator}page_size=${pageSize}&page=1`);
      return unwrapResults(response).filter(isRecord);
    },
    []
  );

  /** Fetch all pages (for manual refresh when user explicitly requests full data). */
  const fetchAllResults = useCallback(async (basePath: string, pageSize = 100): Promise<Record<string, unknown>[]> => {
    const collected: Record<string, unknown>[] = [];
    let page = 1;
    let hasNext = true;
    let safetyCounter = 0;

    while (hasNext && safetyCounter < 100) {
      const separator = basePath.includes('?') ? '&' : '?';
      const response = await apiFetch(`${basePath}${separator}page_size=${pageSize}&page=${page}`);
      const rows = unwrapResults(response).filter(isRecord);
      collected.push(...rows);

      const isPaginated =
        response && typeof response === 'object' && 'results' in response && 'next' in response;
      const nextUrl = isPaginated ? (response as { next?: string | null }).next : null;
      hasNext = Boolean(nextUrl);
      page += 1;
      safetyCounter += 1;

      if (!isPaginated) {
        hasNext = false;
      }
    }

    return collected;
  }, []);

  const refreshOrganizationData = useCallback(async () => {
    if (!currentUser?.id || !hasTokens()) {
      logInfo('Skipping organization data refresh:', { hasCurrentUser: !!currentUser?.id, hasTokens: hasTokens() });
      return;
    }

    // Manual refresh always runs (admin UI, role switcher, etc.) regardless of bootstrap.
    logInfo('Refreshing organization data...');
    setIsSyncing(true);
    try {
      // Fetch first page only (server-side pagination). Keeps initial load fast.
      const [
        directoratesRows,
        divisionsRows,
        departmentsRows,
        delegationsRaw,
        rolesRows,
        officesRows,
        officeMembershipsRows,
        usersRows,
      ] = await Promise.all([
        fetchFirstPage('/organization/directorates/?ordering=name'),
        fetchFirstPage('/organization/divisions/?ordering=name'),
        fetchFirstPage('/organization/departments/?ordering=name'),
        apiFetch('/correspondence/delegations/'),
        fetchFirstPage('/organization/roles/?ordering=name'),
        fetchFirstPage('/organization/offices/?ordering=name'),
        fetchFirstPage('/organization/office-memberships/?ordering=office__name'),
        fetchFirstPage('/accounts/users/?is_active=true&ordering=username', 200),
      ]);

      const apiDirectorates = directoratesRows.map(mapApiDirectorate);
      const apiDivisions = divisionsRows.map(mapApiDivision);
      const apiDepartments = departmentsRows.map(mapApiDepartment);
      const apiDelegations = unwrapResults(delegationsRaw).filter(isRecord).map(mapApiDelegation);
      const apiRoles = rolesRows.map(mapApiRole);
      const apiOffices = officesRows.map(mapApiOffice);
      const apiOfficeMemberships = officeMembershipsRows.map(mapApiOfficeMembership);
      const apiUsers = dedupeUsers(usersRows.map(mapApiUserToUser));

      const sortedDirectorates = sortByName(apiDirectorates);
      const sortedDivisions = sortByName(apiDivisions);
      const sortedDepartments = sortByName(apiDepartments);
      const sortedRoles = sortByName(apiRoles);
      const sortedUsers = sortByName(apiUsers);

      setDirectorates(sortedDirectorates);
      setDivisions(sortedDivisions);
      setDepartments(sortedDepartments);
      setAssistantAssignments(apiDelegations);
      const sortedOffices = sortByName(apiOffices);
      setOffices(sortedOffices);
      setOfficeMemberships(apiOfficeMemberships);
      setRoles(sortedRoles);
      setUsers(sortedUsers);

      updateOrganizationCache({
        directorates: sortedDirectorates,
        divisions: sortedDivisions,
        departments: sortedDepartments,
        offices: sortedOffices,
        officeMemberships: apiOfficeMemberships,
        users: sortedUsers,
      });

      writeCachedData({
        directorates: sortedDirectorates,
        divisions: sortedDivisions,
        departments: sortedDepartments,
        roles: sortedRoles,
        offices: sortedOffices,
        officeMemberships: apiOfficeMemberships,
        users: sortedUsers,
        assistantAssignments: apiDelegations,
      }, currentUser?.id);

      setHasSynced(true);
      logInfo('Organization data loaded successfully:', {
        users: sortedUsers.length,
        directorates: sortedDirectorates.length,
        divisions: sortedDivisions.length,
        departments: sortedDepartments.length,
      });
    } catch (error: unknown) {
      logError('Failed to load organization data from API', error);
      if (error instanceof Error) {
        logError('Error details:', { message: (error instanceof Error ? error.message : "Unknown error"), stack: error.stack });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser?.id, fetchFirstPage]);

  useEffect(() => {
    if (!currentUser?.id || !hasTokens()) return;
    // Bootstrap is slimmed: no org data. Always fetch org data on client (first page).
    const hasOrgFromBootstrap = initialData && (initialData.offices?.length > 0 || initialData.directorates?.length > 0);
    if (hasOrgFromBootstrap) return;
    void refreshOrganizationData();
  }, [currentUser?.id, refreshOrganizationData, initialData]);

  // Reset sync flag when user changes (but only on actual user switch, not initial load)
  const lastUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentUser?.id || !hasTokens()) return;
    // If we have server bootstrap data, don't reset on first user load (avoids duplicate fetch)
    if (initialData && lastUserIdRef.current === null) {
      lastUserIdRef.current = currentUser.id;
      return;
    }
    if (lastUserIdRef.current !== currentUser.id) {
      lastUserIdRef.current = currentUser.id;
      setHasSynced(false);
    }
  }, [currentUser?.id, initialData]);

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
      system_role: input.systemRole,
      grade_level: input.gradeLevel,
      directorate: input.directorateId === undefined ? undefined : input.directorateId || null,
      division: input.divisionId === undefined ? undefined : input.divisionId || null,
      department: input.departmentId === undefined ? undefined : input.departmentId || null,
      is_active: input.isActive,
      email: input.email,
      employee_id: input.employeeId === undefined ? undefined : input.employeeId ?? null,
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
      grade_level: input.gradeLevel,
      directorate: input.directorateId === undefined ? undefined : input.directorateId || null,
      division: input.divisionId === undefined ? undefined : input.divisionId || null,
      department: input.departmentId === undefined ? undefined : input.departmentId || null,
      is_active: input.isActive !== undefined ? input.isActive : true,
      employee_id: input.employeeId === undefined ? undefined : input.employeeId ?? null,
    });

  const addDirectorate = async (directorate: CreateDirectorateInput) => {
    const payload = buildDirectoratePayload(directorate);
    const response = await apiFetch<Record<string, unknown>>('/organization/directorates/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = mapApiDirectorate(response);
    applyDirectorateUpdate(created);
    return created;
  };

  const updateDirectorate = async (id: string, updates: UpdateDirectorateInput) => {
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
  };

  const deleteDirectorate = async (id: string) => {
    const response = await apiFetch<Record<string, unknown>>(`/organization/directorates/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
    const updated = mapApiDirectorate(response);
    applyDirectorateUpdate(updated);
    return updated;
  };

  const addDivision = async (division: CreateDivisionInput) => {
    const payload = buildDivisionPayload(division);
    const response = await apiFetch<Record<string, unknown>>('/organization/divisions/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = mapApiDivision(response);
    applyDivisionUpdate(created);
    return created;
  };

  const updateDivision = async (id: string, updates: UpdateDivisionInput) => {
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
  };

  const deleteDivision = async (id: string) => {
    const response = await apiFetch<Record<string, unknown>>(`/organization/divisions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
    const updated = mapApiDivision(response);
    applyDivisionUpdate(updated);
    return updated;
  };

  const addDepartment = async (department: CreateDepartmentInput) => {
    const payload = buildDepartmentPayload(department);
    const response = await apiFetch<Record<string, unknown>>('/organization/departments/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = mapApiDepartment(response);
    applyDepartmentUpdate(created);
    return created;
  };

  const updateDepartment = async (id: string, updates: UpdateDepartmentInput) => {
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
  };

  const deleteDepartment = async (id: string) => {
    const response = await apiFetch<Record<string, unknown>>(`/organization/departments/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
    const updated = mapApiDepartment(response);
    applyDepartmentUpdate(updated);
    return updated;
  };

  const addUser = async (user: CreateUserInput) => {
    const payload = buildCreateUserPayload(user);
    const response = await apiFetch<Record<string, unknown>>('/accounts/users/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = mapApiUserToUser(response);
    applyUserUpdate(created);
    return created;
  };

  const updateUser = async (id: string, updates: UpdateUserInput) => {
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
  };

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

  const addOfficeMembership = async (
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
  };

  const updateOfficeMembership = async (
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
  };

  const deleteOfficeMembership = async (id: string): Promise<void> => {
    await apiFetch(`/organization/office-memberships/${id}/`, {
      method: 'DELETE',
    });
    setOfficeMemberships((prev) => prev.filter((m) => m.id !== id));
  };

  const buildDelegationPayload = (assignment: Omit<AssistantAssignment, 'id'> | Partial<AssistantAssignment>) => {
    const permissions = ('permissions' in assignment && assignment.permissions) ? assignment.permissions : [];
    const type = 'type' in assignment ? assignment.type : undefined;
    
    // Determine can_approve from type or permissions
    const canApprove = type === 'TA' || (Array.isArray(permissions) && permissions.includes('approve'));
    const canMinute = Array.isArray(permissions) && (permissions.includes('minute') || permissions.includes('view'));
    const canForward = Array.isArray(permissions) && (permissions.includes('forward') || permissions.includes('view'));

    return cleanPayload({
      principal_id: 'executiveId' in assignment ? assignment.executiveId : undefined,
      assistant_id: 'assistantId' in assignment ? assignment.assistantId : undefined,
      can_approve: canApprove,
      can_minute: canMinute,
      can_forward: canForward,
      active: 'permissions' in assignment ? true : undefined, // Default to active for new assignments
    });
  };

  const addAssignment = async (assignment: Omit<AssistantAssignment, 'id'>) => {
    const payload = buildDelegationPayload(assignment);
    const response = await apiFetch<Record<string, unknown>>('/correspondence/delegations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = mapApiDelegation(response);
    applyAssignmentUpdate(created);
    return created;
  };

  const updateAssignment = async (id: string, updates: Partial<AssistantAssignment>) => {
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
  };

  const deleteAssignment = async (id: string) => {
    // Soft delete by setting active to false, or hard delete
    await apiFetch(`/correspondence/delegations/${id}/`, {
      method: 'DELETE',
    });
    setAssistantAssignments((prev) => prev.filter((assign) => assign.id !== id));
  };

  const addRole = async (role: CreateRoleInput): Promise<Role> => {
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
  };

  const updateRole = async (id: string, updates: UpdateRoleInput): Promise<Role | null> => {
    try {
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
    } catch (error: unknown) {
      logError('Failed to update role', error);
      return null;
    }
  };

  const deleteRole = async (id: string): Promise<void> => {
    await apiFetch(`/organization/roles/${id}/`, {
      method: 'DELETE',
    });
    setRoles((prev) => prev.filter((role) => role.id !== id));
  };

  const resetOrganizationData = useCallback(() => {
    setDirectorates([]);
    setDivisions([]);
    setDepartments([]);
    setAssistantAssignments([]);
    setOffices([]);
    setOfficeMemberships([]);
    setUsers([]);
    setRoles([]);
    setHasSynced(false);
    updateOrganizationCache({
      directorates: [],
      divisions: [],
      departments: [],
      offices: [],
      officeMemberships: [],
      users: [],
    });
  }, []);

  return (
    <OrganizationContext.Provider
      value={{
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
      }}
    >
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
