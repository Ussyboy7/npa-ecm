/**
 * Frontend API client for Integration Hub (webhooks, email, ERP connectors).
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

export interface Webhook {
  id: string;
  name: string;
  description?: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  retry_count: number;
  timeout_seconds: number;
  headers: Record<string, string>;
  created_by?: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  webhook: Webhook;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  response_code?: number;
  response_body?: string;
  error_message?: string;
  attempt_count: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailConnector {
  id: string;
  name: string;
  connector_type: 'smtp' | 'imap' | 'pop3';
  host: string;
  port: number;
  use_tls: boolean;
  use_ssl: boolean;
  username: string;
  is_active: boolean;
  is_incoming: boolean;
  is_outgoing: boolean;
  auto_create_correspondence: boolean;
  default_division_id?: string;
  default_department_id?: string;
  imap_folder?: string;
  last_synced_uid?: number;
  created_at: string;
  updated_at: string;
}

export interface ERPConnector {
  id: string;
  name: string;
  erp_type: 'oracle' | 'sap' | 'custom';
  base_url: string;
  is_active: boolean;
  sync_enabled: boolean;
  sync_interval_minutes: number;
  field_mappings: Record<string, unknown>;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HRMSConnector {
  id: string;
  name: string;
  base_url: string;
  staff_endpoint: string;
  org_endpoint: string;
  is_active: boolean;
  sync_enabled: boolean;
  sync_interval_minutes: number;
  deactivate_exited_staff: boolean;
  field_mappings: Record<string, unknown>;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationLog {
  id: string;
  log_type: 'webhook' | 'email' | 'erp' | 'hrms' | 'sso';
  integration_id: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
  details: Record<string, unknown>;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}

/**
 * Get all webhooks.
 */
export const getWebhooks = async (params?: {
  is_active?: boolean;
}): Promise<Webhook[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', String(params.is_active));
    }
    const query = queryParams.toString();
    const response = await apiFetch<Webhook[] | { results: Webhook[] }>(
      `/integrations/webhooks/${query ? `?${query}` : ''}`
    );
    return unwrapList(response);
  } catch (error: unknown) {
    logError('Failed to get webhooks', error);
    throw error;
  }
};

/**
 * Create a webhook.
 */
