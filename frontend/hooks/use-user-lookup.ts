import { useEffect, useMemo, useState } from 'react';
import { logWarn } from '@/lib/client-logger';
import type { User } from '@/lib/npa-structure';
import { fetchUsersByIds } from '@/lib/users-api';

/**
 * Resolve an explicit set of users without loading the whole directory.
 * Intended for payloads that carry user IDs but not display names.
 */
export function useUserLookup(userIds: readonly string[]): Map<string, User> {
  const idKey = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).sort().join(','),
    [userIds],
  );
  const [users, setUsers] = useState<Map<string, User>>(() => new Map());

  useEffect(() => {
    if (!idKey) {
      setUsers(new Map());
      return;
    }

    let cancelled = false;
    const ids = idKey.split(',');

    void fetchUsersByIds(ids)
      .then((results) => {
        if (cancelled) return;
        setUsers(new Map(results.map((user) => [user.id, user])));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        logWarn('Failed to resolve user details', { userIds: ids, error });
        setUsers(new Map());
      });

    return () => {
      cancelled = true;
    };
  }, [idKey]);

  return users;
}
