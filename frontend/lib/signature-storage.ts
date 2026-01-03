import { logError } from '@/lib/client-logger';
import { apiFetch } from '@/lib/api-client';

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

const TEMPLATE_KEY = 'npa_signature_templates';
const USER_PREF_KEY_PREFIX = 'npa_signature_pref_';

const getUserPrefKey = (userId: string) => `${USER_PREF_KEY_PREFIX}${userId}`;

// ==========================================
// Backend API Functions (for signature image)
// ==========================================

/**
 * Fetch the current user's signature from the backend
 */
export const fetchUserSignature = async (): Promise<StoredSignature | null> => {
  try {
    const response = await apiFetch<BackendSignatureResponse>('/accounts/signature/');
    
    if (!response.has_signature) {
      return null;
    }
    
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
    logError('Failed to fetch signature from backend:', error);
    return null;
  }
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
  } catch (error: unknown) {
    logError('Failed to delete signature:', error);
    throw error;
  }
};

// ==========================================
// Legacy localStorage functions (backwards compatibility)
// These are deprecated - use backend API instead
// ==========================================

/**
 * @deprecated Use fetchUserSignature() instead
 */
export const loadUserSignature = (userId: string): StoredSignature | null => {
  if (typeof window === 'undefined') return null;
  try {
    const SIGNATURE_KEY_PREFIX = 'npa_signature_';
    const data = localStorage.getItem(`${SIGNATURE_KEY_PREFIX}${userId}`);
    if (!data) return null;
    return JSON.parse(data) as StoredSignature;
  } catch (error: unknown) {
    logError('Failed to load signature from localStorage:', error);
    return null;
  }
};

/**
 * @deprecated Use uploadUserSignature() instead
 */
export const saveUserSignature = (userId: string, signature: StoredSignature) => {
  if (typeof window === 'undefined') return;
  try {
    const SIGNATURE_KEY_PREFIX = 'npa_signature_';
    localStorage.setItem(`${SIGNATURE_KEY_PREFIX}${userId}`, JSON.stringify(signature));
  } catch (error: unknown) {
    logError('Failed to save signature to localStorage:', error);
  }
};

/**
 * @deprecated Use deleteUserSignatureFromBackend() instead
 */
export const deleteUserSignature = (userId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const SIGNATURE_KEY_PREFIX = 'npa_signature_';
    localStorage.removeItem(`${SIGNATURE_KEY_PREFIX}${userId}`);
  } catch (error: unknown) {
    logError('Failed to delete signature from localStorage:', error);
  }
};

// ==========================================
// Template Functions (now using backend)
// ==========================================

import * as signatureTemplateApi from '@/lib/api/signature-templates';

export const loadSignatureTemplates = async (): Promise<SignatureTemplate[]> => {
  try {
    const templates = await signatureTemplateApi.getSignatureTemplates();
    // If no templates exist, return defaults (they'll be created in backend on first use)
    if (templates.length === 0) {
      return DEFAULT_SIGNATURE_TEMPLATES;
    }
    return templates;
  } catch (error: unknown) {
    logError('Failed to load signature templates from backend:', error);
    // Fallback to defaults if backend fails
    return DEFAULT_SIGNATURE_TEMPLATES;
  }
};

export const saveSignatureTemplates = async (templates: SignatureTemplate[]): Promise<void> => {
  // Templates are managed in backend - this function is kept for compatibility
  // but doesn't actually save to localStorage anymore
  logWarn('saveSignatureTemplates is deprecated - templates are managed in backend');
};

export const ensureDefaultSignatureTemplates = async (): Promise<SignatureTemplate[]> => {
  const existing = await loadSignatureTemplates();
  if (existing.length === 0) {
    return [...DEFAULT_SIGNATURE_TEMPLATES];
  }
  return existing;
};

// ==========================================
// User Preferences (now using backend)
// ==========================================

export const loadUserSignaturePreferences = async (userId: string): Promise<UserSignaturePreferences | null> => {
  try {
    return await signatureTemplateApi.getUserSignaturePreferences();
  } catch (error: unknown) {
    logError('Failed to load signature preferences from backend:', error);
    return null;
  }
};

export const saveUserSignaturePreferences = async (userId: string, prefs: UserSignaturePreferences): Promise<void> => {
  try {
    await signatureTemplateApi.updateUserSignaturePreferences(prefs);
  } catch (error: unknown) {
    logError('Failed to save signature preferences to backend:', error);
    throw error;
  }
};
