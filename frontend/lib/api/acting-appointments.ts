import { apiFetch } from '../api-client';
import { isRecord, unwrapResults } from '@/lib/type-utils';

export interface ActingAppointment {
  id: string;
  office: string;
  officeName: string;
  officeCode: string;
  principal: string;
  principalName: string;
  actingUser: string;
  actingUserName: string;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  isCurrentlyEffective: boolean;
  reason: string;
  appointedBy: string | null;
  appointedByName: string;
  endedAt: string | null;
  endedBy: string | null;
  endedByName: string;
  itemsTransferred: number;
  itemsReclaimed: number;
  createdAt: string;
}

export interface ActingCandidate {
  id: string;
  username: string;
  name: string;
  email: string;
  gradeLevel: string;
}

export interface ActingRequest {
  id: string;
  office: string;
  officeName: string;
  officeCode: string;
  principal: string;
  principalName: string;
  requestedBy: string;
  requestedByName: string;
  suggestedActingUser: string | null;
  suggestedActingUserName: string;
  reason: string;
  pendingItemCount: number;
  status: 'pending' | 'fulfilled' | 'dismissed';
  resolvedBy: string | null;
  resolvedByName: string;
  resolvedAt: string | null;
  resolutionNote: string;
  appointment: string | null;
  createdAt: string;
}

function mapAppointment(raw: Record<string, unknown>): ActingAppointment {
  return {
    id: String(raw.id ?? ''),
    office: String(raw.office ?? ''),
    officeName: String(raw.office_name ?? ''),
    officeCode: String(raw.office_code ?? ''),
    principal: String(raw.principal ?? ''),
    principalName: String(raw.principal_name ?? ''),
    actingUser: String(raw.acting_user ?? ''),
    actingUserName: String(raw.acting_user_name ?? ''),
    startsAt: String(raw.starts_at ?? ''),
    endsAt: raw.ends_at ? String(raw.ends_at) : null,
    isActive: raw.is_active === true,
    isCurrentlyEffective: raw.is_currently_effective === true,
    reason: String(raw.reason ?? ''),
    appointedBy: raw.appointed_by ? String(raw.appointed_by) : null,
    appointedByName: String(raw.appointed_by_name ?? ''),
    endedAt: raw.ended_at ? String(raw.ended_at) : null,
    endedBy: raw.ended_by ? String(raw.ended_by) : null,
    endedByName: String(raw.ended_by_name ?? ''),
    itemsTransferred: typeof raw.items_transferred === 'number' ? raw.items_transferred : 0,
    itemsReclaimed: typeof raw.items_reclaimed === 'number' ? raw.items_reclaimed : 0,
    createdAt: String(raw.created_at ?? ''),
  };
}

function mapRequest(raw: Record<string, unknown>): ActingRequest {
  const statusRaw = String(raw.status ?? 'pending');
  const status =
    statusRaw === 'fulfilled' || statusRaw === 'dismissed' ? statusRaw : 'pending';
  return {
    id: String(raw.id ?? ''),
    office: String(raw.office ?? ''),
    officeName: String(raw.office_name ?? ''),
    officeCode: String(raw.office_code ?? ''),
    principal: String(raw.principal ?? ''),
    principalName: String(raw.principal_name ?? ''),
    requestedBy: String(raw.requested_by ?? ''),
    requestedByName: String(raw.requested_by_name ?? ''),
    suggestedActingUser: raw.suggested_acting_user ? String(raw.suggested_acting_user) : null,
    suggestedActingUserName: String(raw.suggested_acting_user_name ?? ''),
    reason: String(raw.reason ?? ''),
    pendingItemCount: typeof raw.pending_item_count === 'number' ? raw.pending_item_count : 0,
    status,
    resolvedBy: raw.resolved_by ? String(raw.resolved_by) : null,
    resolvedByName: String(raw.resolved_by_name ?? ''),
    resolvedAt: raw.resolved_at ? String(raw.resolved_at) : null,
    resolutionNote: String(raw.resolution_note ?? ''),
    appointment: raw.appointment ? String(raw.appointment) : null,
    createdAt: String(raw.created_at ?? ''),
  };
}

