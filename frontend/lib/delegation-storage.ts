import { logError } from '@/lib/client-logger';
import { bumpSidebarCounts } from '@/hooks/use-sidebar-counts';
import * as delegationApi from '@/lib/api/delegations';

// Re-export the type
export type Delegation = delegationApi.Delegation;

/**
 * Add a new delegation (creates in backend)
 */
export const addDelegation = async (delegation: Omit<Delegation, 'id' | 'delegatedAt' | 'status'>): Promise<Delegation> => {
  try {
    const created = await delegationApi.createCorrespondenceDelegation(delegation);
    bumpSidebarCounts();
    return created;
  } catch (error: unknown) {
    logError('Error creating delegation:', error);
    throw error;
  }
};

/**
 * Update a delegation
 */
export const updateDelegation = async (id: string, updates: Partial<Delegation>): Promise<Delegation | null> => {
  try {
    return await delegationApi.updateCorrespondenceDelegation(id, updates);
  } catch (error: unknown) {
    logError(`Error updating delegation ${id}:`, error);
    return null;
  }
};

/**
 * Get delegation for a specific correspondence
 */
export const getDelegationByCorrespondence = async (correspondenceId: string): Promise<Delegation | undefined> => {
  try {
    const delegation = await delegationApi.getDelegationByCorrespondence(correspondenceId);
    return delegation || undefined;
  } catch (error: unknown) {
    logError(`Error loading delegation for correspondence ${correspondenceId}:`, error);
    return undefined;
  }
};

/**
 * Get delegations by assistant
 */
export const getDelegationsByAssistant = async (assistantId: string): Promise<Delegation[]> => {
  try {
    return await delegationApi.getDelegationsByAssistant(assistantId);
  } catch (error: unknown) {
    logError(`Error loading delegations for assistant ${assistantId}:`, error);
    return [];
  }
};

/**
 * Complete a delegation
 */
export const completeDelegation = async (id: string): Promise<Delegation | null> => {
  try {
    return await delegationApi.completeDelegation(id);
  } catch (error: unknown) {
    logError(`Error completing delegation ${id}:`, error);
    return null;
  }
};

/**
 * Revoke a delegation
 */
export const revokeDelegation = async (id: string): Promise<Delegation | null> => {
  try {
    const revoked = await delegationApi.revokeDelegation(id);
    bumpSidebarCounts();
    return revoked;
  } catch (error: unknown) {
    logError(`Error revoking delegation ${id}:`, error);
    return null;
  }
};