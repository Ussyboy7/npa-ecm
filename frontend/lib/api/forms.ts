/** API client for forms and templates. */

import { apiFetch } from "@/lib/api-client";
import type { FormTemplate, FormSubmission, FormSubmissionListItem } from "@/lib/types/forms";

const BASE_PATH = "/forms";

// Form Templates
export async function getFormTemplates(params?: {
  category?: string;
  is_active?: boolean;
  search?: string;
}): Promise<FormTemplate[]> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append("category", params.category);
  if (params?.is_active !== undefined) queryParams.append("is_active", String(params.is_active));
  if (params?.search) queryParams.append("search", params.search);

  const query = queryParams.toString();
  const response = await apiFetch<FormTemplate[] | { results: FormTemplate[] }>(
    `${BASE_PATH}/templates/${query ? `?${query}` : ""}`
  );
  
  // Handle paginated response (if pagination is enabled)
  if (response && typeof response === "object" && "results" in response) {
    return (response as { results: FormTemplate[] }).results;
  }
  
  // Handle direct array response
  return Array.isArray(response) ? response : [];
}

export async function getFormTemplate(id: string): Promise<FormTemplate> {
  return apiFetch<FormTemplate>(`${BASE_PATH}/templates/${id}/`);
}

export async function createFormTemplate(data: Partial<FormTemplate>): Promise<FormTemplate> {
  return apiFetch<FormTemplate>(`${BASE_PATH}/templates/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFormTemplate(id: string, data: Partial<FormTemplate>): Promise<FormTemplate> {
  return apiFetch<FormTemplate>(`${BASE_PATH}/templates/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteFormTemplate(id: string): Promise<void> {
  return apiFetch<void>(`${BASE_PATH}/templates/${id}/`, {
    method: "DELETE",
  });
}

export async function cloneFormTemplate(id: string): Promise<FormTemplate> {
  return apiFetch<FormTemplate>(`${BASE_PATH}/templates/${id}/clone/`, {
    method: "POST",
  });
}

// Form Submissions
export async function getFormSubmissions(params?: {
  template?: string;
  correspondence?: string;
  is_draft?: boolean;
}): Promise<FormSubmissionListItem[]> {
  const queryParams = new URLSearchParams();
  if (params?.template) queryParams.append("template", params.template);
  if (params?.correspondence) queryParams.append("correspondence", params.correspondence);
  if (params?.is_draft !== undefined) queryParams.append("is_draft", String(params.is_draft));

  const query = queryParams.toString();
  const response = await apiFetch<FormSubmissionListItem[] | { results: FormSubmissionListItem[] }>(
    `${BASE_PATH}/submissions/${query ? `?${query}` : ""}`
  );
  
  // Handle paginated response
  if (response && typeof response === "object" && "results" in response) {
    return (response as { results: FormSubmissionListItem[] }).results;
  }
  
  // Handle direct array response
  return Array.isArray(response) ? response : [];
}

export async function getFormSubmission(id: string): Promise<FormSubmission> {
  return apiFetch<FormSubmission>(`${BASE_PATH}/submissions/${id}/`);
}

export async function getFormSubmissionsByCorrespondence(
  correspondenceId: string
): Promise<FormSubmission[]> {
  const response = await apiFetch<FormSubmission[] | { results: FormSubmission[] }>(
    `${BASE_PATH}/submissions/by_correspondence/?correspondence_id=${correspondenceId}`
  );
  
  // Handle paginated response
  if (response && typeof response === "object" && "results" in response) {
    return (response as { results: FormSubmission[] }).results;
  }
  
  // Handle direct array response
  return Array.isArray(response) ? response : [];
}

export async function createFormSubmission(data: {
  template_id: string;
  correspondence_id?: string;
  data: Record<string, unknown>;
  is_draft?: boolean;
}): Promise<FormSubmission> {
  return apiFetch<FormSubmission>(`${BASE_PATH}/submissions/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFormSubmission(
  id: string,
  data: Partial<{
    data: Record<string, unknown>;
    is_draft: boolean;
  }>
): Promise<FormSubmission> {
  return apiFetch<FormSubmission>(`${BASE_PATH}/submissions/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function submitFormSubmission(id: string): Promise<FormSubmission> {
  return apiFetch<FormSubmission>(`${BASE_PATH}/submissions/${id}/submit/`, {
    method: "POST",
  });
}

export async function deleteFormSubmission(id: string): Promise<void> {
  return apiFetch<void>(`${BASE_PATH}/submissions/${id}/`, {
    method: "DELETE",
  });
}

/**
 * Get PDF URL for a form submission
 */
export function getFormSubmissionPdfUrl(submissionId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${baseUrl}/api/v1${BASE_PATH}/submissions/${submissionId}/generate_pdf/`;
}

// Signature Workflow APIs
import type { FormSignatureWorkflow, FormSignature } from "@/lib/types/forms";

export async function createSignatureWorkflow(data: {
  submission_id: string;
  routing_mode: "sequential" | "parallel";
  signature_assignments: Array<{
    field_name: string;
    field_label?: string;
    office_id?: string;
    department_id?: string;
    division_id?: string;
    user_id?: string;
  }>;
  notes?: string;
}): Promise<FormSignatureWorkflow> {
  return apiFetch<FormSignatureWorkflow>(`${BASE_PATH}/signature-workflows/create_workflow/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSignatureWorkflow(submissionId: string): Promise<FormSignatureWorkflow> {
  return apiFetch<FormSignatureWorkflow>(`${BASE_PATH}/submissions/${submissionId}/signature_workflow/`);
}

export async function getSignatureWorkflows(params?: {
  submission?: string;
  status?: string;
}): Promise<FormSignatureWorkflow[]> {
  const queryParams = new URLSearchParams();
  if (params?.submission) queryParams.append("submission", params.submission);
  if (params?.status) queryParams.append("status", params.status);

  const query = queryParams.toString();
  const response = await apiFetch<FormSignatureWorkflow[] | { results: FormSignatureWorkflow[] }>(
    `${BASE_PATH}/signature-workflows/${query ? `?${query}` : ""}`
  );
  
  if (response && typeof response === "object" && "results" in response) {
    return (response as { results: FormSignatureWorkflow[] }).results;
  }
  
  return Array.isArray(response) ? response : [];
}

export async function getSignatures(params?: {
  workflow?: string;
  status?: string;
}): Promise<FormSignature[]> {
  const queryParams = new URLSearchParams();
  if (params?.workflow) queryParams.append("workflow", params.workflow);
  if (params?.status) queryParams.append("status", params.status);

  const query = queryParams.toString();
  const response = await apiFetch<FormSignature[] | { results: FormSignature[] }>(
    `${BASE_PATH}/signatures/${query ? `?${query}` : ""}`
  );
  
  if (response && typeof response === "object" && "results" in response) {
    return (response as { results: FormSignature[] }).results;
  }
  
  return Array.isArray(response) ? response : [];
}

export async function signForm(workflowId: string, data: {
  signature_id: string;
  signature_file?: File;
  signer_name?: string;
  signer_pn?: string;
  signer_designation?: string;
  signed_date?: string;
  notes?: string;
}): Promise<FormSignature> {
  const formData = new FormData();
  formData.append("signature_id", data.signature_id);
  if (data.signature_file) formData.append("signature_file", data.signature_file);
  if (data.signer_name) formData.append("signer_name", data.signer_name);
  if (data.signer_pn) formData.append("signer_pn", data.signer_pn);
  if (data.signer_designation) formData.append("signer_designation", data.signer_designation);
  if (data.signed_date) formData.append("signed_date", data.signed_date);
  if (data.notes) formData.append("notes", data.notes);

  // Use fetch directly for FormData to avoid JSON serialization issues
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const token = localStorage.getItem("access_token");
  
  const response = await fetch(`${baseUrl}/api/v1${BASE_PATH}/signature-workflows/${workflowId}/sign/`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Failed to sign form" }));
    throw new Error(errorData.error || errorData.message || "Failed to sign form");
  }

  return response.json();
}

