import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUseCurrentUser = vi.hoisted(() => vi.fn());
const mockUseOrganizationCatalogs = vi.hoisted(() => vi.fn());
const mockUseScopedOfficeMemberships = vi.hoisted(() => vi.fn());
const mockUseUserLookup = vi.hoisted(() => vi.fn());
const mockUseRoutingSuggestions = vi.hoisted(() => vi.fn());
const mockUseGradeCatalog = vi.hoisted(() => vi.fn());
const mockUseSignature = vi.hoisted(() => vi.fn());
const mockUseUserPermissions = vi.hoisted(() => vi.fn());
const mockGetTemplatesForUser = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown[]>>(() => Promise.resolve([])),
);
const mockGetDraftByCorrespondence = vi.hoisted(() =>
  vi.fn<
    () => Promise<{
      id: string;
      content: string;
      subject?: string;
      forwardTo?: string;
      responseType?: 'memo' | 'existing-document';
      selectedDocumentId?: string;
      routingData?: {
        routeType?: 'person' | 'office';
        targetOfficeId?: string;
        routeMode?: 'single' | 'parallel';
        parallelUserIds?: string[];
        parallelOfficeIds?: string[];
        purpose?: 'action' | 'information' | 'approval';
        branchConfigs?: Record<string, unknown>;
        mergeStrategy?: string;
      };
    } | null>
  >(() => Promise.resolve(null)),
);
const mockSaveDraft = vi.hoisted(() =>
  vi.fn<(draft: Record<string, unknown>) => Promise<{ id: string }>>(() =>
    Promise.resolve({ id: 'draft-1' }),
  ),
);
const mockFetchActiveUsersForGradeAndDivision = vi.hoisted(() =>
  vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
);
const mockQueryDocuments = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({ results: [], count: 0, next: null, previous: null }),
  ),
);
const mockGetMinutesByCorrespondenceId = vi.hoisted(() =>
  vi.fn<() => Array<Record<string, unknown>>>(() => []),
);
const mockApiFetch = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve({})),
);
const mockFetchDocumentById = vi.hoisted(() =>
  vi.fn((id: string) =>
    Promise.resolve({
      id,
      title: 'Approval memo',
      referenceNumber: 'NPA/DOC/42',
      updatedAt: '2026-11-01T00:00:00Z',
      status: 'published',
    }),
  ),
);

vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser: mockUseCurrentUser }));
vi.mock('@/hooks/use-organization-catalogs', () => ({
  useOrganizationCatalogs: mockUseOrganizationCatalogs,
}));
vi.mock('@/hooks/use-scoped-office-memberships', () => ({
  useScopedOfficeMemberships: mockUseScopedOfficeMemberships,
}));
vi.mock('@/hooks/use-user-lookup', () => ({ useUserLookup: mockUseUserLookup }));
vi.mock('@/hooks/use-routing-suggestions', () => ({
  useRoutingSuggestions: mockUseRoutingSuggestions,
}));
vi.mock('@/hooks/use-grade-catalog', () => ({ useGradeCatalog: mockUseGradeCatalog }));
vi.mock('@/hooks/use-signature', () => ({ useSignature: mockUseSignature }));
vi.mock('@/hooks/use-user-permissions', () => ({ useUserPermissions: mockUseUserPermissions }));
vi.mock('@/lib/grade-catalog', () => ({
  gradeHasTier: () => false,
  getSuperiorGrade: () => null,
  getGradeRelationshipLabel: () => '',
}));
vi.mock('@/lib/users-api', () => ({
  fetchActiveUsersForGradeAndDivision: mockFetchActiveUsersForGradeAndDivision,
}));
vi.mock('@/lib/api/dms', () => ({
  queryDocuments: mockQueryDocuments,
  fetchDocumentById: mockFetchDocumentById,
}));
vi.mock('@/lib/sla-client', () => ({
  fetchSLATargets: vi.fn(() => Promise.resolve({ urgent: 8, high: 24, medium: 48, low: 72 })),
}));
vi.mock('@/lib/api/document-templates', () => ({
  getTemplatesForUser: mockGetTemplatesForUser,
  saveTemplate: vi.fn(),
}));
vi.mock('@/lib/storage', () => ({
  saveDraft: mockSaveDraft,
  getDraftByCorrespondence: mockGetDraftByCorrespondence,
  deleteDraft: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/api-client', () => ({
  apiFetch: mockApiFetch,
  hasTokens: vi.fn(() => true),
}));
vi.mock('@/hooks/use-abort-controller', () => ({
  useAbortController: () => ({ getSignal: () => undefined, reset: () => {} }),
}));
vi.mock('@/contexts/CorrespondenceContext', () => ({
  useCorrespondence: () => ({
    addCorrespondence: vi.fn(),
    addMinute: vi.fn(),
    updateCorrespondence: vi.fn(),
    getMinutesByCorrespondenceId: mockGetMinutesByCorrespondenceId,
    syncFromApi: vi.fn(() => Promise.resolve()),
  }),
}));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import { TreatmentModal } from '../TreatmentModal';

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

