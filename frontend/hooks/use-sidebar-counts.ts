"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, hasTokens } from '@/lib/api-client';

export interface SidebarCounts {
  officeInbox: number;
  myInbox: number;
  outbox: number;
}

const DEFAULT_COUNTS: SidebarCounts = {
  officeInbox: 0,
  myInbox: 0,
  outbox: 0,
};

// Cache the counts to avoid flashing on navigation
let cachedCounts: SidebarCounts = DEFAULT_COUNTS;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

export function useSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCounts>(cachedCounts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async (force = false) => {
    if (!hasTokens()) {
      setCounts(DEFAULT_COUNTS);
      return;
    }

    // Check cache unless forced
    const now = Date.now();
    if (!force && lastFetchTime && (now - lastFetchTime) < CACHE_TTL_MS) {
      setCounts(cachedCounts);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<SidebarCounts>('/correspondence/items/sidebar-counts/');
      cachedCounts = response;
      lastFetchTime = now;
      setCounts(response);
    } catch (err) {
      console.error('[useSidebarCounts] Error fetching counts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch counts');
      // Keep showing cached counts on error
      setCounts(cachedCounts);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and set up polling
  useEffect(() => {
    fetchCounts();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchCounts();
    }, CACHE_TTL_MS);

    return () => clearInterval(interval);
  }, [fetchCounts]);

  // Expose a refresh function
  const refresh = useCallback(() => {
    fetchCounts(true);
  }, [fetchCounts]);

  return { counts, loading, error, refresh };
}

