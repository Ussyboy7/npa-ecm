import { isRecord } from '@/lib/type-utils';
import type { User } from '@/lib/npa-structure';

const MANAGEMENT_GRADES = new Set(['MDCS', 'EDCS', 'MSS1', 'MSS2', 'MSS3']);
const EXECUTIVE_OFFICE_TYPES = new Set(['md', 'ed', 'gm', 'agm']);

export type WorkspaceUserContext = {
  gradeLevel?: string;
  systemRole?: string;
  isSuperuser?: boolean;
  officeTypes?: string[];
};

export function extractWorkspaceContextFromApiUser(user: unknown): WorkspaceUserContext {
  if (!isRecord(user)) return {};
  const systemRoleObj = isRecord(user.system_role) ? user.system_role : undefined;
  const roleName =
    (typeof user.system_role_name === 'string' ? user.system_role_name : undefined) ??
    (systemRoleObj && typeof systemRoleObj.name === 'string' ? systemRoleObj.name : undefined) ??
    '';
  return {
    gradeLevel: typeof user.grade_level === 'string' ? user.grade_level : String(user.grade_level ?? ''),
    systemRole: roleName,
    isSuperuser: typeof user.is_superuser === 'boolean' ? user.is_superuser : false,
  };
}

export function shouldUseWorkspaceHome(ctx: WorkspaceUserContext): boolean {
  if (ctx.isSuperuser) return true;
  const role = (ctx.systemRole ?? '').toLowerCase();
  if (role === 'secretary') return true;
  if (ctx.gradeLevel && MANAGEMENT_GRADES.has(ctx.gradeLevel)) return true;
  if (ctx.officeTypes?.some((type) => EXECUTIVE_OFFICE_TYPES.has(type))) return true;
  return false;
}

export function getDefaultHomePath(ctx: WorkspaceUserContext): '/dashboard' | '/inbox' {
  return shouldUseWorkspaceHome(ctx) ? '/dashboard' : '/inbox';
}

export function shouldUseWorkspaceHomeForUser(
  user: User | null,
  officeTypes: string[] = [],
): boolean {
  if (!user) return false;
  return shouldUseWorkspaceHome({
    gradeLevel: user.gradeLevel,
    systemRole: user.systemRole,
    isSuperuser: user.isSuperuser,
    officeTypes,
  });
}