const gmUser = {
  id: 'user-gm',
  name: 'GM User',
  email: 'gm@npa.gov',
  employeeId: 'GM001',
  gradeLevel: 'MSS1',
  systemRole: 'General Manager',
  active: true,
  rolePermissions: { can_approve: true, can_minute_correspondence: true },
  directorate: 'dir-1',
  division: 'div-fin',
  department: 'dept-fin',
};

const nextPerson = {
  id: 'user-next',
  name: 'Next Person',
  systemRole: 'Principal Manager',
  gradeLevel: 'MSS3',
  active: true,
};

const correspondence = {
  id: 'corr-1',
  referenceNumber: 'NPA/TEST/001',
  subject: 'Test subject',
  source: 'internal',
  receivedDate: new Date().toISOString(),
  senderName: '',
  senderOrganization: '',
  status: 'in-progress',
  priority: 'high',
  direction: 'downward',
  divisionId: 'div-fin',
  departmentId: 'dept-fin',
  currentApproverId: 'user-gm',
  distribution: [],
  requiredApprovalLevel: 'departmental',
};

function setupMocks() {
  mockUseCurrentUser.mockReturnValue({ currentUser: gmUser, hydrated: true });
  mockUseOrganizationCatalogs.mockReturnValue({
    divisions: [{ id: 'div-fin', name: 'Finance', directorateId: 'dir-1', isActive: true }],
    departments: [],
    offices: [
      {
        id: 'office-fin',
        name: 'Finance Office',
        isActive: true,
        officeType: 'division',
        directorateId: 'dir-1',
        divisionId: 'div-fin',
      },
    ],
    officeMemberships: [],
    directorates: [{ id: 'dir-1', name: 'Dir', isActive: true }],
  });
  mockUseScopedOfficeMemberships.mockReturnValue([]);
  mockUseUserLookup.mockReturnValue(new Map());
  mockUseRoutingSuggestions.mockReturnValue([nextPerson]);
  mockUseGradeCatalog.mockReturnValue(null);
  mockUseUserPermissions.mockReturnValue({ canApprove: true, canDistribute: true });
  mockUseSignature.mockReturnValue({
    signature: { imageData: 'data:image/png;base64,xxx', fileName: 'sig.png' },
    templates: [],
    preferences: { autoApplyForMinutes: false },
    isLoading: false,
  });
}

