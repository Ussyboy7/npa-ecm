import { ERROR_AUTHENTICATION_REQUIRED } from '@/lib/constants';
import { apiFetch, hasTokens } from './api-client';
import type { DocumentTemplate, DocumentTemplateInput, CreateDocumentFromTemplateInput, DocumentType, DocumentStatus, DocumentRecord } from './dms-types';
import { mapDocument } from './dms-types';

const mapTemplate = (apiTemplate: Record<string, unknown>): DocumentTemplate => {
  const createdByObj = apiTemplate.created_by_obj as Record<string, unknown> | undefined;
  return {
    id: String(apiTemplate.id),
    name: String(apiTemplate.name),
    description: typeof apiTemplate.description === 'string' ? apiTemplate.description : undefined,
    documentType: apiTemplate.document_type as DocumentType,
    defaultStatus: apiTemplate.default_status as DocumentStatus,
    defaultSensitivity: apiTemplate.default_sensitivity as DocumentRecord['sensitivity'],
    defaultDivisionId: typeof apiTemplate.default_division === 'string' ? apiTemplate.default_division : undefined,
    defaultDepartmentId: typeof apiTemplate.default_department === 'string' ? apiTemplate.default_department : undefined,
    defaultTags: Array.isArray(apiTemplate.default_tags) ? apiTemplate.default_tags.map(String) : [],
    templateContent: typeof apiTemplate.template_content === 'string' ? apiTemplate.template_content : undefined,
    templateMetadata: (apiTemplate.template_metadata && typeof apiTemplate.template_metadata === 'object')
      ? apiTemplate.template_metadata as Record<string, unknown>
      : {},
    isActive: typeof apiTemplate.is_active === 'boolean' ? apiTemplate.is_active : true,
    createdById: typeof apiTemplate.created_by === 'string' ? apiTemplate.created_by : undefined,
    createdBy: createdByObj
      ? {
          id: String(createdByObj.id),
          name: String(createdByObj.name || createdByObj.username || ''),
          email: String(createdByObj.email || ''),
        }
      : undefined,
    usageCount: typeof apiTemplate.usage_count === 'number' ? apiTemplate.usage_count : 0,
    createdAt: String(apiTemplate.created_at),
    updatedAt: String(apiTemplate.updated_at),
  };
};

export const getDocumentTemplates = async (params?: {
  documentType?: DocumentType;
  isActive?: boolean;
  search?: string;
}): Promise<DocumentTemplate[]> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const searchParams = new URLSearchParams();
  if (params?.documentType) searchParams.append('document_type', params.documentType);
  if (params?.isActive !== undefined) searchParams.append('is_active', String(params.isActive));
  if (params?.search) searchParams.append('search', params.search);

  const url = `/dms/templates/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await apiFetch<Record<string, unknown> | Record<string, unknown>[]>(url);
  const results = Array.isArray(response) ? response : (Array.isArray(response.results) ? response.results : []);
  return results.map((item: Record<string, unknown>) => mapTemplate(item));
};

export const getDocumentTemplateById = async (id: string): Promise<DocumentTemplate> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const response = await apiFetch<Record<string, unknown>>(`/dms/templates/${id}/`);
  return mapTemplate(response);
};

export const createDocumentTemplate = async (input: DocumentTemplateInput): Promise<DocumentTemplate> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const payload = {
    name: input.name,
    description: input.description || '',
    document_type: input.documentType,
    default_status: input.defaultStatus || 'draft',
    default_sensitivity: input.defaultSensitivity || 'internal',
    default_division: input.defaultDivisionId || null,
    default_department: input.defaultDepartmentId || null,
    default_tags: input.defaultTags || [],
    template_content: input.templateContent || '',
    template_metadata: input.templateMetadata || {},
    is_active: input.isActive !== undefined ? input.isActive : true,
  };

  const response = await apiFetch<Record<string, unknown>>('/dms/templates/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return mapTemplate(response);
};

export const updateDocumentTemplate = async (
  id: string,
  input: Partial<DocumentTemplateInput>,
): Promise<DocumentTemplate> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description;
  if (input.documentType !== undefined) payload.document_type = input.documentType;
  if (input.defaultStatus !== undefined) payload.default_status = input.defaultStatus;
  if (input.defaultSensitivity !== undefined) payload.default_sensitivity = input.defaultSensitivity;
  if (input.defaultDivisionId !== undefined) payload.default_division = input.defaultDivisionId || null;
  if (input.defaultDepartmentId !== undefined) payload.default_department = input.defaultDepartmentId || null;
  if (input.defaultTags !== undefined) payload.default_tags = input.defaultTags;
  if (input.templateContent !== undefined) payload.template_content = input.templateContent;
  if (input.templateMetadata !== undefined) payload.template_metadata = input.templateMetadata;
  if (input.isActive !== undefined) payload.is_active = input.isActive;

  const response = await apiFetch<Record<string, unknown>>(`/dms/templates/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return mapTemplate(response);
};

export const deleteDocumentTemplate = async (id: string): Promise<void> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  await apiFetch(`/dms/templates/${id}/`, {
    method: 'DELETE',
  });
};

export const createDocumentFromTemplate = async (
  templateId: string,
  input: CreateDocumentFromTemplateInput,
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const payload: Record<string, unknown> = {
    document: {
      title: input.title,
      description: input.description,
      document_type: input.documentType,
      status: input.status,
      sensitivity: input.sensitivity,
      division: input.division,
      department: input.department,
      tags: input.tags || [],
    },
  };

  if (input.file) {
    payload.file = input.file;
  }

  const response = await apiFetch<Record<string, unknown>>(`/dms/templates/${templateId}/create_document/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return mapDocument(response);
};
