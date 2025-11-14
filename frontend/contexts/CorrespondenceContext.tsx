import { logError, logInfo } from '@/lib/client-logger';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Correspondence, Minute } from '@/lib/npa-structure';
import {
  loadCorrespondence,
  loadMinutes,
  saveCorrespondence,
  saveMinutes,
} from '@/lib/storage';
import { Delegation } from '@/lib/delegation-storage';
import { apiFetch, hasTokens } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-current-user';

interface CorrespondenceContextType {
  correspondence: Correspondence[];
  minutes: Minute[];
  delegations: Delegation[];
  getCorrespondenceById: (id: string) => Correspondence | undefined;
  getMinutesByCorrespondenceId: (id: string) => Minute[];
  addMinute: (minute: Minute) => Promise<void>;
  updateCorrespondence: (id: string, updates: Partial<Correspondence>) => Promise<void>;
  addCorrespondence: (correspondence: Correspondence) => Promise<Correspondence>;
  refreshData: () => void;
  syncFromApi: () => Promise<void>;
}

const CorrespondenceContext = createContext<CorrespondenceContextType | undefined>(undefined);

const unwrapResults = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'results' in payload) {
    const results = (payload as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  return [];
};

const normalizeId = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    return normalizeId((value as Record<string, unknown>).id);
  }
  return String(value);
};

const mapApiCorrespondence = (item: any): Correspondence => ({
  id: String(item.id),
  referenceNumber: item.reference_number ?? '',
  subject: item.subject ?? '',
  source: item.source ?? 'internal',
  receivedDate: item.received_date ?? '',
  completedAt: item.completed_at ?? undefined,
  senderName: item.sender_name ?? '',
  senderOrganization: item.sender_organization ?? '',
  status: item.status ?? 'pending',
  priority: item.priority ?? 'medium',
  divisionId: normalizeId(item.division ?? item.division_id),
  departmentId: normalizeId(item.department ?? item.department_id),
  currentApproverId: normalizeId(item.current_approver ?? item.current_approver_id),
  createdById: normalizeId(item.created_by ?? item.created_by_id),
  currentApproverName:
    typeof item.current_approver === 'object' && item.current_approver
      ? (() => {
          const fullName = `${item.current_approver.first_name ?? ''} ${item.current_approver.last_name ?? ''}`.trim();
          if (fullName.length > 0) return fullName;
          return item.current_approver.username ?? '';
        })()
      : undefined,
  createdByName:
    typeof item.created_by === 'object' && item.created_by
      ? (() => {
          const fullName = `${item.created_by.first_name ?? ''} ${item.created_by.last_name ?? ''}`.trim();
          if (fullName.length > 0) return fullName;
          return item.created_by.username ?? '';
        })()
      : undefined,
  direction: item.direction ?? 'upward',
  attachments: Array.isArray(item.attachments)
    ? item.attachments.map((attachment: any) => ({
        id: normalizeId(attachment.id) ?? `${item.id}-att-${Math.random().toString(36).slice(2)}`,
        fileName: attachment.file_name ?? 'Attachment',
        fileType: attachment.file_type ?? undefined,
        fileSize: typeof attachment.file_size === 'number' ? attachment.file_size : undefined,
        fileUrl: attachment.file_url ?? undefined,
        createdAt: attachment.created_at ?? undefined,
        updatedAt: attachment.updated_at ?? undefined,
      }))
    : [],
  distribution: Array.isArray(item.distribution)
    ? item.distribution.map((recipient: any) => {
        const recipientType = recipient.recipient_type ?? 'division';
        return {
          id: normalizeId(recipient.id) ?? `${item.id}-dist-${Math.random().toString(36).slice(2)}`,
          type:
            recipientType === 'directorate'
              ? 'directorate'
              : recipientType === 'department'
              ? 'department'
              : 'division',
          directorateId: normalizeId(recipient.directorate),
          divisionId: normalizeId(recipient.division),
          departmentId: normalizeId(recipient.department),
          name:
            recipient.directorate_name ??
            recipient.division_name ??
            recipient.department_name ??
            undefined,
          addedById: normalizeId(recipient.added_by ?? recipient.added_by_id),
          addedByName:
            typeof recipient.added_by === 'object' && recipient.added_by
              ? (() => {
                  const fullName = `${recipient.added_by.first_name ?? ''} ${recipient.added_by.last_name ?? ''}`.trim();
                  if (fullName.length > 0) return fullName;
                  return recipient.added_by.username ?? undefined;
                })()
              : undefined,
          addedAt: recipient.created_at ?? undefined,
          purpose: recipient.purpose ?? undefined,
        };
      })
    : [],
  archiveLevel: item.archive_level ?? undefined,
  linkedDocumentIds: Array.isArray(item.linked_documents)
    ? item.linked_documents.map((doc: any) => (typeof doc === 'string' ? doc : doc.id))
    : [],
  createdAt: item.created_at ?? undefined,
  updatedAt: item.updated_at ?? undefined,
});

