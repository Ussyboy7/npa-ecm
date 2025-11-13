import { apiFetch, hasTokens } from './api-client';
import type { User } from './npa-structure';

export type DocumentType = 'letter' | 'memo' | 'circular' | 'policy' | 'report' | 'other';
export type DocumentStatus = 'draft' | 'published' | 'archived';
export type DocumentSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';
export type PermissionAccess = 'read' | 'write' | 'admin';

export interface DocumentPermission {
  access: PermissionAccess;
  divisionIds: string[];
  departmentIds: string[];
  gradeLevels: string[];
  userIds: string[];
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
}

export interface DocumentWorkspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  memberIds: string[];
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
  access: data.access ?? 'read',
  divisionIds: (data.division_ids ?? data.divisions ?? []).map(String),
  departmentIds: (data.department_ids ?? data.departments ?? []).map(String),
  gradeLevels: Array.isArray(data.grade_levels) ? data.grade_levels.map(String) : [],
  userIds: (data.user_ids ?? data.users ?? []).map(String),
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

export const fetchDocuments = async (): Promise<DocumentRecord[]> => {
  if (!hasTokens()) {
    documentsCache = [];
    return documentsCache;
  }

  const payload = await apiFetch<ApiPayload>('/dms/documents/');
  documentsCache = unwrapResults<any>(payload).map(mapDocument);
  return documentsCache;
};

export const fetchDocumentById = async (id: string): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  const payload = await apiFetch(`/dms/documents/${id}/`);
  const document = mapDocument(payload);
  updateDocumentsCache(document);
  return document;
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
    console.error('Failed to create document version:', error);
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
    console.error('Failed to create document version:', error);
    throw new Error(`Failed to upload document version: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return fetchDocumentById(documentId);
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
  },
): Promise<DocumentRecord> => {
  if (!hasTokens()) {
    throw new Error('Authentication required');
  }

  const { userIds = [], divisionIds = [], departmentIds = [], shareToAll = false, access = 'read' } = options;

  if (shareToAll) {
    // Share to all users - get all active user IDs
    const allUsersRaw = await apiFetch<any>('/accounts/users/');
    // Handle both wrapped and unwrapped responses
    const allUsers = Array.isArray(allUsersRaw) 
      ? allUsersRaw 
      : (allUsersRaw?.results || allUsersRaw?.raw || []);
    const allUserIds = Array.isArray(allUsers)
      ? allUsers.filter((u) => u.active !== false).map((u) => String(u.id))
      : [];
    
    if (allUserIds.length === 0) {
      throw new Error('No active users found');
    }
    
    await apiFetch('/dms/permissions/', {
      method: 'POST',
      body: JSON.stringify({
        document: documentId,
        access,
        user_ids: allUserIds,
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
    
    console.log('getActiveEditorSessions API response:', { payload, results, documentId });
    
    const sessions = results.map((item: any) => {
      const session = {
        id: String(item.id),
        documentId: String(item.document ?? item.document_id ?? documentId),
        userId: String(item.user?.id ?? item.user_id ?? item.user ?? ''),
        since: item.since ?? item.created_at ?? new Date().toISOString(),
        note: item.note ?? undefined,
        isActive: item.is_active ?? true,
      };
      console.log('Mapped editor session:', session, 'from item:', item);
      return session;
    });
    
    console.log('Returning active editor sessions:', sessions);
    return sessions;
  } catch (error) {
    console.error('Error fetching active editor sessions:', error);
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
    console.error('Failed to get editor session for user', error);
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
