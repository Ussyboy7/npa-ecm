"use client";

import { useEffect, useState } from 'react';
import { getSearchScope, type SearchScope } from '@/lib/api/search';
import { logWarn } from '@/lib/client-logger';

/** Loads the boundary the server applies to search, for the scope note. */
export function useSearchScope(): SearchScope | null {
  const [scope, setScope] = useState<SearchScope | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getSearchScope(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setScope(value);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        // The note is guidance only; search still works without it.
        logWarn('Failed to load search scope', error);
      });

    return () => controller.abort();
  }, []);

  return scope;
}
