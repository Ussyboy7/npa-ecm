import type { Case, CaseCorrespondenceLink, CaseDocumentLink, CaseFormLink } from '@/lib/npa-structure';

export interface ApiCase {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  case_type: string;
  status: string;
  priority: string;
  division?: string;
  department?: string;
  owning_office?: string;
  current_office?: string;
  created_by?: { id: string; name?: string; email?: string } | null;
  created_by_id?: string;
  assigned_to?: { id: string; name?: string; email?: string } | null;
  assigned_to_id?: string;
  opened_at: string;
  resolved_at?: string;
  closed_at?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  completion_package?: {
    id: string;
    document_id?: string;
    version_id?: string;
    title: string;
    file_url?: string;
  };
  completion_package_generated_at?: string;
  correspondence_count?: number;
  documents_count?: number;
  forms_count?: number;
  activities_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ApiCaseCorrespondenceLink {
  id: string;
  case: string;
  correspondence?: { id: string; reference_number?: string; subject?: string; status?: string } | null;
  correspondence_id?: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiCaseDocumentLink {
  id: string;
  case: string;
  document_id: string;
  document_title?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiCaseFormLink {
  id: string;
  case: string;
  form_document_id: string;
  document_id?: string;
  form_title?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function mapApiCase(api: ApiCase): Case {
  return {
    id: api.id,
    caseNumber: api.case_number,
    title: api.title || '',
    description: api.description,
    caseType: api.case_type as Case['caseType'],
    status: api.status as Case['status'],
    priority: api.priority as Case['priority'],
    divisionId: api.division,
    departmentId: api.department,
    owningOfficeId: api.owning_office,
    currentOfficeId: api.current_office,
    createdById: api.created_by_id || api.created_by?.id,
    assignedToId: api.assigned_to_id || api.assigned_to?.id,
    openedAt: api.opened_at,
    resolvedAt: api.resolved_at,
    closedAt: api.closed_at,
    tags: api.tags,
    metadata: api.metadata,
    completionPackage: api.completion_package ? {
      id: api.completion_package.id,
      documentId: api.completion_package.document_id || api.completion_package.id,
      versionId: api.completion_package.version_id,
      title: api.completion_package.title,
      fileUrl: api.completion_package.file_url,
    } : undefined,
    completionPackageGeneratedAt: api.completion_package_generated_at,
    correspondenceCount: api.correspondence_count || 0,
    documentsCount: api.documents_count || 0,
    formsCount: api.forms_count || 0,
    activitiesCount: api.activities_count || 0,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapApiCaseCorrespondenceLink(api: ApiCaseCorrespondenceLink): CaseCorrespondenceLink {
  return {
    id: api.id,
    caseId: api.case,
    correspondenceId: api.correspondence_id || api.correspondence?.id || '',
    correspondence: api.correspondence ? {
      id: api.correspondence.id,
      referenceNumber: api.correspondence.reference_number || '',
      subject: api.correspondence.subject || '',
      status: (api.correspondence.status as 'pending' | 'in-progress' | 'completed' | 'archived') || 'pending',
      source: 'internal',
      receivedDate: '',
      senderName: '',
      senderOrganization: '',
      priority: 'medium',
      direction: 'upward',
    } : undefined,
    isPrimary: api.is_primary || false,
    notes: api.notes,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapApiCaseDocumentLink(api: ApiCaseDocumentLink): CaseDocumentLink {
  return {
    id: api.id,
    caseId: api.case,
    documentId: api.document_id,
    documentTitle: api.document_title,
    notes: api.notes,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapApiCaseFormLink(api: ApiCaseFormLink): CaseFormLink {
  return {
    id: api.id,
    caseId: api.case,
    formDocumentId: api.form_document_id,
    documentId: api.document_id,
    formTitle: api.form_title,
    notes: api.notes,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}
