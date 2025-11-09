// Delegation management functions

export type Delegation = {
  id: string;
  correspondenceId: string;
  executiveId: string;
  assistantId: string;
  assistantType: 'TA' | 'PA';
  delegationNotes: string;
  delegatedAt: string;
  status: 'active' | 'completed' | 'revoked';
  completedAt?: string;
};

const STORAGE_KEY = 'npa-delegations';

export const loadDelegations = (): Delegation[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading delegations:', error);
    return [];
  }
};

export const saveDelegations = (delegations: Delegation[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(delegations));
  } catch (error) {
    console.error('Error saving delegations:', error);
  }
};

export const addDelegation = (delegation: Delegation): Delegation => {
  const delegations = loadDelegations();
  
  // Revoke any existing active delegations for the same correspondence
  const updated = delegations.map(d => 
    d.correspondenceId === delegation.correspondenceId && d.status === 'active'
      ? { ...d, status: 'revoked' as const }
      : d
  );
  
  updated.push(delegation);
  saveDelegations(updated);
  return delegation;
};

export const updateDelegation = (id: string, updates: Partial<Delegation>): Delegation | null => {
  const delegations = loadDelegations();
  const index = delegations.findIndex(d => d.id === id);
  
  if (index === -1) return null;
  
  const updated = { ...delegations[index], ...updates };
  delegations[index] = updated;
  saveDelegations(delegations);
  return updated;
};

export const getDelegationByCorrespondence = (correspondenceId: string): Delegation | undefined => {
  const delegations = loadDelegations();
  return delegations.find(d => d.correspondenceId === correspondenceId && d.status === 'active');
};

export const getDelegationsByAssistant = (assistantId: string): Delegation[] => {
  const delegations = loadDelegations();
  return delegations.filter(d => d.assistantId === assistantId && d.status === 'active');
};

export const completeDelegation = (id: string): Delegation | null => {
  return updateDelegation(id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
};

export const revokeDelegation = (id: string): Delegation | null => {
  return updateDelegation(id, { status: 'revoked' });
};
