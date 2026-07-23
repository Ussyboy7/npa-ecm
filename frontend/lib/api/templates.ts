import { ERROR_AUTHENTICATION_REQUIRED } from '@/lib/constants';
import { apiFetch, hasTokens } from '../api-client';
import { isRecord, asString } from '@/lib/type-utils';

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

const asStringOrNull = (value: unknown): string | null => {
  if (value === null) return null;
  if (value === undefined) return null;
  return asString(value);
};
const asOneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => {
  if (typeof value !== 'string') return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
};
const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return fallback;
};

const mapApiTemplate = (template: Record<string, unknown>): DocumentTemplate => ({
  id: String(template.id),
  scope: asOneOf(template.scope, ['organization', 'directorate', 'division', 'department', 'user'] as const, 'organization'),
  scopeId: asStringOrNull(template.scope_id),
  title: asString(template.title),
  description: template.description === undefined ? undefined : asString(template.description),
  contentHtml: asString(template.content_html),
  contentText: template.content_text === undefined ? undefined : asString(template.content_text),
  createdBy: template.created_by ? String(template.created_by) : 'system',
  updatedBy: template.updated_by ? String(template.updated_by) : 'system',
  createdAt: asString(template.created_at, new Date().toISOString()),
  updatedAt: asString(template.updated_at, new Date().toISOString()),
  isDefault: template.is_default === undefined ? undefined : asBoolean(template.is_default, false),
  templateType: asOneOf(template.template_type, ['document', 'minute', 'treatment'] as const, 'document'),
  actionType:
    template.action_type === null || template.action_type === undefined
      ? undefined
      : asOneOf(template.action_type, ['minute', 'approve', 'any'] as const, 'any'),
  isActive: template.is_active === undefined ? undefined : asBoolean(template.is_active, true),
});

export const getTemplates = async (params?: {
  scope?: TemplateScope;
  scopeId?: string | null;
  templateType?: TemplateType;
  isActive?: boolean;
}): Promise<DocumentTemplate[]> => {
  if (!hasTokens()) {
    return [];
  }

  const queryParams = new URLSearchParams();
  if (params?.scope) queryParams.append('scope', params.scope);
  if (params?.scopeId) queryParams.append('scope_id', params.scopeId);
  if (params?.templateType) queryParams.append('template_type', params.templateType);
  if (params?.isActive !== undefined) queryParams.append('is_active', String(params.isActive));

  const query = queryParams.toString();
  const endpoint = `/correspondence/templates/${query ? `?${query}` : ''}`;
  const response = await apiFetch<unknown>(endpoint);

  if (Array.isArray(response)) {
    return response.filter(isRecord).map(mapApiTemplate);
  }
  if (isRecord(response) && Array.isArray(response.results)) {
    return response.results.filter(isRecord).map(mapApiTemplate);
  }
  return [];
};

export const getTemplate = async (id: string): Promise<DocumentTemplate> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  const response = await apiFetch<Record<string, unknown>>(`/correspondence/templates/${id}/`);
  return mapApiTemplate(response);
};

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
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return mapApiTemplate(response);
};

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
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description ?? '';
  if (data.contentHtml !== undefined) payload.content_html = data.contentHtml;
  if (data.contentText !== undefined) payload.content_text = data.contentText ?? '';
  if (data.isDefault !== undefined) payload.is_default = data.isDefault;
  if (data.isActive !== undefined) payload.is_active = data.isActive;

  const response = await apiFetch<Record<string, unknown>>(`/correspondence/templates/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return mapApiTemplate(response);
};

export const deleteTemplate = async (id: string): Promise<void> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  await apiFetch(`/correspondence/templates/${id}/`, {
    method: 'DELETE',
  });
};
