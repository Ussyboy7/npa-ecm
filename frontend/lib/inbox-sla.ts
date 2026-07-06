import type { Correspondence } from '@/lib/npa-structure';

export interface SLATargets {
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

export interface SLAStatus {
  status: 'overdue' | 'due-soon' | 'pending';
  daysOverdue?: number;
  daysUntilDue?: number;
}

/** SLA status using configured target hours (matches row badges). */
export function calculateSLAStatus(
  item: Correspondence,
  slaTargets?: SLATargets | null,
): SLAStatus {
  if (!item.receivedDate || !slaTargets) {
    return { status: 'pending' };
  }
  const received = new Date(item.receivedDate).getTime();
  const now = Date.now();
  const priority = (item.priority?.toLowerCase() || 'medium') as keyof SLATargets;
  const targetHours = slaTargets[priority] ?? slaTargets.medium;
  const dueDate = received + targetHours * 60 * 60 * 1000;
  const diffHours = (dueDate - now) / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 0) {
    return { status: 'overdue', daysOverdue: Math.abs(diffDays) };
  }
  if (diffDays <= 2) {
    return { status: 'due-soon', daysUntilDue: diffDays };
  }
  return { status: 'pending', daysUntilDue: diffDays };
}

export const slaSortPriority = (status: SLAStatus['status']): number =>
  status === 'overdue' ? 0 : status === 'due-soon' ? 1 : 2;