const renderModal = (
  onClose: () => void = vi.fn(),
  overrides: Partial<import('@/lib/npa-structure').Correspondence> = {},
) =>
  render(
    <TreatmentModal
      correspondence={
        { ...correspondence, ...overrides } as unknown as import('@/lib/npa-structure').Correspondence
      }
      isOpen
      onClose={onClose}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTemplatesForUser.mockReset().mockResolvedValue([]);
  mockGetDraftByCorrespondence.mockReset().mockResolvedValue(null);
  mockFetchActiveUsersForGradeAndDivision.mockReset().mockResolvedValue([]);
  mockGetMinutesByCorrespondenceId.mockReset().mockReturnValue([]);
  mockApiFetch.mockReset().mockResolvedValue({});
  mockSaveDraft.mockClear();
  mockFetchDocumentById.mockClear();
  mockQueryDocuments.mockClear();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe('TreatmentModal routing gate', () => {
  it('shows the shared context card with the current holder and latest minute', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockGetMinutesByCorrespondenceId.mockReturnValue([
      {
        id: 'minute-1',
        correspondenceId: 'corr-1',
        userId: 'user-gm',
        userName: 'GM User',
        userSystemRole: 'General Manager',
        gradeLevel: 'MSS1',
        actionType: 'minute',
        minuteText: 'Recommend approval as requested.',
        direction: 'downward',
        stepNumber: 1,
        timestamp: '2026-11-20T10:00:00Z',
        isRecalled: false,
      },
    ]);
    renderModal(vi.fn(), {
      currentOfficeName: 'Executive Director, Finance & Administration - Direct Reports',
    });

    expect(await screen.findByText('Currently with')).toBeDefined();
    expect(
      screen.getByText(/executive director, finance & administration - direct reports/i),
    ).toBeDefined();
    expect(screen.getByText(/ref: NPA\/TEST\/001/i)).toBeDefined();

    const previous = await screen.findByRole('button', {
      name: /previous minute · gm user/i,
    });
    await user.click(previous);
    expect(await screen.findByText(/general manager ·/i)).toBeDefined();
  });

  it('keeps Send Response disabled and explains why until a destination is picked', async () => {
    setupMocks();
    renderModal();

    const send = await screen.findByRole('button', { name: /send response/i });
    expect(send.hasAttribute('disabled')).toBe(true);
    expect(await screen.findByText(/select a destination to send/i)).toBeDefined();
  });

  it('enables Send Response and clears the hint once a recipient is picked', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderModal();

    const send = await screen.findByRole('button', { name: /send response/i });
    expect(send.hasAttribute('disabled')).toBe(true);

    await user.click(await screen.findByRole('combobox', { name: 'Recipient' }));
    // The same person appears once as the suggestion and once in the full list.
    const options = await screen.findAllByRole('option', { name: /next person/i });
    await user.click(options[0]);

    await waitFor(() => expect(send.hasAttribute('disabled')).toBe(false));
    expect(screen.queryByText(/select a destination to send/i)).toBeNull();
  });

  it('asks for two destinations when the response is assigned separately', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderModal();

    await user.click(await screen.findByRole('radio', { name: /assign separately/i }));

    const send = await screen.findByRole('button', { name: /send response/i });
    expect(send.hasAttribute('disabled')).toBe(true);
    expect(
      await screen.findByText(/add at least two people or offices to send separately/i),
    ).toBeDefined();
  });

  it('presents the response type as a compact choice with guidance for the active one', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderModal();

    const group = await screen.findByRole('radiogroup', { name: /response type/i });
    expect(within(group).getByRole('radio', { name: /^memo$/i })).toBeDefined();
    expect(within(group).getByRole('radio', { name: /attach document/i })).toBeDefined();
    expect(await screen.findByText(/write the response in the editor below/i)).toBeDefined();

    await user.click(within(group).getByRole('radio', { name: /attach document/i }));

    expect(await screen.findByText(/attach a document already stored in the dms/i)).toBeDefined();
    expect(await screen.findByText(/select document/i)).toBeDefined();
  });

  it('names each recipient action directly with one line of guidance', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderModal();

    const group = await screen.findByRole('radiogroup', { name: /recipient action/i });
    expect(within(group).getByRole('radio', { name: /^action$/i })).toBeDefined();
    expect(within(group).getByRole('radio', { name: /^information$/i })).toBeDefined();
    expect(within(group).queryByRole('radio', { name: /^approval$/i })).toBeNull();

    await user.click(within(group).getByRole('radio', { name: /^information$/i }));
    expect(await screen.findByText(/no response is expected/i)).toBeDefined();
  });

  it('clears supporting files when switching to a DMS document response', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderModal();

    await user.click(await screen.findByRole('button', { name: /supporting files/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(['%PDF-1.4'], 'support.pdf', { type: 'application/pdf' })],
      },
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /supporting files/i }).textContent).toContain('1'),
    );

    const responseType = screen.getByRole('radiogroup', { name: /response type/i });
    await user.click(within(responseType).getByRole('radio', { name: /attach document/i }));
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(mockSaveDraft).toHaveBeenCalledTimes(1));
    expect(mockSaveDraft.mock.calls[0][0].files).toBeUndefined();
  });

  it('sends the chosen recipient action with a single-route minute', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-submit',
      content: '<p>Draft response</p>',
      subject: 'Re: Test subject',
    });
    renderModal();

    await user.click(await screen.findByRole('combobox', { name: 'Recipient' }));
    const options = await screen.findAllByRole('option', { name: /next person/i });
    await user.click(options[0]);

    const purpose = await screen.findByRole('radiogroup', { name: /recipient action/i });
    await user.click(within(purpose).getByRole('radio', { name: /^information$/i }));
    await user.click(screen.getByRole('button', { name: /send response/i }));
    await user.click(await screen.findByRole('button', { name: /confirm & send/i }));

    await waitFor(() => {
      const call = mockApiFetch.mock.calls.find(
        ([path]) => path === '/correspondence/minutes/',
      );
      expect(call).toBeDefined();
      const options = call?.[1] as { body?: string } | undefined;
      const body = JSON.parse(options?.body ?? '{}');
      expect(body.purpose).toBe('information');
      expect(body.requires_response).toBe(false);
    });
  });

  it('restores an office destination and the recipient action from a draft', async () => {
    setupMocks();
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-office',
      content: '<p>Draft response</p>',
      subject: 'Re: Test subject',
      // A stale person recipient must not win over the saved office choice.
      forwardTo: 'user-next',
      routingData: {
        routeType: 'office',
        targetOfficeId: 'office-fin',
        routeMode: 'single',
        parallelUserIds: [],
        parallelOfficeIds: [],
        purpose: 'information',
        branchConfigs: {},
        mergeStrategy: 'independent',
      },
    });
    renderModal();

    expect(await screen.findByText('1 office')).toBeDefined();
    expect(screen.getByRole('radio', { name: 'Office' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('combobox', { name: /select office/i }).textContent).toContain(
      'Finance Office',
    );

    const purpose = screen.getByRole('radiogroup', { name: /recipient action/i });
    expect(
      within(purpose).getByRole('radio', { name: 'Information' }).getAttribute('aria-checked'),
    ).toBe('true');
    expect(screen.getByText(/no response is expected/i)).toBeDefined();

    const send = screen.getByRole('button', { name: /send response/i });
    await waitFor(() => expect(send.hasAttribute('disabled')).toBe(false));
  });

  it('restores a legacy approval draft as an action', async () => {
    setupMocks();
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-legacy-approval',
      content: '<p>Draft response</p>',
      subject: 'Re: Test subject',
      routingData: {
        routeType: 'person',
        targetOfficeId: '',
        routeMode: 'single',
        parallelUserIds: [],
        parallelOfficeIds: [],
        purpose: 'approval',
        branchConfigs: {},
        mergeStrategy: 'independent',
      },
    });
    renderModal();

    const purpose = await screen.findByRole('radiogroup', { name: /recipient action/i });
    expect(
      within(purpose).getByRole('radio', { name: 'Action' }).getAttribute('aria-checked'),
    ).toBe('true');
    expect(within(purpose).queryByRole('radio', { name: 'Approval' })).toBeNull();
  });

  it('restores separate assignments, their action, and merge choice from a draft', async () => {
    setupMocks();
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-parallel',
      content: '<p>Draft response</p>',
      subject: 'Re: Test subject',
      forwardTo: '',
      routingData: {
        routeType: 'person',
        targetOfficeId: '',
        routeMode: 'parallel',
        parallelUserIds: ['user-next'],
        parallelOfficeIds: ['office-fin'],
        purpose: 'information',
        mergeStrategy: 'all',
        branchConfigs: {
          'user:user-next': { purpose: 'action', minuteText: 'Review the invoice', outcome: 'respond' },
          'office:office-fin': { purpose: 'action', minuteText: 'Confirm the figures', outcome: 'respond' },
        },
      },
    });
    renderModal();

    expect(
      (await screen.findByRole('radio', { name: /assign separately/i })).getAttribute('aria-checked'),
    ).toBe('true');
    expect(await screen.findByText('2 assignments')).toBeDefined();
    expect(await screen.findByText('Next Person')).toBeDefined();
    expect(await screen.findByText('Finance Office')).toBeDefined();
    // Each assignment keeps its own instruction.
    expect(await screen.findByDisplayValue('Review the invoice')).toBeDefined();
    expect(await screen.findByDisplayValue('Confirm the figures')).toBeDefined();
    expect(await screen.findByText('Consolidate — after every expected outcome')).toBeDefined();

    // The chosen action is still there when the draft returns to a single route.
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Single route' }));
    const purpose = await screen.findByRole('radiogroup', { name: /recipient action/i });
    expect(
      within(purpose).getByRole('radio', { name: 'Information' }).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('saves the restored routing choices back with the draft', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-parallel',
      content: '<p>Draft response</p>',
      subject: 'Re: Test subject',
      forwardTo: '',
      routingData: {
        routeType: 'person',
        targetOfficeId: '',
        routeMode: 'parallel',
        parallelUserIds: ['user-next'],
        parallelOfficeIds: ['office-fin'],
        purpose: 'information',
        branchConfigs: {},
        mergeStrategy: 'all',
      },
    });
    renderModal();

    await screen.findByText('2 assignments');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(mockSaveDraft).toHaveBeenCalledTimes(1));
    const payload = mockSaveDraft.mock.calls[0][0];
    expect(payload.routingData).toMatchObject({
      routeMode: 'parallel',
      parallelUserIds: ['user-next'],
      parallelOfficeIds: ['office-fin'],
      purpose: 'information',
      mergeStrategy: 'all',
    });
    expect(payload.forwardTo).toBe('');
  });

  it('restores the response type and attached document from a draft', async () => {
    setupMocks();
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-document',
      content: '<p>Notes for the attachment</p>',
      subject: 'Re: Test subject',
      responseType: 'existing-document',
      selectedDocumentId: 'doc-42',
    });
    renderModal();

    const responseType = await screen.findByRole('radiogroup', { name: /response type/i });
    await waitFor(() =>
      expect(
        within(responseType)
          .getByRole('radio', { name: /attach document/i })
          .getAttribute('aria-checked'),
      ).toBe('true'),
    );

    expect(mockFetchDocumentById).toHaveBeenCalledWith('doc-42');
    expect(await screen.findByText('Approval memo')).toBeDefined();
    // Preview plus the pinned entry in the document list.
    expect(screen.getAllByText(/NPA\/DOC\/42/).length).toBeGreaterThan(0);
  });

  it('saves the response type and selected document with the draft', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-document',
      content: '<p>Notes for the attachment</p>',
      subject: 'Re: Test subject',
      responseType: 'existing-document',
      selectedDocumentId: 'doc-42',
    });
    renderModal();

    await screen.findByText('Approval memo');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(mockSaveDraft).toHaveBeenCalledTimes(1));
    const payload = mockSaveDraft.mock.calls[0][0];
    expect(payload.responseType).toBe('existing-document');
    expect(payload.selectedDocumentId).toBe('doc-42');
  });

  it('ignores incomplete routing data in a draft instead of crashing', async () => {
    setupMocks();
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-partial',
      content: '<p>Partial routing draft</p>',
      subject: 'Re: Test subject',
      routingData: { routeType: 'office', targetOfficeId: 'office-fin' },
    });
    renderModal();

    // The malformed routing block is ignored; the composer keeps its defaults.
    expect(
      (await screen.findByRole('radio', { name: 'Person' })).getAttribute('aria-checked'),
    ).toBe('true');
    expect(screen.getByText('No recipient yet')).toBeDefined();
    expect(screen.queryByText('1 office')).toBeNull();
    const purpose = screen.getByRole('radiogroup', { name: /recipient action/i });
    expect(
      within(purpose).getByRole('radio', { name: 'Action' }).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('expands the same memo editor into focus mode and returns with Done', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-focus',
      content: '<p>Focus draft</p>',
      subject: 'Re: Test subject',
    });
    renderModal();

    const editor = await screen.findByRole('textbox', { name: 'Document editor' });
    await waitFor(() => expect(editor.textContent).toContain('Focus draft'));

    await user.click(screen.getByRole('button', { name: /expand memo editor/i }));

    // Focus mode keeps the very same editor instance, so content and undo survive.
    expect(screen.getByRole('textbox', { name: 'Document editor' })).toBe(editor);
    expect(screen.queryByRole('radiogroup', { name: /response type/i })).toBeNull();
    expect(screen.queryByText(/route this response/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /send response/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(await screen.findByRole('button', { name: /send response/i })).toBeDefined();
    expect(screen.getByRole('radiogroup', { name: /response type/i })).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Document editor' })).toBe(editor);
  });

  it('closes the composer from the focus-mode X button', async () => {
    const user = userEvent.setup();
    setupMocks();
    const onClose = vi.fn();
    renderModal(onClose);

    await user.click(await screen.findByRole('button', { name: /expand memo editor/i }));
    await user.click(screen.getByRole('button', { name: 'Close composer' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exits focus mode on Escape without closing the composer', async () => {
    const user = userEvent.setup();
    setupMocks();
    const onClose = vi.fn();
    renderModal(onClose);

    await user.click(await screen.findByRole('button', { name: /expand memo editor/i }));
    expect(screen.queryByRole('button', { name: /send response/i })).toBeNull();

    await user.keyboard('{Escape}');

    expect(await screen.findByRole('button', { name: /expand memo editor/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /send response/i })).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /treat & respond/i })).toBeDefined();
  });

  it('talks about a response, not a minute, and leaves formal approval to its own flow', async () => {
    setupMocks();
    renderModal();

    expect(await screen.findByText(/^route this response$/i)).toBeDefined();
    expect(screen.getByText(/one destination will receive this response/i)).toBeDefined();
    expect(screen.queryByText(/route this minute/i)).toBeNull();
    expect(screen.queryByText(/receive this minute/i)).toBeNull();

    const purpose = await screen.findByRole('radiogroup', { name: /recipient action/i });
    expect(within(purpose).queryByRole('radio', { name: /^approval$/i })).toBeNull();
    expect(screen.queryByText(/apply your signature to this response/i)).toBeNull();
  });
});
