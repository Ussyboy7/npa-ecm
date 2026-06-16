"use client";

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';

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

const INITIAL_COUNTS: SidebarCounts = {
  officeInbox: 0, myInbox: 0, outbox: 0, officeOutbox: 0,
  delegated: 0, secretaryInbox: 0, myCases: 0, officeCases: 0,
  allCases: 0, executiveApprovals: 0, myDocuments: 0,
};

export function useSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCounts>(INITIAL_COUNTS);

  useEffect(() => {
    let cancelled = false;
    apiFetch<SidebarCounts>('/correspondence/items/sidebar-counts/')
      .then((data) => { if (!cancelled) setCounts(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return counts;
}
