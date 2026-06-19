// Barrel export for DMS storage modules — preserves backward compatibility
export { apiFetch, hasTokens } from './api-client';

export type {
  DocumentType,
  DocumentStatus,
  DocumentSensitivity,
  PermissionAccess,
  DocumentPermission,
  DocumentVersion,
  DocumentCollaborator,
  DocumentComment,
  CreateDocumentCommentPayload,
  DocumentRecord,
  DocumentCollection,
  CreateDocumentCollectionInput,
  DocumentWorkspace,
  DocumentQueryParams,
  PaginatedDocuments,
  DocumentAccessLog,
  BulkOperationResult,
  ExtendedDocumentQueryParams,
  DocumentStats,
  OCRResult,
  SummaryResult,
  DocumentEditorWebSocket,
  DocumentTemplate,
  DocumentTemplateInput,
  CreateDocumentTemplateInput,
  CreateDocumentFromTemplateInput,
  CreateDocumentInput,
  CreateDocumentVersionInput,
  DocumentDiscussion,
  CreateDiscussionPayload,
  EditorSession,
  CreateAccessLogPayload,
} from './dms-types';

export {
  getCachedDocuments,
  getCachedWorkspaces,
  queryDocuments,
  fetchDocuments,
  fetchDocumentById,
  fetchWorkspaces,
  createDocument,
  createDocumentVersion,
  replaceDocumentVersion,
  updateDocumentMetadata,
  updateDocumentWorkspaces,
  shareDocumentWithUsers,
  shareDocument,
  userHasPermission,
  getAccessibleDocumentsForUser,
} from './dms-documents';

export {
  fetchCollections,
  fetchCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  addDocumentsToCollection,
  removeDocumentsFromCollection,
} from './dms-collections';

export {
  getDocumentComments,
  addDocumentComment,
  resolveDocumentComment,
  deleteDocumentComment,
  getDocumentDiscussions,
  addDocumentDiscussion,
  getActiveEditorSessions,
  getEditorSessionForUser,
  createEditorSession,
  endEditorSession,
  createDocumentEditorWebSocket,
} from './dms-collaboration';

export {
  getDocumentAccessLogs,
  logDocumentAccess,
  getAccessLogsForDocument,
  getRecentDocuments,
  getSharedDocuments,
  getDocumentsSharedByUser,
  isSensitiveAccessAllowed,
} from './dms-logs';

export {
  bulkArchiveDocuments,
  bulkDeleteDocuments,
  bulkRestoreDocuments,
  queryDocumentsExtended,
  getDocumentStats,
  runOCROnVersion,
  generateDocumentSummary,
} from './dms-operations';

export {
  getDocumentTemplates,
  getDocumentTemplateById,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  createDocumentFromTemplate,
} from './dms-templates';
