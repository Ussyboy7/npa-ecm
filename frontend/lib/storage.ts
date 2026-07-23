import { logError } from '@/lib/client-logger';

import type { DraftFileMetadata, Draft } from './api/drafts';

export const STORAGE_KEYS = {
  DRAFTS: 'npa_drafts',
} as const;

export const getFromStorage = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error: unknown) {
    logError(`Failed to parse storage item for key ${key}`, error);
    return null;
  }
};

export const saveToStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

export type { DraftFileMetadata, Draft };

import * as draftApi from '@/lib/api/drafts';

export const saveDraft = async (draft: Partial<Draft> & { correspondenceId: string; type: 'minute' | 'treatment'; content: string }): Promise<Draft> => {
  return await draftApi.saveDraft(draft);
};

export const loadDrafts = async (): Promise<Draft[]> => {
  return await draftApi.getDrafts();
};

export const getDraftByCorrespondence = async (correspondenceId: string, type: 'minute' | 'treatment'): Promise<Draft | null> => {
  return await draftApi.getDraftByCorrespondence(correspondenceId, type);
};

export const deleteDraft = async (draftId: string): Promise<void> => {
  await draftApi.deleteDraft(draftId);
};

export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};
