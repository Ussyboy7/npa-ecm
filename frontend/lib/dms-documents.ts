import { ERROR_AUTHENTICATION_REQUIRED, ERROR_UNKNOWN } from '@/lib/constants';
import { apiFetch, hasTokens } from './api-client';
import { fetchAllPaginatedResults } from '@/lib/pagination-utils';
import { logInfo, logWarn } from '@/lib/client-logger';
import { unwrapResults } from '@/lib/type-utils';
import type { User } from './npa-structure';
import type { Correspondence, Minute } from './npa-structure';
import type { ApiCorrespondence, ApiMinute } from '@/lib/api/correspondence';
import { mapApiCorrespondence, mapApiMinute } from '@/lib/api/correspondence-mappers';
import { isRecord } from '@/lib/type-utils';
import type {
  DocumentQueryParams,
  PaginatedDocuments,
  DocumentRecord,
  PermissionAccess,
  CreateDocumentInput,
  CreateDocumentVersionInput,
} from './dms-types';
import { mapDocument } from './dms-types';

// ============ HELPERS ============

const buildDocumentQueryString = (params: DocumentQueryParams) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('page_size', String(params.pageSize));
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params.documentType && params.documentType !== 'all') searchParams.set('document_type', params.documentType);
  if (params.divisionId && params.divisionId !== 'all') searchParams.set('division', params.divisionId);
  if (params.departmentId && params.departmentId !== 'all') searchParams.set('department', params.departmentId);
  if (params.ordering) searchParams.set('ordering', params.ordering);
  return searchParams.toString();
};

const buildDocumentPayload = (input: CreateDocumentInput) => {
  const payload: Record<string, unknown> = {
    title: input.title,
    description: input.description ?? '',
    document_type: input.documentType,
    status: input.status,
    sensitivity: input.sensitivity,
    division: input.divisionId ?? null,
    department: input.departmentId ?? null,
    reference_number: input.referenceNumber ?? '',
    tags: input.tags ?? [],
  };

  if (input.authorId) {
    payload.author_id = input.authorId;
  }
  if (input.drmPolicyId !== undefined) {
    payload.drm_policy_id = input.drmPolicyId;
  }
  return payload;
};

const buildVersionPayload = (documentId: string, version: CreateDocumentVersionInput) => {
  const payload: Record<string, unknown> = {
    document: documentId,
    file_name: version.fileName,
    file_type: version.fileType,
    file_size: version.fileSize,
    content_html: version.contentHtml ?? '',
    content_json: version.contentJson ?? null,
    notes: version.notes ?? '',
    file_url: '',
  };

  if (version.fileUrl) {
    if (version.fileUrl.startsWith('data:')) {
      payload.file_url = version.fileUrl;
    } else {
      try {
        const url = new URL(version.fileUrl);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          payload.file_url = version.fileUrl;
        }
      } catch {
        // Invalid URL, leave file_url empty
      }
    }
  }

  return payload;
};

// ============ QUERIES ============

export const queryDocuments = async (params: DocumentQueryParams = {}): Promise<PaginatedDocuments> => {
  if (!hasTokens()) {
    logWarn('[DMS] No tokens available, returning empty results');
    return { results: [], count: 0, next: null, previous: null };
  }

  const query = buildDocumentQueryString(params);
  const url = query ? `/dms/documents/?${query}` : '/dms/documents/';
  logInfo('[DMS] Fetching documents from:', url);

  logInfo('[DMS] Starting apiFetch...');
  const payload = await apiFetch<Record<string, unknown>>(url) as Record<string, unknown> | {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: unknown[];
  };

  logInfo('[DMS] Received payload:', { hasResults: !!payload, isArray: Array.isArray(payload), count: payload?.count });

  const results = (unwrapResults(payload) as Record<string, unknown>[]).map(mapDocument);
  const count = typeof payload?.count === 'number' ? payload.count : results.length;
  const next = typeof payload?.next === 'string' ? payload.next : null;
  const previous = typeof payload?.previous === 'string' ? payload.previous : null;

  logInfo('[DMS] Mapped results:', { resultsCount: results.length, count, hasNext: !!next });
  return {
    results,
    count,
    next,
    previous,
  };
};

export const fetchDocuments = async (): Promise<DocumentRecord[]> => {
  if (!hasTokens()) {
    return [];
  }

  return fetchAllPaginatedResults((page, pageSize) =>
    queryDocuments({ page, pageSize }),
  );
};

