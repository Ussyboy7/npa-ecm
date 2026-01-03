/**
 * API client for correspondence/minute content templates
 */

import { apiFetch, hasTokens } from '../api-client';
import { logError } from '../client-logger';

export type TemplateScope = 'organization' | 'directorate' | 'division' | 'department' | 'user';
export type TemplateType = 'document' | 'minute' | 'treatment';
export type ActionType = 'minute' | 'approve' | 'any';

export interface DocumentTemplate {
  id: string;
  scope: TemplateScope;
  scopeId: string | null;
  title: string;
  description?: string;
  contentHtml: string;
  contentText?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  templateType: TemplateType;
  actionType?: ActionType;
  isActive?: boolean;
}

// Map API response (snake_case) to frontend interface (camelCase)
const mapApiTemplate = (template: Record<string, unknown>): DocumentTemplate => ({
  id: String(template.id),
  scope: template.scope,
  scopeId: template.scope_id ?? null,
  title: template.title,
  description: template.description ?? undefined,
  contentHtml: template.content_html,
  contentText: template.content_text ?? undefined,
  createdBy: template.created_by ? String(template.created_by) : 'system',
  updatedBy: template.updated_by ? String(template.updated_by) : 'system',
  createdAt: template.created_at ?? new Date().toISOString(),
  updatedAt: template.updated_at ?? new Date().toISOString(),
  isDefault: template.is_default ?? true,
  templateType: template.template_type ?? 'document',
  actionType: template.action_type ?? undefined,
  isActive: template.is_active ?? true,
});

/**
 * Get all templates with optional filters
 */
export const getTemplates = async (params?: {
  scope?: TemplateScope;
  scopeId?: string | null;
  templateType?: TemplateType;
  isActive?: boolean;
}): Promise<DocumentTemplate[]> => {
  if (!hasTokens()) {
    return [];
  }

  try {
    const queryParams = new URLSearchParams();
    if (params?.scope) queryParams.append('scope', params.scope);
    if (params?.scopeId) queryParams.append('scope_id', params.scopeId);
    if (params?.templateType) queryParams.append('template_type', params.templateType);
    if (params?.isActive !== undefined) queryParams.append('is_active', String(params.isActive));

    const query = queryParams.toString();
    const endpoint = `/correspondence/templates/${query ? `?${query}` : ''}`;
    const response = await apiFetch<Record<string, unknown>>(endpoint);

    if (Array.isArray(response)) {
      return response.map(mapApiTemplate);
    }
    if (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) {
      return response.results.map(mapApiTemplate);
    }
    return [];
      } catch (error: unknown) {
    logError('Failed to get templates', error);
    return [];
  }
};

/**
 * Get a single template by ID
 */
export const getTemplate = async (id: string): Promise<DocumentTemplate | null> => {
  if (!hasTokens()) {
    return null;
  }

  try {
    const response = await apiFetch<Record<string, unknown>>(`/correspondence/templates/${id}/`);
    return mapApiTemplate(response);
      } catch (error: unknown) {
    logError('Failed to get template', error);
    return null;
  }
};

/**
 * Create a new template
 */
export const createTemplate = async (data: {
  scope: TemplateScope;
  scopeId?: string | null;
  title: string;
  description?: string;
  contentHtml: string;
  contentText?: string;
  templateType: TemplateType;
  actionType?: ActionType;
  isDefault?: boolean;
}): Promise<DocumentTemplate> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  try {
    const payload = {
      scope: data.scope,
      scope_id: data.scopeId ?? null,
      title: data.title,
      description: data.description ?? '',
      content_html: data.contentHtml,
      content_text: data.contentText ?? '',
      template_type: data.templateType,
      action_type: data.actionType ?? null,
      is_default: data.isDefault ?? true,
    };

    const response = await apiFetch<Record<string, unknown>>('/correspondence/templates/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return mapApiTemplate(response);
      } catch (error: unknown) {
    logError('Failed to create template', error);
    throw error;
  }
};

/**
 * Update an existing template
 */
export const updateTemplate = async (
  id: string,
  data: Partial<{
    title: string;
    description?: string;
    contentHtml: string;
    contentText?: string;
    isDefault?: boolean;
    isActive?: boolean;
  }>
): Promise<DocumentTemplate> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  try {
    const payload: unknown = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description ?? '';
    if (data.contentHtml !== undefined) payload.content_html = data.contentHtml;
    if (data.contentText !== undefined) payload.content_text = data.contentText ?? '';
    if (data.isDefault !== undefined) payload.is_default = data.isDefault;
    if (data.isActive !== undefined) payload.is_active = data.isActive;

    const response = await apiFetch<Record<string, unknown>>(`/correspondence/templates/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return mapApiTemplate(response);
      } catch (error: unknown) {
    logError('Failed to update template', error);
    throw error;
  }
};

/**
 * Delete a template
 */
export const deleteTemplate = async (id: string): Promise<void> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  try {
    await apiFetch(`/correspondence/templates/${id}/`, {
      method: 'DELETE',
    });
      } catch (error: unknown) {
    logError('Failed to delete template', error);
    throw error;
  }
};

