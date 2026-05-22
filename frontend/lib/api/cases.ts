"use client";

import { apiFetch } from '@/lib/api-client';
import type { Case, CaseDetail, CaseCorrespondenceLink, CaseDocumentLink, CaseFormLink } from '@/lib/npa-structure';

const BASE_PATH = '/correspondence/cases';

export interface CaseQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string | string[];
  caseType?: string | string[];
  priority?: string | string[];
  division?: string;
  department?: string;
  owningOffice?: string;
  currentOffice?: string;
  assignedTo?: string;
  executive?: string; // For secretaries: filter by executive they've acted for
  scope?: "my" | "office" | "all" | "department" | "division" | "directorate" | "organization"; // Filter by scope
  ordering?: string;
  signal?: AbortSignal; // For request cancellation
}

// API response uses snake_case, frontend uses camelCase
interface ApiCase {
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

interface ApiCaseListResponse {
  results: ApiCase[];
  count: number;
  next?: string | null;
  previous?: string | null;
}

/**
 * Transform API case (snake_case) to frontend case (camelCase)
 */
function transformApiCase(api: ApiCase): Case {
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

export interface CaseListResponse {
  results: Case[];
  count: number;
  next?: string | null;
  previous?: string | null;
}

/**
 * Fetch list of cases with filtering and pagination
 */
export async function getCases(params: CaseQueryParams = {}): Promise<CaseListResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', String(params.page));
  if (params.pageSize) queryParams.append('page_size', String(params.pageSize));
  if (params.search) queryParams.append('search', params.search);
  
  if (params.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    statuses.forEach(s => queryParams.append('status', s));
  }
  
  if (params.caseType) {
    const types = Array.isArray(params.caseType) ? params.caseType : [params.caseType];
    types.forEach(t => queryParams.append('case_type', t));
  }
  
  if (params.priority) {
    const priorities = Array.isArray(params.priority) ? params.priority : [params.priority];
    priorities.forEach(p => queryParams.append('priority', p));
  }
  
  if (params.division) queryParams.append('division', params.division);
  if (params.department) queryParams.append('department', params.department);
  if (params.owningOffice) queryParams.append('owning_office', params.owningOffice);
  if (params.currentOffice) queryParams.append('current_office', params.currentOffice);
  if (params.assignedTo) queryParams.append('assigned_to', params.assignedTo);
  if (params.executive) queryParams.append('executive', params.executive);
  if (params.scope) queryParams.append('scope', params.scope);
  if (params.ordering) queryParams.append('ordering', params.ordering);
  
  const response = await apiFetch<ApiCaseListResponse>(`${BASE_PATH}/?${queryParams.toString()}`, {
    signal: params.signal,
  });
  
  return {
    results: response.results.map(transformApiCase),
    count: response.count as number,
    next: response.next,
    previous: response.previous,
  };
}

// API response interfaces for related items (snake_case)
interface ApiCaseCorrespondenceLink {
  id: string;
  case: string;
  correspondence?: { id: string; reference_number?: string; subject?: string; status?: string } | null;
  correspondence_id?: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ApiCaseDocumentLink {
  id: string;
  case: string;
  document_id: string;
  document_title?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ApiCaseFormLink {
  id: string;
  case: string;
  form_document_id: string;
  form_title?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Transform API case correspondence link (snake_case) to frontend (camelCase)
 */
function transformApiCorrespondenceLink(api: ApiCaseCorrespondenceLink): CaseCorrespondenceLink {
  return {
    id: api.id,
    caseId: api.case,
    correspondenceId: api.correspondence_id || api.correspondence?.id || '',
    correspondence: api.correspondence ? {
      // Transform correspondence if present (basic fields)
      id: api.correspondence.id,
      referenceNumber: api.correspondence.reference_number || '',
      subject: api.correspondence.subject || '',
      status: (api.correspondence.status as 'pending' | 'in-progress' | 'completed' | 'archived') || 'pending',
      // Fill required fields with safe defaults (case link only returns partial correspondence)
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

/**
 * Transform API case document link (snake_case) to frontend (camelCase)
 */
function transformApiDocumentLink(api: ApiCaseDocumentLink): CaseDocumentLink {
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

/**
 * Transform API case form link (snake_case) to frontend (camelCase)
 */
function transformApiFormLink(api: ApiCaseFormLink): CaseFormLink {
  return {
    id: api.id,
    caseId: api.case,
    formDocumentId: api.form_document_id,
    formTitle: api.form_title,
    notes: api.notes,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

/**
 * Fetch a single case by ID
 */
export async function getCaseById(caseId: string, signal?: AbortSignal): Promise<CaseDetail> {
  const apiCase = await apiFetch<ApiCase & {
    correspondence?: ApiCaseCorrespondenceLink[];
    documents?: ApiCaseDocumentLink[];
    forms?: ApiCaseFormLink[];
    activities?: unknown[];
  }>(`${BASE_PATH}/${caseId}/`, {
    signal,
  });
  
  const baseCase = transformApiCase(apiCase);
  
  return {
    ...baseCase,
    correspondence: (apiCase.correspondence || []).map(transformApiCorrespondenceLink),
    documents: (apiCase.documents || []).map(transformApiDocumentLink),
    forms: (apiCase.forms || []).map(transformApiFormLink),
    // Backend may return mixed activity shapes; keep empty until we implement a mapper.
    activities: [],
  };
}

/**
 * Create a new case
 */
export async function createCase(data: Partial<Case>): Promise<Case> {
  return apiFetch<Case>(`${BASE_PATH}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Update a case
 */
export async function updateCase(caseId: string, data: Partial<Case>): Promise<Case> {
  return apiFetch<Case>(`${BASE_PATH}/${caseId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Delete a case (soft delete)
 */
export async function deleteCase(caseId: string): Promise<void> {
  await apiFetch(`${BASE_PATH}/${caseId}/`, {
    method: 'DELETE',
  });
}

/**
 * Link a correspondence to a case
 */
export async function linkCorrespondenceToCase(
  caseId: string,
  correspondenceId: string,
  isPrimary: boolean = false,
  notes?: string
): Promise<CaseCorrespondenceLink> {
  return apiFetch<CaseCorrespondenceLink>(`${BASE_PATH}/${caseId}/link_correspondence/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      correspondence_id: correspondenceId,
      is_primary: isPrimary,
      notes: notes || '',
    }),
  });
}

/**
 * Link a document to a case
 */
export async function linkDocumentToCase(
  caseId: string,
  documentId: string,
  notes?: string
): Promise<CaseDocumentLink> {
  return apiFetch<CaseDocumentLink>(`${BASE_PATH}/${caseId}/link_document/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_id: documentId,
      notes: notes || '',
    }),
  });
}

/**
 * Link a form to a case
 */
export async function linkFormToCase(
  caseId: string,
  formDocumentId: string,
  notes?: string
): Promise<CaseFormLink> {
  return apiFetch<CaseFormLink>(`${BASE_PATH}/${caseId}/link_form/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      form_document_id: formDocumentId,
      notes: notes || '',
    }),
  });
}

/**
 * Update case status
 */
export async function updateCaseStatus(
  caseId: string,
  status: Case['status']
): Promise<Case> {
  return apiFetch<Case>(`${BASE_PATH}/${caseId}/update-status/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

/**
 * Generate completion package for a case
 */
export async function generateCaseCompletionPackage(caseId: string): Promise<Case> {
  return apiFetch<Case>(`${BASE_PATH}/${caseId}/generate-completion-package/`, {
    method: 'POST',
  });
}

/**
 * Unlink a correspondence from a case
 */
export async function unlinkCorrespondenceFromCase(
  caseId: string,
  correspondenceId: string
): Promise<void> {
  await apiFetch(`${BASE_PATH}/${caseId}/unlink_correspondence/`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correspondence_id: correspondenceId }),
  });
}

/**
 * Unlink a document from a case
 */
export async function unlinkDocumentFromCase(
  caseId: string,
  documentId: string
): Promise<void> {
  await apiFetch(`${BASE_PATH}/${caseId}/unlink_document/`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId }),
  });
}

/**
 * Unlink a form from a case
 */
export async function unlinkFormFromCase(
  caseId: string,
  formDocumentId: string
): Promise<void> {
  await apiFetch(`${BASE_PATH}/${caseId}/unlink_form/`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ form_document_id: formDocumentId }),
  });
}

// Case Templates
export interface CaseTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string;
  case_type: string;
  case_type_display?: string;
  is_active: boolean;
  default_priority: string;
  structure: Record<string, unknown>;
  created_by?: {
    id: string;
    name: string;
    email: string;
  };
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface CaseTemplateListResponse {
  results: CaseTemplate[];
  count: number;
  next?: string | null;
  previous?: string | null;
}

export async function getCaseTemplates(): Promise<CaseTemplate[]> {
  const data = await apiFetch<CaseTemplate[] | CaseTemplateListResponse>('/correspondence/case-templates/');
  if (Array.isArray(data)) {
    return data;
  }
  return Array.isArray(data.results) ? data.results : [];
}

export async function getCaseTemplate(id: string): Promise<CaseTemplate> {
  return apiFetch<CaseTemplate>(`/correspondence/case-templates/${id}/`);
}

export async function createCaseFromTemplate(
  templateId: string,
  caseData: Partial<Case>
): Promise<Case> {
  return apiFetch<Case>(`/correspondence/case-templates/${templateId}/create-case/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(caseData),
  });
}

// Case Comments
export interface CaseComment {
  id: string;
  case: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
  content: string;
  parent?: string | null;
  mentions?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  is_resolved: boolean;
  resolved_at?: string | null;
  resolved_by?: {
    id: string;
    name: string;
    email: string;
  } | null;
  replies_count?: number;
  created_at: string;
  updated_at: string;
}

export async function getCaseComments(caseId: string, signal?: AbortSignal): Promise<CaseComment[]> {
  return apiFetch<CaseComment[]>(`${BASE_PATH}/${caseId}/comments/`, {
    signal,
  });
}

export async function createCaseComment(
  caseId: string,
  content: string,
  parentId?: string | null,
  mentions?: string[],
  signal?: AbortSignal
): Promise<CaseComment> {
  return apiFetch<CaseComment>(`${BASE_PATH}/${caseId}/comments/`, {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      parent: parentId || null,
      mentions: mentions || [],
    }),
  });
}

export async function resolveCaseComment(commentId: string): Promise<CaseComment> {
  return apiFetch<CaseComment>(`/correspondence/case-comments/${commentId}/resolve/`, {
    method: 'POST',
  });
}

export async function unresolveCaseComment(commentId: string): Promise<CaseComment> {
  return apiFetch<CaseComment>(`/correspondence/case-comments/${commentId}/unresolve/`, {
    method: 'POST',
  });
}

export async function updateCaseComment(
  commentId: string,
  content: string,
  signal?: AbortSignal
): Promise<CaseComment> {
  return apiFetch<CaseComment>(`/correspondence/case-comments/${commentId}/`, {
    method: 'PATCH',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

export async function deleteCaseComment(
  commentId: string,
  signal?: AbortSignal
): Promise<void> {
  await apiFetch(`/correspondence/case-comments/${commentId}/`, {
    method: 'DELETE',
    signal,
  });
}

// Case Export/Import
export interface CaseExportData {
  case: Record<string, unknown>;
  correspondence: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  forms: Array<Record<string, unknown>>;
  comments: Array<Record<string, unknown>>;
  exported_at: string;
  exported_by: string;
}

export async function exportCase(caseId: string): Promise<CaseExportData> {
  return apiFetch<CaseExportData>(`${BASE_PATH}/${caseId}/export/`, {
    method: 'POST',
  });
}

export async function importCases(data: CaseExportData | CaseExportData[]): Promise<{
  imported: number;
  failed: number;
  errors: string[];
}> {
  return apiFetch<{
    imported: number;
    failed: number;
    errors: string[];
  }>(`${BASE_PATH}/import/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Array.isArray(data) ? data : [data]),
  });
}

// Case SLA
export interface CaseSLA {
  id: string;
  case: Case;
  target_days: number;
  target_date: string;
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  warning_sent: boolean;
  critical_sent: boolean;
  breached: boolean;
  breached_at?: string | null;
  status: 'ok' | 'warning' | 'critical' | 'breach';
  created_at: string;
  updated_at: string;
}

export async function getCaseSLAStatus(caseId: string, signal?: AbortSignal): Promise<{
  status: 'ok' | 'warning' | 'critical' | 'breach';
  target_date: string;
  target_days: number;
  breached: boolean;
}> {
  return apiFetch<{
    status: 'ok' | 'warning' | 'critical' | 'breach';
    target_date: string;
    target_days: number;
    breached: boolean;
  }>(`${BASE_PATH}/${caseId}/sla-status/`, {
    signal,
  });
}
