import { logError, logInfo } from '@/lib/client-logger';
import { apiFetch, hasTokens } from './api-client';
import type { User } from './npa-structure';

// Re-export apiFetch and hasTokens for use in components
export { apiFetch, hasTokens };

export type DocumentType = 'letter' | 'memo' | 'circular' | 'policy' | 'report' | 'form' | 'other';
export type DocumentStatus = 'draft' | 'published' | 'archived';
export type DocumentSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';
export type PermissionAccess = 'read' | 'write' | 'admin';

export interface DocumentPermission {
  id?: string;
  access: PermissionAccess;
  divisionIds: string[];
  departmentIds: string[];
  gradeLevels: string[];
  userIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
  contentHtml?: string;
  contentJson?: unknown;
  contentText?: string;
  ocrText?: string;
  summary?: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface DocumentCollaborator {
  userId: string;
  startedAt?: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  authorId: string;
  content: string;
  createdAt: string;
  resolved: boolean;
  parentId?: string | null;
  versionId?: string | null;
}

export interface CreateDocumentCommentPayload {
  authorId: string;
  content: string;
  documentId: string;
  versionId?: string | null;
  parentId?: string | null;
}
export interface DocumentRecord {
  id: string;
  title: string;
  description?: string;
  documentType: DocumentType;
  referenceNumber?: string;
  status: DocumentStatus;
  sensitivity: DocumentSensitivity;
  authorId: string;
  divisionId?: string;
  departmentId?: string;
  tags: string[];
  versions: DocumentVersion[];
  permissions: DocumentPermission[];
  createdAt: string;
  updatedAt: string;
  workspaceIds: string[];
  activeEditors: DocumentCollaborator[];
  form_document?: {
    id: string;
    template?: {
      id: string;
      name: string;
      slug: string;
    };
    status?: string;
    signature_workflow?: {
      id: string;
      status: string;
      total_signatures?: number;
      completed_signatures?: number;
    };
  };
}

export interface DocumentCollection {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  documentIds: string[];
  documents?: DocumentRecord[];
  documentCount?: number;
  memberIds: string[];
  members?: User[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentCollectionInput {
  name: string;
  description?: string;
  documentIds?: string[];
  memberIds?: string[];
  isPublic?: boolean;
}

export interface DocumentWorkspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  memberIds: string[];
}

export interface DocumentQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: DocumentStatus | 'all';
  documentType?: DocumentType | 'all';
  divisionId?: string;
  departmentId?: string;
  ordering?: string;
}

export interface PaginatedDocuments {
  results: DocumentRecord[];
  count: number;
  next: string | null;
  previous: string | null;
}

type ApiPayload = Record<string, unknown> | Record<string, unknown>[] | { results?: unknown };

const unwrapResults = <T,>(payload: ApiPayload): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'results' in payload) {
    const results = (payload as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  return [];
};

const mapDocumentPermission = (data: any): DocumentPermission => ({
  id: data.id ? String(data.id) : undefined,
  access: data.access ?? 'read',
  divisionIds: (data.division_ids ?? data.divisions ?? []).map(String),
  departmentIds: (data.department_ids ?? data.departments ?? []).map(String),
  gradeLevels: Array.isArray(data.grade_levels) ? data.grade_levels.map(String) : [],
  userIds: (data.user_ids ?? data.users ?? []).map(String),
  createdAt: data.created_at ?? undefined,
  updatedAt: data.updated_at ?? undefined,
});

const mapDocumentVersion = (data: any): DocumentVersion => ({
  id: String(data.id),
  documentId: String(data.document ?? data.document_id),
  versionNumber: data.version_number ?? 1,
  fileName: data.file_name ?? 'file',
  fileType: data.file_type ?? 'application/octet-stream',
  fileSize: data.file_size ?? 0,
  fileUrl: data.file_url ?? undefined,
  contentHtml: data.content_html ?? undefined,
  contentJson: data.content_json ?? undefined,
  contentText: data.content_text ?? undefined,
  ocrText: data.ocr_text ?? undefined,
  summary: data.summary ?? undefined,
  uploadedBy: data.uploaded_by?.id ? String(data.uploaded_by.id) : String(data.uploaded_by ?? ''),
  uploadedAt: data.uploaded_at ?? new Date().toISOString(),
  notes: data.notes ?? undefined,
});

const mapActiveEditors = (editors: any[]): DocumentCollaborator[] =>
  editors.map((editor) => ({
    userId: String(editor.user?.id ?? editor.user ?? editor.user_id ?? ''),
    startedAt: editor.started_at ?? editor.startedAt ?? undefined,
  }));

const mapDocument = (item: any): DocumentRecord => ({
  id: String(item.id),
  title: item.title ?? 'Untitled Document',
  description: item.description ?? undefined,
  documentType: item.document_type ?? 'other',
  referenceNumber: item.reference_number ?? undefined,
  status: item.status ?? 'draft',
  sensitivity: item.sensitivity ?? 'internal',
  authorId: item.author?.id ? String(item.author.id) : String(item.author ?? ''),
  divisionId: item.division ?? item.division_id ?? undefined,
  departmentId: item.department ?? item.department_id ?? undefined,
  tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
  versions: Array.isArray(item.versions) ? item.versions.map(mapDocumentVersion) : [],
  permissions: Array.isArray(item.permissions) ? item.permissions.map(mapDocumentPermission) : [],
  createdAt: item.created_at ?? new Date().toISOString(),
  updatedAt: item.updated_at ?? new Date().toISOString(),
  workspaceIds: Array.isArray(item.workspaces)
    ? item.workspaces.map((workspace: any) => String(workspace.id ?? workspace))
    : Array.isArray(item.workspace_ids)
      ? item.workspace_ids.map(String)
      : [],
  activeEditors: Array.isArray(item.active_editors)
    ? mapActiveEditors(item.active_editors)
    : Array.isArray(item.activeEditors)
      ? mapActiveEditors(item.activeEditors)
      : [],
  form_document: item.form_document ? {
    id: String(item.form_document.id),
    template: item.form_document.template ? {
      id: String(item.form_document.template.id),
      name: item.form_document.template.name,
      slug: item.form_document.template.slug,
    } : undefined,
    status: item.form_document.status,
    signature_workflow: item.form_document.signature_workflow ? {
      id: String(item.form_document.signature_workflow.id),
      status: item.form_document.signature_workflow.status,
      total_signatures: item.form_document.signature_workflow.total_signatures,
      completed_signatures: item.form_document.signature_workflow.completed_signatures,
    } : undefined,
  } : undefined,
});

const mapCollection = (item: any): DocumentCollection => ({
  id: String(item.id),
  name: item.name ?? 'Collection',
  description: item.description ?? undefined,
  ownerId: String(item.owner_id ?? (item.owner?.id ?? item.owner) ?? ''),
  documentIds: (item.document_ids ?? (item.documents ? unwrapResults<any>(item.documents).map((d: any) => d.id ?? d) : [])).map(String),
  documents: item.documents ? unwrapResults<any>(item.documents).map(mapDocument) : undefined,
  documentCount: item.document_count ?? (item.documents ? unwrapResults<any>(item.documents).length : 0),
  memberIds: Array.isArray(item.member_ids)
    ? item.member_ids.map(String)
    : Array.isArray(item.members)
      ? item.members.map((member: any) => String(member.id ?? member))
      : [],
  members: item.members ? unwrapResults<any>(item.members) : undefined,
  isPublic: item.is_public ?? false,
  createdAt: item.created_at ?? '',
  updatedAt: item.updated_at ?? '',
});

const mapWorkspace = (item: any): DocumentWorkspace => ({
  id: String(item.id),
  name: item.name ?? 'Workspace',
  description: item.description ?? undefined,
  color: item.color ?? '#2563eb',
  memberIds: Array.isArray(item.member_ids)
    ? item.member_ids.map(String)
    : Array.isArray(item.members)
      ? item.members.map((member: any) => String(member.id ?? member))
      : [],
});

let documentsCache: DocumentRecord[] = [];
let workspacesCache: DocumentWorkspace[] = [];

const updateDocumentsCache = (document: DocumentRecord) => {
  documentsCache = [document, ...documentsCache.filter((item) => item.id !== document.id)];
  return documentsCache;
};

export const getCachedDocuments = () => documentsCache;
export const getCachedWorkspaces = () => workspacesCache;

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

export const queryDocuments = async (params: DocumentQueryParams = {}): Promise<PaginatedDocuments> => {
  if (!hasTokens()) {
    console.warn('[DMS] No tokens available, returning empty results');
    return { results: [], count: 0, next: null, previous: null };
  }

  const query = buildDocumentQueryString(params);
  const url = query ? `/dms/documents/?${query}` : '/dms/documents/';
  console.log('[DMS] Fetching documents from:', url);
  
  try {
    console.log('[DMS] Starting apiFetch...');
    const payload = await Promise.race([
      apiFetch<any>(url),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      )
    ]) as any;
    
    console.log('[DMS] Received payload:', { hasResults: !!payload, isArray: Array.isArray(payload), count: payload?.count });

    const results = unwrapResults<any>(payload).map(mapDocument);
    const count = typeof payload?.count === 'number' ? payload.count : results.length;
    const next = typeof payload?.next === 'string' ? payload.next : null;
    const previous = typeof payload?.previous === 'string' ? payload.previous : null;

    console.log('[DMS] Mapped results:', { resultsCount: results.length, count, hasNext: !!next });
    return {
      results,
      count,
      next,
      previous,
    };
  } catch (error) {
    console.error('[DMS] Error in queryDocuments:', error);
    console.error('[DMS] Error details:', { 
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

export const fetchDocuments = async (): Promise<DocumentRecord[]> => {
  if (!hasTokens()) {
    documentsCache = [];
    return documentsCache;
  }

  const response = await queryDocuments({ page: 1, pageSize: 100 });
  documentsCache = response.results;
  return documentsCache;
};

export const fetchDocumentById = async (id: string): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  try {
    const payload = await apiFetch(`/dms/documents/${id}/`);
    const document = mapDocument(payload);
    updateDocumentsCache(document);
    return document;
  } catch (error: any) {
    // For 404 errors (document not found), create a custom error that won't be logged as critically
    if (error?.status === 404) {
      const notFoundError = new Error(error.message || 'Document not found');
      (notFoundError as any).status = 404;
      (notFoundError as any).isNotFound = true;
      throw notFoundError;
    }
    // Re-throw other errors as-is
    throw error;
  }
};

export const fetchWorkspaces = async (): Promise<DocumentWorkspace[]> => {
  if (!hasTokens()) {
    workspacesCache = [];
    return workspacesCache;
  }

  const payload = await apiFetch<ApiPayload>('/dms/workspaces/');
  workspacesCache = unwrapResults<any>(payload).map(mapWorkspace);
  return workspacesCache;
};

// Document Collections API
let collectionsCache: DocumentCollection[] = [];

export const fetchCollections = async (): Promise<DocumentCollection[]> => {
  if (!hasTokens()) {
    collectionsCache = [];
    return collectionsCache;
  }

  const payload = await apiFetch<ApiPayload>('/dms/collections/');
  collectionsCache = unwrapResults<any>(payload).map(mapCollection);
  return collectionsCache;
};

export const fetchCollectionById = async (id: string): Promise<DocumentCollection> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  const data = await apiFetch<any>(`/dms/collections/${id}/`);
  return mapCollection(data);
};

export const createCollection = async (input: CreateDocumentCollectionInput): Promise<DocumentCollection> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  const payload: Record<string, unknown> = {
    name: input.name,
    description: input.description ?? '',
    document_ids: input.documentIds ?? [],
    member_ids: input.memberIds ?? [],
    is_public: input.isPublic ?? false,
  };

  const data = await apiFetch<any>('/dms/collections/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const collection = mapCollection(data);
  collectionsCache = [...collectionsCache, collection];
  return collection;
};

export const updateCollection = async (
  id: string,
  input: Partial<CreateDocumentCollectionInput>
): Promise<DocumentCollection> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description;
  if (input.documentIds !== undefined) payload.document_ids = input.documentIds;
  if (input.memberIds !== undefined) payload.member_ids = input.memberIds;
  if (input.isPublic !== undefined) payload.is_public = input.isPublic;

  const data = await apiFetch<any>(`/dms/collections/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  const collection = mapCollection(data);
  collectionsCache = collectionsCache.map((c) => (c.id === id ? collection : c));
  return collection;
};

export const deleteCollection = async (id: string): Promise<void> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  await apiFetch(`/dms/collections/${id}/`, {
    method: 'DELETE',
  });

  collectionsCache = collectionsCache.filter((c) => c.id !== id);
};

export const addDocumentsToCollection = async (collectionId: string, documentIds: string[]): Promise<void> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  await apiFetch(`/dms/collections/${collectionId}/add-documents/`, {
    method: 'POST',
    body: JSON.stringify({ document_ids: documentIds }),
  });

  // Invalidate cache
  collectionsCache = [];
};

export const removeDocumentsFromCollection = async (collectionId: string, documentIds: string[]): Promise<void> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  await apiFetch(`/dms/collections/${collectionId}/remove-documents/`, {
    method: 'POST',
    body: JSON.stringify({ document_ids: documentIds }),
  });

  // Invalidate cache
  collectionsCache = [];
};

export interface CreateDocumentInput {
  title: string;
  description?: string;
  documentType: DocumentType;
  status: DocumentStatus;
  sensitivity: DocumentSensitivity;
  divisionId?: string;
  departmentId?: string;
  referenceNumber?: string;
  tags?: string[];
  authorId?: string;
  workspaceIds?: string[];
}

export interface CreateDocumentVersionInput {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
  contentHtml?: string;
  contentJson?: unknown;
  notes?: string;
}

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
  if (input.workspaceIds) {
    payload.workspace_ids = input.workspaceIds;
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
    file_url: '', // Default to empty
  };

  // Include file_url if it exists - backend will handle data URLs and convert them to file paths
  if (version.fileUrl) {
    // Send data URLs to backend - backend will decode and save to disk
    if (version.fileUrl.startsWith('data:')) {
      payload.file_url = version.fileUrl;
    } else {
      // For regular URLs, include them as-is
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

export const createDocument = async (
  documentInput: CreateDocumentInput,
  versionInput: CreateDocumentVersionInput,
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  const documentPayload = buildDocumentPayload(documentInput);
  const created = await apiFetch('/dms/documents/', {
    method: 'POST',
    body: JSON.stringify(documentPayload),
  });

  const document = mapDocument(created);
  updateDocumentsCache(document);

  const versionPayload = buildVersionPayload(document.id, versionInput);
  try {
    await apiFetch('/dms/versions/', {
    method: 'POST',
    body: JSON.stringify(versionPayload),
  });
  } catch (error) {
    logError('Failed to create document version:', error);
    throw new Error(`Failed to upload document version: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return fetchDocumentById(document.id);
};

export const createDocumentVersion = async (
  documentId: string,
  versionInput: CreateDocumentVersionInput,
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  const versionPayload = buildVersionPayload(documentId, versionInput);
  try {
    await apiFetch('/dms/versions/', {
    method: 'POST',
    body: JSON.stringify(versionPayload),
  });
  } catch (error) {
    logError('Failed to create document version:', error);
    throw new Error(`Failed to upload document version: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return fetchDocumentById(documentId);
};

export const replaceDocumentVersion = async (
  versionId: string,
  versionInput: CreateDocumentVersionInput,
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  const versionPayload = buildVersionPayload('', versionInput);
  // Remove document field for replacement
  delete versionPayload.document;
  
  try {
    await apiFetch(`/dms/versions/${versionId}/replace/`, {
      method: 'POST',
      body: JSON.stringify(versionPayload),
    });
  } catch (error) {
    logError('Failed to replace document version', error);
    throw new Error(`Failed to replace document version: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Fetch the document to get updated version
  const version = await apiFetch<any>(`/dms/versions/${versionId}/`);
  return fetchDocumentById(version.document);
};

export const updateDocumentMetadata = async (
  documentId: string,
  updates: Partial<CreateDocumentInput>,
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
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
  if (updates.workspaceIds !== undefined) payload.workspace_ids = updates.workspaceIds;

  const updated = await apiFetch(`/dms/documents/${documentId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  const document = mapDocument(updated);
  updateDocumentsCache(document);
  return document;
};

export const updateDocumentWorkspaces = async (
  documentId: string,
  workspaceIds: string[],
): Promise<DocumentRecord> => updateDocumentMetadata(documentId, { workspaceIds });

export const shareDocumentWithUsers = async (
  documentId: string,
  userIds: string[],
  access: PermissionAccess = 'read',
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
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
    throw new Error('Authentication required');
  }

  const { userIds = [], divisionIds = [], departmentIds = [], shareToAll = false, access = 'read', note = '' } = options;

  if (shareToAll) {
    // Use the new share-to-all endpoint
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

export const getAccessibleDocumentsForUser = (user: User): DocumentRecord[] => {
  return documentsCache.filter((document) => userHasPermission(user, document));
};

// Document Comments API
export const getDocumentComments = async (documentId: string, versionId?: string | null): Promise<DocumentComment[]> => {
  if (!hasTokens()) return [];
  
  const params = new URLSearchParams({ document: documentId });
  if (versionId) params.append('version', versionId);
  
  const payload = await apiFetch<ApiPayload>(`/dms/comments/?${params.toString()}`);
  const results = unwrapResults<any>(payload);
  
  return results.map((item: any) => ({
    id: String(item.id),
    documentId: String(item.document ?? item.document_id ?? documentId),
    authorId: String(item.author?.id ?? item.author_id ?? item.author ?? ''),
    content: item.content ?? '',
    createdAt: item.created_at ?? new Date().toISOString(),
    resolved: item.resolved ?? false,
    parentId: item.parent ? String(item.parent) : item.parent_id ? String(item.parent_id) : null,
    versionId: item.version ? String(item.version) : item.version_id ? String(item.version_id) : null,
  }));
};

export const addDocumentComment = async (payload: CreateDocumentCommentPayload): Promise<DocumentComment> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const body: any = {
    document: payload.documentId,
    author_id: payload.authorId,
    content: payload.content,
  };
  
  if (payload.versionId) body.version = payload.versionId;
  if (payload.parentId) body.parent = payload.parentId;
  
  const response = await apiFetch<any>('/dms/comments/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  return {
    id: String(response.id),
    documentId: String(response.document ?? payload.documentId),
    authorId: String(response.author?.id ?? response.author_id ?? payload.authorId),
    content: response.content ?? payload.content,
    createdAt: response.created_at ?? new Date().toISOString(),
    resolved: response.resolved ?? false,
    parentId: response.parent ? String(response.parent) : response.parent_id ? String(response.parent_id) : payload.parentId ?? null,
    versionId: response.version ? String(response.version) : response.version_id ? String(response.version_id) : payload.versionId ?? null,
  };
};

export const resolveDocumentComment = async (commentId: string, resolved: boolean): Promise<DocumentComment | null> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const response = await apiFetch<any>(`/dms/comments/${commentId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ resolved }),
  });
  
  return {
    id: String(response.id),
    documentId: String(response.document ?? response.document_id ?? ''),
    authorId: String(response.author?.id ?? response.author_id ?? response.author ?? ''),
    content: response.content ?? '',
    createdAt: response.created_at ?? new Date().toISOString(),
    resolved: response.resolved ?? resolved,
    parentId: response.parent ? String(response.parent) : response.parent_id ? String(response.parent_id) : null,
    versionId: response.version ? String(response.version) : response.version_id ? String(response.version_id) : null,
  };
};

export const deleteDocumentComment = async (commentId: string): Promise<void> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  await apiFetch(`/dms/comments/${commentId}/`, {
    method: 'DELETE',
  });
};

// Document Discussions API
export interface DocumentDiscussion {
  id: string;
  documentId: string;
  authorId: string;
  message: string;
  createdAt: string;
}

export interface CreateDiscussionPayload {
  documentId: string;
  authorId: string;
  message: string;
}

export const getDocumentDiscussions = async (documentId: string): Promise<DocumentDiscussion[]> => {
  if (!hasTokens()) return [];
  
  const payload = await apiFetch<ApiPayload>(`/dms/discussions/?document=${documentId}`);
  const results = unwrapResults<any>(payload);
  
  return results.map((item: any) => ({
    id: String(item.id),
    documentId: String(item.document ?? item.document_id ?? documentId),
    authorId: String(item.author?.id ?? item.author_id ?? item.author ?? ''),
    message: item.message ?? '',
    createdAt: item.created_at ?? new Date().toISOString(),
  }));
};

export const addDocumentDiscussion = async (payload: CreateDiscussionPayload): Promise<DocumentDiscussion> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const body = {
    document: payload.documentId,
    author_id: payload.authorId,
    message: payload.message,
  };
  
  const response = await apiFetch<any>('/dms/discussions/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  return {
    id: String(response.id),
    documentId: String(response.document ?? payload.documentId),
    authorId: String(response.author?.id ?? response.author_id ?? payload.authorId),
    message: response.message ?? payload.message,
    createdAt: response.created_at ?? new Date().toISOString(),
  };
};

