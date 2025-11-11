import { Correspondence, Minute } from './npa-structure';

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
    case 'completed': return 'default';
    case 'in-progress': return 'secondary';
    default: return 'outline';
  }
};

// Format date - Always uses 'en-US' locale for consistent server/client rendering
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format date with time - Always uses 'en-US' locale
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Short date format (MM/DD/YYYY) for consistent rendering
export const formatDateShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

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
    case 'completed': return 'text-success';
    case 'in-progress': return 'text-info';
    case 'pending': return 'text-warning';
    default: return 'text-muted-foreground';
  }
};
