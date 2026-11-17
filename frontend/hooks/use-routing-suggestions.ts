'use client';

import { useEffect, useState } from 'react';
import { logError } from '@/lib/client-logger';
import type { User } from '@/lib/npa-structure';
import {
  fetchRoutingSuggestions,
  type RoutingDirection,
} from '@/lib/api/routing-suggestions';

interface UseRoutingSuggestionsOptions {
  enabled: boolean;
  correspondenceId: string;
  direction: RoutingDirection;
}

export function useRoutingSuggestions({
  enabled,
  correspondenceId,
  direction,
}: UseRoutingSuggestionsOptions): User[] {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      return;
    }

    const controller = new AbortController();
    fetchRoutingSuggestions(correspondenceId, direction, controller.signal)
      .then((suggestions) => {
        if (!controller.signal.aborted) setUsers(suggestions);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        logError('Failed to load routing suggestions', error);
        setUsers([]);
      });

    return () => controller.abort();
  }, [enabled, correspondenceId, direction]);

  return users;
}
