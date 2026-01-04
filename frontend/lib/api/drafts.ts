import { apiFetch } from '../api-client';
import { logError } from '@/lib/client-logger';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

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
  files_metadata: draft.files || [],
});

/**
 * Get all drafts for the current user
 */
export async function getDrafts(params?: {
  correspondence?: string;
  draft_type?: 'minute' | 'treatment';
}): Promise<Draft[]> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.correspondence) queryParams.append('correspondence', params.correspondence);
    if (params?.draft_type) queryParams.append('draft_type', params.draft_type);

    const response = await apiFetch<unknown>(
      `/correspondence/drafts/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    
    // Handle both array and paginated response
    const drafts = Array.isArray(response)
      ? (response as ApiDraft[])
      : isRecord(response) && Array.isArray(response.results)
        ? (response.results as ApiDraft[])
        : [];
    return drafts.map(mapApiDraftToFrontend);
  } catch (error: unknown) {
    logError('Failed to fetch drafts from backend', error);
    return [];
  }
}

/**
 * Get draft for a specific correspondence and type
 */
export async function getDraftByCorrespondence(
  correspondenceId: string,
  type: 'minute' | 'treatment'
): Promise<Draft | null> {
  try {
    const drafts = await getDrafts({
      correspondence: correspondenceId,
      draft_type: type,
    });
    return drafts[0] || null;
  } catch (error: unknown) {
    logError(`Failed to fetch draft for correspondence ${correspondenceId}`, error);
    return null;
  }
}

/**
 * Create or update a draft
 */
export async function saveDraft(draft: Partial<Draft> & { correspondenceId: string; type: 'minute' | 'treatment'; content: string }): Promise<Draft> {
  try {
    // Check if draft exists
    const existing = await getDraftByCorrespondence(draft.correspondenceId, draft.type);
    
    if (existing) {
      // Update existing draft
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
      // Create new draft
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
  } catch (error: unknown) {
    logError('Failed to save draft on backend', error);
    throw error;
  }
}

/**
 * Delete a draft
 */
export async function deleteDraft(draftId: string): Promise<void> {
  try {
    await apiFetch(`/correspondence/drafts/${draftId}/`, {
      method: 'DELETE',
    });
  } catch (error: unknown) {
    logError(`Failed to delete draft ${draftId} from backend`, error);
    throw error;
  }
}

