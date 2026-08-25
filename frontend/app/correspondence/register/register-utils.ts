/**
 * Utility functions for Register Correspondence page
 */

import { generateUUID } from '@/lib/utils';
import { REGISTER_CONSTANTS } from './register-constants';
import { toast } from "@/components/ui/sonner";

export type FormData = {
  subject: string;
  senderName: string;
  senderOrganization: string;
  senderEmail: string;
  senderPhone: string;
  receivedDate: string;
  letterDate: string;
  dispatchDate: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  referenceNumber: string;
  assignTo: string;
  divisionId: string;
  documentType: string;
  tags: string;
  owningOfficeId: string;
  senderReference: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  remarks: string;
  correspondenceSource?: 'internal' | 'external';
  hasPhysicalCopy: boolean;
};

export type FlowType = 'inward' | 'outward';

export type DistributionState = {
  directorates: string[];
  divisions: string[];
  departments: string[];
};

/**
 * Detect correspondence source type (internal/external) from form data
 * Returns 'internal' | 'external' | 'ambiguous' (when both are present)
 */
export const detectCorrespondenceSource = (
  flowType: FlowType,
  formData: FormData,
  distributions: DistributionState
): 'internal' | 'external' | 'ambiguous' => {
  if (flowType === 'inward') {
    // Inward is typically external (physical copy received from external org)
    return 'external';
  }

  // Outward: Check if routing to NPA offices (internal) or external organization (external)
  const hasDistributions = distributions.directorates.length > 0 || 
                           distributions.divisions.length > 0 || 
                           distributions.departments.length > 0;
  const hasExternalRecipient = !!(formData.recipientName || formData.recipientEmail || formData.senderOrganization);

  // If both are present, it's ambiguous
  if (hasDistributions && hasExternalRecipient) {
    return 'ambiguous';
  }

  // If distributions present, it's internal
  if (hasDistributions) {
    return 'internal';
  }

  // If external recipient present, it's external
  if (hasExternalRecipient) {
    return 'external';
  }

  // Default to internal (assume NPA office routing)
  return 'internal';
};

/**
 * Reference is server-generated as HQ/<tier>/<division>/<dept>/<seq> e.g. HQ/AGM/ICT/SA&DM/001.
 * Client leaves this empty so the server canonicalizes; preview shows the expected format.
 */
export const generateReferenceNumber = (): string => "";

/**
 * Create initial form data
 */
export const createInitialFormData = (owningOfficeId?: string): FormData => {
  // Use a stable date to avoid hydration mismatch
  const today = typeof window !== 'undefined' 
    ? new Date().toISOString().split('T')[0]
    : '2025-01-01'; // Fallback for SSR
  return {
    subject: '',
    senderName: '',
    senderOrganization: '',
    senderEmail: '',
    senderPhone: '',
    receivedDate: today,
    letterDate: '',
    dispatchDate: '',
    priority: 'medium',
    referenceNumber: '', // Will be generated on client mount
    assignTo: '',
    divisionId: '',
    documentType: 'letter',
    tags: '',
    owningOfficeId: owningOfficeId || '',
    senderReference: '',
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    remarks: '',
    correspondenceSource: undefined,
    hasPhysicalCopy: false,
  };
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Validate file
 */
export const validateFile = (file: File): boolean => {
  if (file.size > REGISTER_CONSTANTS.MAX_FILE_SIZE) {
      toast.error(`File "${file.name}" exceeds 30MB limit`);
    return false;
  }
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!REGISTER_CONSTANTS.ALLOWED_FILE_TYPES.includes(fileExtension as (typeof REGISTER_CONSTANTS.ALLOWED_FILE_TYPES)[number])) {
    toast.error(`File "${file.name}" is not a valid type. Please upload PDF, DOC, or DOCX.`);
    return false;
  }
  return true;
};

/**
 * Validate form data
 */
