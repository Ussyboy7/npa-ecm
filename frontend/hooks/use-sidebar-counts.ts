"use client";

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { logError } from '@/lib/client-logger';

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

        // Fetch inbox counts
        const inboxResponse = await apiFetch<{ office: number; my: number; delegated: number; secretary: number }>('/correspondence/inbox/counts/');
        setCounts(prev => ({
          ...prev,
          officeInbox: inboxResponse.office || 0,
          myInbox: inboxResponse.my || 0,
          delegated: inboxResponse.delegated || 0,
          secretaryInbox: inboxResponse.secretary || 0,
        }));

        // Fetch outbox counts
        const outboxResponse = await apiFetch<{ my: number; office: number }>('/correspondence/outbox/counts/');
        setCounts(prev => ({
          ...prev,
          outbox: outboxResponse.my || 0,
          officeOutbox: outboxResponse.office || 0,
        }));

        // Fetch case counts
        const casesResponse = await apiFetch<{ my: number; office: number; all: number }>('/correspondence/cases/counts/');
        setCounts(prev => ({
          ...prev,
          myCases: casesResponse.my || 0,
          officeCases: casesResponse.office || 0,
          allCases: casesResponse.all || 0,
        }));

        // Fetch executive approvals count
        const approvalsResponse = await apiFetch<{ count: number }>('/approvals/executive/count/');
        setCounts(prev => ({
          ...prev,
          executiveApprovals: approvalsResponse.count || 0,
        }));

        // Fetch document counts
        const documentsResponse = await apiFetch<{ my: number }>('/dms/documents/counts/');
        setCounts(prev => ({
          ...prev,
          myDocuments: documentsResponse.my || 0,
        }));

      } catch (error) {
        logError('Failed to fetch sidebar counts', error);
        // Keep default counts (0) on error
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return { counts, loading };
}