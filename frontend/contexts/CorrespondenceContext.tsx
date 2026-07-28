import { ERROR_UNKNOWN } from '@/lib/constants';
import { logError, logInfo } from '@/lib/client-logger';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Correspondence, Minute } from '@/lib/npa-structure';
import type { ApiCorrespondence, ApiMinute } from '@/lib/api/correspondence';
import type { Delegation } from '@/lib/api/delegations';
import { apiFetch, hasTokens } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { bumpSidebarCounts } from '@/hooks/use-sidebar-counts';
import { DEFAULT_LIST_PAGE_SIZE } from '@/lib/pagination-constants';
import { fetchAllPaginated } from '@/lib/pagination-utils';
import { isRecord, asString, unwrapResults } from '@/lib/type-utils';
import { mapApiCorrespondence, mapApiMinute, mapApiDelegation } from '@/lib/api/correspondence-mappers';

interface CorrespondenceContextType {
  correspondence: Correspondence[];
  minutes: Minute[];
  delegations: Delegation[];
  dataVersion: number;
  getCorrespondenceById: (id: string) => Correspondence | undefined;
  getMinutesByCorrespondenceId: (id: string) => Minute[];
  mergeMinutes: (incoming: Minute[]) => void;
  addMinute: (minute: Minute) => Promise<void>;
  updateCorrespondence: (id: string, updates: Partial<Correspondence>) => Promise<void>;
  addCorrespondence: (correspondence: Correspondence) => Promise<Correspondence>;
  refreshData: () => void;
  syncFromApi: () => Promise<void>;
}

const CorrespondenceContext = createContext<CorrespondenceContextType | undefined>(undefined);

const buildCorrespondencePatchPayload = (updates: Partial<Correspondence>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.direction !== undefined) payload.direction = updates.direction;
  if (updates.documentType !== undefined) payload.document_type = updates.documentType;
  if (updates.senderReference !== undefined) payload.sender_reference = updates.senderReference;
  if (updates.letterDate !== undefined) payload.letter_date = updates.letterDate || null;
  if (updates.dispatchDate !== undefined) payload.dispatch_date = updates.dispatchDate || null;
  if (updates.recipientName !== undefined) payload.recipient_name = updates.recipientName;
  if (updates.remarks !== undefined) payload.remarks = updates.remarks;
  if (updates.currentApproverId !== undefined) payload.current_approver_id = updates.currentApproverId || null;
  if (updates.divisionId !== undefined) payload.division = updates.divisionId || null;
  if (updates.departmentId !== undefined) payload.department = updates.departmentId || null;
  if (updates.owningOfficeId !== undefined) payload.owning_office = updates.owningOfficeId || null;
  if (updates.currentOfficeId !== undefined) payload.current_office = updates.currentOfficeId || null;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.referenceNumber !== undefined) payload.reference_number = updates.referenceNumber;
  if (updates.linkedDocumentIds !== undefined) payload.linked_document_ids = updates.linkedDocumentIds;
  if (updates.archiveLevel !== undefined) payload.archive_level = updates.archiveLevel;
  if (updates.subject !== undefined) payload.subject = updates.subject;
  return payload;
};

const buildCorrespondenceCreatePayload = (correspondence: Correspondence): Record<string, unknown> => {
  return {
    reference_number: correspondence.referenceNumber,
    subject: correspondence.subject,
    source: correspondence.source,
    received_date: correspondence.receivedDate,
    sender_name: correspondence.senderName,
    sender_organization: correspondence.senderOrganization,
    sender_reference: correspondence.senderReference ?? '',
    letter_date: correspondence.letterDate ?? null,
    dispatch_date: correspondence.dispatchDate ?? null,
    recipient_name: correspondence.recipientName ?? '',
    remarks: correspondence.remarks ?? '',
    status: correspondence.status,
    priority: correspondence.priority,
    document_type: correspondence.documentType ?? 'letter',
    direction: correspondence.direction,
    division: correspondence.divisionId ?? null,
    department: correspondence.departmentId ?? null,
    owning_office: correspondence.owningOfficeId ?? null,
    current_office: correspondence.currentOfficeId ?? correspondence.owningOfficeId ?? null,
    current_approver_id: correspondence.currentApproverId ?? null,
    archive_level: correspondence.archiveLevel ?? null,
    linked_document_ids: correspondence.linkedDocumentIds ?? [],
  };
};

const buildMinuteCreatePayload = (minute: Minute): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    correspondence: minute.correspondenceId,
    user_id: minute.userId,
    grade_level: minute.gradeLevel,
    action_type: minute.actionType,
    minute_text: minute.minuteText,
    direction: minute.direction,
    step_number: minute.stepNumber,
    acted_by_secretary: minute.actedBySecretary ?? false,
    acted_by_assistant: minute.actedByAssistant ?? false,
    mentions: minute.mentions ?? [],
    signature_payload: minute.signature ?? undefined,
  };

  if (minute.assistantType) {
    payload.assistant_type = minute.assistantType;
  }
  if (minute.toOfficeId) {
    payload.to_office = minute.toOfficeId;
  }

  return payload;
};

const normalizeMinutePayload = (payload: Record<string, unknown>) => {
  if (!payload.acted_by_assistant) {
    delete payload.assistant_type;
  }
  return payload;
};

