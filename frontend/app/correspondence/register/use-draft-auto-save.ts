/**
 * Hook for auto-saving draft correspondence registration
 */

import { useEffect, useRef } from 'react';
import { REGISTER_CONSTANTS } from './register-constants';
import { FormData, FlowType, DistributionState } from './register-utils';
import { toast } from 'sonner';

interface DraftData {
  flowType: FlowType;
  formData: FormData;
  directorateDistribution: string[];
  divisionDistribution: string[];
  departmentDistribution: string[];
  savedAt: string;
}

export const useDraftAutoSave = (
  flowType: FlowType,
  formData: FormData,
  distributions: DistributionState,
  mounted: boolean,
  onDraftLoaded?: (draft: DraftData) => void,
  onHasDraftChange?: (hasDraft: boolean) => void
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef(true);
  const hasLoadedDraftRef = useRef(false);

  // Load draft on mount (only once)
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
    isInitialMountRef.current = false;
  }, [mounted, onDraftLoaded, onHasDraftChange]);

  // Auto-save draft with debounce
  useEffect(() => {
    if (!mounted || isInitialMountRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
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

  const clearDraft = () => {
    localStorage.removeItem(REGISTER_CONSTANTS.DRAFT_KEY);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return { clearDraft };
};

