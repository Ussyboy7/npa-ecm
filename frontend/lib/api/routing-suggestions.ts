import { apiFetch } from '@/lib/api-client';
import type { User } from '@/lib/npa-structure';
import { mapActiveUsers } from '@/lib/users-api';

export type RoutingDirection = 'upward' | 'downward' | 'lateral';

interface RoutingSuggestionsResponse {
  suggestions?: Record<string, unknown>[];
}

/** Fetch a server-computed hierarchy suggestion list for one correspondence. */
export async function fetchRoutingSuggestions(
  correspondenceId: string,
  direction: RoutingDirection,
  signal?: AbortSignal,
): Promise<User[]> {
  const params = new URLSearchParams({ routing_direction: direction });
  const response = await apiFetch<RoutingSuggestionsResponse>(
    `/correspondence/items/${encodeURIComponent(correspondenceId)}/routing-suggestions/?${params.toString()}`,
    { signal },
  );
  return mapActiveUsers(
    Array.isArray(response.suggestions) ? response.suggestions : [],
  );
}
