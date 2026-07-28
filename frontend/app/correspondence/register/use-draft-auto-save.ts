"use client";

import { useEffect, useRef, useCallback } from 'react';
import { REGISTER_CONSTANTS } from './register-constants';
import { logError } from '@/lib/client-logger';
import { FormData, FlowType, DistributionState } from './register-utils';
import { toast } from "@/components/ui/sonner";
import { apiFetch } from '@/lib/api-client';
import { invalidateSidebarCounts } from '@/hooks/use-sidebar-counts';

interface DraftData {
  flowType: FlowType;
  formData: FormData;
  directorateDistribution: string[];
  divisionDistribution: string[];
  departmentDistribution: string[];
  savedAt: string;
}

interface ServerDraft {
  id: string;
  form_data: Record<string, unknown>;
  draft_type: string;
  created_at: string;
  updated_at: string;
}

const SERVER_SAVE_DEBOUNCE_MS = 3000;

export const useDraftAutoSave = (
  flowType: FlowType,
  formData: FormData,
  distributions: DistributionState,
  mounted: boolean,
  onDraftLoaded?: (draft: DraftData) => void,
  onHasDraftChange?: (hasDraft: boolean) => void
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef(true);
  const hasLoadedDraftRef = useRef(false);
  const draftIdRef = useRef<string | null>(null);

  const saveDraftToServer = useCallback(async (data: DraftData) => {
    try {
      const method = draftIdRef.current ? 'PATCH' : 'POST';
      const url = draftIdRef.current
        ? `/correspondence/drafts/${draftIdRef.current}/`
        : '/correspondence/drafts/';

      const body: Record<string, unknown> = {
        form_data: data,
        draft_type: 'registration',
      };

      if (data.formData.subject) {
        body.subject = data.formData.subject;
      }

      const result = await apiFetch<{ id: string }>(url, {
        method,
        body: JSON.stringify(body),
      });

      if (result?.id) {
        draftIdRef.current = result.id;
      }

      invalidateSidebarCounts();
    } catch (err) {
      console.warn('Failed to save draft to server', err);
    }
  }, []);

  const loadServerDraft = useCallback(async () => {
    try {
      const drafts = await apiFetch<{ results: ServerDraft[] }>(
        '/correspondence/drafts/?draft_type=registration&ordering=-updated_at'
      );

      if (!drafts?.results?.length) return;

      const latest = drafts.results[0];
      draftIdRef.current = latest.id;

      const formDataRaw = latest.form_data as Record<string, unknown>;
      const draft = formDataRaw as unknown as DraftData;

      const localDraft = localStorage.getItem(REGISTER_CONSTANTS.DRAFT_KEY);
      if (localDraft) {
        try {
          const local = JSON.parse(localDraft) as DraftData;
          const serverTime = new Date(latest.updated_at).getTime();
          const localTime = new Date(local.savedAt).getTime();
          if (localTime > serverTime) {
            return;
          }
        } catch {
          // fall through to server draft
        }
      }

      if (onDraftLoaded) {
        onDraftLoaded(draft);
      }
      if (onHasDraftChange) {
        onHasDraftChange(true);
      }
      toast.info('Server draft loaded', {
        description: 'You have unsaved changes from a previous session',
      });
    } catch (err) {
      logError('Failed to load server draft:', err);
    }
  }, [onDraftLoaded, onHasDraftChange]);

  // Load draft on mount (localStorage first, then server)
  useEffect(() => {
    if (!mounted || hasLoadedDraftRef.current) return;
    hasLoadedDraftRef.current = true;

    const savedDraft = localStorage.getItem(REGISTER_CONSTANTS.DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft) as DraftData;
        if (onDraftLoaded) {
          onDraftLoaded(draft);
        }
        if (onHasDraftChange) {
          onHasDraftChange(true);
        }
        toast.info('Draft loaded', {
          description: 'You have unsaved changes from a previous session',
        });
      } catch (err) {
        logError('Failed to load draft:', err);
      }
    }

    void loadServerDraft();

    isInitialMountRef.current = false;
  }, [mounted, onDraftLoaded, onHasDraftChange, loadServerDraft]);

  // Auto-save draft to localStorage with debounce
  useEffect(() => {
    if (!mounted || isInitialMountRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const draft: DraftData = {
        flowType,
        formData,
        directorateDistribution: distributions.directorates,
        divisionDistribution: distributions.divisions,
        departmentDistribution: distributions.departments,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(REGISTER_CONSTANTS.DRAFT_KEY, JSON.stringify(draft));
      if (onHasDraftChange) {
        onHasDraftChange(true);
      }
    }, REGISTER_CONSTANTS.DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [flowType, formData, distributions, mounted, onHasDraftChange]);

  // Auto-save draft to server with longer debounce
  useEffect(() => {
    if (!mounted || isInitialMountRef.current) return;

    if (serverTimeoutRef.current) {
      clearTimeout(serverTimeoutRef.current);
    }

    serverTimeoutRef.current = setTimeout(() => {
      const draft: DraftData = {
        flowType,
        formData,
        directorateDistribution: distributions.directorates,
        divisionDistribution: distributions.divisions,
        departmentDistribution: distributions.departments,
        savedAt: new Date().toISOString(),
      };
      void saveDraftToServer(draft);
    }, SERVER_SAVE_DEBOUNCE_MS);

    return () => {
      if (serverTimeoutRef.current) {
        clearTimeout(serverTimeoutRef.current);
      }
    };
  }, [flowType, formData, distributions, mounted, saveDraftToServer]);

  const clearDraft = () => {
    localStorage.removeItem(REGISTER_CONSTANTS.DRAFT_KEY);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (serverTimeoutRef.current) {
      clearTimeout(serverTimeoutRef.current);
    }
    if (draftIdRef.current) {
      apiFetch(`/correspondence/drafts/${draftIdRef.current}/`, {
        method: 'DELETE',
      }).catch(() => {});
      draftIdRef.current = null;
    }
    invalidateSidebarCounts();
  };

  return { clearDraft };
};
