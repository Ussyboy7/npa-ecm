import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ apiFetch: mockApiFetch }));

import { getDraftByCorrespondence, saveDraft } from '@/lib/api/drafts';

const routingData = {
  routeType: 'office' as const,
  targetOfficeId: 'office-fin',
  routeMode: 'parallel' as const,
  parallelUserIds: ['user-next'],
  parallelOfficeIds: ['office-fin'],
  purpose: 'information' as const,
  branchConfigs: {},
  mergeStrategy: 'independent' as const,
};

const apiDraft = {
  id: 'draft-1',
  correspondence: { id: 'corr-1', reference_number: 'NPA/TEST/001', subject: 'Test' },
  correspondence_id: 'corr-1',
  user: { id: 'user-1', name: 'User', email: 'user@npa.gov' },
  draft_type: 'treatment',
  content: '<p>Draft response</p>',
  subject: 'Re: Test',
  forward_to: '',
  on_behalf_of: '',
  action_type: null,
  files_metadata: [],
  routing_data: routingData,
  response_type: 'existing-document',
  selected_document_id: 'doc-42',
  created_at: '2026-11-25T00:00:00Z',
  updated_at: '2026-11-25T00:00:00Z',
};

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('treatment draft routing data', () => {
  it('reads routing_data into the draft the composer restores from', async () => {
    mockApiFetch.mockResolvedValue([apiDraft]);

    const draft = await getDraftByCorrespondence('corr-1', 'treatment');

    expect(draft?.routingData).toEqual(routingData);
    expect(draft?.responseType).toBe('existing-document');
    expect(draft?.selectedDocumentId).toBe('doc-42');
  });

  it('ignores incomplete routing data instead of restoring it', async () => {
    mockApiFetch.mockResolvedValue([
      { ...apiDraft, routing_data: { routeType: 'office', targetOfficeId: 'office-fin' } },
    ]);

    const draft = await getDraftByCorrespondence('corr-1', 'treatment');

    expect(draft?.routingData).toBeUndefined();
  });

  it('writes routingData back as routing_data when the draft is saved', async () => {
    mockApiFetch
      .mockResolvedValueOnce([apiDraft])
      .mockImplementationOnce(
        (_path: string, init: { body: string }) =>
          Promise.resolve({ ...apiDraft, ...JSON.parse(init.body) }),
      );

    const saved = await saveDraft({
      correspondenceId: 'corr-1',
      type: 'treatment',
      content: '<p>Updated response</p>',
      routingData: { ...routingData, purpose: 'approval' },
      responseType: 'existing-document',
      selectedDocumentId: 'doc-42',
    });

    const [, patchInit] = mockApiFetch.mock.calls[1];
    const body = JSON.parse(patchInit.body);
    expect(body.routing_data).toEqual({ ...routingData, purpose: 'approval' });
    expect(body.response_type).toBe('existing-document');
    expect(body.selected_document_id).toBe('doc-42');
    expect(saved.routingData).toEqual({ ...routingData, purpose: 'approval' });
    expect(saved.responseType).toBe('existing-document');
    expect(saved.selectedDocumentId).toBe('doc-42');
  });
});
