import { logError, logWarn } from '@/lib/client-logger';
import * as delegationApi from '@/lib/api/delegations';

// Re-export the type
export type Delegation = delegationApi.Delegation;

/**
 * Load all delegations from backend
 * @deprecated Use getCorrespondenceDelegations from @/lib/api/delegations directly
 */
export const loadDelegations = async (): Promise<Delegation[]> => {
  try {
    return await delegationApi.getCorrespondenceDelegations();
  } catch (error) {
    logError('Error loading delegations from backend:', error);
    return [];
  }
};

/**
 * @deprecated Not needed - backend handles saving automatically
 */
export const saveDelegations = (delegations: Delegation[]): void => {
  // No-op - backend handles persistence
  logWarn('saveDelegations is deprecated - backend handles persistence automatically');
};

/**
 * Add a new delegation (creates in backend)
 */
export const addDelegation = async (delegation: Omit<Delegation, 'id' | 'delegatedAt' | 'status'>): Promise<Delegation> => {
  try {
    return await delegationApi.createCorrespondenceDelegation(delegation);
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    logError(`Error completing delegation ${id}:`, error);
    return null;
  }
};

/**
 * Revoke a delegation
 */
export const revokeDelegation = async (id: string): Promise<Delegation | null> => {
  try {
    return await delegationApi.revokeDelegation(id);
  } catch (error) {
    logError(`Error revoking delegation ${id}:`, error);
    return null;
  }
};