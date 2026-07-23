import { bumpSidebarCounts } from '@/hooks/use-sidebar-counts';
import * as delegationApi from '@/lib/api/delegations';

export type Delegation = delegationApi.Delegation;

export const addDelegation = async (delegation: Omit<Delegation, 'id' | 'delegatedAt' | 'status'>): Promise<Delegation> => {
  const created = await delegationApi.createCorrespondenceDelegation(delegation);
  bumpSidebarCounts();
  return created;
};

export const updateDelegation = async (id: string, updates: Partial<Delegation>): Promise<Delegation> =>
  delegationApi.updateCorrespondenceDelegation(id, updates);

export const getDelegationByCorrespondence = async (correspondenceId: string): Promise<Delegation | null> => {
  const delegation = await delegationApi.getDelegationByCorrespondence(correspondenceId);
  return delegation ?? null;
};

export const getDelegationsByAssistant = async (assistantId: string): Promise<Delegation[]> =>
  delegationApi.getDelegationsByAssistant(assistantId);

export const completeDelegation = async (id: string): Promise<Delegation> =>
  delegationApi.completeDelegation(id);

export const revokeDelegation = async (id: string): Promise<Delegation> => {
  const revoked = await delegationApi.revokeDelegation(id);
  bumpSidebarCounts();
  return revoked;
};
