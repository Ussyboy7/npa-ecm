import { useState, useEffect, useSyncExternalStore } from 'react';
import { hasTokens } from '@/lib/api-client';
import type { User } from '@/lib/npa-structure';
import { fetchActiveUsers } from '@/lib/users-api';
import { registerIdentityCacheClearer } from '@/lib/identity-cache';
import { getCurrentUserSnapshot, subscribeToStore } from '@/hooks/use-current-user';

type UserCacheEntry = { userId: string; users: User[] };
type UserFetch = { userId: string; promise: Promise<User[]> };

let cachedUsers: UserCacheEntry | null = null;
let fetchPromise: UserFetch | null = null;

async function fetchAllUsers(userId: string): Promise<User[]> {
  if (!userId) return [];
  if (cachedUsers?.userId === userId) return cachedUsers.users;
  if (fetchPromise?.userId === userId) return fetchPromise.promise;

  let entry: UserFetch | null = null;
  const promise = (async () => {
    try {
      const users = await fetchActiveUsers(500);
      // A clear or identity switch may have happened while this request was in
      // flight; never let the old directory repopulate the shared cache.
      if (fetchPromise === entry) {
        cachedUsers = { userId, users };
      }
      return users;
    } finally {
      if (fetchPromise === entry) fetchPromise = null;
    }
  })();

  entry = { userId, promise };
  fetchPromise = entry;
  return promise;
}

/** Drop the shared user directory so it cannot survive an identity switch. */
export function clearOrgUsersCache(): void {
  cachedUsers = null;
  fetchPromise = null;
}

registerIdentityCacheClearer(clearOrgUsersCache);

/**
 * Hook that fetches all active users on-demand with shared caching.
 * Returns the user array (empty until loaded) and a loading flag.
 */
export function useOrgUsers(options: { enabled?: boolean } = {}): { users: User[]; loading: boolean } {
  const enabled = options.enabled ?? true;
  const currentUser = useSyncExternalStore(
    subscribeToStore,
    getCurrentUserSnapshot,
    getCurrentUserSnapshot,
  );
  const userId = currentUser?.id ?? null;
  const [users, setUsers] = useState<User[]>(
    cachedUsers?.userId === userId ? cachedUsers.users : [],
  );
  const [loading, setLoading] = useState(
    Boolean(enabled && userId && cachedUsers?.userId !== userId),
  );

  useEffect(() => {
    if (!enabled || !userId || !hasTokens()) {
      setUsers([]);
      setLoading(false);
      return;
    }
    if (cachedUsers?.userId === userId) {
      setUsers(cachedUsers.users);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setUsers([]);
    setLoading(true);
    fetchAllUsers(userId)
      .then((result) => {
        if (!cancelled) {
          setUsers(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUsers([]);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [userId, enabled]);

  return { users, loading };
}

/**
 * Fetch all users directly (for use outside React components).
 */
export { fetchAllUsers };
