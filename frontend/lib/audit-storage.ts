/**
 * Frontend API client for audit logs.
 */

import { apiFetch, hasTokens } from './api-client';
import { logError, logWarn, logInfo } from '@/lib/client-logger';

export interface ActivityLog {
  id: string;
  user?: string;
  userName?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  actionDisplay: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  severityDisplay: string;
  objectType?: string;
  objectId?: string;
  objectRepr?: string;
  module?: string;
  description: string;
  metadata: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

// Map API response (snake_case) to frontend interface (camelCase)
const mapApiLog = (log: Record<string, unknown>): ActivityLog => ({
  id: String(log.id),
  user: log.user ? String(log.user) : undefined,
  userName: log.user_name ?? undefined,
  userEmail: log.user_email ?? undefined,
  ipAddress: log.ip_address ?? undefined,
  userAgent: log.user_agent ?? undefined,
  action: log.action ?? '',
  actionDisplay: log.action_display ?? log.action ?? '',
  severity: log.severity ?? 'info',
  severityDisplay: log.severity_display ?? log.severity ?? 'Info',
  objectType: log.object_type ?? undefined,
  objectId: log.object_id ? String(log.object_id) : undefined,
  objectRepr: log.object_repr ?? undefined,
  module: log.module ?? undefined,
  description: log.description ?? '',
  metadata: log.metadata ?? {},
  success: log.success ?? true,
  errorMessage: log.error_message ?? undefined,
  timestamp: log.timestamp ?? new Date().toISOString(),
});

// Unwrap paginated results
const unwrapResults = (data: Record<string, unknown>): unknown[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'results' in data) {
    return Array.isArray(data.results) ? data.results : [];
  }
  return [];
};

export interface PaginatedActivityLogs {
  results: ActivityLog[];
  count: number;
  next: string | null;
  previous: string | null;
}

/**
 * Get activity logs with filters and pagination.
 */
export const getActivityLogs = async (params?: {
  user?: string;
  action?: string;
  objectType?: string;
  objectId?: string;
  module?: string;
  severity?: string;
  success?: boolean;
  search?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  pageSize?: number;
  ordering?: string;
}): Promise<PaginatedActivityLogs> => {
  if (!hasTokens()) return { results: [], count: 0, next: null, previous: null };

  const queryParams = new URLSearchParams();
  if (params?.user) queryParams.append('user', params.user);
  if (params?.action) queryParams.append('action', params.action);
  if (params?.objectType) queryParams.append('object_type', params.objectType);
  if (params?.objectId) queryParams.append('object_id', params.objectId);
  if (params?.module) queryParams.append('module', params.module);
  if (params?.severity) queryParams.append('severity', params.severity);
  if (params?.success !== undefined) queryParams.append('success', String(params.success));
  if (params?.search) queryParams.append('search', params.search);
  if (params?.from_date) queryParams.append('from_date', params.from_date);
  if (params?.to_date) queryParams.append('to_date', params.to_date);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.pageSize) queryParams.append('page_size', String(params.pageSize));
  if (params?.ordering) queryParams.append('ordering', params.ordering);

  const query = queryParams.toString();
  const endpoint = `/audit/logs${query ? `?${query}` : ''}`;
  try {
    const response = await apiFetch<Record<string, unknown> | { results: unknown[]; count?: number; next?: string | null; previous?: string | null }>(endpoint);
    
    // Handle paginated response
    if (response && typeof response === 'object' && 'results' in response) {
      return {
        results: Array.isArray(response.results) ? response.results.map(mapApiLog) : [],
        count: response.count as number ?? 0,
        next: response.next ?? null,
        previous: response.previous ?? null,
      };
    }
    
    // Handle non-paginated response (array)
    const rawLogs = unwrapResults(response);
    return {
      results: rawLogs.map(mapApiLog),
      count: rawLogs.length,
      next: null,
      previous: null,
    };
      } catch (error: unknown) {
    // Silently fail - audit logs are not critical for functionality
    logWarn('Failed to fetch audit logs:', error);
    return { results: [], count: 0, next: null, previous: null };
  }
};

/**
 * Get activity logs for a specific object.
 */
export const getActivityLogsForObject = async (
  objectType: string,
  objectId: string
): Promise<ActivityLog[]> => {
  const response = await getActivityLogs({ objectType, objectId });
  return response.results;
};

/**
 * Get activity logs for the current user.
 */
export const getMyActivityLogs = async (params?: {
  action?: string;
  module?: string;
}): Promise<ActivityLog[]> => {
  const response = await getActivityLogs(params);
  return response.results;
};

