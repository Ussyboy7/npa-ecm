"use client";

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { logError, logInfo } from '@/lib/client-logger';

export interface SidebarCounts {
  officeInbox: number;
  myInbox: number;
  outbox: number;
  officeOutbox: number;
  delegated: number;
  secretaryInbox: number;
  myCases: number;
  officeCases: number;
  allCases: number;
  executiveApprovals: number;
  myDocuments: number;
}

export function useSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCounts>({
    officeInbox: 0,
    myInbox: 0,
    outbox: 0,
    officeOutbox: 0,
    delegated: 0,
    secretaryInbox: 0,
    myCases: 0,
    officeCases: 0,
    allCases: 0,
    executiveApprovals: 0,
    myDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);
        const data = await apiFetch<SidebarCounts>('/correspondence/items/sidebar-counts/');
        setCounts(data);
      } catch (error) {
        if ((error as any)?.status === 401) {
          logInfo('Sidebar counts will sync after authentication.');
        } else {
          logError('Failed to fetch sidebar counts', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return { counts, loading };
}
