"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { apiFetch, hasTokens } from '@/lib/api-client';
import { toast } from 'sonner';

export interface SidebarCounts {
  officeInbox: number;
  myInbox: number;
  outbox: number;
  delegated: number;
  secretaryInbox?: number;
}

const DEFAULT_COUNTS: SidebarCounts = {
  officeInbox: 0,
  myInbox: 0,
  outbox: 0,
  delegated: 0,
  secretaryInbox: 0,
};

// Use React state for caching instead of module-level variables
const cacheStore = new Map<string, { counts: SidebarCounts; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Singleton polling interval - only one interval should run regardless of how many components use the hook
let globalIntervalId: NodeJS.Timeout | null = null;
let globalSubscribers = new Set<(counts: SidebarCounts) => void>();
let globalFetchPromise: Promise<SidebarCounts> | null = null;
let globalAbortController: AbortController | null = null;

export function useSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCounts>(DEFAULT_COUNTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const fetchCounts = useCallback(async (force = false) => {
    if (!hasTokens()) {
      setCounts(DEFAULT_COUNTS);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache unless forced
    const cacheKey = 'sidebar-counts';
    const cached = cacheStore.get(cacheKey);
    const now = Date.now();
    
    if (!force && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      setCounts(cached.counts);
      return;
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<SidebarCounts>('/correspondence/items/sidebar-counts/', {
        signal,
      });
      
      if (signal.aborted) return;

      // Update cache
      cacheStore.set(cacheKey, { counts: response, timestamp: now });
      setCounts(response);
    } catch (err) {
      // Silently handle authentication errors - they're expected when user is not logged in
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage === 'Authentication required' || errorMessage === 'Authentication expired') {
        setCounts(DEFAULT_COUNTS);
        setError(null);
      } else {
        console.error('[useSidebarCounts] Error fetching counts:', err);
        setError(errorMessage);
        // Keep showing cached counts on error
        setCounts(cachedCounts);
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Global fetch function that only runs once, then notifies all subscribers
  const performGlobalFetch = useCallback(async (force = false) => {
    // If there's already a fetch in progress, wait for it
    if (globalFetchPromise && !force) {
      try {
        const result = await globalFetchPromise;
        // Notify all subscribers with cached result
        globalSubscribers.forEach(sub => sub(result));
        return;
      } catch {
        // If the promise failed, continue with new fetch
      }
    }

    // Start new fetch
    globalFetchPromise = (async () => {
      if (!hasTokens()) {
        const defaultCounts = DEFAULT_COUNTS;
        globalSubscribers.forEach(sub => sub(defaultCounts));
        return defaultCounts;
      }

      // Cancel previous global request
      if (globalAbortController) {
        globalAbortController.abort();
      }

      // Check cache unless forced
      const cacheKey = 'sidebar-counts';
      const cached = cacheStore.get(cacheKey);
      const now = Date.now();
      
      if (!force && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
        globalSubscribers.forEach(sub => sub(cached.counts));
        return cached.counts;
      }

      globalAbortController = new AbortController();
      const signal = globalAbortController.signal;

      try {
        const response = await apiFetch<SidebarCounts>('/correspondence/items/sidebar-counts/', {
          signal,
        });
        
        if (signal.aborted) return DEFAULT_COUNTS;

        // Update cache
        cacheStore.set(cacheKey, { counts: response, timestamp: now });
        
        // Notify all subscribers
        globalSubscribers.forEach(sub => sub(response));
        
        return response;
      } catch (err: Record<string, unknown>) {
        if (err.name === 'AbortError') return DEFAULT_COUNTS;
        
        // On error, use cached value if available
        if (cached) {
          globalSubscribers.forEach(sub => sub(cached.counts));
          return cached.counts;
        }
        
        globalSubscribers.forEach(sub => sub(DEFAULT_COUNTS));
        return DEFAULT_COUNTS;
      } finally {
        globalFetchPromise = null;
        globalAbortController = null;
      }
    })();

    await globalFetchPromise;
  }, []);

  // Subscribe to global polling - only one interval runs for all hook instances
  useEffect(() => {
    // Add this component as a subscriber
    const subscriber = (counts: SidebarCounts) => {
      setCounts(counts);
    };
    globalSubscribers.add(subscriber);
    
    // Synchronously check and set interval to prevent race conditions
    let shouldStartInterval = false;
    if (!globalIntervalId) {
      globalIntervalId = setInterval(() => {
        // Single fetch that notifies all subscribers
        void performGlobalFetch();
      }, CACHE_TTL_MS);
      shouldStartInterval = true;
    }
    
    // Use cached value or fetch if needed
    const cacheKey = 'sidebar-counts';
    const cached = cacheStore.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      setCounts(cached.counts);
    } else {
      // Only fetch if we just started the interval, or if there's no cached value
      if (shouldStartInterval || !cached) {
        void performGlobalFetch();
      }
    }

    return () => {
      // Remove this component as a subscriber
      globalSubscribers.delete(subscriber);
      
      // If no more subscribers, clear the global interval
      if (globalSubscribers.size === 0 && globalIntervalId) {
        clearInterval(globalIntervalId);
        globalIntervalId = null;
        if (globalAbortController) {
          globalAbortController.abort();
          globalAbortController = null;
        }
      }
      
      // Cleanup: abort any pending requests for this component
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Expose a refresh function
  const refresh = useCallback(() => {
    retryCountRef.current = 0; // Reset retry count
    fetchCounts(true);
  }, [fetchCounts]);

  return { counts, loading, error, refresh };
}

