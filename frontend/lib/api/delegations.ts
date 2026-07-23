import { apiFetch } from '../api-client';
import { isRecord } from '@/lib/type-utils';

export interface ApiDelegation {
  id: string;
  principal: { id: string; name: string; email: string };
  assistant: { id: string; name: string; email: string };
  can_approve: boolean;
  can_minute: boolean;
  can_forward: boolean;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiCorrespondenceDelegation {
  id: string;
  correspondence: string;
  principal: { id: string; name: string; email: string };
  assistant: { id: string; name: string; email: string };
  delegation: string | null;
  notes: string;
  status: 'active' | 'completed' | 'revoked' | 'expired';
  delegated_at: string;
  completed_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Delegation {
  id: string;
  correspondenceId?: string;
  executiveId?: string;
  principalId: string | number;
  assistantId: string | number;
  assistantType?: 'TA' | 'PA';
  delegationNotes?: string;
  delegatedAt: string;
  status: 'active' | 'completed' | 'revoked';
  completedAt?: string;
  duration?: string;
  expiresAt?: string;
}

const mapApiCorrespondenceDelegationToFrontend = (
  api: ApiCorrespondenceDelegation
): Delegation => ({
  id: api.id,
  correspondenceId: api.correspondence,
  principalId: api.principal.id,
  assistantId: api.assistant.id,
  delegationNotes: api.notes,
  delegatedAt: api.delegated_at,
  status: api.status as 'active' | 'completed' | 'revoked',
  completedAt: api.completed_at ?? undefined,
  expiresAt: api.expires_at ?? undefined,
});

export async function getCorrespondenceDelegations(params?: {
  correspondence?: string;
  status?: 'active' | 'completed' | 'revoked' | 'expired';
}): Promise<Delegation[]> {
  const queryParams = new URLSearchParams();
  if (params?.correspondence) queryParams.append('correspondence', params.correspondence);
  if (params?.status) queryParams.append('status', params.status);

  const response = await apiFetch<unknown>(
    `/correspondence/correspondence-delegations/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  );

  const delegations = Array.isArray(response)
    ? (response as ApiCorrespondenceDelegation[])
    : isRecord(response) && Array.isArray(response.results)
      ? (response.results as ApiCorrespondenceDelegation[])
      : [];
  return delegations.map(mapApiCorrespondenceDelegationToFrontend);
}

export async function getDelegationByCorrespondence(
  correspondenceId: string
): Promise<Delegation | null> {
  const delegations = await getCorrespondenceDelegations({
    correspondence: correspondenceId,
    status: 'active',
  });
  return delegations[0] || null;
}

export async function createCorrespondenceDelegation(
  data: Omit<Delegation, 'id' | 'delegatedAt' | 'status'>
): Promise<Delegation> {
  const apiData: Record<string, unknown> = {
    correspondence_id: data.correspondenceId!,
    assistant_id: data.assistantId.toString(),
    notes: data.delegationNotes || '',
  };

  if (data.expiresAt) {
    apiData.expires_at = data.expiresAt;
  }

  const response = await apiFetch<ApiCorrespondenceDelegation>(
    '/correspondence/correspondence-delegations/',
    {
      method: 'POST',
      body: JSON.stringify(apiData),
    }
  );

  return mapApiCorrespondenceDelegationToFrontend(response);
}

export async function updateCorrespondenceDelegation(
  id: string,
  updates: Partial<Pick<Delegation, 'status' | 'completedAt' | 'expiresAt' | 'delegationNotes'>>
): Promise<Delegation> {
  const apiData: Partial<ApiCorrespondenceDelegation> = {};
  if (updates.status) apiData.status = updates.status as 'active' | 'completed' | 'revoked' | 'expired';
  if (updates.completedAt !== undefined) apiData.completed_at = updates.completedAt || null;
  if (updates.expiresAt !== undefined) apiData.expires_at = updates.expiresAt || null;
  if (updates.delegationNotes !== undefined) apiData.notes = updates.delegationNotes || '';

  const response = await apiFetch<ApiCorrespondenceDelegation>(
    `/correspondence/correspondence-delegations/${id}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(apiData),
    }
  );

  return mapApiCorrespondenceDelegationToFrontend(response);
}

export async function completeDelegation(id: string): Promise<Delegation> {
  return updateCorrespondenceDelegation(id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
}

export async function revokeDelegation(id: string): Promise<Delegation> {
  return updateCorrespondenceDelegation(id, {
    status: 'revoked',
  });
}

export async function getDelegationsByAssistant(
  assistantId: string
): Promise<Delegation[]> {
  const delegations = await getCorrespondenceDelegations({ status: 'active' });
  return delegations.filter((d) => d.assistantId.toString() === assistantId.toString());
}
