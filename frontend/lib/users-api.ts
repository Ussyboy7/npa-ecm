import { mapApiUserToUser } from '@/lib/organization-data';
import type { User } from '@/lib/npa-structure';
import { fetchAllCatalogPaginated } from '@/lib/pagination-utils';
import { MAX_CATALOG_PAGE_SIZE } from '@/lib/pagination-constants';
import { apiFetch } from '@/lib/api-client';
import { unwrapResults } from '@/lib/type-utils';

export const ACTIVE_USERS_PATH = '/accounts/users/?is_active=true&ordering=username';

/** Keep batch URLs bounded while avoiding one request per user. */
const USER_LOOKUP_BATCH_SIZE = 200;

/** Map raw `/accounts/users/` rows, dropping records that fail mapping. */
export function mapActiveUsers(rows: Record<string, unknown>[]): User[] {
  return rows
    .map(mapApiUserToUser)
    .filter((user): user is User => user != null);
}

/** Fetch every active user across all pages. */
export async function fetchActiveUsers(pageSize = 500): Promise<User[]> {
  const rows = await fetchAllCatalogPaginated<Record<string, unknown>>(
    ACTIVE_USERS_PATH,
    pageSize,
  );
  return mapActiveUsers(rows);
}

/** Fetch an explicit set of users in as few list requests as possible. */
export async function fetchUsersByIds(userIds: readonly string[]): Promise<User[]> {
  const ids = Array.from(new Set(userIds.filter(Boolean))).sort();
  if (ids.length === 0) return [];

  const batches: string[][] = [];
  for (let index = 0; index < ids.length; index += USER_LOOKUP_BATCH_SIZE) {
    batches.push(ids.slice(index, index + USER_LOOKUP_BATCH_SIZE));
  }

  const pages = await Promise.all(
    batches.map((batch) => {
      const params = new URLSearchParams({ ids: batch.join(',') });
      return fetchAllCatalogPaginated<Record<string, unknown>>(
        `/accounts/users/?${params.toString()}`,
        MAX_CATALOG_PAGE_SIZE,
      );
    }),
  );

  return mapActiveUsers(pages.flat());
}

/** Fetch the small active-user slice used for on-behalf-of choices. */
export async function fetchActiveUsersForGradeAndDivision(
  gradeLevel: string,
  divisionId: string,
): Promise<User[]> {
  const params = new URLSearchParams({
    is_active: 'true',
    grade_level: gradeLevel,
    division: divisionId,
    ordering: 'username',
  });
  const rows = await fetchAllCatalogPaginated<Record<string, unknown>>(
    `/accounts/users/?${params.toString()}`,
  );
  return mapActiveUsers(rows);
}

/** Resolve a single exact username without loading the organization directory. */
export async function fetchUserByUsername(username: string): Promise<User | null> {
  const search = encodeURIComponent(username.trim());
  if (!search) return null;
  const response = await apiFetch<unknown>(
    `/accounts/users/?search=${search}&is_active=true&page_size=10`,
  );
  const users = mapActiveUsers(unwrapResults<Record<string, unknown>>(response));
  return users.find((user) => user.username?.toLowerCase() === username.trim().toLowerCase()) ?? null;
}
