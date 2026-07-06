import { logError } from '@/lib/client-logger';
import { apiFetch } from '@/lib/api-client';
import type { SignatureTemplate, UserSignaturePreferences } from '@/lib/api/signature-templates';

// ==========================================
// Types
// ==========================================

export type StoredSignature = {
  id?: string;
  imageData: string;  // URL to signature image (from backend)
  fileName?: string;
  uploadedAt: string;
  sealOfficeName?: string;
  sealOfficeTitle?: string;
  sealPrefix?: string;
  require2fa?: boolean;
  isActive?: boolean;
  lastUsedAt?: string;
  timesUsed?: number;
};

export type { SignatureTemplate };

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

export type { UserSignaturePreferences };

// ==========================================
// Backend API Response Types
// ==========================================

interface BackendSignatureResponse {
  id: string;
  user: number;
  user_name: string;
  user_role: string;
  signature_image: string | null;
  signature_url: string | null;
  has_signature: boolean;
  original_filename: string;
  seal_office_name: string;
  seal_office_title: string;
  seal_prefix: string;
  require_2fa: boolean;
  is_active: boolean;
  last_used_at: string | null;
  times_used: number;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Local Storage Keys (for templates/preferences only)
// ==========================================

const _USER_PREF_KEY_PREFIX = 'npa_signature_pref_';

const SIGNATURE_CACHE_TTL_MS = 60 * 1000;
const SIGNATURE_TEMPLATES_CACHE_TTL_MS = 5 * 60 * 1000;

let signatureCache: { data: StoredSignature | null; timestamp: number } | null = null;
let signaturePromise: Promise<StoredSignature | null> | null = null;
let signatureTemplatesCache: { data: SignatureTemplate[]; timestamp: number } | null = null;
let signatureTemplatesPromise: Promise<SignatureTemplate[]> | null = null;
let signaturePreferencesCache: { userId: string; data: UserSignaturePreferences | null; timestamp: number } | null = null;
let signaturePreferencesPromise: Promise<UserSignaturePreferences | null> | null = null;

export const invalidateSignatureCache = (): void => {
  signatureCache = null;
  signaturePromise = null;
};

// ==========================================
// Backend API Functions (for signature image)
// ==========================================

/**
 * Fetch the current user's signature from the backend
 */
export const fetchUserSignature = async (signal?: AbortSignal, force = false): Promise<StoredSignature | null> => {
  const now = Date.now();
  if (!force && signatureCache && now - signatureCache.timestamp < SIGNATURE_CACHE_TTL_MS) {
    return signatureCache.data;
  }
  if (!force && signaturePromise) {
    return signaturePromise;
  }

  signaturePromise = (async () => {
    try {
      const response = await apiFetch<BackendSignatureResponse>('/accounts/signature/', { signal });
      
      if (!response.has_signature) {
        signatureCache = { data: null, timestamp: Date.now() };
        return null;
      }
      
      const result: StoredSignature = {
        id: response.id,
        imageData: response.signature_url || '',
        fileName: response.original_filename,
        uploadedAt: response.created_at,
        sealOfficeName: response.seal_office_name,
        sealOfficeTitle: response.seal_office_title,
        sealPrefix: response.seal_prefix,
        require2fa: response.require_2fa,
        isActive: response.is_active,
        lastUsedAt: response.last_used_at ?? undefined,
        timesUsed: response.times_used,
      };
      signatureCache = { data: result, timestamp: Date.now() };
      return result;
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        logError('Failed to fetch signature from backend:', error);
      }
      return null;
    } finally {
      signaturePromise = null;
    }
  })();

  return signaturePromise;
};

/**
 * Upload a new signature to the backend
 */
export const uploadUserSignature = async (
  file: File,
  options?: {
    sealOfficeName?: string;
    sealOfficeTitle?: string;
    sealPrefix?: string;
    require2fa?: boolean;
  }
): Promise<StoredSignature | null> => {
  try {
    const formData = new FormData();
    formData.append('signature_image', file);
    
    if (options?.sealOfficeName) {
      formData.append('seal_office_name', options.sealOfficeName);
    }
    if (options?.sealOfficeTitle) {
      formData.append('seal_office_title', options.sealOfficeTitle);
    }
    if (options?.sealPrefix) {
      formData.append('seal_prefix', options.sealPrefix);
    }
    if (options?.require2fa !== undefined) {
      formData.append('require_2fa', String(options.require2fa));
    }
    
    const response = await apiFetch<BackendSignatureResponse>('/accounts/signature/', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for FormData
    });
    
    invalidateSignatureCache();
    return {
      id: response.id,
      imageData: response.signature_url || '',
      fileName: response.original_filename,
      uploadedAt: response.created_at,
      sealOfficeName: response.seal_office_name,
      sealOfficeTitle: response.seal_office_title,
      sealPrefix: response.seal_prefix,
      require2fa: response.require_2fa,
      isActive: response.is_active,
      lastUsedAt: response.last_used_at ?? undefined,
      timesUsed: response.times_used,
    };
  } catch (error: unknown) {
    logError('Failed to upload signature:', error);
    throw error;
  }
};

