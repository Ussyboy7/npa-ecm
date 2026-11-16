"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';

export interface SidebarCounts {
  officeInbox: number;
  myInbox: number;
  delegated: number;
  pendingApprovals: number;
  pendingSignatures: number;
}

const INITIAL_COUNTS: SidebarCounts = {
  officeInbox: 0, myInbox: 0, delegated: 0,
  pendingSignatures: 0,
  pendingApprovals: 0,
};

const SIDEBAR_COUNTS_TTL_MS = 60 * 1000;
let cachedCounts: SidebarCounts | null = null;
let cachedAt = 0;
let fetchPromise: Promise<SidebarCounts> | null = null;
const listeners = new Set<() => void>();

const notifyListeners = (): void => {
  listeners.forEach((listener) => listener());
};

const normalizeCounts = (raw: Partial<SidebarCounts> | Record<string, number>): SidebarCounts => ({
  officeInbox: Number(raw.officeInbox ?? 0),
  myInbox: Number(raw.myInbox ?? 0),
  delegated: Number(raw.delegated ?? 0),
  pendingApprovals: Number(raw.pendingApprovals ?? 0),
  pendingSignatures: Number(raw.pendingSignatures ?? 0),
});

export const seedSidebarCounts = (
  counts: Partial<SidebarCounts> | Record<string, number>,
  options?: { notify?: boolean },
): void => {
  cachedCounts = normalizeCounts(counts);
  cachedAt = Date.now();
  if (options?.notify !== false) {
    notifyListeners();
  }
};

export const invalidateSidebarCounts = (options?: { notify?: boolean }): void => {
  cachedCounts = null;
  cachedAt = 0;
  fetchPromise = null;
  if (options?.notify !== false) {
    notifyListeners();
  }
};

/** Invalidate cache and refetch counts (deduped). Call after correspondence actions. */
export const bumpSidebarCounts = (): void => {
  invalidateSidebarCounts({ notify: false });
  void fetchSidebarCounts(undefined, true, true)
    .then(() => notifyListeners())
    .catch(() => {});
};

const fetchSidebarCounts = async (
  signal?: AbortSignal,
  force = false,
  refreshServerCache = false,
): Promise<SidebarCounts> => {
  const now = Date.now();
  if (!force && cachedCounts && now - cachedAt < SIDEBAR_COUNTS_TTL_MS) {
    return cachedCounts;
  }
  if (fetchPromise) {
    return fetchPromise;
  }

  const fetchFromApi = async (): Promise<SidebarCounts> => {
    const endpoint = refreshServerCache
      ? '/correspondence/items/sidebar-counts/?refresh=1'
      : '/correspondence/items/sidebar-counts/';
    const data = await apiFetch<SidebarCounts>(endpoint, { signal });
    return normalizeCounts(data);
  };

  fetchPromise = fetchFromApi()
    .then((counts) => {
      cachedCounts = counts;
      cachedAt = Date.now();
      return cachedCounts;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
};

export function useSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCounts>(cachedCounts ?? INITIAL_COUNTS);

  const refreshCounts = useCallback(() => {
    if (cachedCounts && Date.now() - cachedAt < SIDEBAR_COUNTS_TTL_MS) {
      setCounts(cachedCounts);
      return;
    }
    void fetchSidebarCounts(undefined, false)
      .then((data) => setCounts(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    listeners.add(refreshCounts);

    const controller = new AbortController();
    void fetchSidebarCounts(controller.signal, true)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCounts(data);
        }
      })
      .catch(() => {});

    return () => {
      listeners.delete(refreshCounts);
      controller.abort();
    };
  }, [refreshCounts]);

  return counts;
}
