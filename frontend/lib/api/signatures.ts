import { apiFetch } from '@/lib/api-client';
import type { SignatureTemplate, UserSignaturePreferences } from '@/lib/api/signature-templates';

export type StoredSignature = {
  id?: string;
  imageData: string;
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

function toStoredSignature(response: BackendSignatureResponse): StoredSignature {
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
}

export const fetchUserSignature = async (signal?: AbortSignal): Promise<StoredSignature | null> => {
  const response = await apiFetch<BackendSignatureResponse>('/accounts/signature/', { signal });
  if (!response.has_signature) return null;
  return toStoredSignature(response);
};

export const uploadUserSignature = async (
  file: File,
  options?: {
    sealOfficeName?: string;
    sealOfficeTitle?: string;
    sealPrefix?: string;
    require2fa?: boolean;
  }
): Promise<StoredSignature> => {
  const formData = new FormData();
  formData.append('signature_image', file);
  if (options?.sealOfficeName) formData.append('seal_office_name', options.sealOfficeName);
  if (options?.sealOfficeTitle) formData.append('seal_office_title', options.sealOfficeTitle);
  if (options?.sealPrefix) formData.append('seal_prefix', options.sealPrefix);
  if (options?.require2fa !== undefined) formData.append('require_2fa', String(options.require2fa));

  const response = await apiFetch<BackendSignatureResponse>('/accounts/signature/', {
    method: 'POST',
    body: formData,
  });
  return toStoredSignature(response);
};

export const updateSignatureSettings = async (
  settings: {
    sealOfficeName?: string;
    sealOfficeTitle?: string;
    sealPrefix?: string;
    require2fa?: boolean;
    isActive?: boolean;
  }
): Promise<StoredSignature> => {
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
  return toStoredSignature(response);
};

export const deleteUserSignatureFromBackend = async (): Promise<void> => {
  await apiFetch('/accounts/signature/', { method: 'DELETE' });
};

import * as signatureTemplateApi from '@/lib/api/signature-templates';

export const loadSignatureTemplates = async (signal?: AbortSignal): Promise<SignatureTemplate[]> => {
  const templates = await signatureTemplateApi.getSignatureTemplates({}, signal);
  return templates.length > 0 ? templates : DEFAULT_SIGNATURE_TEMPLATES;
};

export const ensureDefaultSignatureTemplates = async (signal?: AbortSignal): Promise<SignatureTemplate[]> => {
  return loadSignatureTemplates(signal);
};

export const loadUserSignaturePreferences = async (_userId: string, signal?: AbortSignal): Promise<UserSignaturePreferences | null> => {
  return await signatureTemplateApi.getUserSignaturePreferences(signal);
};

export const saveUserSignaturePreferences = async (_userId: string, prefs: UserSignaturePreferences): Promise<void> => {
  await signatureTemplateApi.updateUserSignaturePreferences(prefs);
};
