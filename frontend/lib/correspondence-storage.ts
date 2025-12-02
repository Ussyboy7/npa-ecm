import { logError } from '@/lib/client-logger';
import { apiFetch, hasTokens } from './api-client';
import type { Correspondence } from './npa-structure';
import { formatDateForAPI } from './correspondence-helpers';

// Re-export apiFetch and hasTokens
export { apiFetch, hasTokens };

export interface CorrespondenceQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  priority?: string;
  source?: string;
  direction?: string;
  division?: string;
  department?: string;
  owning_office?: string;
  current_office?: string;
  date_from?: string;  // YYYY-MM-DD format
  date_to?: string;    // YYYY-MM-DD format
  received_date_from?: string;  // YYYY-MM-DD format
  received_date_to?: string;    // YYYY-MM-DD format
  ordering?: string;
}

export interface PaginatedCorrespondence {
  results: Correspondence[];
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

/**
 * Build query string from parameters
 */
const buildCorrespondenceQueryString = (params: CorrespondenceQueryParams) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('page_size', String(params.pageSize));
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.status) searchParams.set('status', params.status);
  if (params.priority) searchParams.set('priority', params.priority);
  if (params.source) searchParams.set('source', params.source);
  if (params.direction) searchParams.set('direction', params.direction);
  if (params.division) searchParams.set('division', params.division);
  if (params.department) searchParams.set('department', params.department);
  if (params.owning_office) searchParams.set('owning_office', params.owning_office);
  if (params.current_office) searchParams.set('current_office', params.current_office);
  if (params.ordering) searchParams.set('ordering', params.ordering);
  // Date range filters
  if (params.date_from) searchParams.set('date_from', params.date_from);
  if (params.date_to) searchParams.set('date_to', params.date_to);
  if (params.received_date_from) searchParams.set('received_date_from', params.received_date_from);
  if (params.received_date_to) searchParams.set('received_date_to', params.received_date_to);
  return searchParams.toString();
};

/**
 * Query correspondence items with filters
 */
export const queryCorrespondence = async (
  params: CorrespondenceQueryParams = {},
  mapFn?: (item: any) => Correspondence
): Promise<PaginatedCorrespondence> => {
  if (!hasTokens()) {
    console.warn('[Correspondence] No tokens available, returning empty results');
    return { results: [], count: 0, next: null, previous: null };
  }

  const query = buildCorrespondenceQueryString(params);
  const url = query ? `/correspondence/items/?${query}` : '/correspondence/items/';
  
  try {
    const payload = await apiFetch<any>(url);
    
    const results = unwrapResults<any>(payload);
    const mappedResults = mapFn ? results.map(mapFn) : results;
    const count = typeof payload?.count === 'number' ? payload.count : mappedResults.length;
    const next = typeof payload?.next === 'string' ? payload.next : null;
    const previous = typeof payload?.previous === 'string' ? payload.previous : null;

    return {
      results: mappedResults,
      count,
      next,
      previous,
    };
  } catch (error) {
    console.error('[Correspondence] Error in queryCorrespondence:', error);
    throw error;
  }
};

// =============================================================================
// BULK OPERATIONS API
// =============================================================================

export interface BulkOperationResult {
  message: string;
  archived_count?: number;
  deleted_count?: number;
  reassigned_count?: number;
  skipped_count: number;
}

/**
 * Archive multiple correspondence items at once
 */
export const bulkArchiveCorrespondence = async (correspondenceIds: string[]): Promise<BulkOperationResult> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  if (!correspondenceIds.length) {
    throw new Error('No correspondence items selected');
  }
  
  const response = await apiFetch<BulkOperationResult>('/correspondence/items/bulk-archive/', {
    method: 'POST',
    body: JSON.stringify({ correspondence_ids: correspondenceIds }),
  });
  
  return response;
};

/**
 * Delete multiple correspondence items at once (soft delete)
 */
export const bulkDeleteCorrespondence = async (correspondenceIds: string[]): Promise<BulkOperationResult> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  if (!correspondenceIds.length) {
    throw new Error('No correspondence items selected');
  }
  
  const response = await apiFetch<BulkOperationResult>('/correspondence/items/bulk-delete/', {
    method: 'POST',
    body: JSON.stringify({ correspondence_ids: correspondenceIds }),
  });
  
  return response;
};

/**
 * Reassign multiple correspondence items to a target office/user
 */
export const bulkReassignCorrespondence = async (
  correspondenceIds: string[],
  options: {
    target_office_id?: string;
    owning_office_id?: string;
    target_user_id?: string;
    reason: string;
  }
): Promise<BulkOperationResult> => {
  if (!hasTokens()) throw new Error('Authentication required');
  
  if (!correspondenceIds.length) {
    throw new Error('No correspondence items selected');
  }
  
  if (!options.reason?.trim()) {
    throw new Error('Reason is required for bulk reassignment');
  }
  
  const response = await apiFetch<BulkOperationResult>('/correspondence/items/bulk-reassign/', {
    method: 'POST',
    body: JSON.stringify({
      correspondence_ids: correspondenceIds,
      target_office_id: options.target_office_id || null,
      owning_office_id: options.owning_office_id || null,
      target_user_id: options.target_user_id || null,
      reason: options.reason.trim(),
    }),
  });
  
  return response;
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format date for API (YYYY-MM-DD)
 */
export { formatDateForAPI };

/**
 * Build date range query params from Date objects
 */
export const buildDateRangeParams = (
  dateFrom?: Date | string | null,
  dateTo?: Date | string | null,
  receivedDateFrom?: Date | string | null,
  receivedDateTo?: Date | string | null
): Partial<CorrespondenceQueryParams> => {
  const params: Partial<CorrespondenceQueryParams> = {};
  
  if (dateFrom) {
    params.date_from = typeof dateFrom === 'string' ? dateFrom : formatDateForAPI(dateFrom);
  }
  if (dateTo) {
    params.date_to = typeof dateTo === 'string' ? dateTo : formatDateForAPI(dateTo);
  }
  if (receivedDateFrom) {
    params.received_date_from = typeof receivedDateFrom === 'string' ? receivedDateFrom : formatDateForAPI(receivedDateFrom);
  }
  if (receivedDateTo) {
    params.received_date_to = typeof receivedDateTo === 'string' ? receivedDateTo : formatDateForAPI(receivedDateTo);
  }
  
  return params;
};

