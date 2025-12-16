/** API client for form documents in DMS. */

import { apiFetch } from "@/lib/api-client";
import type { FormTemplate } from "@/lib/types/forms";

const BASE_PATH = "/dms";

export interface FormDocument {
  id: string;
  document: {
    id: string;
    title: string;
    description?: string;
    document_type: "form";
    reference_number?: string;
    status: "draft" | "published" | "archived";
    sensitivity: "public" | "internal" | "confidential" | "restricted";
    author: {
      id: string;
      name: string;
      email: string;
    };
    division?: string;
    department?: string;
    tags: string[];
    versions: Array<{
      id: string;
      version_number: number;
      file_name: string;
      file_type: string;
      file_url?: string;
      uploaded_at: string;
    }>;
    created_at: string;
    updated_at: string;
  };
  template?: {
    id: string;
    name: string;
    slug: string;
  };
  form_data: Record<string, unknown>;
  status: "draft" | "in_progress" | "awaiting_signatures" | "completed";
  signature_workflow?: {
    id: string;
    status: string;
  };
  correspondence?: {
    id: string;
    reference_number: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateFormDocumentData {
  document_id?: string;
  template_id: string;
  form_data?: Record<string, unknown>;
  status?: "draft" | "in_progress";
  correspondence_id?: string;
  title: string;
  description?: string;
  reference_number?: string;
  division_id?: string;
  department_id?: string;
}

export async function getFormDocuments(params?: {
  status?: string;
  template?: string;
  correspondence?: string;
  search?: string;
}): Promise<FormDocument[]> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append("status", params.status);
  if (params?.template) queryParams.append("template", params.template);
  if (params?.correspondence) queryParams.append("correspondence", params.correspondence);
  if (params?.search) queryParams.append("search", params.search);

  const query = queryParams.toString();
  const response = await apiFetch<FormDocument[]>(
    `${BASE_PATH}/form-documents${query ? `?${query}` : ""}`
  );
  return Array.isArray(response) ? response : [];
}

export async function getFormDocument(id: string): Promise<FormDocument> {
  console.log('[dms-forms] Fetching form document:', id);
  try {
    const result = await apiFetch<FormDocument>(`${BASE_PATH}/form-documents/${id}/`);
    console.log('[dms-forms] Received form document:', { id: result.id, hasTemplate: !!result.template });
    return result;
  } catch (error) {
    console.error('[dms-forms] Error fetching form document:', error);
    throw error;
  }
}

export async function createFormDocument(
  data: CreateFormDocumentData
): Promise<FormDocument> {
  // First create the document if document_id not provided
  let documentId = data.document_id;
  
  if (!documentId) {
    const document = await apiFetch<{ id: string }>(`${BASE_PATH}/documents/`, {
      method: "POST",
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        document_type: "form",
        reference_number: data.reference_number,
        status: "draft",
        sensitivity: "internal",
        division: data.division_id,
        department: data.department_id,
      }),
    });
    documentId = document.id;
  }

  // Then create the form document
  return apiFetch<FormDocument>(`${BASE_PATH}/form-documents/`, {
    method: "POST",
    body: JSON.stringify({
      document_id: documentId,
      template_id: data.template_id,
      form_data: data.form_data || {},
      status: data.status || "draft",
      correspondence_id: data.correspondence_id,
    }),
  });
}

export async function updateFormDocument(
  id: string,
  data: Partial<{
    form_data: Record<string, unknown>;
    status: "draft" | "in_progress" | "awaiting_signatures" | "completed";
    template_id: string;
    signature_workflow_id: string;
    correspondence_id: string;
  }>
): Promise<FormDocument> {
  return apiFetch<FormDocument>(`${BASE_PATH}/form-documents/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function generateFormDocumentPdf(id: string): Promise<{
  id: string;
  file_url: string;
  file_name: string;
}> {
  return apiFetch<{ id: string; file_url: string; file_name: string }>(
    `${BASE_PATH}/form-documents/${id}/generate_pdf/`,
    {
      method: "POST",
    }
  );
}

export async function markFormDocumentCompleted(id: string): Promise<FormDocument> {
  return apiFetch<FormDocument>(`${BASE_PATH}/form-documents/${id}/mark_completed/`, {
    method: "POST",
  });
}

