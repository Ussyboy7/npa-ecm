import { logError, logInfo, logWarn } from '@/lib/client-logger';
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
  case_links?: Array<{
    id: string;
    case: {
      id: string;
      caseNumber: string;
      title: string;
      status: string;
    };
    notes?: string;
  }>;
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

const mapDocumentPermission = (data: Record<string, unknown>): DocumentPermission => ({
  id: data.id ? String(data.id) : undefined,
  access: (data.access as PermissionAccess) ?? 'read',
  divisionIds: Array.isArray(data.division_ids) ? data.division_ids.map(String) : (Array.isArray(data.divisions) ? data.divisions.map(String) : []),
  departmentIds: Array.isArray(data.department_ids) ? data.department_ids.map(String) : (Array.isArray(data.departments) ? data.departments.map(String) : []),
  gradeLevels: Array.isArray(data.grade_levels) ? data.grade_levels.map(String) : [],
  userIds: Array.isArray(data.user_ids) ? data.user_ids.map(String) : (Array.isArray(data.users) ? data.users.map(String) : []),
  createdAt: data.created_at ? String(data.created_at) : undefined,
  updatedAt: data.updated_at ? String(data.updated_at) : undefined,
});

const mapDocumentVersion = (data: Record<string, unknown>): DocumentVersion => {
  const uploadedBy = data.uploaded_by as Record<string, unknown> | undefined;
  return {
    id: String(data.id),
    documentId: String(data.document ?? data.document_id),
    versionNumber: typeof data.version_number === 'number' ? data.version_number : 1,
    fileName: typeof data.file_name === 'string' ? data.file_name : 'file',
    fileType: typeof data.file_type === 'string' ? data.file_type : 'application/octet-stream',
    fileSize: typeof data.file_size === 'number' ? data.file_size : 0,
    fileUrl: typeof data.file_url === 'string' ? data.file_url : undefined,
    contentHtml: typeof data.content_html === 'string' ? data.content_html : undefined,
    contentJson: data.content_json,
    contentText: typeof data.content_text === 'string' ? data.content_text : undefined,
    ocrText: typeof data.ocr_text === 'string' ? data.ocr_text : undefined,
    summary: typeof data.summary === 'string' ? data.summary : undefined,
    uploadedBy: (uploadedBy && 'id' in uploadedBy) ? String(uploadedBy.id) : String(data.uploaded_by ?? ''),
    uploadedAt: typeof data.uploaded_at === 'string' ? data.uploaded_at : new Date().toISOString(),
    notes: typeof data.notes === 'string' ? data.notes : undefined,
  };
};

const mapActiveEditors = (editors: unknown[]): DocumentCollaborator[] =>
  editors.map((editor) => {
    const editorObj = editor as Record<string, unknown>;
    return {
      userId: String(
        (editorObj.user && typeof editorObj.user === 'object' && 'id' in editorObj.user)
          ? (editorObj.user as { id: unknown }).id
          : editorObj.user ?? editorObj.user_id ?? ''
      ),
      startedAt: typeof editorObj.started_at === 'string' ? editorObj.started_at : (typeof editorObj.startedAt === 'string' ? editorObj.startedAt : undefined),
    };
  });