// Editor Sessions API
export interface EditorSession {
  id: string;
  documentId: string;
  userId: string;
  since: string;
  note?: string;
  isActive: boolean;
}

export const getActiveEditorSessions = async (documentId: string): Promise<EditorSession[]> => {
  if (!hasTokens()) return [];
  
  try {
    const payload = await apiFetch<ApiPayload>(`/dms/editor-sessions/?document=${documentId}&is_active=true`);
    const results = unwrapResults<any>(payload);
    
    logInfo('getActiveEditorSessions API response:', { payload, results, documentId });
    
    const sessions = results.map((item: any) => {
      const session = {
        id: String(item.id),
        documentId: String(item.document ?? item.document_id ?? documentId),
        userId: String(item.user?.id ?? item.user_id ?? item.user ?? ''),
        since: item.since ?? item.created_at ?? new Date().toISOString(),
        note: item.note ?? undefined,
        isActive: item.is_active ?? true,
      };
      logInfo('Mapped editor session:', session, 'from item:', item);
      return session;
    });
    
    logInfo('Returning active editor sessions:', sessions);
    return sessions;
  } catch (error) {
    logError('Error fetching active editor sessions:', error);
    return [];
  }
};

export const getEditorSessionForUser = async (documentId: string, userId: string): Promise<EditorSession | null> => {
  if (!hasTokens()) return null;
  
  try {
    const payload = await apiFetch<ApiPayload>(`/dms/editor-sessions/?document=${documentId}&user=${userId}`);
    const results = unwrapResults<any>(payload);
    
    if (results.length > 0) {
      const item = results[0];
      return {
        id: String(item.id),
        documentId: String(item.document ?? item.document_id ?? documentId),
        userId: String(item.user?.id ?? item.user_id ?? item.user ?? userId),
        since: item.since ?? item.created_at ?? new Date().toISOString(),
        note: item.note ?? undefined,
        isActive: item.is_active ?? true,
      };
    }
    return null;
  } catch (error) {
    logError('Failed to get editor session for user', error);
    return null;
  }
};