export const validateFormData = (
  formData: FormData,
  flowType: FlowType,
  documentFiles: File[],
  distributions: DistributionState,
  linkedCount: number = 0
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!formData.subject) errors.subject = 'Subject is required';
  if (!formData.assignTo) errors.assignTo = 'Please assign to an executive';
  if (!formData.owningOfficeId) errors.owningOfficeId = 'Please select an owning office';

  if (flowType === 'inward') {
    if (!formData.senderOrganization) {
      errors.senderOrganization = 'Sender organization/private entity is required';
    }
    if (!formData.receivedDate) errors.receivedDate = 'Date received is required';
  } else {
    if (!formData.recipientName) errors.recipientName = 'Recipient name is required';
    if (!formData.dispatchDate) errors.dispatchDate = 'Dispatch date is required';
    if (!formData.letterDate) errors.letterDate = 'Letter date is required';
    if (
      distributions.directorates.length +
      distributions.divisions.length +
      distributions.departments.length ===
      0
    ) {
      errors.distribution = 'Select at least one directorate, division, or department';
    }
  }

  if (!documentFiles.length && linkedCount === 0) {
    errors.documentFiles = 'Please upload or select at least one source document';
  }

  if (formData.senderEmail && !isValidEmail(formData.senderEmail)) {
    errors.senderEmail = 'Please enter a valid email address';
  }
  if (formData.recipientEmail && !isValidEmail(formData.recipientEmail)) {
    errors.recipientEmail = 'Please enter a valid email address';
  }

  return errors;
};

/**
 * Validate a specific form step
 */
export const validateStep = (
  step: string,
  formData: FormData,
  flowType: FlowType,
  documentFiles: File[],
  distributions: DistributionState,
  linkedCount: number = 0
): Record<string, string> => {
  const errors: Record<string, string> = {};

  switch (step) {
    case 'basics':
      if (!formData.subject) errors.subject = 'Subject is required';
      if (!formData.owningOfficeId) errors.owningOfficeId = 'Please select an owning office';
      if (flowType === 'inward' && !formData.receivedDate) {
        errors.receivedDate = 'Date received is required';
      }
      if (flowType === 'outward') {
        if (!formData.letterDate) errors.letterDate = 'Letter date is required';
        if (!formData.dispatchDate) errors.dispatchDate = 'Dispatch date is required';
      }
      break;
    case 'sender':
      if (flowType === 'inward') {
        if (!formData.senderOrganization) {
          errors.senderOrganization = 'Sender organization/private entity is required';
        }
      } else {
        if (!formData.recipientName) errors.recipientName = 'Recipient name is required';
      }
      if (formData.senderEmail && !isValidEmail(formData.senderEmail)) {
        errors.senderEmail = 'Please enter a valid email address';
      }
      if (formData.recipientEmail && !isValidEmail(formData.recipientEmail)) {
        errors.recipientEmail = 'Please enter a valid email address';
      }
      break;
    case 'routing':
      if (!formData.assignTo) errors.assignTo = 'Please assign to an executive';
      if (flowType === 'outward') {
        if (
          distributions.directorates.length +
          distributions.divisions.length +
          distributions.departments.length ===
          0
        ) {
          errors.distribution = 'Select at least one directorate, division, or department';
        }
      }
      break;
    case 'documents':
      if (!documentFiles.length && linkedCount === 0) {
        errors.documentFiles = 'Please upload or select at least one source document';
      }
      break;
  }

  return errors;
};

/**
 * Build FormData for API submission
 */
