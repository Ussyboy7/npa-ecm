/** API client for forms and templates. */

import { apiFetch } from "@/lib/api-client";
import { fetchAllPaginated } from "@/lib/pagination-utils";
import type { FormTemplate, FormSubmission, FormSubmissionListItem, FormSignature, FormSignatureWorkflow } from "@/lib/types/forms";

// Re-export types for convenience
export type { FormTemplate, FormSubmission, FormSubmissionListItem };

const BASE_PATH = "/forms";

const FORM_TEMPLATES_CACHE_TTL_MS = 5 * 60 * 1000;
const formTemplatesCache = new Map<string, { data: FormTemplate[]; timestamp: number }>();
const formTemplatesPromises = new Map<string, Promise<FormTemplate[]>>();
const signaturesCache = new Map<string, { data: FormSignature[]; timestamp: number }>();
const signaturesPromises = new Map<string, Promise<FormSignature[]>>();

const buildFormTemplatesCacheKey = (params?: {
  category?: string;
  is_active?: boolean;
  search?: string;
}) =>
  JSON.stringify({
    category: params?.category ?? null,
    is_active: params?.is_active ?? null,
    search: params?.search ?? null,
  });

export const invalidateFormTemplatesCache = (): void => {
  formTemplatesCache.clear();
  formTemplatesPromises.clear();
};

export const invalidateSignaturesCache = (): void => {
  signaturesCache.clear();
  signaturesPromises.clear();
};

if (typeof window !== "undefined") {
  window.addEventListener("npa_ecm_auth_changed", () => {
    invalidateSignaturesCache();
    invalidateFormTemplatesCache();
  });
}

// Form Templates
export async function getFormTemplates(params?: {
  category?: string;
  is_active?: boolean;
  search?: string;
}, force = false): Promise<FormTemplate[]> {
  const cacheKey = buildFormTemplatesCacheKey(params);
  const now = Date.now();
  const cached = formTemplatesCache.get(cacheKey);
  if (!force && cached && now - cached.timestamp < FORM_TEMPLATES_CACHE_TTL_MS) {
    return cached.data;
  }

  const inFlight = formTemplatesPromises.get(cacheKey);
  if (!force && inFlight) {
    return inFlight;
  }

  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append("category", params.category);
  if (params?.is_active !== undefined) queryParams.append("is_active", String(params.is_active));
  if (params?.search) queryParams.append("search", params.search);

  const query = queryParams.toString();
  const request = (async () => {
    const path = `${BASE_PATH}/templates/${query ? `?${query}` : ""}`;
    return fetchAllPaginated<FormTemplate>(path);
  })();

  formTemplatesPromises.set(cacheKey, request);

  try {
    const data = await request;
    formTemplatesCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } finally {
    formTemplatesPromises.delete(cacheKey);
  }
}

export async function getFormTemplate(id: string): Promise<FormTemplate> {
  return apiFetch<FormTemplate>(`${BASE_PATH}/templates/${id}/`);
}

export async function createFormTemplate(data: Partial<FormTemplate>): Promise<FormTemplate> {
  const created = await apiFetch<FormTemplate>(`${BASE_PATH}/templates/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  invalidateFormTemplatesCache();
  return created;
}

export async function updateFormTemplate(id: string, data: Partial<FormTemplate>): Promise<FormTemplate> {
  const updated = await apiFetch<FormTemplate>(`${BASE_PATH}/templates/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  invalidateFormTemplatesCache();
  return updated;
}

export async function deleteFormTemplate(id: string): Promise<void> {
  await apiFetch<void>(`${BASE_PATH}/templates/${id}/`, {
    method: "DELETE",
  });
  invalidateFormTemplatesCache();
}

export async function cloneFormTemplate(id: string): Promise<FormTemplate> {
  const cloned = await apiFetch<FormTemplate>(`${BASE_PATH}/templates/${id}/clone/`, {
    method: "POST",
  });
  invalidateFormTemplatesCache();
  return cloned;
}

// Signature Workflow APIs

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

export async function getSignatureWorkflow(submissionIdOrWorkflowId: string, isWorkflowId: boolean = false): Promise<FormSignatureWorkflow> {
  if (isWorkflowId) {
    // Get workflow directly by ID
    return apiFetch<FormSignatureWorkflow>(`${BASE_PATH}/signature-workflows/${submissionIdOrWorkflowId}/`);
  } else {
    // Get workflow via submission
    return apiFetch<FormSignatureWorkflow>(`${BASE_PATH}/submissions/${submissionIdOrWorkflowId}/signature_workflow/`);
  }
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

  const result = await apiFetch<FormSignature>(
    `${BASE_PATH}/signature-workflows/${workflowId}/sign/`,
    {
      method: "POST",
      body: formData,
    },
  );

  invalidateSignaturesCache();
  return result;
}
