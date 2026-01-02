/**
 * Constants for Register Correspondence page
 */

export const REGISTER_CONSTANTS = {
  DRAFT_KEY: 'correspondence_register_draft',
  MAX_FILE_SIZE: 30 * 1024 * 1024, // 30MB
  ALLOWED_FILE_TYPES: ['.pdf', '.doc', '.docx'],
  ALLOWED_FILE_EXTENSIONS: ['pdf', 'doc', 'docx'],
  ELIGIBLE_GRADES: ['MDCS', 'EDCS', 'MSS1', 'MSS2', 'MSS3', 'MSS4'],
  ASSIGN_PLACEHOLDER: '__select_assign__',
  DRAFT_SAVE_DEBOUNCE_MS: 2000, // 2 seconds
} as const;

export const FORM_STEPS = [
  { id: 'basics' as const, label: 'Basic Info' },
  { id: 'sender' as const, label: 'Parties' },
  { id: 'routing' as const, label: 'Routing' },
  { id: 'documents' as const, label: 'Documents' },
] as const;

export type FormStep = typeof FORM_STEPS[number]['id'];

export const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent', color: 'destructive' },
  { value: 'high', label: 'High', color: 'default' },
  { value: 'medium', label: 'Medium', color: 'secondary' },
  { value: 'low', label: 'Low', color: 'outline' },
] as const;

export const DOCUMENT_TYPE_OPTIONS = [
  'letter',
  'request',
  'complaint',
  'inquiry',
  'report',
  'directive',
] as const;