const mapDocument = (item: Record<string, unknown>): DocumentRecord => {
  const author = item.author as Record<string, unknown> | undefined;
  const formDoc = item.form_document as Record<string, unknown> | undefined;
  const formTemplate = formDoc?.template as Record<string, unknown> | undefined;
  const formWorkflow = formDoc?.signature_workflow as Record<string, unknown> | undefined;
  
  return {
    id: String(item.id as string),
    title: typeof item.title as string === 'string' ? item.title as string : 'Untitled Document',
    description: typeof item.description === 'string' ? item.description : undefined,
    documentType: (item.document_type as DocumentType) ?? 'other',
    referenceNumber: typeof item.reference_number === 'string' ? item.reference_number : undefined,
    status: (item.status as string as DocumentStatus) ?? 'draft',
    sensitivity: (item.sensitivity as DocumentSensitivity) ?? 'internal',
    authorId: (author && 'id' in author) ? String(author.id) : String(item.author ?? ''),
    divisionId: typeof item.division === 'string' ? item.division : (typeof item.division_id === 'string' ? item.division_id : undefined),
    departmentId: typeof item.department === 'string' ? item.department : (typeof item.department_id === 'string' ? item.department_id : undefined),
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    versions: Array.isArray(item.versions) ? item.versions.map(mapDocumentVersion) : [],
    permissions: Array.isArray(item.permissions) ? item.permissions.map(mapDocumentPermission) : [],
    createdAt: typeof item.created_at === 'string' ? item.created_at : new Date().toISOString(),
    updatedAt: typeof item.updated_at === 'string' ? item.updated_at : new Date().toISOString(),
    workspaceIds: Array.isArray(item.workspaces)
      ? item.workspaces.map((workspace: Record<string, unknown>) => String(workspace.id ?? workspace))
      : Array.isArray(item.workspace_ids)
        ? item.workspace_ids.map(String)
        : [],
    activeEditors: Array.isArray(item.active_editors)
      ? mapActiveEditors(item.active_editors)
      : Array.isArray(item.activeEditors)
        ? mapActiveEditors(item.activeEditors)
        : [],
    form_document: formDoc ? {
      id: String(formDoc.id),
      template: formTemplate ? {
        id: String(formTemplate.id),
        name: String(formTemplate.name),
        slug: String(formTemplate.slug),
      } : undefined,
      status: typeof formDoc.status === 'string' ? formDoc.status : undefined,
      signature_workflow: formWorkflow ? {
        id: String(formWorkflow.id),
        status: String(formWorkflow.status),
        total_signatures: typeof formWorkflow.total_signatures === 'number' ? formWorkflow.total_signatures : undefined,
        completed_signatures: typeof formWorkflow.completed_signatures === 'number' ? formWorkflow.completed_signatures : undefined,
      } : undefined,
    } : undefined,
  };
};

const mapCollection = (item: Record<string, unknown>): DocumentCollection => {
  const owner = item.owner as Record<string, unknown> | undefined;
  return {
    id: String(item.id as string),
    name: typeof item.name === 'string' ? item.name : 'Collection',
    description: typeof item.description === 'string' ? item.description : undefined,
    ownerId: String(item.owner_id ?? (owner && 'id' in owner ? owner.id : item.owner) ?? ''),
    documentIds: Array.isArray(item.document_ids) 
      ? item.document_ids.map(String)
      : (item.documents ? unwrapResults<Record<string, unknown>>(item.documents).map((d: Record<string, unknown>) => String(d.id ?? d)) : []),
    documents: item.documents ? unwrapResults<Record<string, unknown>>(item.documents).map(mapDocument) : undefined,
    documentCount: typeof item.document_count === 'number' ? item.document_count : (item.documents ? unwrapResults<Record<string, unknown>>(item.documents).length : 0),
    memberIds: Array.isArray(item.member_ids)
      ? item.member_ids.map(String)
      : Array.isArray(item.members)
        ? item.members.map((member: Record<string, unknown>) => String(member.id ?? member))
        : [],
    members: item.members ? unwrapResults<Record<string, unknown>>(item.members).map((m: Record<string, unknown>) => m as User) : undefined,
    isPublic: typeof item.is_public === 'boolean' ? item.is_public : false,
    createdAt: typeof item.created_at === 'string' ? item.created_at : '',
    updatedAt: typeof item.updated_at === 'string' ? item.updated_at : '',
  };
};

const mapWorkspace = (item: Record<string, unknown>): DocumentWorkspace => ({
  id: String(item.id as string),
  name: typeof item.name === 'string' ? item.name : 'Workspace',
  description: typeof item.description === 'string' ? item.description : undefined,
  color: typeof item.color === 'string' ? item.color : '#2563eb',
  memberIds: Array.isArray(item.member_ids)
    ? item.member_ids.map(String)
    : Array.isArray(item.members)
      ? item.members.map((member: Record<string, unknown>) => String(member.id ?? member))
      : [],
});

let documentsCache: DocumentRecord[] = [];
let workspacesCache: DocumentWorkspace[] = [];