export const createEditorSession = async (documentId: string, userId: string, note?: string): Promise<EditorSession> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const body: any = { 
    document: documentId,
    user_id: userId,
  };
  if (note) body.note = note;
  
  const response = await apiFetch<any>('/dms/editor-sessions/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  return {
    id: String(response.id),
    documentId: String(response.document ?? response.document_id ?? documentId),
    userId: String(response.user?.id ?? response.user_id ?? response.user ?? userId),
    since: response.since ?? response.created_at ?? new Date().toISOString(),
    note: response.note ?? note ?? undefined,
    isActive: response.is_active ?? true,
  };
};

export const endEditorSession = async (sessionId: string): Promise<void> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  await apiFetch(`/dms/editor-sessions/${sessionId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: false }),
  });
};

// Document Access Logs API
export interface DocumentAccessLog {
  id: string;
  documentId: string;
  userId: string;
  action: 'view' | 'download' | 'attempted-download';
  sensitivity: string;
  timestamp: string;
}

export interface CreateAccessLogPayload {
  documentId: string;
  userId: string;
  action: 'view' | 'download' | 'attempted-download';
  sensitivity: string;
}

export const getDocumentAccessLogs = async (documentId: string): Promise<DocumentAccessLog[]> => {
  if (!hasTokens()) return [];
  
  const payload = await apiFetch<ApiPayload>(`/dms/access-logs/?document=${documentId}`);
  const results = unwrapResults<any>(payload);
  
  return results.map((item: any) => ({
    id: String(item.id),
    documentId: String(item.document ?? item.document_id ?? documentId),
    userId: String(item.user?.id ?? item.user_id ?? item.user ?? ''),
    action: item.action ?? 'view',
    sensitivity: item.sensitivity ?? 'internal',
    timestamp: item.timestamp ?? new Date().toISOString(),
  }));
};

export const logDocumentAccess = async (payload: CreateAccessLogPayload): Promise<DocumentAccessLog> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const body = {
    document: payload.documentId,
    user_id: payload.userId,
    action: payload.action,
    sensitivity: payload.sensitivity,
  };
  
  const response = await apiFetch<any>('/dms/access-logs/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  return {
    id: String(response.id),
    documentId: String(response.document ?? response.document_id ?? payload.documentId),
    userId: String(response.user?.id ?? response.user_id ?? payload.userId),
    action: response.action ?? payload.action,
    sensitivity: response.sensitivity ?? payload.sensitivity,
    timestamp: response.timestamp ?? new Date().toISOString(),
  };
};
export const getAccessLogsForDocument = async () => [] as never[];
export const isSensitiveAccessAllowed = (document: DocumentRecord, user: User | null) => {
  if (!user) return document.sensitivity === 'public';
  return userHasPermission(user, document);
};

// =============================================================================
// BULK OPERATIONS API
// =============================================================================

export interface BulkOperationResult {
  message: string;
  archived_count?: number;
  deleted_count?: number;
  restored_count?: number;
  skipped_count: number;
}

/**
 * Archive multiple documents at once
 */
export const bulkArchiveDocuments = async (documentIds: string[]): Promise<BulkOperationResult> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  if (!documentIds.length) {
    throw new Error('No documents selected');
  }
  
  const response = await apiFetch<BulkOperationResult>('/dms/documents/bulk-archive/', {
    method: 'POST',
    body: JSON.stringify({ document_ids: documentIds }),
  });
  
  return response;
};

/**
 * Delete multiple documents at once (soft delete)
 */
export const bulkDeleteDocuments = async (documentIds: string[]): Promise<BulkOperationResult> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  if (!documentIds.length) {
    throw new Error('No documents selected');
  }
  
  const response = await apiFetch<BulkOperationResult>('/dms/documents/bulk-delete/', {
    method: 'POST',
    body: JSON.stringify({ document_ids: documentIds }),
  });
  
  return response;
};

/**
 * Restore multiple soft-deleted documents
 */
export const bulkRestoreDocuments = async (documentIds: string[]): Promise<BulkOperationResult> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  if (!documentIds.length) {
    throw new Error('No documents selected');
  }
  
  const response = await apiFetch<BulkOperationResult>('/dms/documents/bulk-restore/', {
    method: 'POST',
    body: JSON.stringify({ document_ids: documentIds }),
  });
  
  return response;
};

// =============================================================================
// EXTENDED QUERY PARAMETERS
// =============================================================================

export interface ExtendedDocumentQueryParams extends DocumentQueryParams {
  authorId?: string;
  dateFrom?: string;  // YYYY-MM-DD format
  dateTo?: string;    // YYYY-MM-DD format
}

/**
 * Build query string with extended parameters (author and date range)
 */
const buildExtendedDocumentQueryString = (params: ExtendedDocumentQueryParams) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('page_size', String(params.pageSize));
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params.documentType && params.documentType !== 'all') searchParams.set('document_type', params.documentType);
  if (params.divisionId && params.divisionId !== 'all') searchParams.set('division', params.divisionId);
  if (params.departmentId && params.departmentId !== 'all') searchParams.set('department', params.departmentId);
  if (params.ordering) searchParams.set('ordering', params.ordering);
  // New extended parameters
  if (params.authorId && params.authorId !== 'all') searchParams.set('author', params.authorId);
  if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
  if (params.dateTo) searchParams.set('date_to', params.dateTo);
  return searchParams.toString();
};

/**
 * Query documents with extended filters (author, date range)
 */
export const queryDocumentsExtended = async (params: ExtendedDocumentQueryParams = {}): Promise<PaginatedDocuments> => {
  if (!hasTokens()) {
    console.warn('[DMS] No tokens available, returning empty results');
    return { results: [], count: 0, next: null, previous: null };
  }

  const query = buildExtendedDocumentQueryString(params);
  const url = query ? `/dms/documents/?${query}` : '/dms/documents/';
  
  try {
    const payload = await Promise.race([
      apiFetch<any>(url),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      )
    ]) as any;

    const results = unwrapResults<any>(payload).map(mapDocument);
    const count = typeof payload?.count === 'number' ? payload.count : results.length;
    const next = typeof payload?.next === 'string' ? payload.next : null;
    const previous = typeof payload?.previous === 'string' ? payload.previous : null;

    return { results, count, next, previous };
  } catch (error) {
    console.error('[DMS] Error in queryDocumentsExtended:', error);
    throw error;
  }
};

export interface DocumentStats {
  total: number;
  draft: number;
  published: number;
  archived: number;
}

export const getDocumentStats = async (): Promise<DocumentStats> => {
  if (!hasTokens()) {
    return { total: 0, draft: 0, published: 0, archived: 0 };
  }

  try {
    // Fetch all documents with minimal fields to get counts
    const [allResponse, draftResponse, publishedResponse, archivedResponse] = await Promise.all([
      apiFetch<any>('/dms/documents/?page_size=1'),
      apiFetch<any>('/dms/documents/?status=draft&page_size=1'),
      apiFetch<any>('/dms/documents/?status=published&page_size=1'),
      apiFetch<any>('/dms/documents/?status=archived&page_size=1'),
    ]);

    return {
      total: typeof allResponse?.count === 'number' ? allResponse.count : 0,
      draft: typeof draftResponse?.count === 'number' ? draftResponse.count : 0,
      published: typeof publishedResponse?.count === 'number' ? publishedResponse.count : 0,
      archived: typeof archivedResponse?.count === 'number' ? archivedResponse.count : 0,
    };
  } catch (error) {
    logError('Failed to fetch document stats', error);
    return { total: 0, draft: 0, published: 0, archived: 0 };
  }
};

// =============================================================================
// OCR AND SUMMARY API
// =============================================================================

export interface OCRResult {
  ocr_text: string;
  characters: number;
}

export interface SummaryResult {
  summary: string;
  version_id: string;
}

/**
 * Run OCR on a specific document version
 */
export const runOCROnVersion = async (versionId: string): Promise<OCRResult> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const response = await apiFetch<OCRResult>(`/dms/versions/${versionId}/run-ocr/`, {
    method: 'POST',
  });
  
  return response;
};

/**
 * Generate AI summary for a document
 */
export const generateDocumentSummary = async (documentId: string): Promise<SummaryResult> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const response = await apiFetch<SummaryResult>(`/dms/documents/${documentId}/generate-summary/`, {
    method: 'POST',
  });
  
  return response;
};

// =============================================================================
// REAL-TIME COLLABORATION (WebSocket)
// =============================================================================

export interface DocumentEditorWebSocket {
  connect: () => void;
  disconnect: () => void;
  sendCursorPosition: (position: { line: number; column: number }, selection?: { start: number; end: number }) => void;
  sendContentChange: (changes: any[], version?: number) => void;
  sendTypingStart: () => void;
  sendTypingStop: () => void;
  requestSync: () => void;
  onUserJoined: (callback: (data: { user_id: string; username: string }) => void) => void;
  onUserLeft: (callback: (data: { user_id: string; username: string }) => void) => void;
  onCursorUpdate: (callback: (data: { user_id: string; username: string; position: any; selection?: any }) => void) => void;
  onContentUpdate: (callback: (data: { user_id: string; changes: any[]; version?: number }) => void) => void;
  onTypingIndicator: (callback: (data: { user_id: string; username: string; is_typing: boolean }) => void) => void;
  onActiveEditors: (callback: (editors: { user_id: string; username: string; since?: string }[]) => void) => void;
  onSyncResponse: (callback: (state: any) => void) => void;
}

/**
 * Create a WebSocket connection for real-time document collaboration
 */
export const createDocumentEditorWebSocket = (
  documentId: string,
  token: string
): DocumentEditorWebSocket => {
  let ws: WebSocket | null = null;
  const callbacks: Record<string, ((data: any) => void)[]> = {};
  
  const emit = (event: string, data: any) => {
    const handlers = callbacks[event] || [];
    handlers.forEach(handler => handler(data));
  };
  
  const on = (event: string, callback: (data: any) => void) => {
    if (!callbacks[event]) callbacks[event] = [];
    callbacks[event].push(callback);
  };
  
  const send = (data: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };
  
  return {
    connect: () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host.replace(':3002', ':8002');
      const url = `${protocol}//${host}/ws/documents/${documentId}/edit/?token=${token}`;
      
      ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('[DMS WebSocket] Connected to document', documentId);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          emit(data.type, data);
        } catch (e) {
          console.error('[DMS WebSocket] Failed to parse message:', e);
        }
      };
      
      ws.onclose = () => {
        console.log('[DMS WebSocket] Disconnected');
      };
      
      ws.onerror = (error) => {
        console.error('[DMS WebSocket] Error:', error);
      };
    },
    
    disconnect: () => {
      if (ws) {
        ws.close();
        ws = null;
      }
    },
    
    sendCursorPosition: (position, selection) => {
      send({ type: 'cursor_move', position, selection });
    },
    
    sendContentChange: (changes, version) => {
      send({ type: 'content_change', changes, version });
    },
    
    sendTypingStart: () => {
      send({ type: 'typing_start' });
    },
    
    sendTypingStop: () => {
      send({ type: 'typing_stop' });
    },
    
    requestSync: () => {
      send({ type: 'request_sync' });
    },
    
    onUserJoined: (callback) => on('user_joined', callback),
    onUserLeft: (callback) => on('user_left', callback),
    onCursorUpdate: (callback) => on('cursor_update', callback),
    onContentUpdate: (callback) => on('content_update', callback),
    onTypingIndicator: (callback) => on('typing_indicator', callback),
    onActiveEditors: (callback) => on('active_editors', callback),
    onSyncResponse: (callback) => on('sync_response', callback),
  };
};