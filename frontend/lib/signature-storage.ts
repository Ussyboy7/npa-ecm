import { logError } from '@/lib/client-logger';
export type StoredSignature = {
  imageData: string;
  fileName?: string;
  uploadedAt: string;
};

export type SignatureTemplate = {
  id: string;
  name: string;
  description: string;
  templateType: 'approval' | 'minute' | 'forward' | 'treatment';
  format: string; // e.g. "APPROVED BY {name} {title}\n{date}"
  style: 'stamp' | 'formal' | 'minimal';
  defaultApply: boolean;
};

export const DEFAULT_SIGNATURE_TEMPLATES: SignatureTemplate[] = [
  {
    id: 'template-approval-standard',
    name: 'Approval – Standard',
    description: 'Formal approval block with signature, role, and date.',
    templateType: 'approval',
    format: 'APPROVED BY {name}\n{role}\n{date}',
    style: 'formal',
    defaultApply: true,
  },
  {
    id: 'template-minute-followup',
    name: 'Minute – Follow Up',
    description: 'Minute stamp highlighting requested follow-up actions.',
    templateType: 'minute',
    format: 'MINUTED BY {name}\n{role}\nFollow up and revert within 48 hours.\n{date}',
    style: 'stamp',
    defaultApply: false,
  },
  {
    id: 'template-forward-standard',
    name: 'Forward – FYI',
    description: 'Forwarding note for information or action.',
    templateType: 'forward',
    format: 'FORWARDED BY {name}\n{role}\n{date}',
    style: 'minimal',
    defaultApply: false,
  },
  {
    id: 'template-treatment-response',
    name: 'Treatment – Response Memo',
    description: 'Template for treatment responses back to originator.',
    templateType: 'treatment',
    format: 'TREATED BY {name}\n{role}\n{date}',
    style: 'formal',
    defaultApply: false,
  },
];

export type UserSignaturePreferences = {
  defaultTemplateId?: string;
  templateOverrides?: Record<string, string>; // templateType -> templateId
  autoApplyForMinutes?: boolean;
};

const SIGNATURE_KEY_PREFIX = 'npa_signature_';
const TEMPLATE_KEY = 'npa_signature_templates';
const USER_PREF_KEY_PREFIX = 'npa_signature_pref_';

const getSignatureStorageKey = (userId: string) => `${SIGNATURE_KEY_PREFIX}${userId}`;
const getUserPrefKey = (userId: string) => `${USER_PREF_KEY_PREFIX}${userId}`;

export const saveUserSignature = (userId: string, signature: StoredSignature) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getSignatureStorageKey(userId), JSON.stringify(signature));
  } catch (error) {
    logError('Failed to save signature:', error);
  }
};

export const loadUserSignature = (userId: string): StoredSignature | null => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(getSignatureStorageKey(userId));
    if (!data) return null;
    return JSON.parse(data) as StoredSignature;
  } catch (error) {
    logError('Failed to load signature:', error);
    return null;
  }
};

export const deleteUserSignature = (userId: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getSignatureStorageKey(userId));
  } catch (error) {
    logError('Failed to delete signature:', error);
  }
};

export const loadSignatureTemplates = (): SignatureTemplate[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(TEMPLATE_KEY);
    if (!data) return [];
    return JSON.parse(data) as SignatureTemplate[];
  } catch (error) {
    logError('Failed to load templates:', error);
    return [];
  }
};

export const saveSignatureTemplates = (templates: SignatureTemplate[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
  } catch (error) {
    logError('Failed to save templates:', error);
  }
};

export const ensureDefaultSignatureTemplates = (): SignatureTemplate[] => {
  const existing = loadSignatureTemplates();
  if (existing.length === 0) {
    saveSignatureTemplates(DEFAULT_SIGNATURE_TEMPLATES);
    return [...DEFAULT_SIGNATURE_TEMPLATES];
  }
  return existing;
};

export const loadUserSignaturePreferences = (userId: string): UserSignaturePreferences | null => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(getUserPrefKey(userId));
    if (!data) return null;
    return JSON.parse(data) as UserSignaturePreferences;
  } catch (error) {
    logError('Failed to load signature preferences:', error);
    return null;
  }
};

export const saveUserSignaturePreferences = (userId: string, prefs: UserSignaturePreferences) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getUserPrefKey(userId), JSON.stringify(prefs));
  } catch (error) {
    logError('Failed to save signature preferences:', error);
  }
};