"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import { getDocumentsSharedByUser } from '@/lib/dms-logs';

export interface SidebarCounts {
  officeInbox: number;
  unreadInboxCount: number;
  myInbox: number;
  myWork: number;
  mySent: number;
  officeSent: number;
  delegated: number;
  secretaryInbox: number;
  myCases: number;
  officeCases: number;
  allCases: number;
  executiveApprovals: number;
  myDocuments: number;
  drafts: number;
}

const INITIAL_COUNTS: SidebarCounts = {
  officeInbox: 0, unreadInboxCount: 0, myInbox: 0, myWork: 0, mySent: 0, officeSent: 0,
  delegated: 0, secretaryInbox: 0, myCases: 0, officeCases: 0,
  allCases: 0, executiveApprovals: 0, myDocuments: 0, drafts: 0,
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
  unreadInboxCount: Number(raw.unreadInboxCount ?? 0),
  myInbox: Number(raw.myInbox ?? 0),
  myWork: Number(raw.myWork ?? 0),
  mySent: Number(raw.mySent ?? 0),
  officeSent: Number(raw.officeSent ?? 0),
  delegated: Number(raw.delegated ?? 0),
  secretaryInbox: Number(raw.secretaryInbox ?? 0),
  myCases: Number(raw.myCases ?? 0),
  officeCases: Number(raw.officeCases ?? 0),
  allCases: Number(raw.allCases ?? 0),
  executiveApprovals: Number(raw.executiveApprovals ?? 0),
  myDocuments: Number(raw.myDocuments ?? 0),
  drafts: Number(raw.drafts ?? 0),
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

export const invalidateSidebarCounts = (): void => {
  cachedCounts = null;
  cachedAt = 0;
  fetchPromise = null;
  notifyListeners();
};

/** Invalidate cache and refetch counts (deduped). Call after correspondence actions. */
export const bumpSidebarCounts = (userId?: string): void => {
  invalidateSidebarCounts();
  void fetchSidebarCounts(undefined, true, userId)
    .then(() => notifyListeners())
    .catch(() => {});
};

const fetchSidebarCounts = async (signal?: AbortSignal, force = false, userId?: string): Promise<SidebarCounts> => {
  const now = Date.now();
  if (!force && cachedCounts && now - cachedAt < SIDEBAR_COUNTS_TTL_MS) {
    return cachedCounts;
  }
  if (!force && fetchPromise) {
    return fetchPromise;
  }

  const fetchFromApi = async (): Promise<SidebarCounts> => {
    const data = await apiFetch<SidebarCounts>('/correspondence/items/sidebar-counts/', { signal });
    const counts = normalizeCounts(data);
    if (userId) {
      try {
        const { count: sharedCount } = await getDocumentsSharedByUser(userId, { pageSize: 1, signal });
        counts.mySent += sharedCount;
      } catch {
        // Shared documents count is optional
      }
    }
    return counts;
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

export function useSidebarCounts(userId?: string) {
  const [counts, setCounts] = useState<SidebarCounts>(cachedCounts ?? INITIAL_COUNTS);

  const refreshCounts = useCallback(() => {
    if (cachedCounts && Date.now() - cachedAt < SIDEBAR_COUNTS_TTL_MS) {
      setCounts(cachedCounts);
      return;
    }
    void fetchSidebarCounts(undefined, false, userId)
      .then((data) => setCounts(data))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    listeners.add(refreshCounts);

    const controller = new AbortController();
    void fetchSidebarCounts(controller.signal, !!userId, userId)
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
  }, [refreshCounts, userId]);

  return counts;
}