export const createWebhook = async (data: Partial<Webhook>): Promise<Webhook> => {
  try {
    const response = await apiFetch<Webhook>('/integrations/webhooks/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error: unknown) {
    logError('Failed to create webhook', error);
    throw error;
  }
};

/**
 * Update a webhook.
 */
export const updateWebhook = async (
  id: string,
  data: Partial<Webhook>
): Promise<Webhook> => {
  try {
    const response = await apiFetch<Webhook>(`/integrations/webhooks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error: unknown) {
    logError('Failed to update webhook', error);
    throw error;
  }
};

/**
 * Delete a webhook.
 */
export const deleteWebhook = async (id: string): Promise<void> => {
  try {
    await apiFetch(`/integrations/webhooks/${id}/`, {
      method: 'DELETE',
    });
  } catch (error: unknown) {
    logError('Failed to delete webhook', error);
    throw error;
  }
};

/**
 * Test a webhook.
 */
export const testWebhook = async (id: string): Promise<{
  status: string;
  message: string;
  event_id?: string;
  error?: string;
}> => {
  try {
    const response = await apiFetch<{
      status: string;
      message: string;
      event_id?: string;
      error?: string;
    }>(`/integrations/webhooks/${id}/test/`, {
      method: 'POST',
    });
    return response;
  } catch (error: unknown) {
    logError('Failed to test webhook', error);
    throw error;
  }
};

/**
 * Get webhook events.
 */
export const getWebhookEvents = async (params?: {
  webhook?: string;
  status?: string;
}): Promise<WebhookEvent[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.webhook) {
      queryParams.append('webhook', params.webhook);
    }
    if (params?.status) {
      queryParams.append('status', params.status);
    }
    const query = queryParams.toString();
    const response = await apiFetch<WebhookEvent[] | { results: WebhookEvent[] }>(
      `/integrations/webhook-events/${query ? `?${query}` : ''}`
    );
    return unwrapList(response);
  } catch (error: unknown) {
    logError('Failed to get webhook events', error);
    throw error;
  }
};

/**
 * Get email connectors.
 */
export const getEmailConnectors = async (): Promise<EmailConnector[]> => {
  try {
    const response = await apiFetch<EmailConnector[] | { results: EmailConnector[] }>(
      '/integrations/email-connectors/'
    );
    return unwrapList(response);
  } catch (error: unknown) {
    logError('Failed to get email connectors', error);
    throw error;
  }
};

export const updateEmailConnector = async (
  id: string,
  data: Partial<EmailConnector> & { password?: string }
): Promise<EmailConnector> => {
  return apiFetch<EmailConnector>(`/integrations/email-connectors/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteEmailConnector = async (id: string): Promise<void> => {
  await apiFetch(`/integrations/email-connectors/${id}/`, { method: 'DELETE' });
};

/**
 * Create an email connector.
 */
export const createEmailConnector = async (
  data: Partial<EmailConnector>
): Promise<EmailConnector> => {
  try {
    const response = await apiFetch<EmailConnector>('/integrations/email-connectors/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error: unknown) {
    logError('Failed to create email connector', error);
    throw error;
  }
};

/**
 * Send email via connector.
 */
export const sendEmail = async (data: {
  to: string[];
  subject: string;
  body: string;
  html_body?: string;
  connector_id?: string;
}): Promise<{ status: string; message: string }> => {
  try {
    const response = await apiFetch<{ status: string; message: string }>(
      '/integrations/email-connectors/send_email/',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
  } catch (error: unknown) {
    logError('Failed to send email', error);
    throw error;
  }
};

/**
 * Get ERP connectors.
 */
export const getERPConnectors = async (): Promise<ERPConnector[]> => {
  try {
    const response = await apiFetch<ERPConnector[] | { results: ERPConnector[] }>(
      '/integrations/erp-connectors/'
    );
    return unwrapList(response);
  } catch (error: unknown) {
    logError('Failed to get ERP connectors', error);
    throw error;
  }
};

export const createERPConnector = async (
  data: Partial<ERPConnector> & { password?: string; api_key?: string }
): Promise<ERPConnector> => {
  return apiFetch<ERPConnector>('/integrations/erp-connectors/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateERPConnector = async (
  id: string,
  data: Partial<ERPConnector> & { password?: string; api_key?: string }
): Promise<ERPConnector> => {
  return apiFetch<ERPConnector>(`/integrations/erp-connectors/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteERPConnector = async (id: string): Promise<void> => {
  await apiFetch(`/integrations/erp-connectors/${id}/`, { method: 'DELETE' });
};

/**
 * Sync from ERP.
 */
export const syncFromERP = async (
  connectorId: string
): Promise<{
  success: boolean;
  documents_synced?: number;
  documents_created?: number;
  documents_updated?: number;
  documents_skipped?: number;
  error?: string;
}> => {
  try {
    const response = await apiFetch<{
      success: boolean;
      documents_synced?: number;
      documents_created?: number;
      documents_updated?: number;
      documents_skipped?: number;
      error?: string;
    }>('/integrations/erp-connectors/sync/', {
      method: 'POST',
      body: JSON.stringify({ connector_id: connectorId }),
    });
    return response;
  } catch (error: unknown) {
    logError('Failed to sync from ERP', error);
    throw error;
  }
};

/**
 * Get integration logs.
 */
export const getIntegrationLogs = async (params?: {
  log_type?: string;
  status?: string;
  integration_id?: string;
}): Promise<IntegrationLog[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.log_type) {
      queryParams.append('log_type', params.log_type);
    }
    if (params?.status) {
      queryParams.append('status', params.status);
    }
    if (params?.integration_id) {
      queryParams.append('integration_id', params.integration_id);
    }
    const query = queryParams.toString();
    const response = await apiFetch<IntegrationLog[] | { results: IntegrationLog[] }>(
      `/integrations/logs/${query ? `?${query}` : ''}`
    );
    return unwrapList(response);
  } catch (error: unknown) {
    logError('Failed to get integration logs', error);
    throw error;
  }
};

export const getWebhookEventCatalog = async (): Promise<
  Array<{ id: string; label: string; module: string }>
> => {
  const response = await apiFetch<{ events: Array<{ id: string; label: string; module: string }> }>(
    '/integrations/webhooks/event-catalog/'
  );
  return response.events ?? [];
};

export const pollEmailInbox = async (
  connectorId: string
): Promise<{
  success: boolean;
  correspondence_created?: number;
  messages_processed?: number;
  error?: string;
}> => {
  return apiFetch(`/integrations/email-connectors/${connectorId}/poll-inbox/`, {
    method: 'POST',
  });
};

export const getHRMSConnectors = async (): Promise<HRMSConnector[]> => {
  const response = await apiFetch<HRMSConnector[] | { results: HRMSConnector[] }>(
    '/integrations/hrms-connectors/'
  );
  return unwrapList(response);
};

export const createHRMSConnector = async (
  data: Partial<HRMSConnector> & { password?: string; api_key?: string }
): Promise<HRMSConnector> => {
  return apiFetch<HRMSConnector>('/integrations/hrms-connectors/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateHRMSConnector = async (
  id: string,
  data: Partial<HRMSConnector> & { password?: string; api_key?: string }
): Promise<HRMSConnector> => {
  return apiFetch<HRMSConnector>(`/integrations/hrms-connectors/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteHRMSConnector = async (id: string): Promise<void> => {
  await apiFetch(`/integrations/hrms-connectors/${id}/`, { method: 'DELETE' });
};

export const syncFromHRMS = async (
  connectorId: string
): Promise<{
  success: boolean;
  staff_created?: number;
  staff_updated?: number;
  staff_deactivated?: number;
  error?: string;
}> => {
  return apiFetch('/integrations/hrms-connectors/sync/', {
    method: 'POST',
    body: JSON.stringify({ connector_id: connectorId }),
  });
};