export const fetchDocumentById = async (id: string): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  try {
    const payload = await apiFetch<Record<string, unknown>>(`/dms/documents/${id}/`);
    const document = mapDocument(payload);
    return document;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      const notFoundError = new Error(
        ('message' in error && typeof error.message === 'string') ? error.message : 'Document not found'
      );
      (notFoundError as { status?: number; isNotFound?: boolean }).status = 404;
      (notFoundError as { status?: number; isNotFound?: boolean }).isNotFound = true;
      throw notFoundError;
    }
    throw error;
  }
};

export type DocumentRelatedCorrespondenceItem = {
  correspondence: Correspondence;
  minutes: Minute[];
  linkNotes?: string;
};

export const fetchDocumentRelatedCorrespondence = async (
  documentId: string,
): Promise<DocumentRelatedCorrespondenceItem[]> => {
  if (!hasTokens()) return [];

  const payload = await apiFetch<unknown>(`/dms/documents/${documentId}/related-correspondence/`);
  if (!Array.isArray(payload)) return [];

  return payload.filter(isRecord).map((row) => ({
    correspondence: mapApiCorrespondence(row.correspondence as ApiCorrespondence),
    minutes: Array.isArray(row.minutes)
      ? row.minutes.filter(isRecord).map((item) => mapApiMinute(item as ApiMinute))
      : [],
    linkNotes: typeof row.link_notes === 'string' ? row.link_notes : undefined,
  }));
};

// ============ CREATE / UPDATE / REPLACE ============

export const createDocument = async (
  documentInput: CreateDocumentInput,
  versionInput: CreateDocumentVersionInput,
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const documentPayload = buildDocumentPayload(documentInput);
  const created = await apiFetch<Record<string, unknown>>('/dms/documents/', {
    method: 'POST',
    body: JSON.stringify(documentPayload),
  });

  const document = mapDocument(created);

  const versionPayload = buildVersionPayload(document.id, versionInput);
  await apiFetch('/dms/versions/', {
    method: 'POST',
    body: JSON.stringify(versionPayload),
  });

  return fetchDocumentById(document.id);
};

export const createDocumentVersion = async (
  documentId: string,
  versionInput: CreateDocumentVersionInput,
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const versionPayload = buildVersionPayload(documentId, versionInput);
  await apiFetch('/dms/versions/', {
    method: 'POST',
    body: JSON.stringify(versionPayload),
  });

  return fetchDocumentById(documentId);
};

export const replaceDocumentVersion = async (
  versionId: string,
  versionInput: CreateDocumentVersionInput,
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const versionPayload = buildVersionPayload('', versionInput);
  delete versionPayload.document;

  await apiFetch(`/dms/versions/${versionId}/replace/`, {
    method: 'POST',
    body: JSON.stringify(versionPayload),
  });

  const version = await apiFetch<Record<string, unknown>>(`/dms/versions/${versionId}/`);
  return fetchDocumentById(String(version.document));
};

