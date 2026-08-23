import { useState, useEffect, useRef } from 'react';
import { hasTokens, apiFetch } from '@/lib/api-client';
import { mapApiUserToUser } from '@/lib/organization-data';
import type { User } from '@/lib/npa-structure';
import { fetchAllCatalogPaginated } from '@/lib/pagination-utils';

let cachedUsers: User[] | null = null;
let fetchPromise: Promise<User[]> | null = null;

async function fetchAllUsers(): Promise<User[]> {
  if (cachedUsers) return cachedUsers;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const rows = await fetchAllCatalogPaginated<Record<string, unknown>>(
        '/accounts/users/?is_active=true&ordering=username',
        500,
      );
      const users = rows
        .map(mapApiUserToUser)
        .filter((u): u is User => u != null);
      cachedUsers = users;
      return users;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Hook that fetches all active users on-demand with shared caching.
 * Returns the user array (empty until loaded) and a loading flag.
 */
export function useOrgUsers(): { users: User[]; loading: boolean } {
  const [users, setUsers] = useState<User[]>(cachedUsers ?? []);
  const [loading, setLoading] = useState(cachedUsers === null);

  useEffect(() => {
    if (!hasTokens()) return;
    if (cachedUsers) {
      setUsers(cachedUsers);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchAllUsers().then((result) => {
      if (!cancelled) {
        setUsers(result);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return { users, loading };
}

/**
 * Fetch all users directly (for use outside React components).
 */
export { fetchAllUsers };
