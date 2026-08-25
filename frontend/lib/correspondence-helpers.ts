import { Correspondence, Minute } from './npa-structure';

export const CORRESPONDENCE_CLOSED_STATUSES = [
  'completed',
  'dispatched',
  'acknowledged',
  'archived',
  'withdrawn',
] as const;

export type CorrespondenceClosedStatus = (typeof CORRESPONDENCE_CLOSED_STATUSES)[number];

/** Workflow finished or cancelled — no further minutes/routing. */
export const isCorrespondenceClosed = (
  status: string | null | undefined,
): boolean =>
  Boolean(status && (CORRESPONDENCE_CLOSED_STATUSES as readonly string[]).includes(status));

/** True when correspondence is outward (going out of office). */
export const isCorrespondenceOutward = (
  correspondence: Pick<Correspondence, 'isOutward' | 'direction' | 'flowType'> | null | undefined,
): boolean => {
  if (!correspondence) return false;
  if (typeof correspondence.isOutward === 'boolean') return correspondence.isOutward;
  if (correspondence.flowType?.startsWith('outward')) return true;
  return correspondence.direction === 'downward';
};

/** Registry dispatch is only for completed outward items that have a physical copy and haven't been dispatched yet. */
export const canDispatchCorrespondence = (
  correspondence: Pick<Correspondence, 'status' | 'isOutward' | 'direction' | 'flowType' | 'hasPhysicalCopy' | 'dispatchDate'> | null | undefined,
): boolean => {
  if (!correspondence || correspondence.status !== 'completed') return false;
  if (!isCorrespondenceOutward(correspondence)) return false;
  if ((correspondence as unknown as { hasPhysicalCopy?: boolean }).hasPhysicalCopy === false) return false;
  // If dispatchDate already set, it's been dispatched — don't show again
  if ((correspondence as unknown as { dispatchDate?: string | null }).dispatchDate) return false;
  return true;
};

/** Archive after completion (inward) or after dispatch/ack (outward). */
export const canArchiveCorrespondence = (
  correspondence: Pick<Correspondence, 'status'> | null | undefined,
): boolean => {
  if (!correspondence) return false;
  return (
    correspondence.status === 'completed' ||
    correspondence.status === 'dispatched' ||
    correspondence.status === 'acknowledged'
  );
};

// Generate unique IDs
export const generateId = (prefix: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${random}`;
};

// Generate reference number
export const generateReferenceNumber = (divisionCode: string): string => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `NPA/${divisionCode}/${year}/${month}${random}`;
};

// Calculate next step number
export const getNextStepNumber = (minutes: Minute[]): number => {
  if (minutes.length === 0) return 1;
  return Math.max(...minutes.map(m => m.stepNumber)) + 1;
};

// Get priority badge variant
export const getPriorityVariant = (priority: string): 'destructive' | 'default' | 'secondary' => {
  switch (priority) {
    case 'urgent': return 'destructive';
    case 'high': return 'default';
    default: return 'secondary';
  }
};

// Get status badge variant
export const getStatusVariant = (status: string): 'default' | 'secondary' | 'outline' => {
  switch (status) {
    case 'completed':
    case 'acknowledged':
      return 'default';
    case 'in-progress':
    case 'dispatched':
      return 'secondary';
    default:
      return 'outline';
  }
};

export {
  formatDateLong as formatDate,
  formatDateTime,
  formatDateShort,
  formatDateForAPI,
} from "@/lib/datetime";

// Check if correspondence is overdue
export const isOverdue = (correspondence: Correspondence): boolean => {
  const daysSinceReceived = Math.floor(
    (Date.now() - new Date(correspondence.receivedDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  switch (correspondence.priority) {
    case 'urgent': return daysSinceReceived > 1;
    case 'high': return daysSinceReceived > 3;
    case 'medium': return daysSinceReceived > 7;
    case 'low': return daysSinceReceived > 10;
    default: return daysSinceReceived > 14;
  }
};

// Get correspondence status color
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
    case 'acknowledged':
      return 'text-success';
    case 'dispatched':
      return 'text-info';
    case 'in-progress':
      return 'text-info';
    case 'pending':
      return 'text-warning';
    case 'withdrawn':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
};
