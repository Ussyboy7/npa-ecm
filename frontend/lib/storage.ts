import { logError } from '@/lib/client-logger';
// localStorage utilities for data persistence

import { Correspondence, Minute } from './npa-structure';
import type { DraftFileMetadata, Draft } from './api/drafts';

export const STORAGE_KEYS = {
  CORRESPONDENCE: 'npa_correspondence',
  MINUTES: 'npa_minutes',
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

// Correspondence operations
export const saveCorrespondence = (correspondence: Correspondence[]) => {
  localStorage.setItem(STORAGE_KEYS.CORRESPONDENCE, JSON.stringify(correspondence));
};

export const loadCorrespondence = (): Correspondence[] | null => {
  const data = localStorage.getItem(STORAGE_KEYS.CORRESPONDENCE);
  return data ? JSON.parse(data) : null;
};

export const updateCorrespondence = (id: string, updates: Partial<Correspondence>) => {
  const correspondence = loadCorrespondence();
  if (!correspondence) return null;
  
  const index = correspondence.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  correspondence[index] = { ...correspondence[index], ...updates };
  saveCorrespondence(correspondence);
  return correspondence[index];
};

export const addCorrespondence = (newCorr: Correspondence) => {
  const correspondence = loadCorrespondence() || [];
  correspondence.unshift(newCorr); // Add to beginning
  saveCorrespondence(correspondence);
  return newCorr;
};

// Minutes operations
export const saveMinutes = (minutes: Minute[]) => {
  localStorage.setItem(STORAGE_KEYS.MINUTES, JSON.stringify(minutes));
};

export const loadMinutes = (): Minute[] | null => {
  const data = localStorage.getItem(STORAGE_KEYS.MINUTES);
  return data ? JSON.parse(data) : null;
};

export const addMinute = (newMinute: Minute) => {
  const minutes = loadMinutes() || [];
  minutes.push(newMinute);
  saveMinutes(minutes);
  return newMinute;
};

export const getMinutesByCorrespondence = (correspondenceId: string): Minute[] => {
  const minutes = loadMinutes() || [];
  return minutes.filter(m => m.correspondenceId === correspondenceId);
};

// Drafts operations - Now using backend API
import * as draftApi from '@/lib/api/drafts';

export const saveDraft = async (draft: Partial<Draft> & { correspondenceId: string; type: 'minute' | 'treatment'; content: string }): Promise<Draft> => {
  try {
    return await draftApi.saveDraft(draft);
  } catch (error: unknown) {
    logError('Error saving draft to backend:', error);
    throw error;
  }
};

export const loadDrafts = async (): Promise<Draft[]> => {
  try {
    return await draftApi.getDrafts();
  } catch (error: unknown) {
    logError('Error loading drafts from backend:', error);
    return [];
  }
};

export const getDraftByCorrespondence = async (correspondenceId: string, type: 'minute' | 'treatment'): Promise<Draft | null> => {
  try {
    return await draftApi.getDraftByCorrespondence(correspondenceId, type);
  } catch (error: unknown) {
    logError(`Error loading draft for correspondence ${correspondenceId}:`, error);
    return null;
  }
};

export const deleteDraft = async (draftId: string): Promise<void> => {
  try {
    await draftApi.deleteDraft(draftId);
  } catch (error: unknown) {
    logError(`Error deleting draft ${draftId}:`, error);
    throw error;
  }
};

// Clear all data
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// Minute templates

export type MinuteTemplate = {
  id: string;
  name: string;
  content: string;
  actionType: 'minute' | 'approve' | 'any';
};

const MINUTE_TEMPLATES_KEY = 'npa_minute_templates';

const DEFAULT_MINUTE_TEMPLATES: MinuteTemplate[] = [
  {
    id: 'template-review-revert',
    name: 'Review & Revert',
    content: 'Please review and revert with your feedback by close of business.',
    actionType: 'minute',
  },
  {
    id: 'template-acknowledge',
    name: 'Acknowledgement',
    content: 'Acknowledged. Kindly ensure necessary follow-up actions are taken.',
    actionType: 'minute',
  },
  {
    id: 'template-approve-with-remarks',
    name: 'Approval with Remarks',
    content: 'Approved subject to compliance with stated conditions. Please proceed and provide periodic updates.',
    actionType: 'approve',
  },
  {
    id: 'template-escalate',
    name: 'Escalation',
    content: 'Please escalate to the appropriate directorate and revert with status within 48 hours.',
    actionType: 'minute',
  },
];

const ensureMinuteTemplates = (): MinuteTemplate[] => {
  const existing = getFromStorage<MinuteTemplate[]>(MINUTE_TEMPLATES_KEY);
  if (!existing || existing.length === 0) {
    saveToStorage(MINUTE_TEMPLATES_KEY, DEFAULT_MINUTE_TEMPLATES);
    return [...DEFAULT_MINUTE_TEMPLATES];
  }

  // Merge defaults without overwriting custom templates
  const map = new Map(existing.map((template) => [template.id, template]));
  DEFAULT_MINUTE_TEMPLATES.forEach((template) => {
    if (!map.has(template.id)) {
      map.set(template.id, template);
    }
  });
  const merged = Array.from(map.values());
  saveToStorage(MINUTE_TEMPLATES_KEY, merged);
  return merged;
};

export const loadMinuteTemplates = (): MinuteTemplate[] => ensureMinuteTemplates();

const saveMinuteTemplates = (templates: MinuteTemplate[]) => {
  saveToStorage(MINUTE_TEMPLATES_KEY, templates);
};

export const addMinuteTemplateToStorage = (template: MinuteTemplate) => {
  const templates = ensureMinuteTemplates();
  templates.push(template);
  saveMinuteTemplates(templates);
};

export const deleteMinuteTemplateFromStorage = (templateId: string) => {
  const templates = ensureMinuteTemplates().filter((template) => template.id !== templateId);
  saveMinuteTemplates(templates);
};