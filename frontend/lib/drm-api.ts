import { apiFetch } from "./api-client";

export interface DocumentRightsPolicy {
  id: string;
  name: string;
  description: string;
  allow_download: boolean;
  allow_print: boolean;
  allow_external_share: boolean;
  view_only: boolean;
  watermark_text: string;
  expires_after_days?: number | null;
  is_active: boolean;
}

export interface DocumentDrmRights {
  policy_id?: string | null;
  policy_name?: string | null;
  allow_download: boolean;
  allow_print: boolean;
  allow_external_share: boolean;
  view_only: boolean;
  watermark_text: string;
  expired: boolean;
  message: string;
}

export async function fetchDrmPolicies(): Promise<DocumentRightsPolicy[]> {
  const response = await apiFetch<DocumentRightsPolicy[] | { results: DocumentRightsPolicy[] }>(
    "/dms/drm-policies/?is_active=true",
  );
  return Array.isArray(response) ? response : response.results ?? [];
}

export async function createDrmPolicy(
  data: Omit<DocumentRightsPolicy, "id" | "is_active"> & { is_active?: boolean },
): Promise<DocumentRightsPolicy> {
  return apiFetch<DocumentRightsPolicy>("/dms/drm-policies/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDrmPolicy(
  id: string,
  data: Partial<DocumentRightsPolicy>,
): Promise<DocumentRightsPolicy> {
  return apiFetch<DocumentRightsPolicy>(`/dms/drm-policies/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
