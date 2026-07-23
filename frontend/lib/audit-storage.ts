/**
 * Frontend API client for audit logs.
 */

import { apiFetch, hasTokens } from './api-client';
import { logWarn } from '@/lib/client-logger';
import { isRecord, asString, unwrapResults } from '@/lib/type-utils';

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

const asStringOptional = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  return asString(value);
};
const asBoolean = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback);
const asOneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => {
  if (typeof value !== 'string') return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
};

// Map API response (snake_case) to frontend interface (camelCase)
const mapApiLog = (log: Record<string, unknown>): ActivityLog => ({
  id: asString(log.id),
  user: log.user ? asStringOptional(log.user) : undefined,
  userName: asStringOptional(log.user_name),
  userEmail: asStringOptional(log.user_email),
  ipAddress: asStringOptional(log.ip_address),
  userAgent: asStringOptional(log.user_agent),
  action: asString(log.action),
  actionDisplay: asStringOptional(log.action_display) ?? asString(log.action),
  severity: asOneOf(log.severity, ['info', 'warning', 'error', 'critical'] as const, 'info'),
  severityDisplay: asStringOptional(log.severity_display) ?? asString(log.severity, 'Info'),
  objectType: asStringOptional(log.object_type),
  objectId: log.object_id ? asStringOptional(log.object_id) : undefined,
  objectRepr: asStringOptional(log.object_repr),
  module: asStringOptional(log.module),
  description: asString(log.description),
  metadata: isRecord(log.metadata) ? log.metadata : {},
  success: asBoolean(log.success, true),
  errorMessage: asStringOptional(log.error_message),
  timestamp: asStringOptional(log.timestamp) ?? new Date().toISOString(),
});



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
  const response = await apiFetch<unknown>(endpoint);
  
  // Handle paginated response
  if (isRecord(response) && Array.isArray(response.results)) {
    return {
      results: response.results.filter(isRecord).map(mapApiLog),
      count: typeof response.count === 'number' ? response.count : 0,
      next: typeof response.next === 'string' ? response.next : null,
      previous: typeof response.previous === 'string' ? response.previous : null,
    };
  }
  
  // Handle non-paginated response (array)
  const rawLogs = unwrapResults(response);
  return {
    results: rawLogs.filter(isRecord).map(mapApiLog),
    count: rawLogs.length,
    next: null,
    previous: null,
  };
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

export interface ComplianceExportParams {
  action?: string;
  module?: string;
  severity?: string;
  success?: boolean;
  search?: string;
  from_date?: string;
  to_date?: string;
  ordering?: string;
}

/**
 * Download tamper-evident compliance bundle (ZIP with CSV, manifest, SHA-256).
 */
export const downloadComplianceExport = async (
  params?: ComplianceExportParams,
): Promise<{ blob: Blob; recordCount?: number; sha256?: string }> => {
  if (!hasTokens()) throw new Error('Authentication required');

  const queryParams = new URLSearchParams();
  if (params?.action) queryParams.append('action', params.action);
  if (params?.module) queryParams.append('module', params.module);
  if (params?.severity) queryParams.append('severity', params.severity);
  if (params?.success !== undefined) queryParams.append('success', String(params.success));
  if (params?.search) queryParams.append('search', params.search);
  if (params?.from_date) queryParams.append('from_date', params.from_date);
  if (params?.to_date) queryParams.append('to_date', params.to_date);
  if (params?.ordering) queryParams.append('ordering', params.ordering);

  const query = queryParams.toString();
  const { getBaseUrl, getStoredAccessToken } = await import('./api-client');
  const response = await fetch(
    `${getBaseUrl()}/audit/logs/compliance-export${query ? `?${query}` : ''}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${getStoredAccessToken()}`,
      },
    },
  );

  if (!response.ok) {
    let message = 'Compliance export failed';
    try {
      const body = await response.json();
      if (body?.detail) message = String(body.detail);
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  return {
    blob,
    recordCount: Number(response.headers.get('X-Audit-Record-Count') || '') || undefined,
    sha256: response.headers.get('X-Audit-SHA256') || undefined,
  };
};