export async function listActingAppointments(params?: {
  isActive?: boolean;
  office?: string;
}): Promise<ActingAppointment[]> {
  const query = new URLSearchParams();
  if (params?.isActive !== undefined) query.set('is_active', String(params.isActive));
  if (params?.office) query.set('office', params.office);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await apiFetch<unknown>(`/organization/acting-appointments/${suffix}`);
  return unwrapResults(response).filter(isRecord).map(mapAppointment);
}

export async function getMyActingAppointments(): Promise<ActingAppointment[]> {
  const response = await apiFetch<unknown>('/organization/acting-appointments/mine/');
  if (Array.isArray(response)) {
    return response.filter(isRecord).map(mapAppointment);
  }
  return unwrapResults(response).filter(isRecord).map(mapAppointment);
}

export async function getMyPrincipalActingAppointments(): Promise<ActingAppointment[]> {
  const response = await apiFetch<unknown>('/organization/acting-appointments/my-principal/');
  if (Array.isArray(response)) {
    return response.filter(isRecord).map(mapAppointment);
  }
  return unwrapResults(response).filter(isRecord).map(mapAppointment);
}

export async function getEligibleActingCandidates(params: {
  office: string;
  principal?: string;
}): Promise<ActingCandidate[]> {
  const query = new URLSearchParams({ office: params.office });
  if (params.principal) query.set('principal', params.principal);
  const response = await apiFetch<unknown>(
    `/organization/acting-appointments/eligible/?${query.toString()}`
  );
  const rows = Array.isArray(response) ? response : unwrapResults(response);
  return rows.filter(isRecord).map((raw) => ({
    id: String(raw.id ?? ''),
    username: String(raw.username ?? ''),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    gradeLevel: String(raw.grade_level ?? ''),
  }));
}

export async function appointActing(payload: {
  office: string;
  principal?: string;
  actingUser: string;
  startsAt?: string;
  endsAt?: string;
  reason?: string;
}): Promise<ActingAppointment> {
  const body: Record<string, string> = {
    office: payload.office,
    acting_user: payload.actingUser,
  };
  if (payload.principal) body.principal = payload.principal;
  if (payload.startsAt) body.starts_at = payload.startsAt;
  if (payload.endsAt) body.ends_at = payload.endsAt;
  if (payload.reason) body.reason = payload.reason;

  const response = await apiFetch<Record<string, unknown>>(
    '/organization/acting-appointments/appoint/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  return mapAppointment(response);
}

export async function endActingAppointment(
  id: string,
  reason?: string
): Promise<ActingAppointment> {
  const response = await apiFetch<Record<string, unknown>>(
    `/organization/acting-appointments/${id}/end/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || '' }),
    }
  );
  return mapAppointment(response);
}

export async function listActingRequests(params?: {
  status?: string;
}): Promise<ActingRequest[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await apiFetch<unknown>(`/organization/acting-requests/${suffix}`);
  return unwrapResults(response).filter(isRecord).map(mapRequest);
}

export async function createActingRequest(payload: {
  office: string;
  principal?: string;
  suggestedActingUser?: string;
  reason: string;
}): Promise<ActingRequest> {
  const body: Record<string, string> = {
    office: payload.office,
    reason: payload.reason,
  };
  if (payload.principal) body.principal = payload.principal;
  if (payload.suggestedActingUser) {
    body.suggested_acting_user = payload.suggestedActingUser;
  }
  const response = await apiFetch<Record<string, unknown>>(
    '/organization/acting-requests/request/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  return mapRequest(response);
}

export async function dismissActingRequest(
  id: string,
  note?: string
): Promise<ActingRequest> {
  const response = await apiFetch<Record<string, unknown>>(
    `/organization/acting-requests/${id}/dismiss/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution_note: note || '' }),
    }
  );
  return mapRequest(response);
}

export async function returnCorrespondenceToPrincipal(
  correspondenceId: string,
  reason?: string
): Promise<void> {
  await apiFetch(`/correspondence/items/${correspondenceId}/return-to-principal/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason || '' }),
  });
}
