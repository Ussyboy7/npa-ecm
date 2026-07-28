// Barrel export for DMS API modules — preserves backward compatibility
export { apiFetch, hasTokens } from '@/lib/api-client';

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
} from '@/lib/dms-types';

export {
  queryDocuments,
  fetchDocuments,
  fetchDocumentById,
  fetchDocumentRelatedCorrespondence,
  createDocument,
  createDocumentVersion,
  replaceDocumentVersion,
  updateDocumentMetadata,
  downloadDocumentVersion,
  canDownloadDocument,
  shareDocumentWithUsers,
  shareDocument,
  userHasPermission,
  type DocumentRelatedCorrespondenceItem,
} from '@/lib/dms-documents';

export {
  fetchCollections,
  fetchCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  addDocumentsToCollection,
  removeDocumentsFromCollection,
} from '@/lib/dms-collections';

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
} from '@/lib/dms-collaboration';

export {
  getDocumentAccessLogs,
  logDocumentAccess,
  getRecentDocuments,
  getSharedDocuments,
  getDocumentsSharedByUser,
  isSensitiveAccessAllowed,
} from '@/lib/dms-logs';

export {
  bulkArchiveDocuments,
  bulkDeleteDocuments,
  bulkRestoreDocuments,
  queryDocumentsExtended,
  getDocumentStats,
  runOCROnVersion,
  generateDocumentSummary,
} from '@/lib/dms-operations';

export {
  getDocumentTemplates,
  getDocumentTemplateById,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  createDocumentFromTemplate,
} from '@/lib/dms-templates';
