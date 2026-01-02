/**
 * Frontend API client for Records Management (retention policies, legal holds, dispositions).
 */

import { apiFetch } from './api-client';
import { logError, logWarn, logInfo } from '@/lib/client-logger';

export interface RetentionPolicy {
  id: string;
  name: string;
  description?: string;
  retention_period_days: number;
  trigger_event: 'creation' | 'completion' | 'last_access' | 'last_modified';
  applies_to: 'document' | 'correspondence' | 'all';
  disposition_action: 'archive' | 'delete' | 'review' | 'transfer';
  requires_approval: boolean;
  approval_role?: string;
  document_types?: string[];
  sensitivity_levels?: string[];
  division_ids?: string[];
  is_active: boolean;
  created_by?: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface LegalHold {
  id: string;
  name: string;
  reason: string;
  case_number?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  documents?: Array<{ id: string; title: string }>;
  correspondences?: Array<{ id: string; subject: string }>;
  created_by?: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Disposition {
  id: string;
  record_type: 'document' | 'correspondence';
  record_id: string;
  policy?: RetentionPolicy;
  action: 'archive' | 'delete' | 'review' | 'transfer';
  status: 'pending' | 'scheduled' | 'approved' | 'completed' | 'cancelled' | 'blocked';
  scheduled_date: string;
  requires_approval: boolean;
  approved_by?: {
    id: string;
    name: string;
    email: string;
  };
  executed_by?: {
    id: string;
    name: string;
    email: string;
  };
  blocked_by_legal_hold: boolean;
  blocking_legal_holds?: LegalHold[];
  created_at: string;
  updated_at: string;
}

export interface RetentionSchedule {
  id: string;
  record_type: 'document' | 'correspondence';
  record_id: string;
  policy: RetentionPolicy;
  retention_start_date: string;
  retention_end_date: string;
  disposition_date: string;
  is_active: boolean;
  disposition_created: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all retention policies.
 */
export const getRetentionPolicies = async (params?: {
  is_active?: boolean;
  applies_to?: string;
  signal?: AbortSignal;
}): Promise<RetentionPolicy[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', String(params.is_active));
    }
    if (params?.applies_to) {
      queryParams.append('applies_to', params.applies_to);
    }
    const query = queryParams.toString();
    const url = `/records/policies/${query ? `?${query}` : ''}`;
    const response = await apiFetch<Record<string, unknown>>(url, {
      signal: params?.signal,
    });
    
    // Handle paginated response (DRF returns {count, next, previous, results: [...]})
    if (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) {
      return response.results;
    }
    // Handle direct array response
    if (Array.isArray(response)) {
      return response;
    }
    // Fallback to empty array if response is not in expected format
    logWarn('Unexpected response format from getRetentionPolicies:', response);
    return [];
  } catch (error) {
    logError('Failed to get retention policies', error);
    // Return empty array on error instead of throwing
    return [];
  }
};

/**
 * Get a retention policy by ID.
 */
export const getRetentionPolicy = async (id: string): Promise<RetentionPolicy> => {
  try {
    const response = await apiFetch<RetentionPolicy>(`/records/policies/${id}/`);
    return response;
  } catch (error) {
    logError('Failed to get retention policy', error);
    throw error;
  }
};

/**
 * Create a retention policy.
 */
export const createRetentionPolicy = async (
  data: Partial<RetentionPolicy>
): Promise<RetentionPolicy> => {
  try {
    const response = await apiFetch<RetentionPolicy>('/records/policies/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error) {
    logError('Failed to create retention policy', error);
    throw error;
  }
};

/**
 * Update a retention policy.
 */
export const updateRetentionPolicy = async (
  id: string,
  data: Partial<RetentionPolicy>
): Promise<RetentionPolicy> => {
  try {
    const response = await apiFetch<RetentionPolicy>(`/records/policies/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error) {
    logError('Failed to update retention policy', error);
    throw error;
  }
};

/**
 * Apply retention policy to records.
 */
export const applyRetentionPolicy = async (
  policyId: string,
  recordIds: string[]
): Promise<{ applied: number; failed: number }> => {
  try {
    const response = await apiFetch<{ applied: number; failed: number }>(
      `/records/policies/${policyId}/apply_to_records/`,
      {
        method: 'POST',
        body: JSON.stringify({ record_ids: recordIds }),
      }
    );
    return response;
  } catch (error) {
    logError('Failed to apply retention policy', error);
    throw error;
  }
};

/**
 * Get all legal holds.
 */
export const getLegalHolds = async (params?: {
  is_active?: boolean;
}): Promise<LegalHold[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', String(params.is_active));
    }
    const query = queryParams.toString();
    const response = await apiFetch<Record<string, unknown>>(
      `/records/legal-holds/${query ? `?${query}` : ''}`
    );
    
    // Handle paginated response
    if (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) {
      return response.results;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  } catch (error) {
    logError('Failed to get legal holds', error);
    return [];
  }
};

/**
 * Create a legal hold.
 */
export const createLegalHold = async (data: Partial<LegalHold>): Promise<LegalHold> => {
  try {
    const response = await apiFetch<LegalHold>('/records/legal-holds/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error) {
    logError('Failed to create legal hold', error);
    throw error;
  }
};

/**
 * Check if a record is on legal hold.
 */
export const checkLegalHold = async (
  recordType: 'document' | 'correspondence',
  recordId: string
): Promise<{
  on_hold: boolean;
  legal_holds: LegalHold[];
  can_delete: boolean;
  can_archive: boolean;
}> => {
  try {
    const response = await apiFetch<{
      on_hold: boolean;
      legal_holds: LegalHold[];
      can_delete: boolean;
      can_archive: boolean;
    }>('/records/legal-holds/check_record/', {
      method: 'POST',
      body: JSON.stringify({
        record_type: recordType,
        record_id: recordId,
      }),
    });
    return response;
  } catch (error) {
    logError('Failed to check legal hold', error);
    throw error;
  }
};

/**
 * Get dispositions.
 */
export const getDispositions = async (params?: {
  status?: string;
  record_type?: string;
}): Promise<Disposition[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.status) {
      queryParams.append('status', params.status);
    }
    if (params?.record_type) {
      queryParams.append('record_type', params.record_type);
    }
    const query = queryParams.toString();
    const response = await apiFetch<Record<string, unknown>>(
      `/records/dispositions/${query ? `?${query}` : ''}`
    );
    
    // Handle paginated response
    if (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) {
      return response.results;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  } catch (error) {
    logError('Failed to get dispositions', error);
    return [];
  }
};

/**
 * Approve a disposition.
 */
export const approveDisposition = async (id: string): Promise<Disposition> => {
  try {
    const response = await apiFetch<Disposition>(`/records/dispositions/${id}/approve/`, {
      method: 'POST',
    });
    return response;
  } catch (error) {
    logError('Failed to approve disposition', error);
    throw error;
  }
};

/**
 * Execute a disposition.
 */
export const executeDisposition = async (
  id: string,
  notes?: string
): Promise<Disposition> => {
  try {
    const response = await apiFetch<Disposition>(`/records/dispositions/${id}/execute/`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    return response;
  } catch (error) {
    logError('Failed to execute disposition', error);
    throw error;
  }
};

/**
 * Get retention schedules.
 */
export const getRetentionSchedules = async (params?: {
  record_type?: string;
  record_id?: string;
}): Promise<RetentionSchedule[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.record_type) {
      queryParams.append('record_type', params.record_type);
    }
    if (params?.record_id) {
      queryParams.append('record_id', params.record_id);
    }
    const query = queryParams.toString();
    const response = await apiFetch<Record<string, unknown>>(
      `/records/schedules/${query ? `?${query}` : ''}`
    );
    
    // Handle paginated response
    if (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) {
      return response.results;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  } catch (error) {
    logError('Failed to get retention schedules', error);
    return [];
  }
};

