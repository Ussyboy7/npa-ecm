import { apiFetch } from "@/lib/api-client";

export type ReferenceScopeType = "directorate" | "division" | "department";

export interface ReferenceClassification {
  id?: string;
  code: string;
  label: string;
  next_serial: number;
  is_active: boolean;
}

export interface ReferenceScheme {
  id: string;
  scope_type: ReferenceScopeType;
  scope_label: string;
  directorate: string | null;
  division: string | null;
  department: string | null;
  unit_name: string;
  location_code: string;
  authority_code: string;
  unit_code: string;
  serial_length: number;
  description: string;
  is_active: boolean;
  classifications: ReferenceClassification[];
  reference_preview: string;
  created_at: string;
  updated_at: string;
}

export interface ReferenceSchemeInput {
  scope_type: ReferenceScopeType;
  directorate?: string | null;
  division?: string | null;
  department?: string | null;
  location_code: string;
  authority_code: string;
  unit_code: string;
  serial_length: number;
  description?: string;
  is_active: boolean;
  classifications: ReferenceClassification[];
}

export interface ReferenceSchemePage {
  results: ReferenceScheme[];
  count: number;
}

export interface ReferenceAllocation {
  id: string;
  reference_number: string;
  scope_type: ReferenceScopeType | "";
  scope_label: string;
  unit_name: string;
  unit_code: string;
  classification_code: string;
  classification_label: string;
  serial: number;
  correspondence: string | null;
  correspondence_reference: string;
  correspondence_subject: string;
  created_by_name: string;
  created_at: string;
}

export interface ReferenceAllocationPage {
  results: ReferenceAllocation[];
  count: number;
}

export async function listReferenceSchemes(params?: {
  scope_type?: ReferenceScopeType;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ReferenceSchemePage> {
  const query = new URLSearchParams();
  if (params?.scope_type) query.set("scope_type", params.scope_type);
  if (params?.search) query.set("search", params.search);
  query.set("page", String(params?.page ?? 1));
  query.set("page_size", String(params?.pageSize ?? 100));
  return apiFetch<ReferenceSchemePage>(
    `/organization/reference-schemes/?${query.toString()}`
  );
}

export async function listReferenceAllocations(params?: {
  scope_type?: ReferenceScopeType;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ReferenceAllocationPage> {
  const query = new URLSearchParams();
  if (params?.scope_type) query.set("scope_type", params.scope_type);
  if (params?.search) query.set("search", params.search);
  query.set("page", String(params?.page ?? 1));
  query.set("page_size", String(params?.pageSize ?? 25));
  return apiFetch<ReferenceAllocationPage>(
    `/organization/reference-allocations/?${query.toString()}`
  );
}

export async function createReferenceScheme(
  input: ReferenceSchemeInput
): Promise<ReferenceScheme> {
  return apiFetch<ReferenceScheme>("/organization/reference-schemes/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateReferenceScheme(
  id: string,
  input: Partial<ReferenceSchemeInput>
): Promise<ReferenceScheme> {
  return apiFetch<ReferenceScheme>(`/organization/reference-schemes/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteReferenceScheme(id: string): Promise<void> {
  await apiFetch(`/organization/reference-schemes/${id}/`, { method: "DELETE" });
}
