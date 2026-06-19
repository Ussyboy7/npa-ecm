import type { Directorate, Division, Department, Office, OfficeMembership, AssistantAssignment, Role, CachedData } from './organization-types';
import type { User } from './npa-structure';
import { isRecord, asString } from '@/lib/type-utils';

// Cache configuration
const CACHE_KEY = 'org_data_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const USERS_CACHE_DURATION = 60 * 60 * 1000;

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
  let roleName = asString(user.system_role_name, '');

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if ((!roleName || uuidPattern.test(roleName)) && isRecord(user.system_role)) {
    roleName = asString(user.system_role.name, '');
  }

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
    systemRole: roleName,
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

export {
  CACHE_KEY,
  CACHE_DURATION,
  USERS_CACHE_DURATION,
  buildCacheKey,
  readCachedData,
  writeCachedData,
  isCacheFresh,
  asStringOptional,
  asBoolean,
  normalizeId,
  mapApiUserToUser,
  mapApiDirectorate,
  mapApiDivision,
  mapApiDepartment,
  mapApiDelegation,
  mapApiRole,
  mapApiOffice,
  mapApiOfficeMembership,
  cleanPayload,
  sortByName,
  upsertById,
  isCanonicalUser,
  userDetailScore,
  dedupeUsers,
};
