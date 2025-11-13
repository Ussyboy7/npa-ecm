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
    file_url: '', // Default to empty, only set if it's a valid short URL
  };

  // Only include file_url if it's a valid URL (not a data URL) and under 200 characters
  // Data URLs (base64) are too long and should not be stored in file_url field
  if (version.fileUrl && !version.fileUrl.startsWith('data:') && version.fileUrl.length <= 200) {
    // Only include actual HTTP/HTTPS URLs that are under 200 characters
    try {
      const url = new URL(version.fileUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        payload.file_url = version.fileUrl;
      }
    } catch {
      // Invalid URL, leave file_url empty
    }
  }
  // For data URLs or long URLs, we don't include them in file_url
  // The content should be in content_html for HTML files or handled separately for binary files

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

// Legacy helpers retained as no-ops while the comment/discussion UI is reworked.
export const getDocumentComments = async (_documentId: string, _versionId?: string | null): Promise<DocumentComment[]> => [];
export const addDocumentComment = async (_payload: CreateDocumentCommentPayload): Promise<DocumentComment> => {
  throw new Error('Document comments API integration not yet implemented');
};
export const resolveDocumentComment = async (_commentId: string, _resolved: boolean): Promise<DocumentComment | null> => {
  throw new Error('Document comments API integration not yet implemented');
};
export const deleteDocumentComment = async (_commentId: string): Promise<void> => {
  throw new Error('Document comments API integration not yet implemented');
};
export const getDiscussionMessages = async () => [] as never[];
export const addDiscussionMessage = async () => {
  throw new Error('Document discussion API integration not yet implemented');
};
export const logDocumentAccess = async () => undefined;
export const getAccessLogsForDocument = async () => [] as never[];
export const isSensitiveAccessAllowed = (document: DocumentRecord, user: User | null) => {
  if (!user) return document.sensitivity === 'public';
  return userHasPermission(user, document);
};
