import { apiFetch } from '../api-client';
import { isRecord } from '@/lib/type-utils';

export interface DraftFileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
}

/** Everything a treatment draft needs to resume where it left off. */
export interface DraftRoutingData {
  routeType: 'person' | 'office';
  targetOfficeId: string;
  routeMode: 'single' | 'parallel';
  parallelUserIds: string[];
  parallelOfficeIds: string[];
  purpose: 'action' | 'information' | 'approval';
  branchConfigs: Record<
    string,
    {
      purpose: 'action' | 'information' | 'approval';
      minuteText: string;
      outcome: 'respond' | 'treat' | 'onward';
    }
  >;
  mergeStrategy: 'independent' | 'all' | 'any' | 'majority';
}

const ROUTE_TYPES = ['person', 'office'] as const;
const ROUTE_MODES = ['single', 'parallel'] as const;
const PURPOSES = ['action', 'information', 'approval'] as const;
const MERGE_STRATEGIES = ['independent', 'all', 'any', 'majority'] as const;
const OUTCOMES = ['respond', 'treat', 'onward'] as const;

const isOneOf = <T extends string>(value: unknown, choices: readonly T[]): value is T =>
  typeof value === 'string' && choices.includes(value as T);

/** Reject partial or malformed draft routing so a draft can never crash the composer. */
export function isDraftRoutingData(value: unknown): value is DraftRoutingData {
  if (!isRecord(value)) return false;
  const routing = value;

  const branchConfigs = routing.branchConfigs;
  if (!isRecord(branchConfigs) || Array.isArray(branchConfigs)) {
    return false;
  }

  return (
    isOneOf(routing.routeType, ROUTE_TYPES) &&
    typeof routing.targetOfficeId === 'string' &&
    isOneOf(routing.routeMode, ROUTE_MODES) &&
    Array.isArray(routing.parallelUserIds) &&
    routing.parallelUserIds.every((id) => typeof id === 'string') &&
    Array.isArray(routing.parallelOfficeIds) &&
    routing.parallelOfficeIds.every((id) => typeof id === 'string') &&
    isOneOf(routing.purpose, PURPOSES) &&
    Object.values(branchConfigs).every((config) => {
      if (!isRecord(config)) return false;
      const branch = config;
      return (
        isOneOf(branch.purpose, PURPOSES) &&
        typeof branch.minuteText === 'string' &&
        isOneOf(branch.outcome, OUTCOMES)
      );
    }) &&
    isOneOf(routing.mergeStrategy, MERGE_STRATEGIES)
  );
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
  routing_data?: DraftRoutingData | null;
  response_type?: string | null;
  selected_document_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Draft {
  id: string;
  correspondenceId: string;
  type: 'minute' | 'treatment';
  content: string;
  subject?: string;
  forwardTo: string;
  onBehalfOf?: string;
  actionType?: 'minute' | 'approve';
  timestamp: string;
  files?: DraftFileMetadata[];
  routingData?: DraftRoutingData;
  responseType?: 'memo' | 'existing-document';
  selectedDocumentId: string;
}

const mapApiDraftToFrontend = (api: ApiDraft): Draft => ({
  id: api.id,
  correspondenceId: api.correspondence_id,
  type: api.draft_type,
  content: api.content,
  subject: api.subject || undefined,
  forwardTo: api.forward_to ?? '',
  onBehalfOf: api.on_behalf_of || undefined,
  actionType: api.action_type || undefined,
  timestamp: api.updated_at,
  files: api.files_metadata.length > 0 ? api.files_metadata : undefined,
  routingData: isDraftRoutingData(api.routing_data) ? api.routing_data : undefined,
  responseType:
    api.response_type === 'memo' || api.response_type === 'existing-document'
      ? api.response_type
      : undefined,
  selectedDocumentId: api.selected_document_id ?? '',
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
  routing_data: draft.routingData,
  response_type: draft.responseType,
  selected_document_id: draft.selectedDocumentId,
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
