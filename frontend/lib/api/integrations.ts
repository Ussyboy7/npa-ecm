import { apiFetch } from '@/lib/api-client';

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
  created_by?: { id: string; name: string; email: string };
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

export const getWebhooks = async (params?: { is_active?: boolean }): Promise<Webhook[]> => {
  const queryParams = new URLSearchParams();
  if (params?.is_active !== undefined) queryParams.append('is_active', String(params.is_active));
  const query = queryParams.toString();
  const response = await apiFetch<Webhook[] | { results: Webhook[] }>(
    `/integrations/webhooks/${query ? `?${query}` : ''}`
  );
  return unwrapList(response);
};

export const createWebhook = async (data: Partial<Webhook>): Promise<Webhook> =>
  apiFetch<Webhook>('/integrations/webhooks/', { method: 'POST', body: JSON.stringify(data) });

export const updateWebhook = async (id: string, data: Partial<Webhook>): Promise<Webhook> =>
  apiFetch<Webhook>(`/integrations/webhooks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteWebhook = async (id: string): Promise<void> =>
  apiFetch(`/integrations/webhooks/${id}/`, { method: 'DELETE' });

export const testWebhook = async (id: string): Promise<{ status: string; message: string; event_id?: string; error?: string }> =>
  apiFetch(`/integrations/webhooks/${id}/test/`, { method: 'POST' });

export const getWebhookEvents = async (params?: { webhook?: string; status?: string }): Promise<WebhookEvent[]> => {
  const queryParams = new URLSearchParams();
  if (params?.webhook) queryParams.append('webhook', params.webhook);
  if (params?.status) queryParams.append('status', params.status);
  const query = queryParams.toString();
  const response = await apiFetch<WebhookEvent[] | { results: WebhookEvent[] }>(
    `/integrations/webhook-events/${query ? `?${query}` : ''}`
  );
  return unwrapList(response);
};

export const getEmailConnectors = async (): Promise<EmailConnector[]> => {
  const response = await apiFetch<EmailConnector[] | { results: EmailConnector[] }>(
    '/integrations/email-connectors/'
  );
  return unwrapList(response);
};

export const updateEmailConnector = async (id: string, data: Partial<EmailConnector> & { password?: string }): Promise<EmailConnector> =>
  apiFetch<EmailConnector>(`/integrations/email-connectors/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteEmailConnector = async (id: string): Promise<void> =>
  apiFetch(`/integrations/email-connectors/${id}/`, { method: 'DELETE' });

export const createEmailConnector = async (data: Partial<EmailConnector>): Promise<EmailConnector> =>
  apiFetch<EmailConnector>('/integrations/email-connectors/', { method: 'POST', body: JSON.stringify(data) });

export const sendEmail = async (data: { to: string[]; subject: string; body: string; html_body?: string; connector_id?: string }): Promise<{ status: string; message: string }> =>
  apiFetch('/integrations/email-connectors/send_email/', { method: 'POST', body: JSON.stringify(data) });

export const getERPConnectors = async (): Promise<ERPConnector[]> => {
  const response = await apiFetch<ERPConnector[] | { results: ERPConnector[] }>('/integrations/erp-connectors/');
  return unwrapList(response);
};

export const createERPConnector = async (data: Partial<ERPConnector> & { password?: string; api_key?: string }): Promise<ERPConnector> =>
  apiFetch<ERPConnector>('/integrations/erp-connectors/', { method: 'POST', body: JSON.stringify(data) });

export const updateERPConnector = async (id: string, data: Partial<ERPConnector> & { password?: string; api_key?: string }): Promise<ERPConnector> =>
  apiFetch<ERPConnector>(`/integrations/erp-connectors/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteERPConnector = async (id: string): Promise<void> =>
  apiFetch(`/integrations/erp-connectors/${id}/`, { method: 'DELETE' });

export const syncFromERP = async (connectorId: string): Promise<{ success: boolean; documents_synced?: number; documents_created?: number; documents_updated?: number; documents_skipped?: number; error?: string }> =>
  apiFetch('/integrations/erp-connectors/sync/', { method: 'POST', body: JSON.stringify({ connector_id: connectorId }) });

export const getIntegrationLogs = async (params?: { log_type?: string; status?: string; integration_id?: string }): Promise<IntegrationLog[]> => {
  const queryParams = new URLSearchParams();
  if (params?.log_type) queryParams.append('log_type', params.log_type);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.integration_id) queryParams.append('integration_id', params.integration_id);
  const query = queryParams.toString();
  const response = await apiFetch<IntegrationLog[] | { results: IntegrationLog[] }>(
    `/integrations/logs/${query ? `?${query}` : ''}`
  );
  return unwrapList(response);
};

export const getWebhookEventCatalog = async (): Promise<Array<{ id: string; label: string; module: string }>> => {
  const response = await apiFetch<{ events: Array<{ id: string; label: string; module: string }> }>(
    '/integrations/webhooks/event-catalog/'
  );
  return response.events ?? [];
};

export const pollEmailInbox = async (connectorId: string): Promise<{ success: boolean; correspondence_created?: number; messages_processed?: number; error?: string }> =>
  apiFetch(`/integrations/email-connectors/${connectorId}/poll-inbox/`, { method: 'POST' });

export const getHRMSConnectors = async (): Promise<HRMSConnector[]> => {
  const response = await apiFetch<HRMSConnector[] | { results: HRMSConnector[] }>('/integrations/hrms-connectors/');
  return unwrapList(response);
};

export const createHRMSConnector = async (data: Partial<HRMSConnector> & { password?: string; api_key?: string }): Promise<HRMSConnector> =>
  apiFetch<HRMSConnector>('/integrations/hrms-connectors/', { method: 'POST', body: JSON.stringify(data) });

export const updateHRMSConnector = async (id: string, data: Partial<HRMSConnector> & { password?: string; api_key?: string }): Promise<HRMSConnector> =>
  apiFetch<HRMSConnector>(`/integrations/hrms-connectors/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteHRMSConnector = async (id: string): Promise<void> =>
  apiFetch(`/integrations/hrms-connectors/${id}/`, { method: 'DELETE' });

export const syncFromHRMS = async (connectorId: string): Promise<{ success: boolean; staff_created?: number; staff_updated?: number; staff_deactivated?: number; error?: string }> =>
  apiFetch('/integrations/hrms-connectors/sync/', { method: 'POST', body: JSON.stringify({ connector_id: connectorId }) });
