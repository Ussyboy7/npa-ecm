"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchUsers } from "@/lib/admin-api";
import { useDebounce } from "@/hooks/use-debounce";
import type { User } from "@/lib/npa-structure";
import { mapActiveUsers } from "@/lib/users-api";
import { logError } from "@/lib/client-logger";

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_SEARCH_DELAY_MS = 250;

interface UsePaginatedUserSearchOptions {
  enabled?: boolean;
  pageSize?: number;
  searchDelayMs?: number;
  excludeUserIds?: string[];
}

interface PaginatedUserSearch {
  query: string;
  setQuery: (query: string) => void;
  users: User[];
  userById: Map<string, User>;
  totalCount: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * Server-side, paginated active-user search for pickers.
 * Results are appended by "load more"; selected users stay available in
 * userById even after the query changes.
 */
export function usePaginatedUserSearch({
  enabled = true,
  pageSize = DEFAULT_PAGE_SIZE,
  searchDelayMs = DEFAULT_SEARCH_DELAY_MS,
  excludeUserIds = [],
}: UsePaginatedUserSearchOptions = {}): PaginatedUserSearch {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, searchDelayMs);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [userById, setUserById] = useState<Map<string, User>>(new Map());
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const excludeKey = excludeUserIds.join(",");
  const excludeSet = useMemo(
    () => new Set(excludeKey ? excludeKey.split(",") : []),
    [excludeKey],
  );
  const requestIdRef = useRef(0);
  const debouncedQueryRef = useRef(debouncedQuery);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setQuery("");
    setPage(1);
    setUsers([]);
    setUserById(new Map());
    setTotalCount(0);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      reset();
    }
  }, [enabled, reset]);

  useEffect(() => {
    if (!enabled) return;

    if (debouncedQueryRef.current !== debouncedQuery) {
      debouncedQueryRef.current = debouncedQuery;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchUsers({
      search: debouncedQuery.trim() || undefined,
      page,
      page_size: pageSize,
      is_active: true,
      ordering: "first_name,last_name",
      signal: controller.signal,
    })
      .then((response) => {
        if (requestId !== requestIdRef.current) return;
        const results = mapActiveUsers(
          response.results as unknown as Record<string, unknown>[],
        ).filter((user) => !excludeSet.has(user.id));

        setUsers((current) => {
          if (page === 1) return results;
          const seen = new Set(current.map((user) => user.id));
          return [...current, ...results.filter((user) => !seen.has(user.id))];
        });
        setUserById((current) => {
          const next = new Map(current);
          results.forEach((user) => next.set(user.id, user));
          return next;
        });
        setTotalCount(response.count ?? 0);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        logError("Failed to search users", fetchError);
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load users.");
        if (page === 1) {
          setUsers([]);
          setTotalCount(0);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [enabled, debouncedQuery, page, pageSize, excludeSet]);

  const loadMore = useCallback(() => {
    if (loading || page * pageSize >= totalCount) return;
    setPage((current) => current + 1);
  }, [loading, page, pageSize, totalCount]);

  return {
    query,
    setQuery,
    users,
    userById,
    totalCount,
    loading,
    loadingMore: loading && page > 1,
    error,
    hasMore: page * pageSize < totalCount,
    loadMore,
  };
}