/**
 * Update signature settings (without changing the image)
 */
export const updateSignatureSettings = async (
  settings: {
    sealOfficeName?: string;
    sealOfficeTitle?: string;
    sealPrefix?: string;
    require2fa?: boolean;
    isActive?: boolean;
  }
): Promise<StoredSignature | null> => {
  try {
    const payload: Record<string, unknown> = {};
    if (settings.sealOfficeName !== undefined) payload.seal_office_name = settings.sealOfficeName;
    if (settings.sealOfficeTitle !== undefined) payload.seal_office_title = settings.sealOfficeTitle;
    if (settings.sealPrefix !== undefined) payload.seal_prefix = settings.sealPrefix;
    if (settings.require2fa !== undefined) payload.require_2fa = settings.require2fa;
    if (settings.isActive !== undefined) payload.is_active = settings.isActive;
    
    const response = await apiFetch<BackendSignatureResponse>('/accounts/signature/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    invalidateSignatureCache();
    return {
      id: response.id,
      imageData: response.signature_url || '',
      fileName: response.original_filename,
      uploadedAt: response.created_at,
      sealOfficeName: response.seal_office_name,
      sealOfficeTitle: response.seal_office_title,
      sealPrefix: response.seal_prefix,
      require2fa: response.require_2fa,
      isActive: response.is_active,
      lastUsedAt: response.last_used_at ?? undefined,
      timesUsed: response.times_used,
    };
  } catch (error: unknown) {
    logError('Failed to update signature settings:', error);
    throw error;
  }
};

/**
 * Delete the user's signature from the backend
 */
export const deleteUserSignatureFromBackend = async (): Promise<void> => {
  try {
    await apiFetch('/accounts/signature/', {
      method: 'DELETE',
    });
    invalidateSignatureCache();
  } catch (error: unknown) {
    logError('Failed to delete signature:', error);
    throw error;
  }
};

// ==========================================
// Template Functions (now using backend)
// ==========================================

import * as signatureTemplateApi from '@/lib/api/signature-templates';

export const loadSignatureTemplates = async (signal?: AbortSignal, force = false): Promise<SignatureTemplate[]> => {
  const now = Date.now();
  if (!force && signatureTemplatesCache && now - signatureTemplatesCache.timestamp < SIGNATURE_TEMPLATES_CACHE_TTL_MS) {
    return signatureTemplatesCache.data;
  }
  if (!force && signatureTemplatesPromise) {
    return signatureTemplatesPromise;
  }

  signatureTemplatesPromise = (async () => {
    try {
      const templates = await signatureTemplateApi.getSignatureTemplates({}, signal);
      const result = templates.length === 0 ? DEFAULT_SIGNATURE_TEMPLATES : templates;
      signatureTemplatesCache = { data: result, timestamp: Date.now() };
      return result;
    } catch (error: unknown) {
      logError('Failed to load signature templates from backend:', error);
      return DEFAULT_SIGNATURE_TEMPLATES;
    } finally {
      signatureTemplatesPromise = null;
    }
  })();

  return signatureTemplatesPromise;
};

export const ensureDefaultSignatureTemplates = async (signal?: AbortSignal): Promise<SignatureTemplate[]> => {
  const existing = await loadSignatureTemplates(signal);
  if (existing.length === 0) {
    return [...DEFAULT_SIGNATURE_TEMPLATES];
  }
  return existing;
};

// ==========================================
// User Preferences (now using backend)
// ==========================================

export const loadUserSignaturePreferences = async (userId: string, signal?: AbortSignal, force = false): Promise<UserSignaturePreferences | null> => {
  const now = Date.now();
  if (
    !force &&
    signaturePreferencesCache &&
    signaturePreferencesCache.userId === userId &&
    now - signaturePreferencesCache.timestamp < SIGNATURE_CACHE_TTL_MS
  ) {
    return signaturePreferencesCache.data;
  }
  if (!force && signaturePreferencesPromise) {
    return signaturePreferencesPromise;
  }

  signaturePreferencesPromise = (async () => {
    try {
      const prefs = await signatureTemplateApi.getUserSignaturePreferences(signal);
      signaturePreferencesCache = { userId, data: prefs, timestamp: Date.now() };
      return prefs;
    } catch (error: unknown) {
      logError('Failed to load signature preferences from backend:', error);
      return null;
    } finally {
      signaturePreferencesPromise = null;
    }
  })();

  return signaturePreferencesPromise;
};

export const saveUserSignaturePreferences = async (userId: string, prefs: UserSignaturePreferences): Promise<void> => {
  try {
    await signatureTemplateApi.updateUserSignaturePreferences(prefs);
    signaturePreferencesCache = { userId, data: prefs, timestamp: Date.now() };
  } catch (error: unknown) {
    logError('Failed to save signature preferences to backend:', error);
    throw error;
  }
};