const mapApiMinute = (item: any): Minute => {
  // Extract user system role name (not UUID)
  let userSystemRole: string | undefined = undefined;
  if (typeof item.user === 'object' && item.user) {
    // Prefer system_role_name (the role name string)
    userSystemRole = item.user.system_role_name ?? undefined;
    // Fallback to system_role.name if it's an object
    if (!userSystemRole && item.user.system_role && typeof item.user.system_role === 'object' && item.user.system_role.name) {
      userSystemRole = item.user.system_role.name;
    }
    // Never use the UUID - if it looks like a UUID, set to undefined
    if (userSystemRole && userSystemRole.includes('-') && userSystemRole.length > 30) {
      userSystemRole = undefined;
    }
  }
  
  return {
    id: String(item.id),
    correspondenceId: item.correspondence ?? item.correspondence_id ?? '',
    userId: normalizeId(item.user ?? item.user_id) ?? '',
    userName:
      typeof item.user === 'object' && item.user
        ? (() => {
            const fullName = `${item.user.first_name ?? ''} ${item.user.last_name ?? ''}`.trim();
            if (fullName.length > 0) return fullName;
            return item.user.username ?? '';
          })()
        : undefined,
    userEmail: typeof item.user === 'object' ? item.user.email ?? undefined : undefined,
    userSystemRole: userSystemRole,
    gradeLevel: item.grade_level ?? '',
    actionType: item.action_type ?? 'minute',
    minuteText: item.minute_text ?? '',
    direction: item.direction ?? 'downward',
    stepNumber: item.step_number ?? 1,
    timestamp: item.timestamp ?? new Date().toISOString(),
    actedBySecretary: item.acted_by_secretary ?? false,
    actedByAssistant: item.acted_by_assistant ?? false,
    assistantType: item.assistant_type ?? undefined,
    readAt: item.read_at ?? undefined,
    mentions: Array.isArray(item.mentions) ? item.mentions : [],
    signature: item.signature_payload ?? undefined,
  };
};

const mapApiDelegation = (item: any): Delegation => ({
  id: String(item.id),
  correspondenceId: item.correspondence ? String(item.correspondence) : '',
  executiveId: normalizeId(item.principal ?? item.principal_id) ?? '',
  assistantId: normalizeId(item.assistant ?? item.assistant_id) ?? '',
  assistantType: (item.assistant_type ?? 'PA').toUpperCase() === 'TA' ? 'TA' : 'PA',
  delegationNotes: item.notes ?? '',
  delegatedAt: item.created_at ?? new Date().toISOString(),
  status: item.active === false ? 'revoked' : 'active',
  completedAt: item.completed_at ?? undefined,
});

