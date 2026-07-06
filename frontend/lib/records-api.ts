/**
 * API client for records governance (retention, legal hold, disposal).
 */

import { apiFetch } from './api-client';
import { logError } from './client-logger';

function unwrapList<T>(response: T[] | { results?: T[] } | unknown): T[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && 'results' in response) {
    const results = (response as { results?: T[] }).results;
    return Array.isArray(results) ? results : [];
  }
  return [];
}

export interface RetentionSchedule {
  id: string;
  name: string;
  description: string;
  record_type: 'correspondence' | 'document' | 'all';
  archive_level: string;
  directorate?: string | null;
  division?: string | null;
  retention_years: number;
  retention_months: number;
  retention_days: number;
  disposition_action: 'review' | 'archive' | 'delete';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegalHold {
  id: string;
  name: string;
  matter_reference: string;
  description: string;
  is_active: boolean;
  correspondence_count: number;
  placed_by?: { id: string; name: string; email: string };
  released_by?: { id: string; name: string; email: string } | null;
  released_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisposalRequest {
  id: string;
  correspondence: string;
  correspondence_reference: string;
  correspondence_subject: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason: string;
  rejection_reason: string;
  scheduled_disposal_date?: string | null;
  requested_by?: { id: string; name: string; email: string };
  reviewed_by?: { id: string; name: string; email: string } | null;
  reviewed_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface RecordsSummary {
  active_retention_schedules: number;
  active_legal_holds: number;
  correspondence_on_legal_hold: number;
  pending_disposal_requests: number;
  correspondence_due_for_disposal: number;
  archived_correspondence: number;
}

export async function fetchRecordsSummary(): Promise<RecordsSummary> {
  return apiFetch<RecordsSummary>('/records/reports/summary/');
}

export async function fetchRetentionSchedules(activeOnly = false): Promise<RetentionSchedule[]> {
  const query = activeOnly ? '?active_only=true' : '';
  const response = await apiFetch<RetentionSchedule[] | { results: RetentionSchedule[] }>(
    `/records/retention-schedules/${query}`,
  );
  return unwrapList(response);
}

export async function createRetentionSchedule(
  data: Partial<RetentionSchedule>,
): Promise<RetentionSchedule> {
  return apiFetch<RetentionSchedule>('/records/retention-schedules/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRetentionSchedule(
  id: string,
  data: Partial<RetentionSchedule>,
): Promise<RetentionSchedule> {
  return apiFetch<RetentionSchedule>(`/records/retention-schedules/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchLegalHolds(activeOnly = false): Promise<LegalHold[]> {
  const query = activeOnly ? '?active_only=true' : '';
  const response = await apiFetch<LegalHold[] | { results: LegalHold[] }>(
    `/records/legal-holds/${query}`,
  );
  return unwrapList(response);
}

export async function createLegalHold(data: {
  name: string;
  matter_reference?: string;
  description?: string;
  correspondence_ids?: string[];
}): Promise<LegalHold> {
  return apiFetch<LegalHold>('/records/legal-holds/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function releaseLegalHold(id: string): Promise<LegalHold> {
  return apiFetch<LegalHold>(`/records/legal-holds/${id}/release/`, { method: 'POST' });
}

export async function downloadEdiscoveryExport(holdId: string): Promise<{
  blob: Blob;
  correspondenceCount?: number;
  documentCount?: number;
  sha256?: string;
}> {
  const { getBaseUrl, getStoredAccessToken, hasTokens } = await import('./api-client');
  if (!hasTokens()) throw new Error('Authentication required');

  const response = await fetch(
    `${getBaseUrl()}/records/legal-holds/${holdId}/ediscovery-export/`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${getStoredAccessToken()}`,
      },
    },
  );

  if (!response.ok) {
    let message = 'eDiscovery export failed';
    try {
      const body = await response.json();
      if (body?.detail) message = String(body.detail);
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return {
    blob: await response.blob(),
    correspondenceCount: Number(response.headers.get('X-EDiscovery-Correspondence-Count') || '') || undefined,
    documentCount: Number(response.headers.get('X-EDiscovery-Document-Count') || '') || undefined,
    sha256: response.headers.get('X-EDiscovery-SHA256') || undefined,
  };
}

export async function fetchDisposalRequests(status?: string): Promise<DisposalRequest[]> {
  const query = status ? `?status=${status}` : '';
  const response = await apiFetch<DisposalRequest[] | { results: DisposalRequest[] }>(
    `/records/disposal-requests/${query}`,
  );
  return unwrapList(response);
}

export async function approveDisposalRequest(id: string): Promise<DisposalRequest> {
  return apiFetch<DisposalRequest>(`/records/disposal-requests/${id}/approve/`, { method: 'POST' });
}

export async function rejectDisposalRequest(id: string, reason: string): Promise<DisposalRequest> {
  return apiFetch<DisposalRequest>(`/records/disposal-requests/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function completeDisposalRequest(id: string): Promise<DisposalRequest> {
  return apiFetch<DisposalRequest>(`/records/disposal-requests/${id}/complete/`, {
    method: 'POST',
  });
}

export async function generateDueDisposalRequests(): Promise<{ created: number }> {
  return apiFetch<{ created: number }>('/records/disposal-requests/generate-due/', {
    method: 'POST',
  });
}

export async function createDisposalRequest(data: {
  correspondence: string;
  reason?: string;
}): Promise<DisposalRequest> {
  try {
    return await apiFetch<DisposalRequest>('/records/disposal-requests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (error) {
    logError('Failed to create disposal request', error);
    throw error;
  }
}