const updateDocumentsCache = (document: DocumentRecord) => {
  documentsCache = [document, ...documentsCache.filter((item) => item.id as string !== document.id)];
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
    logWarn('[DMS] No tokens available, returning empty results');
    return { results: [], count: 0, next: null, previous: null };
  }

  const query = buildDocumentQueryString(params);
  const url = query ? `/dms/documents/?${query}` : '/dms/documents/';
  logInfo('[DMS] Fetching documents from:', url);
  
  try {
    logInfo('[DMS] Starting apiFetch...');
    const payload = await Promise.race([
      apiFetch<Record<string, unknown>>(url),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      )
    ]) as Record<string, unknown> | { count?: number; next?: string | null; previous?: string | null; results?: unknown[] };
    
    logInfo('[DMS] Received payload:', { hasResults: !!payload, isArray: Array.isArray(payload), count: payload?.count });

    const results = unwrapResults<Record<string, unknown>>(payload).map(mapDocument);
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
      } catch (error: unknown) {
    logError('[DMS] Error in queryDocuments:', error);
    logError('[DMS] Error details:', { 
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
    const payload = await apiFetch<Record<string, unknown>>(`/dms/documents/${id}/`);
    const document = mapDocument(payload);
    updateDocumentsCache(document);
    return document;
  } catch (error: unknown) {
    // For 404 errors (document not found), create a custom error that won't be logged as critically
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      const notFoundError = new Error(('message' in error && typeof error.message === 'string') ? error.message : 'Document not found');
      (notFoundError as { status?: number; isNotFound?: boolean }).status = 404;
      (notFoundError as { status?: number; isNotFound?: boolean }).isNotFound = true;
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
  workspacesCache = unwrapResults<Record<string, unknown>>(payload).map(mapWorkspace);
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
  collectionsCache = unwrapResults<Record<string, unknown>>(payload).map(mapCollection);
  return collectionsCache;
};

export const fetchCollectionById = async (id: string): Promise<DocumentCollection> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  const data = await apiFetch<Record<string, unknown>>(`/dms/collections/${id}/`);
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

  const data = await apiFetch<Record<string, unknown>>('/dms/collections/', {
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

  const data = await apiFetch<Record<string, unknown>>(`/dms/collections/${id}/`, {
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
  const created = await apiFetch<Record<string, unknown>>('/dms/documents/', {
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
      } catch (error: unknown) {
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
      } catch (error: unknown) {
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
      } catch (error: unknown) {
    logError('Failed to replace document version', error);
    throw new Error(`Failed to replace document version: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Fetch the document to get updated version
  const version = await apiFetch<Record<string, unknown>>(`/dms/versions/${versionId}/`);
  return fetchDocumentById(String(version.document));
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

  const updated = await apiFetch<Record<string, unknown>>(`/dms/documents/${documentId}/`, {
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
  const results = unwrapResults<Record<string, unknown>>(payload);
  
  return results.map((item: Record<string, unknown>) => {
    const author = item.author as Record<string, unknown> | undefined;
    return {
      id: String(item.id as string),
      documentId: String(item.document ?? item.document_id ?? documentId),
      authorId: String((author && 'id' in author) ? author.id : item.author_id ?? item.author ?? ''),
      content: typeof item.content === 'string' ? item.content : '',
      createdAt: typeof item.created_at === 'string' ? item.created_at : new Date().toISOString(),
      resolved: typeof item.resolved === 'boolean' ? item.resolved : false,
      parentId: item.parent ? String(item.parent) : (item.parent_id ? String(item.parent_id) : null),
      versionId: item.version ? String(item.version) : (item.version_id ? String(item.version_id) : null),
    };
  });
};

export const addDocumentComment = async (payload: CreateDocumentCommentPayload): Promise<DocumentComment> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const body: Record<string, unknown> = {
    document: payload.documentId,
    author_id: payload.authorId,
    content: payload.content,
  };
  
  if (payload.versionId) body.version = payload.versionId;
  if (payload.parentId) body.parent = payload.parentId;
  
  const response = await apiFetch<Record<string, unknown>>('/dms/comments/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  const author = response.author as Record<string, unknown> | undefined;
  return {
    id: String(response.id),
    documentId: String(response.document ?? payload.documentId),
    authorId: String((author && 'id' in author) ? author.id : response.author_id ?? payload.authorId),
    content: typeof response.content === 'string' ? response.content : payload.content,
    createdAt: typeof response.created_at === 'string' ? response.created_at : new Date().toISOString(),
    resolved: typeof response.resolved === 'boolean' ? response.resolved : false,
    parentId: response.parent ? String(response.parent) : (response.parent_id ? String(response.parent_id) : payload.parentId ?? null),
    versionId: response.version ? String(response.version) : (response.version_id ? String(response.version_id) : payload.versionId ?? null),
  };
};

export const resolveDocumentComment = async (commentId: string, resolved: boolean): Promise<DocumentComment | null> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const response = await apiFetch<Record<string, unknown>>(`/dms/comments/${commentId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ resolved }),
  });
  
  const author = response.author as Record<string, unknown> | undefined;
  return {
    id: String(response.id),
    documentId: String(response.document ?? response.document_id ?? ''),
    authorId: String((author && 'id' in author) ? author.id : response.author_id ?? response.author ?? ''),
    content: typeof response.content === 'string' ? response.content : '',
    createdAt: typeof response.created_at === 'string' ? response.created_at : new Date().toISOString(),
    resolved: typeof response.resolved === 'boolean' ? response.resolved : resolved,
    parentId: response.parent ? String(response.parent) : (response.parent_id ? String(response.parent_id) : null),
    versionId: response.version ? String(response.version) : (response.version_id ? String(response.version_id) : null),
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
  const results = unwrapResults<Record<string, unknown>>(payload);
  
  return results.map((item: Record<string, unknown>) => {
    const author = item.author as Record<string, unknown> | undefined;
    return {
      id: String(item.id as string),
      documentId: String(item.document ?? item.document_id ?? documentId),
      authorId: String((author && 'id' in author) ? author.id : item.author_id ?? item.author ?? ''),
      message: typeof item.message === 'string' ? item.message : '',
      createdAt: typeof item.created_at === 'string' ? item.created_at : new Date().toISOString(),
    };
  });
};

export const addDocumentDiscussion = async (payload: CreateDiscussionPayload): Promise<DocumentDiscussion> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const body = {
    document: payload.documentId,
    author_id: payload.authorId,
    message: payload.message,
  };
  
  const response = await apiFetch<Record<string, unknown>>('/dms/discussions/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  const author = response.author as Record<string, unknown> | undefined;
  return {
    id: String(response.id),
    documentId: String(response.document ?? payload.documentId),
    authorId: String((author && 'id' in author) ? author.id : response.author_id ?? payload.authorId),
    message: typeof response.message === 'string' ? response.message : payload.message,
    createdAt: typeof response.created_at === 'string' ? response.created_at : new Date().toISOString(),
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
  
  // Validate documentId is a valid UUID before making the API call
  if (!documentId || documentId === 'undefined' || documentId.trim() === '') {
    logWarn('getActiveEditorSessions called with invalid documentId:', documentId);
    return [];
  }
  
  // Basic UUID format validation (UUIDs are 36 characters with dashes)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(documentId)) {
    logWarn('getActiveEditorSessions called with non-UUID documentId:', documentId);
    return [];
  }
  
  try {
    const payload = await apiFetch<ApiPayload>(`/dms/editor-sessions/?document=${documentId}&is_active=true`);
    const results = unwrapResults<Record<string, unknown>>(payload);
    
    logInfo('getActiveEditorSessions API response:', { payload, results, documentId });
    
    const sessions = results.map((item: Record<string, unknown>) => {
      const user = item.user as Record<string, unknown> | undefined;
      const session = {
        id: String(item.id as string),
        documentId: String(item.document ?? item.document_id ?? documentId),
        userId: String((user && 'id' in user) ? user.id : item.user_id ?? item.user ?? ''),
        since: typeof item.since === 'string' ? item.since : (typeof item.created_at === 'string' ? item.created_at : new Date().toISOString()),
        note: typeof item.note === 'string' ? item.note : undefined,
        isActive: typeof item.is_active === 'boolean' ? item.is_active : true,
      };
      logInfo('Mapped editor session:', session, 'from item:', item);
      return session;
    });
    
    logInfo('Returning active editor sessions:', sessions);
    return sessions;
      } catch (error: unknown) {
    logError('Error fetching active editor sessions:', error);
    return [];
  }
};

export const getEditorSessionForUser = async (documentId: string, userId: string): Promise<EditorSession | null> => {
  if (!hasTokens()) return null;
  
  try {
    const payload = await apiFetch<ApiPayload>(`/dms/editor-sessions/?document=${documentId}&user=${userId}`);
    const results = unwrapResults<Record<string, unknown>>(payload);
    
    if (results.length > 0) {
      const item = results[0] as Record<string, unknown>;
      const user = item.user as Record<string, unknown> | undefined;
      return {
        id: String(item.id as string),
        documentId: String(item.document ?? item.document_id ?? documentId),
        userId: String((user && 'id' in user) ? user.id : item.user_id ?? item.user ?? userId),
        since: typeof item.since === 'string' ? item.since : (typeof item.created_at === 'string' ? item.created_at : new Date().toISOString()),
        note: typeof item.note === 'string' ? item.note : undefined,
        isActive: typeof item.is_active === 'boolean' ? item.is_active : true,
      };
    }
    return null;
      } catch (error: unknown) {
    logError('Failed to get editor session for user', error);
    return null;
  }
};

export const createEditorSession = async (documentId: string, userId: string, note?: string): Promise<EditorSession> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const body: Record<string, unknown> = { 
    document: documentId,
    user_id: userId,
  };
  if (note) {
    body.note = note;
  }
  
  const response = await apiFetch<Record<string, unknown>>('/dms/editor-sessions/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  const user = response.user as Record<string, unknown> | undefined;
  return {
    id: String(response.id),
    documentId: String(response.document ?? response.document_id ?? documentId),
    userId: String((user && 'id' in user) ? user.id : response.user_id ?? response.user ?? userId),
    since: typeof response.since === 'string' ? response.since : (typeof response.created_at === 'string' ? response.created_at : new Date().toISOString()),
    note: typeof response.note === 'string' ? response.note : (note ?? undefined),
    isActive: typeof response.is_active === 'boolean' ? response.is_active : true,
  };
};

export const endEditorSession = async (sessionId: string): Promise<void> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  try {
    await apiFetch(`/dms/editor-sessions/${sessionId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
  } catch (error: unknown) {
    // Handle permission errors gracefully - session might not belong to current user
    // This can happen if user was switched or session was reassigned
    if (error && typeof error === 'object' && (
      ('status' in error && error.status === 403) ||
      ('message' in error && typeof (error instanceof Error ? error.message : "Unknown error") === 'string' && (error instanceof Error ? error.message : "Unknown error").includes('only modify your own'))
    )) {
      logWarn('Cannot end editor session - does not belong to current user', { sessionId, error });
      // Silently fail - this is expected in some cases (user switch, session reassignment)
      return;
    }
    // Re-throw other errors
    throw error;
  }
};

// Document Access Logs API
export interface DocumentAccessLog {
  id: string;
  documentId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
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
  const results = unwrapResults<Record<string, unknown>>(payload);
  
  return results.map((item: Record<string, unknown>) => {
    const user = item.user as Record<string, unknown> | undefined;
    const userName = typeof item.user_name === 'string'
      ? item.user_name
      : (user
          ? (() => {
              const firstName = typeof user.first_name === 'string' ? user.first_name : '';
              const lastName = typeof user.last_name === 'string' ? user.last_name : '';
              const fullName = `${firstName} ${lastName}`.trim();
              if (fullName.length > 0) return fullName;
              return typeof user.username === 'string' ? user.username : undefined;
            })()
          : undefined);
    const userEmail = typeof item.user_email === 'string'
      ? item.user_email
      : (user && typeof user.email === 'string' ? user.email : undefined);
    return {
      id: String(item.id as string),
      documentId: String(item.document ?? item.document_id ?? documentId),
      userId: String((user && 'id' in user) ? user.id : item.user_id ?? item.user ?? ''),
      userName,
      userEmail,
      action: (item.action as 'view' | 'download' | 'attempted-download') ?? 'view',
      sensitivity: typeof item.sensitivity === 'string' ? item.sensitivity : 'internal',
      timestamp: typeof item.timestamp === 'string' ? item.timestamp : new Date().toISOString(),
    };
  });
};

export const logDocumentAccess = async (payload: CreateAccessLogPayload): Promise<DocumentAccessLog> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  const body = {
    document: payload.documentId,
    user_id: payload.userId,
    action: payload.action,
    sensitivity: payload.sensitivity,
  };
  
  const response = await apiFetch<Record<string, unknown>>('/dms/access-logs/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  const user = response.user as Record<string, unknown> | undefined;
  const userName = typeof response.user_name === 'string'
    ? response.user_name
    : (user
        ? (() => {
            const firstName = typeof user.first_name === 'string' ? user.first_name : '';
            const lastName = typeof user.last_name === 'string' ? user.last_name : '';
            const fullName = `${firstName} ${lastName}`.trim();
            if (fullName.length > 0) return fullName;
            return typeof user.username === 'string' ? user.username : undefined;
          })()
        : undefined);
  const userEmail = typeof response.user_email === 'string'
    ? response.user_email
    : (user && typeof user.email === 'string' ? user.email : undefined);
  return {
    id: String(response.id),
    documentId: String(response.document ?? response.document_id ?? payload.documentId),
    userId: String((user && 'id' in user) ? user.id : response.user_id ?? payload.userId),
    userName,
    userEmail,
    action: (response.action as 'view' | 'download' | 'attempted-download') ?? payload.action,
    sensitivity: typeof response.sensitivity === 'string' ? response.sensitivity : payload.sensitivity,
    timestamp: typeof response.timestamp === 'string' ? response.timestamp : new Date().toISOString(),
  };
};
export const getAccessLogsForDocument = async () => [] as never[];

/**
 * Get recent documents accessed by the current user (last 30 days)
 */
export const getRecentDocuments = async (userId: string, limit: number = 50): Promise<DocumentRecord[]> => {
  if (!hasTokens()) return [];
  
  try {
    // Get access logs for the user (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Query with user parameter (backend now supports filtering by user)
    const payload = await apiFetch<ApiPayload>(`/dms/access-logs/?user=${userId}&action=view&ordering=-timestamp`);
    const logs = unwrapResults<Record<string, unknown>>(payload);
    
    // Get unique document IDs from recent logs (last 30 days)
    const documentIds = Array.from(new Set(
      logs
        .filter((log: Record<string, unknown>) => {
          const timestamp = typeof log.timestamp === 'string' ? log.timestamp : (typeof log.created_at === 'string' ? log.created_at : '');
          const logDate = new Date(timestamp);
          return !isNaN(logDate.getTime()) && logDate >= thirtyDaysAgo;
        })
        .map((log: Record<string, unknown>) => String(log.document ?? log.document_id ?? ''))
        .filter(Boolean)
    )).slice(0, limit);
    
    if (documentIds.length === 0) return [];
    
    // Fetch documents
    const documents = await Promise.all(
      documentIds.map(async (docId) => {
        try {
          return await fetchDocumentById(docId);
        } catch {
          return null;
        }
      })
    );
    
    return documents.filter((doc): doc is DocumentRecord => doc !== null);
      } catch (error: unknown) {
    logError('Failed to get recent documents', error);
    // If querying by user fails, return empty array (backend may need update)
    return [];
  }
};

/**
 * Get documents shared with the current user (explicit permissions)
 */
export const getSharedDocuments = async (
  userId: string,
  params: Omit<DocumentQueryParams, 'authorId'> = {}
): Promise<PaginatedDocuments> => {
  if (!hasTokens()) {
    return { results: [], count: 0, next: null, previous: null };
  }
  
  try {
    // Use backend shared_with_me filtering for performance and accurate pagination
    return await queryDocumentsExtended({
      ...params,
      sharedWithMe: true,
    });
      } catch (error: unknown) {
    logError('Failed to get shared documents', error);
    return { results: [], count: 0, next: null, previous: null };
  }
};

/**
 * Get documents shared by the current user (documents with permissions created by user)
 */
export const getDocumentsSharedByUser = async (
  userId: string,
  params: Omit<DocumentQueryParams, 'authorId'> = {}
): Promise<PaginatedDocuments> => {
  if (!hasTokens()) {
    return { results: [], count: 0, next: null, previous: null };
  }
  
  try {
    // Use backend shared_by_me filtering for performance and accurate pagination
    return await queryDocumentsExtended({
      ...params,
      authorId: userId,
      sharedByMe: true,
    });
      } catch (error: unknown) {
    logError('Failed to get documents shared by user', error);
    return { results: [], count: 0, next: null, previous: null };
  }
};

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
  sharedWithMe?: boolean;
  sharedByMe?: boolean;
  recentForMe?: boolean;
  awaitingAction?: boolean;
  recentDays?: number;
  statusIn?: string[];
  documentTypeIn?: string[];
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
  if (params.sharedWithMe) searchParams.set('shared_with_me', 'true');
  if (params.sharedByMe) searchParams.set('shared_by_me', 'true');
  if (params.recentForMe) searchParams.set('recent_for_me', 'true');
  if (params.awaitingAction) searchParams.set('awaiting_action', 'true');
  if (typeof params.recentDays === 'number' && params.recentDays > 0) searchParams.set('recent_days', String(params.recentDays));
  if (params.statusIn && params.statusIn.length > 0) searchParams.set('status_in', params.statusIn.join(','));
  if (params.documentTypeIn && params.documentTypeIn.length > 0) searchParams.set('document_type_in', params.documentTypeIn.join(','));
  return searchParams.toString();
};

/**
 * Query documents with extended filters (author, date range)
 */
export const queryDocumentsExtended = async (params: ExtendedDocumentQueryParams = {}): Promise<PaginatedDocuments> => {
  if (!hasTokens()) {
    logWarn('[DMS] No tokens available, returning empty results');
    return { results: [], count: 0, next: null, previous: null };
  }

  const query = buildExtendedDocumentQueryString(params);
  const url = query ? `/dms/documents/?${query}` : '/dms/documents/';
  
  try {
    const payload = await Promise.race([
      apiFetch<Record<string, unknown>>(url),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      )
    ]) as Record<string, unknown> | { count?: number; next?: string | null; previous?: string | null; results?: unknown[] };

    const results = unwrapResults<Record<string, unknown>>(payload).map(mapDocument);
    const count = typeof payload?.count === 'number' ? payload.count : results.length;
    const next = typeof payload?.next === 'string' ? payload.next : null;
    const previous = typeof payload?.previous === 'string' ? payload.previous : null;

    return { results, count, next, previous };
      } catch (error: unknown) {
    logError('[DMS] Error in queryDocumentsExtended:', error);
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
      apiFetch<Record<string, unknown>>('/dms/documents/?page_size=1'),
      apiFetch<Record<string, unknown>>('/dms/documents/?status=draft&page_size=1'),
      apiFetch<Record<string, unknown>>('/dms/documents/?status=published&page_size=1'),
      apiFetch<Record<string, unknown>>('/dms/documents/?status=archived&page_size=1'),
    ]);

    return {
      total: typeof allResponse?.count === 'number' ? allResponse.count : 0,
      draft: typeof draftResponse?.count === 'number' ? draftResponse.count : 0,
      published: typeof publishedResponse?.count === 'number' ? publishedResponse.count : 0,
      archived: typeof archivedResponse?.count === 'number' ? archivedResponse.count : 0,
    };
      } catch (error: unknown) {
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
  method?: string;
  message?: string;
}

export interface SummaryResult {
  summary: string;
  version_id: string;
}

/**
 * Run OCR on a specific document version (or extract text from HTML content)
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
  sendContentChange: (changes: unknown[], version?: number) => void;
  sendTypingStart: () => void;
  sendTypingStop: () => void;
  requestSync: () => void;
  onUserJoined: (callback: (data: { user_id: string; username: string }) => void) => void;
  onUserLeft: (callback: (data: { user_id: string; username: string }) => void) => void;
  onCursorUpdate: (callback: (data: { user_id: string; username: string; position: unknown; selection?: unknown }) => void) => void;
  onContentUpdate: (callback: (data: { user_id: string; changes: unknown[]; version?: number }) => void) => void;
  onTypingIndicator: (callback: (data: { user_id: string; username: string; is_typing: boolean }) => void) => void;
  onActiveEditors: (callback: (editors: { user_id: string; username: string; since?: string }[]) => void) => void;
  onSyncResponse: (callback: (state: Record<string, unknown>) => void) => void;
}

/**
 * Create a WebSocket connection for real-time document collaboration
 */
export const createDocumentEditorWebSocket = (
  documentId: string,
  token: string
): DocumentEditorWebSocket => {
  let ws: WebSocket | null = null;
  const callbacks: Record<string, ((data: Record<string, unknown>) => void)[]> = {};
  
  const emit = (event: string, data: Record<string, unknown>) => {
    const handlers = callbacks[event] || [];
    handlers.forEach(handler => handler(data));
  };
  
  const on = (event: string, callback: (data: Record<string, unknown>) => void) => {
    if (!callbacks[event]) callbacks[event] = [];
    callbacks[event].push(callback);
  };
  
  const send = (data: Record<string, unknown>) => {
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
        logInfo('[DMS WebSocket] Connected to document', documentId);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          emit(data.type, data);
        } catch (e) {
          logError('[DMS WebSocket] Failed to parse message:', e);
        }
      };
      
      ws.onclose = () => {
        logInfo('[DMS WebSocket] Disconnected');
      };
      
      ws.onerror = (error) => {
        logError('[DMS WebSocket] Error:', error);
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
    
    onUserJoined: (callback) => on('user_joined', callback as (data: Record<string, unknown>) => void),
    onUserLeft: (callback) => on('user_left', callback as (data: Record<string, unknown>) => void),
    onCursorUpdate: (callback) => on('cursor_update', callback as (data: Record<string, unknown>) => void),
    onContentUpdate: (callback) => on('content_update', callback as (data: Record<string, unknown>) => void),
    onTypingIndicator: (callback) => on('typing_indicator', callback as (data: Record<string, unknown>) => void),
    onActiveEditors: (callback) => on('active_editors', (data: Record<string, unknown>) => {
      if (Array.isArray(data)) {
        callback(data as { user_id: string; username: string; since?: string }[]);
      }
    }),
    onSyncResponse: (callback) => on('sync_response', callback),
  };
};

// ============================================================================
// DOCUMENT TEMPLATES
// ============================================================================

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  documentType: DocumentType;
  defaultStatus: DocumentStatus;
  defaultSensitivity: DocumentRecord['sensitivity'];
  defaultDivisionId?: string;
  defaultDepartmentId?: string;
  defaultTags: string[];
  templateContent?: string;
  templateMetadata: Record<string, unknown>;
  isActive: boolean;
  createdById?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentTemplateInput {
  name: string;
  description?: string;
  documentType: DocumentType;
  defaultStatus?: DocumentStatus;
  defaultSensitivity?: DocumentRecord['sensitivity'];
  defaultDivisionId?: string;
  defaultDepartmentId?: string;
  defaultTags?: string[];
  templateContent?: string;
  templateMetadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface CreateDocumentFromTemplateInput {
  title: string;
  description?: string;
  documentType?: DocumentType;
  status?: DocumentStatus;
  sensitivity?: DocumentRecord['sensitivity'];
  division?: string;
  department?: string;
  tags?: string[];
  file?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
  };
}

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
    templateMetadata: (apiTemplate.template_metadata && typeof apiTemplate.template_metadata === 'object') ? apiTemplate.template_metadata as Record<string, unknown> : {},
    isActive: typeof apiTemplate.is_active === 'boolean' ? apiTemplate.is_active : true,
    createdById: typeof apiTemplate.created_by === 'string' ? apiTemplate.created_by : undefined,
    createdBy: createdByObj ? {
      id: String(createdByObj.id),
      name: String(createdByObj.name || createdByObj.username || ''),
      email: String(createdByObj.email || ''),
    } : undefined,
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
    throw new Error('Authentication required');
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
    throw new Error('Authentication required');
  }

  const response = await apiFetch<Record<string, unknown>>(`/dms/templates/${id}/`);
  return mapTemplate(response);
};

export const createDocumentTemplate = async (input: CreateDocumentTemplateInput): Promise<DocumentTemplate> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
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
  input: Partial<CreateDocumentTemplateInput>
): Promise<DocumentTemplate> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
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
    throw new Error('Authentication required');
  }

  await apiFetch(`/dms/templates/${id}/`, {
    method: 'DELETE',
  });
};

export const createDocumentFromTemplate = async (
  templateId: string,
  input: CreateDocumentFromTemplateInput
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
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
