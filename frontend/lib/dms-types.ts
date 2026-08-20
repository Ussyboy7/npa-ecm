import type { User } from './npa-structure';
import { isRecord, unwrapResults as unwrapResultsUtil } from '@/lib/type-utils';

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
  /** True when a file or HTML body exists server-side (even if fileUrl is redacted). */
  hasFile?: boolean;
  /** "api" = must use /content|/download; "media" = direct fileUrl may be present */
  drmDelivery?: 'api' | 'media';
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

export type DocumentRole = "primary" | "attachment";

export interface DocumentRecord {
  id: string;
  title: string;
  description?: string;
  role?: DocumentRole;
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
  activeEditors: DocumentCollaborator[];
  drmRights?: {
    policy_id?: string | null;
    policy_name?: string | null;
    allow_download: boolean;
    allow_print: boolean;
    allow_external_share: boolean;
    view_only: boolean;
    watermark_text: string;
    expired: boolean;
    message: string;
  };
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
  correspondence_links?: Array<{
    id: string;
    correspondence: {
      id: string;
      reference_number: string;
      subject: string;
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
  /** DRM policy id; null clears the policy on update */
  drmPolicyId?: string | null;
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

export interface EditorSession {
  id: string;
  documentId: string;
  userId: string;
  since: string;
  note?: string;
  isActive: boolean;
}

export interface DocumentAccessLog {
  id: string;
  documentId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: 'view' | 'download' | 'attempted-download' | 'print' | 'attempted-print';
  sensitivity: string;
  timestamp: string;
}

export interface CreateAccessLogPayload {
  documentId: string;
  userId: string;
  action: 'view' | 'download' | 'attempted-download' | 'print' | 'attempted-print';
  sensitivity: string;
}

export interface BulkOperationResult {
  message: string;
  archived_count?: number;
  deleted_count?: number;
  restored_count?: number;
  skipped_count: number;
}

export interface ExtendedDocumentQueryParams extends DocumentQueryParams {
  authorId?: string;
  dateFrom?: string;
  dateTo?: string;
  sharedWithMe?: boolean;
  sharedByMe?: boolean;
  recentForMe?: boolean;
  awaitingAction?: boolean;
  recentDays?: number;
  statusIn?: string[];
  documentTypeIn?: string[];
}

export interface DocumentStats {
  total: number;
  draft: number;
  published: number;
  archived: number;
}

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

export interface DocumentTemplateInput {
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

// Backward-compat alias
export type CreateDocumentTemplateInput = DocumentTemplateInput;

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

// Backward-compat unwrapResults wrapper
export const unwrapResults = <T,>(payload: unknown): T[] =>
  unwrapResultsUtil(payload) as T[];

// ============ MAPPER FUNCTIONS ============

export const mapDocumentPermission = (data: Record<string, unknown>): DocumentPermission => ({
  id: data.id ? String(data.id) : undefined,
  access: (data.access as PermissionAccess) ?? 'read',
  divisionIds: Array.isArray(data.division_ids)
    ? data.division_ids.map(String)
    : Array.isArray(data.divisions)
      ? data.divisions.map(String)
      : [],
  departmentIds: Array.isArray(data.department_ids)
    ? data.department_ids.map(String)
    : Array.isArray(data.departments)
      ? data.departments.map(String)
      : [],
  gradeLevels: Array.isArray(data.grade_levels) ? data.grade_levels.map(String) : [],
  userIds: Array.isArray(data.user_ids)
    ? data.user_ids.map(String)
    : Array.isArray(data.users)
      ? data.users.map(String)
      : [],
  createdAt: data.created_at ? String(data.created_at) : undefined,
  updatedAt: data.updated_at ? String(data.updated_at) : undefined,
});

export const mapDocumentVersion = (data: Record<string, unknown>): DocumentVersion => {
  const uploadedBy = data.uploaded_by as Record<string, unknown> | undefined;
  const fileUrl = typeof data.file_url === 'string' && data.file_url.trim() ? data.file_url : undefined;
  const hasHtml = typeof data.content_html === 'string' && data.content_html.trim().length > 0;
  const hasFile =
    typeof data.has_file === 'boolean'
      ? data.has_file
      : Boolean(fileUrl) || hasHtml;
  const drmDelivery =
    data.drm_delivery === 'api' || data.drm_delivery === 'media'
      ? data.drm_delivery
      : undefined;
  return {
    id: String(data.id),
    documentId: String(data.document ?? data.document_id),
    versionNumber: typeof data.version_number === 'number' ? data.version_number : 1,
    fileName: typeof data.file_name === 'string' ? data.file_name : 'file',
    fileType: typeof data.file_type === 'string' ? data.file_type : 'application/octet-stream',
    fileSize: typeof data.file_size === 'number' ? data.file_size : 0,
    fileUrl,
    hasFile,
    drmDelivery,
    contentHtml: typeof data.content_html === 'string' ? data.content_html : undefined,
    contentJson: data.content_json,
    contentText: typeof data.content_text === 'string' ? data.content_text : undefined,
    ocrText: typeof data.ocr_text === 'string' ? data.ocr_text : undefined,
    summary: typeof data.summary === 'string' ? data.summary : undefined,
    uploadedBy: uploadedBy && 'id' in uploadedBy ? String(uploadedBy.id) : String(data.uploaded_by ?? ''),
    uploadedAt: typeof data.uploaded_at === 'string' ? data.uploaded_at : new Date().toISOString(),
    notes: typeof data.notes === 'string' ? data.notes : undefined,
  };
};

export const mapActiveEditors = (editors: unknown[]): DocumentCollaborator[] =>
  editors.map((editor) => {
    const editorObj = editor as Record<string, unknown>;
    return {
      userId: String(
        editorObj.user && typeof editorObj.user === 'object' && 'id' in editorObj.user
          ? (editorObj.user as { id: unknown }).id
          : editorObj.user ?? editorObj.user_id ?? ''
      ),
      startedAt: typeof editorObj.started_at === 'string'
        ? editorObj.started_at
        : typeof editorObj.startedAt === 'string'
          ? editorObj.startedAt
          : undefined,
    };
  });

export const mapDocument = (item: Record<string, unknown>): DocumentRecord => {
  const author = item.author as Record<string, unknown> | undefined;
  const formDoc = item.form_document as Record<string, unknown> | undefined;
  const formTemplate = formDoc?.template as Record<string, unknown> | undefined;
  const formWorkflow = formDoc?.signature_workflow as Record<string, unknown> | undefined;

  return {
    id: String(item.id as string),
    title: typeof item.title === 'string' ? item.title : 'Untitled Document',
    description: typeof item.description === 'string' ? item.description : undefined,
    documentType: (item.document_type as DocumentType) ?? 'other',
    role: (item.role as DocumentRole) ?? undefined,
    referenceNumber: typeof item.reference_number === 'string' ? item.reference_number : undefined,
    status: (item.status as DocumentStatus) ?? 'draft',
    sensitivity: (item.sensitivity as DocumentSensitivity) ?? 'internal',
    authorId: author && 'id' in author ? String(author.id) : String(item.author ?? ''),
    divisionId: typeof item.division === 'string' ? item.division : (typeof item.division_id === 'string' ? item.division_id : undefined),
    departmentId: typeof item.department === 'string' ? item.department : (typeof item.department_id === 'string' ? item.department_id : undefined),
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    versions: Array.isArray(item.versions) ? item.versions.map(mapDocumentVersion) : [],
    permissions: Array.isArray(item.permissions) ? item.permissions.map(mapDocumentPermission) : [],
    createdAt: typeof item.created_at === 'string' ? item.created_at : new Date().toISOString(),
    updatedAt: typeof item.updated_at === 'string' ? item.updated_at : new Date().toISOString(),
    activeEditors: Array.isArray(item.active_editors)
      ? mapActiveEditors(item.active_editors)
      : Array.isArray(item.activeEditors)
        ? mapActiveEditors(item.activeEditors)
        : [],
    form_document: formDoc
      ? {
          id: String(formDoc.id),
          template: formTemplate
            ? {
                id: String(formTemplate.id),
                name: String(formTemplate.name),
                slug: String(formTemplate.slug),
              }
            : undefined,
          status: typeof formDoc.status === 'string' ? formDoc.status : undefined,
          signature_workflow: formWorkflow
            ? {
                id: String(formWorkflow.id),
                status: String(formWorkflow.status),
                total_signatures: typeof formWorkflow.total_signatures === 'number' ? formWorkflow.total_signatures : undefined,
                completed_signatures: typeof formWorkflow.completed_signatures === 'number' ? formWorkflow.completed_signatures : undefined,
              }
            : undefined,
        }
      : undefined,
    drmRights: isRecord(item.drm_rights)
      ? {
          policy_id: item.drm_rights.policy_id ? String(item.drm_rights.policy_id) : null,
          policy_name: item.drm_rights.policy_name ? String(item.drm_rights.policy_name) : null,
          allow_download: Boolean(item.drm_rights.allow_download),
          allow_print: Boolean(item.drm_rights.allow_print),
          allow_external_share: Boolean(item.drm_rights.allow_external_share),
          view_only: Boolean(item.drm_rights.view_only),
          watermark_text: String(item.drm_rights.watermark_text ?? ''),
          expired: Boolean(item.drm_rights.expired),
          message: String(item.drm_rights.message ?? ''),
        }
      : undefined,
    correspondence_links: Array.isArray(item.correspondence_links)
      ? item.correspondence_links.map((link: Record<string, unknown>) => ({
          id: String(link.id),
          correspondence: {
            id: String((link.correspondence as Record<string, unknown>)?.id ?? ''),
            reference_number: String((link.correspondence as Record<string, unknown>)?.reference_number ?? ''),
            subject: String((link.correspondence as Record<string, unknown>)?.subject ?? ''),
          },
          notes: typeof link.notes === 'string' ? link.notes : undefined,
        }))
      : undefined,
  };
};

export const mapCollection = (item: Record<string, unknown>): DocumentCollection => {
  const owner = item.owner as Record<string, unknown> | undefined;
  return {
    id: String(item.id as string),
    name: typeof item.name === 'string' ? item.name : 'Collection',
    description: typeof item.description === 'string' ? item.description : undefined,
    ownerId: String(item.owner_id ?? (owner && 'id' in owner ? owner.id : item.owner) ?? ''),
    documentIds: Array.isArray(item.document_ids)
      ? item.document_ids.map(String)
      : item.documents
        ? unwrapResults<Record<string, unknown>>(item.documents).map((d: Record<string, unknown>) => String(d.id ?? d))
        : [],
    documents: item.documents ? unwrapResults<Record<string, unknown>>(item.documents).map(mapDocument) : undefined,
    documentCount: typeof item.document_count === 'number'
      ? item.document_count
      : item.documents
        ? unwrapResults<Record<string, unknown>>(item.documents).length
        : 0,
    memberIds: Array.isArray(item.member_ids)
      ? item.member_ids.map(String)
      : Array.isArray(item.members)
        ? item.members.map((member: Record<string, unknown>) => String(member.id ?? member))
        : [],
    members: item.members
      ? unwrapResults<Record<string, unknown>>(item.members).map((m: Record<string, unknown>) => m as User)
      : undefined,
    isPublic: typeof item.is_public === 'boolean' ? item.is_public : false,
    createdAt: typeof item.created_at === 'string' ? item.created_at : '',
    updatedAt: typeof item.updated_at === 'string' ? item.updated_at : '',
  };
};