export const updateDocumentMetadata = async (
  documentId: string,
  updates: Partial<CreateDocumentInput>,
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.documentType !== undefined) payload.document_type = updates.documentType;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.sensitivity !== undefined) payload.sensitivity = updates.sensitivity;
  if (updates.divisionId !== undefined) payload.division = updates.divisionId ?? null;
  if (updates.departmentId !== undefined) payload.department = updates.departmentId ?? null;
  if (updates.referenceNumber !== undefined) payload.reference_number = updates.referenceNumber ?? '';
  if (updates.tags !== undefined) payload.tags = updates.tags;
  if (updates.drmPolicyId !== undefined) payload.drm_policy_id = updates.drmPolicyId;
  const updated = await apiFetch<Record<string, unknown>>(`/dms/documents/${documentId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  const document = mapDocument(updated);
  return document;
};

/** Download a document version through the DRM-enforced API endpoint. */
export const downloadDocumentVersion = async (
  versionId: string,
  fileName?: string,
): Promise<void> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const blob = await apiFetch<Blob>(`/dms/versions/${versionId}/download/`, {
    responseType: 'blob',
  });
  // Force a save dialog — browsers often open application/pdf in a viewer instead of downloading.
  const saveBlob = new Blob([blob], { type: 'application/octet-stream' });
  const blobUrl = URL.createObjectURL(saveBlob);
  const link = window.document.createElement('a');
  link.href = blobUrl;
  link.download = fileName?.trim() || 'document';
  link.rel = 'noopener';
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2_000);
};

/** Inline/preview stream (view-allowed); applies DRM watermark when policy sets one. */
export const fetchDocumentVersionContent = async (versionId: string): Promise<Blob> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }
  return apiFetch<Blob>(`/dms/versions/${versionId}/content/`, {
    responseType: 'blob',
  });
};

/** Print/inline stream blocked when DRM disallows print. */
export const fetchDocumentVersionPrint = async (versionId: string): Promise<Blob> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }
  return apiFetch<Blob>(`/dms/versions/${versionId}/print/`, {
    responseType: 'blob',
  });
};

export const canDownloadDocument = (document: DocumentRecord | null | undefined): boolean => {
  if (!document) return false;
  const rights = document.drmRights;
  if (!rights) return true;
  if (rights.expired || rights.view_only) return false;
  return rights.allow_download !== false;
};

export const canPrintDocument = (document: DocumentRecord | null | undefined): boolean => {
  if (!document) return false;
  const rights = document.drmRights;
  if (!rights) return true;
  if (rights.expired || rights.view_only) return false;
  return rights.allow_print !== false;
};

export const canShareDocument = (document: DocumentRecord | null | undefined): boolean => {
  if (!document) return false;
  const rights = document.drmRights;
  if (!rights) return true;
  if (rights.expired) return false;
  return rights.allow_external_share !== false;
};

/** True when version bytes must be loaded via /content|download (no raw media URL). */
export const versionRequiresApiDelivery = (version: { fileUrl?: string; drmDelivery?: string; hasFile?: boolean } | null | undefined): boolean => {
  if (!version) return false;
  if (version.drmDelivery === 'api') return true;
  if (version.drmDelivery === 'media') return false;
  return Boolean(version.hasFile && !(version.fileUrl || '').trim());
};

// ============ SHARING ============

export const shareDocumentWithUsers = async (
  documentId: string,
  userIds: string[],
  access: PermissionAccess = 'read',
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const recipients = Array.from(new Set(userIds.filter(Boolean)));
  if (recipients.length === 0) {
    throw new Error('Select at least one recipient');
  }

  await apiFetch('/dms/permissions/', {
    method: 'POST',
    body: JSON.stringify({
      document: documentId,
      access,
      user_ids: recipients,
    }),
  });

  return fetchDocumentById(documentId);
};

export const shareDocument = async (
  documentId: string,
  options: {
    userIds?: string[];
    divisionIds?: string[];
    departmentIds?: string[];
    shareToAll?: boolean;
    access?: PermissionAccess;
    note?: string;
  },
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const {
    userIds = [],
    divisionIds = [],
    departmentIds = [],
    shareToAll = false,
    access = 'read',
    note = '',
  } = options;

  if (shareToAll) {
    await apiFetch('/dms/permissions/share-to-all/', {
      method: 'POST',
      body: JSON.stringify({
        document: documentId,
        access,
        note,
      }),
    });
  } else {
    const hasSelection = userIds.length > 0 || divisionIds.length > 0 || departmentIds.length > 0;
    if (!hasSelection) {
      throw new Error('Select at least one recipient, division, or department');
    }

    await apiFetch('/dms/permissions/', {
      method: 'POST',
      body: JSON.stringify({
        document: documentId,
        access,
        note,
        user_ids: Array.from(new Set(userIds.filter(Boolean))),
        division_ids: Array.from(new Set(divisionIds.filter(Boolean))),
        department_ids: Array.from(new Set(departmentIds.filter(Boolean))),
      }),
    });
  }

  return fetchDocumentById(documentId);
};

// ============ PERMISSION CHECKS ============

const userHasWorkspaceAccess = (user: User, document: DocumentRecord) => {
  if (document.divisionId && user.division && document.divisionId === user.division) return true;
  if (document.departmentId && user.department && document.departmentId === user.department) return true;
  return false;
};

export const userHasPermission = (user: User, document: DocumentRecord): boolean => {
  if (document.authorId === user.id) return true;

  for (const permission of document.permissions) {
    if (permission.userIds.includes(user.id)) return true;
    if (permission.divisionIds.length && user.division && permission.divisionIds.includes(user.division)) return true;
    if (permission.departmentIds.length && user.department && permission.departmentIds.includes(user.department)) return true;
    if (permission.gradeLevels.length && permission.gradeLevels.includes(user.gradeLevel)) return true;
  }

  if (userHasWorkspaceAccess(user, document)) return true;

  if (document.status === 'published') return true;
  if (document.sensitivity === 'public') return true;
  if (document.sensitivity === 'internal') return true;

  if (document.sensitivity === 'confidential') {
    return ['MSS5', 'MSS4', 'MSS3', 'MSS2', 'MSS1', 'EDCS', 'MDCS'].includes(user.gradeLevel);
  }

  if (document.sensitivity === 'restricted') {
    return document.authorId === user.id || ['MSS1', 'EDCS', 'MDCS'].includes(user.gradeLevel);
  }

  return false;
};