export const buildSubmissionFormData = (
  formData: FormData,
  flowType: FlowType,
  documentFiles: File[],
  distributions: DistributionState
): globalThis.FormData => {
  const form = new globalThis.FormData();
  
  form.append('subject', formData.subject);
  form.append('reference_number', formData.referenceNumber);
  form.append('sender_name', formData.senderName);
  form.append('sender_organization', formData.senderOrganization);
  if (formData.senderEmail) form.append('sender_email', formData.senderEmail);
  if (formData.senderPhone) form.append('sender_phone', formData.senderPhone);

  const registrationDate =
    flowType === 'outward' ? formData.dispatchDate || formData.receivedDate : formData.receivedDate;
  if (registrationDate) form.append('received_date', registrationDate);

  form.append('priority', formData.priority);
  if (formData.senderReference) form.append('sender_reference', formData.senderReference);
  if (formData.letterDate) form.append('letter_date', formData.letterDate);
  if (flowType === 'outward' && formData.dispatchDate) form.append('dispatch_date', formData.dispatchDate);

  if (flowType === 'outward') {
    form.append('recipient_name', formData.recipientName);
    if (formData.recipientEmail) form.append('recipient_email', formData.recipientEmail);
    if (formData.recipientPhone) form.append('recipient_phone', formData.recipientPhone);
  } else if (formData.recipientName) {
    form.append('recipient_name', formData.recipientName);
  }

  if (formData.remarks) form.append('remarks', formData.remarks);

  // Determine source (internal/external) - use explicit override if provided, otherwise auto-detect
  let source: string;
  if (formData.correspondenceSource) {
    // Use explicit override if user selected it
    source = formData.correspondenceSource;
  } else {
    // Auto-detect from form data
    const detected = detectCorrespondenceSource(flowType, formData, distributions);
    // If ambiguous, default to internal (distributions take precedence)
    source = detected === 'ambiguous' ? 'internal' : detected;
  }
  
  const direction = flowType === 'inward' ? 'upward' : 'downward';
  form.append('current_approver_id', formData.assignTo);
  form.append('document_type', formData.documentType);
  if (formData.tags) {
    const tags = formData.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    form.append('tags', JSON.stringify(tags));
  }
  if (formData.divisionId) form.append('division', formData.divisionId);
  form.append('source', source);
  form.append('direction', direction);
  form.append('owning_office', formData.owningOfficeId);
  form.append('current_office', formData.owningOfficeId);
  form.append('has_physical_copy', formData.hasPhysicalCopy ? 'true' : 'false');
  documentFiles.forEach((file) => form.append('attachments', file));

  return form;
};

/**
 * Calculate form completion percentage
 */
export const calculateCompletionPercentage = (
  formData: FormData,
  flowType: FlowType,
  documentFiles: File[],
  linkedCount: number = 0
): number => {
  let completed = 0;
  let total = 0;

  // Required fields for all
  total += 4; // subject, senderOrganization, assignTo, owningOfficeId
  if (formData.subject) completed++;
  if (formData.senderOrganization) completed++;
  if (formData.assignTo) completed++;
  if (formData.owningOfficeId) completed++;

  // Flow-specific required fields
  if (flowType === 'inward') {
    total += 1; // receivedDate
    if (formData.receivedDate) completed++;
  } else {
    total += 3; // recipientName, dispatchDate, letterDate
    if (formData.recipientName) completed++;
    if (formData.dispatchDate) completed++;
    if (formData.letterDate) completed++;
  }

  // Documents — either upload or select from My Documents
  total += 1;
  if (documentFiles.length > 0 || linkedCount > 0) completed++;

  return Math.round((completed / total) * 100);
};

/**
 * Create distribution entries for outward correspondence
 */
export const createDistributionEntries = async (
  correspondenceId: string,
  distributions: DistributionState,
  apiFetch: (path: string, options?: Record<string, unknown>) => Promise<unknown>,
  logError: (message: string, error: unknown) => void
): Promise<void> => {
  const payloads = [
    ...distributions.directorates.map((id) => ({
      recipient_type: 'directorate' as const,
      directorate: id,
    })),
    ...distributions.divisions.map((id) => ({
      recipient_type: 'division' as const,
      division: id,
    })),
    ...distributions.departments.map((id) => ({
      recipient_type: 'department' as const,
      department: id,
    })),
  ];

  if (!payloads.length) return;

  await Promise.all(
    payloads.map((payload) =>
      apiFetch('/correspondence/distribution/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correspondence: correspondenceId,
          recipient_type: payload.recipient_type,
          directorate: payload.recipient_type === 'directorate' ? payload.directorate : undefined,
          division: payload.recipient_type === 'division' ? payload.division : undefined,
          department: payload.recipient_type === 'department' ? payload.department : undefined,
        }),
      }).catch((error) => {
        logError('Failed to create distribution entry', error);
        return null;
      })
    )
  );
};
