import type { User } from '@/lib/npa-structure';

export function getDefaultHomePath(): '/dashboard' | '/inbox' {
  return '/dashboard';
}

export function shouldUseWorkspaceHomeForUser(
  _user: User | null,
  _officeTypes: string[] = [],
): boolean {
  return false;
}
