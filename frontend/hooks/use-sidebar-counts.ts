"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';

export interface SidebarCounts {
  officeInbox: number;
  myInbox: number;
  myWork: number;
  outbox: number;
  officeOutbox: number;
  officeDispatched: number;
  delegated: number;
  secretaryInbox: number;
  myCases: number;
  officeCases: number;
  allCases: number;
  executiveApprovals: number;
  myDocuments: number;
}

const INITIAL_COUNTS: SidebarCounts = {
  officeInbox: 0, myInbox: 0, myWork: 0, outbox: 0, officeOutbox: 0, officeDispatched: 0,
  delegated: 0, secretaryInbox: 0, myCases: 0, officeCases: 0,
  allCases: 0, executiveApprovals: 0, myDocuments: 0,
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
  myWork: Number(raw.myWork ?? 0),
  outbox: Number(raw.outbox ?? 0),
  officeOutbox: Number(raw.officeOutbox ?? 0),
  officeDispatched: Number(raw.officeDispatched ?? 0),
  delegated: Number(raw.delegated ?? 0),
  secretaryInbox: Number(raw.secretaryInbox ?? 0),
  myCases: Number(raw.myCases ?? 0),
  officeCases: Number(raw.officeCases ?? 0),
  allCases: Number(raw.allCases ?? 0),
  executiveApprovals: Number(raw.executiveApprovals ?? 0),
  myDocuments: Number(raw.myDocuments ?? 0),
});

export const seedSidebarCounts = (counts: Partial<SidebarCounts> | Record<string, number>): void => {
  cachedCounts = normalizeCounts(counts);
  cachedAt = Date.now();
  notifyListeners();
};

export const invalidateSidebarCounts = (): void => {
  cachedCounts = null;
  cachedAt = 0;
  fetchPromise = null;
  notifyListeners();
};

/** Invalidate cache and refetch counts (deduped). Call after correspondence actions. */
export const bumpSidebarCounts = (): void => {
  invalidateSidebarCounts();
  void fetchSidebarCounts(undefined, true)
    .then(() => notifyListeners())
    .catch(() => {});
};

const fetchSidebarCounts = async (signal?: AbortSignal, force = false): Promise<SidebarCounts> => {
  const now = Date.now();
  if (!force && cachedCounts && now - cachedAt < SIDEBAR_COUNTS_TTL_MS) {
    return cachedCounts;
  }
  if (!force && fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = apiFetch<SidebarCounts>('/correspondence/items/sidebar-counts/', { signal })
    .then((data) => {
      cachedCounts = normalizeCounts(data);
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
    void fetchSidebarCounts(controller.signal)
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
