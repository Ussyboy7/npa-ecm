import { apiFetch } from '../api-client';
import { isRecord } from '@/lib/type-utils';

export interface DraftFileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface ApiDraft {
  id: string;
  correspondence: {
    id: string;
    reference_number: string;
    subject: string;
  };
  correspondence_id: string;
  user: { id: string; name: string; email: string };
  draft_type: 'minute' | 'treatment';
  content: string;
  subject?: string;
  forward_to?: string;
  on_behalf_of?: string;
  action_type?: 'minute' | 'approve' | null;
  apply_signature?: boolean | null;
  selected_signature_template_id?: string | null;
  files_metadata: DraftFileMetadata[];
  created_at: string;
  updated_at: string;
}

export interface Draft {
  id: string;
  correspondenceId: string;
  type: 'minute' | 'treatment';
  content: string;
  subject?: string;
  forwardTo?: string;
  onBehalfOf?: string;
  actionType?: 'minute' | 'approve';
  applySignature?: boolean;
  selectedSignatureTemplateId?: string;
  timestamp: string;
  files?: DraftFileMetadata[];
}

const mapApiDraftToFrontend = (api: ApiDraft): Draft => ({
  id: api.id,
  correspondenceId: api.correspondence_id,
  type: api.draft_type,
  content: api.content,
  subject: api.subject || undefined,
  forwardTo: api.forward_to || undefined,
  onBehalfOf: api.on_behalf_of || undefined,
  actionType: api.action_type || undefined,
  applySignature: api.apply_signature ?? undefined,
  selectedSignatureTemplateId: api.selected_signature_template_id ?? undefined,
  timestamp: api.updated_at,
  files: api.files_metadata.length > 0 ? api.files_metadata : undefined,
});

const mapFrontendDraftToApi = (draft: Partial<Draft>): Partial<ApiDraft> => ({
  correspondence_id: draft.correspondenceId,
  draft_type: draft.type,
  content: draft.content,
  subject: draft.subject,
  forward_to: draft.forwardTo,
  on_behalf_of: draft.onBehalfOf,
  action_type: draft.actionType,
  apply_signature: draft.applySignature ?? null,
  selected_signature_template_id: draft.selectedSignatureTemplateId ?? null,
  files_metadata: draft.files || [],
});

export async function getDrafts(params?: {
  correspondence?: string;
  draft_type?: 'minute' | 'treatment';
}): Promise<Draft[]> {
  const queryParams = new URLSearchParams();
  if (params?.correspondence) queryParams.append('correspondence', params.correspondence);
  if (params?.draft_type) queryParams.append('draft_type', params.draft_type);

  const response = await apiFetch<unknown>(
    `/correspondence/drafts/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  );

  const drafts = Array.isArray(response)
    ? (response as ApiDraft[])
    : isRecord(response) && Array.isArray(response.results)
      ? (response.results as ApiDraft[])
      : [];
  return drafts.map(mapApiDraftToFrontend);
}

export async function getDraftByCorrespondence(
  correspondenceId: string,
  type: 'minute' | 'treatment'
): Promise<Draft | null> {
  const drafts = await getDrafts({
    correspondence: correspondenceId,
    draft_type: type,
  });
  return drafts[0] || null;
}

export async function saveDraft(draft: Partial<Draft> & { correspondenceId: string; type: 'minute' | 'treatment'; content: string }): Promise<Draft> {
  const existing = await getDraftByCorrespondence(draft.correspondenceId, draft.type);

  if (existing) {
    const apiData = mapFrontendDraftToApi({ ...existing, ...draft });
    const response = await apiFetch<ApiDraft>(
      `/correspondence/drafts/${existing.id}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(apiData),
      }
    );
    return mapApiDraftToFrontend(response);
  } else {
    const apiData = mapFrontendDraftToApi(draft);
    const response = await apiFetch<ApiDraft>(
      '/correspondence/drafts/',
      {
        method: 'POST',
        body: JSON.stringify(apiData),
      }
    );
    return mapApiDraftToFrontend(response);
  }
}

export async function deleteDraft(draftId: string): Promise<void> {
  await apiFetch(`/correspondence/drafts/${draftId}/`, {
    method: 'DELETE',
  });
}
