import { apiFetch } from '../api-client';
import { logError } from '@/lib/client-logger';

export interface ApiSignatureTemplate {
  id: string;
  name: string;
  description: string;
  template_type: 'approval' | 'minute' | 'forward' | 'treatment';
  format: string;
  style: 'stamp' | 'formal' | 'minimal';
  default_apply: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiUserSignaturePreferences {
  id: string;
  user: { id: string; name: string; email: string };
  default_template: ApiSignatureTemplate | null;
  default_template_id: string | null;
  template_overrides: Record<string, string>;
  auto_apply_for_minutes: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignatureTemplate {
  id: string;
  name: string;
  description: string;
  templateType: 'approval' | 'minute' | 'forward' | 'treatment';
  format: string;
  style: 'stamp' | 'formal' | 'minimal';
  defaultApply: boolean;
}

export interface UserSignaturePreferences {
  defaultTemplateId?: string;
  templateOverrides?: Record<string, string>;
  autoApplyForMinutes?: boolean;
}

const mapApiTemplateToFrontend = (api: ApiSignatureTemplate): SignatureTemplate => ({
  id: api.id,
  name: api.name,
  description: api.description,
  templateType: api.template_type,
  format: api.format,
  style: api.style,
  defaultApply: api.default_apply,
});

const mapApiPreferencesToFrontend = (api: ApiUserSignaturePreferences): UserSignaturePreferences => ({
  defaultTemplateId: api.default_template_id || undefined,
  templateOverrides: api.template_overrides || undefined,
  autoApplyForMinutes: api.auto_apply_for_minutes,
});

/**
 * Get all signature templates
 */
export async function getSignatureTemplates(params?: {
  template_type?: 'approval' | 'minute' | 'forward' | 'treatment';
  style?: 'stamp' | 'formal' | 'minimal';
  default_apply?: boolean;
}): Promise<SignatureTemplate[]> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.template_type) queryParams.append('template_type', params.template_type);
    if (params?.style) queryParams.append('style', params.style);
    if (params?.default_apply !== undefined) queryParams.append('default_apply', String(params.default_apply));

    const response = await apiFetch<ApiSignatureTemplate[]>(
      `/accounts/signature-templates/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    
    const templates = Array.isArray(response) ? response : (response.results || []);
    return templates.map(mapApiTemplateToFrontend);
  } catch (error) {
    logError('Failed to fetch signature templates from backend', error);
    return [];
  }
}

/**
 * Get user signature preferences
 */
export async function getUserSignaturePreferences(): Promise<UserSignaturePreferences | null> {
  try {
    const response = await apiFetch<ApiUserSignaturePreferences>(
      '/accounts/signature-preferences/my_preferences/'
    );
    return mapApiPreferencesToFrontend(response);
  } catch (error) {
    logError('Failed to fetch user signature preferences from backend', error);
    return null;
  }
}

/**
 * Update user signature preferences
 */
export async function updateUserSignaturePreferences(
  preferences: Partial<UserSignaturePreferences>
): Promise<UserSignaturePreferences> {
  try {
    const apiData: Partial<ApiUserSignaturePreferences> = {};
    if (preferences.defaultTemplateId !== undefined) {
      apiData.default_template_id = preferences.defaultTemplateId || null;
    }
    if (preferences.templateOverrides !== undefined) {
      apiData.template_overrides = preferences.templateOverrides;
    }
    if (preferences.autoApplyForMinutes !== undefined) {
      apiData.auto_apply_for_minutes = preferences.autoApplyForMinutes;
    }

    const response = await apiFetch<ApiUserSignaturePreferences>(
      '/accounts/signature-preferences/my_preferences/',
      {
        method: 'PATCH',
        body: JSON.stringify(apiData),
      }
    );
    return mapApiPreferencesToFrontend(response);
  } catch (error) {
    logError('Failed to update user signature preferences on backend', error);
    throw error;
  }
}

