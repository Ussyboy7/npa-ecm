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