const buildCorrespondencePatchPayload = (updates: Partial<Correspondence>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.direction !== undefined) payload.direction = updates.direction;
  if (updates.currentApproverId !== undefined) payload.current_approver_id = updates.currentApproverId || null;
  if (updates.divisionId !== undefined) payload.division = updates.divisionId || null;
  if (updates.departmentId !== undefined) payload.department = updates.departmentId || null;
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
    status: correspondence.status,
    priority: correspondence.priority,
    direction: correspondence.direction,
    division: correspondence.divisionId ?? null,
    department: correspondence.departmentId ?? null,
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
  const { currentUser, hydrated } = useCurrentUser();

  // Initialize data on mount
  useEffect(() => {
    refreshData();
  }, []);

  const syncFromApi = useCallback(async () => {
    if (!hydrated || !currentUser || !hasTokens()) return;

    try {
      const [correspondenceRaw, minutesRaw, delegationsRaw] = await Promise.all([
        apiFetch('/correspondence/items/'),
        apiFetch('/correspondence/minutes/'),
        apiFetch('/correspondence/delegations/'),
      ]);

      const correspondenceList = unwrapResults<any>(correspondenceRaw).map(mapApiCorrespondence);
      const minutesList = unwrapResults<any>(minutesRaw).map(mapApiMinute);
      const delegationsList = unwrapResults<any>(delegationsRaw)
        .map(mapApiDelegation)
        .filter((delegation) => delegation.correspondenceId);

      saveCorrespondence(correspondenceList);
      saveMinutes(minutesList);
      setCorrespondence(correspondenceList);
      setMinutes(minutesList);
      setDelegations(delegationsList);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('auth')) {
        logInfo('Correspondence data will sync after authentication is available.');
      } else {
        logError('Failed to load correspondence from API', error);
      }
    }
  }, [hydrated, currentUser]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (ignore) return;
      await syncFromApi();
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [syncFromApi]);

  const refreshData = () => {
    const loadedCorrespondence = loadCorrespondence() ?? [];
    const loadedMinutes = loadMinutes() ?? [];
    setCorrespondence(loadedCorrespondence);
    setMinutes(loadedMinutes);
    setDelegations([]);
  };

  const getCorrespondenceById = (id: string) => {
    return correspondence.find(c => c.id === id);
  };

  const getMinutesByCorrespondenceId = (id: string) => {
    return minutes.filter(m => m.correspondenceId === id);
  };

  const addMinute = async (minute: Minute) => {
    try {
      const payload = normalizeMinutePayload(buildMinuteCreatePayload(minute));
      const response = await apiFetch('/correspondence/minutes/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const created = mapApiMinute(response);
      setMinutes((prev) => {
        const updated = [...prev, created];
        saveMinutes(updated);
        return updated;
      });
    } catch (error) {
      logError('Failed to add minute via API', error);
      throw error;
    }
  };

  const updateCorrespondence = async (id: string, updates: Partial<Correspondence>) => {
    const payload = buildCorrespondencePatchPayload(updates);
    if (Object.keys(payload).length === 0) {
      return;
    }

    try {
      const response = await apiFetch(`/correspondence/items/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const updated = mapApiCorrespondence(response);
      setCorrespondence((prev) => {
        const updatedList = prev.map((item) => (item.id === updated.id ? updated : item));
        saveCorrespondence(updatedList);
        return updatedList;
      });
    } catch (error) {
      logError('Failed to update correspondence via API', error);
      throw error;
    }
  };

  const addCorrespondence = async (newCorr: Correspondence) => {
    try {
      const response = await apiFetch('/correspondence/items/', {
        method: 'POST',
        body: JSON.stringify(buildCorrespondenceCreatePayload(newCorr)),
      });

      const created = mapApiCorrespondence(response);
      setCorrespondence((prev) => {
        const updatedList = [created, ...prev];
        saveCorrespondence(updatedList);
        return updatedList;
      });
      return created;
    } catch (error) {
      logError('Failed to create correspondence via API', error);
      throw error;
    }
  };

  return (
    <CorrespondenceContext.Provider
      value={{
        correspondence,
        minutes,
        delegations,
        getCorrespondenceById,
        getMinutesByCorrespondenceId,
        addMinute,
        updateCorrespondence,
        addCorrespondence,
        refreshData,
        syncFromApi,
      }}
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