export const CorrespondenceProvider = ({ children }: { children: ReactNode }) => {
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const {currentUser: _currentUser, hydrated: _hydrated } = useCurrentUser();

  const syncFromApi = useCallback(async () => {
    // Only requirement: authenticated (has token)
    // Don't wait for useCurrentUser to hydrate - data fetching is independent
    if (!hasTokens()) return;

    try {
      // Bootstrap: first page of correspondence for context cache; pages load more as needed.
      const [correspondenceRaw, delegationsRaw] = await Promise.all([
        apiFetch<{ results: ApiCorrespondence[] } | ApiCorrespondence[]>(`/correspondence/items/?page_size=${DEFAULT_LIST_PAGE_SIZE}&page=1`),
        fetchAllPaginated<Record<string, unknown>>('/correspondence/delegations/'),
      ]);

      const correspondenceList = unwrapResults(correspondenceRaw).filter(isRecord).map(mapApiCorrespondence);
      const delegationsList = delegationsRaw
        .filter(isRecord)
        .map(mapApiDelegation)
        .filter((delegation) => delegation.correspondenceId);

      setCorrespondence(correspondenceList);
      setDelegations(delegationsList);
      setDataVersion(v => v + 1);
    } catch (error: unknown) {
      if (error instanceof Error && (error instanceof Error ? error.message : ERROR_UNKNOWN).toLowerCase().includes('auth')) {
        logInfo('Correspondence data will sync after authentication is available.');
      } else {
        logError('Failed to load correspondence from API', error);
      }
    }
  }, []);

  // Track if we've synced already to prevent duplicate syncs
  const syncedRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (!hasTokens()) return;
    
    // Only sync once when tokens become available
    // Don't wait for useCurrentUser to hydrate - we can fetch data immediately after login
    if (syncedRef.current) return;
    
    let ignore = false;
    const run = async () => {
      if (ignore) return;
      syncedRef.current = true;
      await syncFromApi();
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [syncFromApi]);

  const refreshData = useCallback(() => {
    void syncFromApi();
  }, [syncFromApi]);

  const getCorrespondenceById = useCallback((id: string) => {
    return correspondence.find(c => c.id === id);
  }, [correspondence]);

  const getMinutesByCorrespondenceId = useCallback((id: string) => {
    return minutes.filter(m => m.correspondenceId === id);
  }, [minutes]);

  const mergeMinutes = useCallback((incoming: Minute[]) => {
    if (incoming.length === 0) return;
    setMinutes((prev) => {
      const byId = new Map(prev.map((minute) => [minute.id, minute]));
      incoming.forEach((minute) => byId.set(minute.id, minute));
      return Array.from(byId.values());
    });
  }, []);

  const addMinute = useCallback(async (minute: Minute) => {
    try {
      const payload = normalizeMinutePayload(buildMinuteCreatePayload(minute));
      const response = await apiFetch<ApiMinute>('/correspondence/minutes/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const created = mapApiMinute(response);
      setMinutes((prev) => {
        const updated = [...prev, created];
        return updated;
      });
      bumpSidebarCounts();
    } catch (error: unknown) {
      logError('Failed to add minute via API', error);
      throw error;
    }
  }, []);

  const updateCorrespondence = useCallback(async (id: string, updates: Partial<Correspondence>) => {
    const payload = buildCorrespondencePatchPayload(updates);
    if (Object.keys(payload).length === 0) {
      return;
    }

    try {
      const response = await apiFetch<ApiCorrespondence>(`/correspondence/items/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const updated = mapApiCorrespondence(response);
      setCorrespondence((prev) => {
        const updatedList = prev.map((item) => (item.id as string === updated.id ? updated : item));
        return updatedList;
      });
      bumpSidebarCounts();
    } catch (error: unknown) {
      logError('Failed to update correspondence via API', error);
      throw error;
    }
  }, []);

  const addCorrespondence = useCallback(async (newCorr: Correspondence) => {
    try {
      const response = await apiFetch<ApiCorrespondence>('/correspondence/items/', {
        method: 'POST',
        body: JSON.stringify(buildCorrespondenceCreatePayload(newCorr)),
      });

      const created = mapApiCorrespondence(response);
      setCorrespondence((prev) => {
        const updatedList = [created, ...prev];
        return updatedList;
      });
      bumpSidebarCounts();
      return created;
    } catch (error: unknown) {
      logError('Failed to create correspondence via API', error);
      throw error;
    }
  }, []);

  const contextValue = React.useMemo(() => ({
    correspondence,
    minutes,
    delegations,
    dataVersion,
    getCorrespondenceById,
    getMinutesByCorrespondenceId,
    mergeMinutes,
    addMinute,
    updateCorrespondence,
    addCorrespondence,
    refreshData,
    syncFromApi,
  }), [
    correspondence,
    minutes,
    delegations,
    dataVersion,
    getCorrespondenceById,
    getMinutesByCorrespondenceId,
    mergeMinutes,
    addMinute,
    updateCorrespondence,
    addCorrespondence,
    refreshData,
    syncFromApi,
  ]);

  return (
    <CorrespondenceContext.Provider
      value={contextValue}
    >
      {children}
    </CorrespondenceContext.Provider>
  );
};

export const useCorrespondence = () => {
  const context = useContext(CorrespondenceContext);
  if (!context) {
    throw new Error('useCorrespondence must be used within CorrespondenceProvider');
  }
  return context;
};

// Export mapping functions for use in other components

export { mapApiCorrespondence, mapApiMinute, mapApiDelegation } from '@/lib/api/correspondence-mappers';
