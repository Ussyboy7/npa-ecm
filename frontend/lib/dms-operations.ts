import { ERROR_AUTHENTICATION_REQUIRED } from '@/lib/constants';
import { apiFetch, hasTokens } from './api-client';
import { logError, logWarn } from '@/lib/client-logger';
import { unwrapResults } from '@/lib/type-utils';
import type { BulkOperationResult, ExtendedDocumentQueryParams, PaginatedDocuments, DocumentStats, OCRResult, SummaryResult } from './dms-types';
import { mapDocument } from './dms-types';

// =============================================================================
// BULK OPERATIONS API
// =============================================================================

/**
 * Archive multiple documents at once
 */
export const bulkArchiveDocuments = async (documentIds: string[]): Promise<BulkOperationResult> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

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
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

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
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

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
  if (params.workspaceId) searchParams.set('workspace', params.workspaceId);
  return searchParams.toString();
};

/**
 * Query documents with extended filters (author, date range)
 */
export const queryDocumentsExtended = async (params: ExtendedDocumentQueryParams & { signal?: AbortSignal } = {}): Promise<PaginatedDocuments> => {
  if (!hasTokens()) {
    logWarn('[DMS] No tokens available, returning empty results');
    return { results: [], count: 0, next: null, previous: null };
  }

  const query = buildExtendedDocumentQueryString(params);
  const url = query ? `/dms/documents/?${query}` : '/dms/documents/';

  const payload = await apiFetch<Record<string, unknown>>(url, { signal: params.signal });

  const results = (unwrapResults(payload) as Record<string, unknown>[]).map(mapDocument);
  const count = typeof payload?.count === 'number' ? payload.count : results.length;
  const next = typeof payload?.next === 'string' ? payload.next : null;
  const previous = typeof payload?.previous === 'string' ? payload.previous : null;

  return { results, count, next, previous };
};

// =============================================================================
// DOCUMENT STATS
// =============================================================================

export const getDocumentStats = async (): Promise<DocumentStats> => {
  if (!hasTokens()) {
    return { total: 0, draft: 0, published: 0, archived: 0 };
  }

  try {
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

/**
 * Run OCR on a specific document version (or extract text from HTML content)
 */
export const runOCROnVersion = async (versionId: string): Promise<OCRResult> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  const response = await apiFetch<OCRResult>(`/dms/versions/${versionId}/run-ocr/`, {
    method: 'POST',
  });

  return response;
};

/**
 * Generate AI summary for a document
 */
export const generateDocumentSummary = async (documentId: string): Promise<SummaryResult> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  const response = await apiFetch<SummaryResult>(`/dms/documents/${documentId}/generate-summary/`, {
    method: 'POST',
  });

  return response;
};
