/**
 * Frontend API client for audit logs.
 */

import { apiFetch, hasTokens } from './api-client';

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
  metadata: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

/**
 * Get activity logs with filters.
 */
export const getActivityLogs = async (params?: {
  user?: string;
  action?: string;
  objectType?: string;
  module?: string;
  severity?: string;
  success?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActivityLog[]> => {
  if (!hasTokens()) return [];

  const queryParams = new URLSearchParams();
  if (params?.user) queryParams.append('user', params.user);
  if (params?.action) queryParams.append('action', params.action);
  if (params?.objectType) queryParams.append('object_type', params.objectType);
  if (params?.module) queryParams.append('module', params.module);
  if (params?.severity) queryParams.append('severity', params.severity);
  if (params?.success !== undefined) queryParams.append('success', String(params.success));
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.pageSize) queryParams.append('page_size', String(params.pageSize));

  const query = queryParams.toString();
  const response = await apiFetch<ActivityLog[]>(
    `/audit/logs/${query ? `?${query}` : ''}`
  );
  return Array.isArray(response) ? response : [];
};

/**
 * Get activity logs for a specific object.
 */
export const getActivityLogsForObject = async (
  objectType: string,
  objectId: string
): Promise<ActivityLog[]> => {
  return getActivityLogs({ objectType, objectId });
};

/**
 * Get activity logs for the current user.
 */
export const getMyActivityLogs = async (params?: {
  action?: string;
  module?: string;
}): Promise<ActivityLog[]> => {
  return getActivityLogs(params);
};

