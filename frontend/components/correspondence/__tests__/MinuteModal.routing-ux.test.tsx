import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUseCurrentUser = vi.hoisted(() => vi.fn());
const mockUseOrganization = vi.hoisted(() => vi.fn());
const mockUseOrgUsers = vi.hoisted(() => vi.fn());
const mockUseUserPermissions = vi.hoisted(() => vi.fn());
const mockUseSignature = vi.hoisted(() => vi.fn());
const mockGetTemplatesForUser = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<import('@/lib/api/document-templates').DocumentTemplate[]>>(
    () => Promise.resolve([]),
  ),
);
const mockGetDraftByCorrespondence = vi.hoisted(() =>
  vi.fn<() => Promise<{ id: string; content: string; forwardTo: string; actionType: 'minute' | 'approve' } | null>>(
    () => Promise.resolve(null),
  ),
);
const mockFetchSLATargets = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ urgent: 24, high: 72, medium: 120, low: 168 })),
);

vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser: mockUseCurrentUser }));
vi.mock('@/contexts/OrganizationContext', () => ({ useOrganization: mockUseOrganization }));
vi.mock('@/hooks/use-org-users', () => ({ useOrgUsers: mockUseOrgUsers }));
vi.mock('@/hooks/use-user-permissions', () => ({ useUserPermissions: mockUseUserPermissions }));
vi.mock('@/hooks/use-signature', () => ({ useSignature: mockUseSignature }));
vi.mock('@/lib/api/document-templates', () => ({
  getTemplatesForUser: mockGetTemplatesForUser,
  createTemplate: vi.fn(),
}));
vi.mock('@/lib/sla-client', () => ({
  fetchSLATargets: mockFetchSLATargets,
  DEFAULT_SLA_TARGETS: { urgent: 24, high: 72, medium: 120, low: 168 },
}));
vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(() => Promise.resolve({})),
  hasTokens: vi.fn(() => true),
}));
vi.mock('@/hooks/use-abort-controller', () => ({
  useAbortController: () => ({ getSignal: () => undefined, reset: () => {} }),
}));
vi.mock('@/contexts/CorrespondenceContext', () => ({
  useCorrespondence: () => ({
    getMinutesByCorrespondenceId: () => [],
    addMinute: vi.fn(),
    updateCorrespondence: vi.fn(),
  }),
}));
vi.mock('@/lib/storage', () => ({
  saveDraft: vi.fn(() => Promise.resolve({})),
  getDraftByCorrespondence: mockGetDraftByCorrespondence,
  deleteDraft: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/correspondence-helpers', () => ({
  generateId: (p: string) => `${p}-test`,
  getNextStepNumber: () => 1,
}));
vi.mock('@/hooks/use-routing-suggestions', () => ({
  useRoutingSuggestions: () => [
    {
      id: 'user-next',
      name: 'Next Person',
      systemRole: 'Principal Manager',
      gradeLevel: 'MSS3',
      active: true,
    },
  ],
}));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import { MinuteModal } from '../MinuteModal';

// cmdk (used by the office picker) measures its list with ResizeObserver,
// which jsdom does not implement.
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

const mdUser = {
  id: 'user-md',
  name: 'MD User',
  email: 'md@npa.gov',
  employeeId: 'MD001',
  gradeLevel: 'MDCS',
  systemRole: 'Managing Director',
  active: true,
  rolePermissions: { can_approve: true, can_minute_correspondence: true },
  directorate: 'dir-1',
  division: 'div-fin',
  department: 'dept-fin',
};

const baseCorrespondence = {
  id: 'corr-1',
  referenceNumber: 'NPA/TEST/001',
  subject: 'Test subject',
  source: 'internal' as const,
  receivedDate: new Date().toISOString(),
  senderName: '',
  senderOrganization: '',
  status: 'in-progress' as const,
  priority: 'high' as const,
  direction: 'downward' as const,
  divisionId: 'div-fin',
  departmentId: 'dept-fin',
  currentApproverId: 'user-gm',
  distribution: [] as unknown[],
  requiredApprovalLevel: 'departmental' as const,
};

function setupMocks(
  options: {
    officeMemberships?: Array<Record<string, unknown>>;
    user?: typeof gmUser;
    offices?: Array<Record<string, unknown>>;
  } = {},
) {
  const activeUser = options.user ?? gmUser;
  mockUseCurrentUser.mockReturnValue({ currentUser: activeUser, hydrated: true });
  mockUseOrganization.mockReturnValue({
    offices: options.offices ?? [
      {
        id: 'office-fin',
        name: 'Finance Office',
        isActive: true,
        officeType: 'division',
        directorateId: 'dir-1',
        divisionId: 'div-fin',
      },
    ],
    officeMemberships: options.officeMemberships ?? [
      { userId: 'user-gm', officeId: 'office-fin', isPrimary: true, isActive: true },
    ],
    directorates: [{ id: 'dir-1', name: 'Dir', isActive: true }],
    divisions: [{ id: 'div-fin', name: 'Finance', directorateId: 'dir-1', isActive: true }],
    assistantAssignments: [],
    ensureAssistantAssignments: vi.fn(async () => {}),
    users: [activeUser],
  });
  mockUseOrgUsers.mockReturnValue({ users: [activeUser] });
  mockUseUserPermissions.mockReturnValue({ canApprove: true, canDistribute: true });
  mockUseSignature.mockReturnValue({
    signature: { imageData: 'data:image/png;base64,xxx', fileName: 'sig.png' },
    templates: [],
    preferences: {},
    isLoading: false,
  });
}

const renderModal = (
  overrides: Record<string, unknown> = {},
  onClose: () => void = vi.fn(),
) =>
  render(
    <MinuteModal
      correspondence={
        { ...baseCorrespondence, ...overrides } as unknown as import('@/lib/npa-structure').Correspondence
      }
      isOpen
      onClose={onClose}
      direction="downward"
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTemplatesForUser.mockReset().mockResolvedValue([]);
  mockGetDraftByCorrespondence.mockReset().mockResolvedValue(null);
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
});

describe('MinuteModal routing UX', () => {
  const makeTemplate = (
    overrides: Partial<import('@/lib/api/document-templates').DocumentTemplate> = {},
  ): import('@/lib/api/document-templates').DocumentTemplate => ({
    id: 'template-1',
    scope: 'user',
    scopeId: gmUser.id,
    title: 'Seen and filed',
    contentHtml: '<p>Seen and filed</p>',
    contentText: 'Seen. Please file.',
    createdBy: gmUser.id,
    updatedBy: gmUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateType: 'minute',
    actionType: 'any',
    ...overrides,
  });

  it('closes only the template picker on Escape, keeping the composer open', async () => {
    const user = userEvent.setup();
    mockGetTemplatesForUser.mockResolvedValue([makeTemplate()]);
    setupMocks();
    const onClose = vi.fn();
    renderModal({}, onClose);

    await user.click(await screen.findByRole('button', { name: 'Templates' }));
    expect(await screen.findByRole('menu')).toBeDefined();

    // Escape must not leak once focus moves out of the search field.
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.getAttribute('role')).toBe('menuitem');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /minute correspondence/i })).toBeDefined();
  });

  it('closes only the template name row on Escape, keeping the composer open', async () => {
    const user = userEvent.setup();
    mockGetTemplatesForUser.mockResolvedValue([makeTemplate()]);
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-test',
      content: 'Draft minute',
      forwardTo: '',
      actionType: 'minute',
    });
    setupMocks();
    const onClose = vi.fn();
    renderModal({}, onClose);

    await user.click(await screen.findByRole('button', { name: 'Templates' }));
    const menu = await screen.findByRole('menu');
    await user.click(
      within(menu).getByRole('menuitem', { name: /save this minute as a template/i }),
    );

    const nameInput = await screen.findByPlaceholderText('Name this template');
    nameInput.blur();
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByPlaceholderText('Name this template')).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /minute correspondence/i })).toBeDefined();
  });

  it('finds a minute template by title or body text', async () => {
    const user = userEvent.setup();
    mockGetTemplatesForUser.mockResolvedValue([
      makeTemplate({ id: 'template-urgent', title: 'Treat as urgent', contentText: 'Please treat as urgent.' }),
      makeTemplate({ id: 'template-filed', title: 'Seen and filed', contentText: 'Seen. Please file.' }),
    ]);
    setupMocks();
    renderModal();

    await user.click(await screen.findByRole('button', { name: 'Templates' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('Seen and filed')).toBeDefined();

    const search = within(menu).getByRole('searchbox', { name: 'Find a template' });
    await user.type(search, 'urgent');

    expect(within(menu).queryByText('Seen and filed')).toBeNull();
    expect(within(menu).getByText('Treat as urgent')).toBeDefined();

    await user.clear(search);
    expect(within(menu).getByText('Seen and filed')).toBeDefined();
  });

  it('moves from the search field into the matches with the arrow keys', async () => {
    const user = userEvent.setup();
    mockGetTemplatesForUser.mockResolvedValue([
      makeTemplate({ id: 'template-urgent', title: 'Treat as urgent' }),
      makeTemplate({ id: 'template-filed', title: 'Seen and filed' }),
    ]);
    setupMocks();
    renderModal();

    await user.click(await screen.findByRole('button', { name: 'Templates' }));
    const menu = await screen.findByRole('menu');
    await user.type(within(menu).getByRole('searchbox', { name: 'Find a template' }), 'filed');
    await user.keyboard('{ArrowDown}');

    expect(document.activeElement?.textContent).toContain('Seen and filed');
  });

  it('groups templates by scope so shared and personal ones are distinguishable', async () => {
    const user = userEvent.setup();
    mockGetTemplatesForUser.mockResolvedValue([
      makeTemplate({ id: 'template-org', scope: 'organization', scopeId: null, title: 'Organization wording' }),
      makeTemplate({ id: 'template-div', scope: 'division', scopeId: 'div-fin', title: 'Division wording' }),
      makeTemplate({ id: 'template-mine', scope: 'user', title: 'My wording' }),
    ]);
    setupMocks();
    renderModal();

    await user.click(await screen.findByRole('button', { name: 'Templates' }));
    const menu = await screen.findByRole('menu');

    expect(within(menu).getByText('Organization')).toBeDefined();
    expect(within(menu).getByText('Division')).toBeDefined();
    expect(within(menu).getByText('Personal')).toBeDefined();
    expect(within(menu).queryByText('Department')).toBeNull();
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Organization wording'),
      expect.stringContaining('Division wording'),
      expect.stringContaining('My wording'),
    ]);
  });

  it('still appends the chosen template to the minute text', async () => {
    const user = userEvent.setup();
    mockGetTemplatesForUser.mockResolvedValue([makeTemplate()]);
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-test',
      content: 'Existing minute',
      forwardTo: '',
      actionType: 'minute',
    });
    setupMocks();
    renderModal();

    const minuteInput = await screen.findByRole('textbox', { name: 'Minute text' });
    await waitFor(() => expect(minuteInput).toHaveProperty('value', 'Existing minute'));

    await user.click(await screen.findByRole('button', { name: 'Templates' }));
    const menu = await screen.findByRole('menu');
    await user.click(within(menu).getByRole('menuitem', { name: /seen and filed/i }));

    await waitFor(() =>
      expect(minuteInput).toHaveProperty('value', 'Existing minute\n\nSeen. Please file.'),
    );
  });

  it('keeps every minute template and the save option reachable in a short viewport', async () => {
    const user = userEvent.setup();
    const templates = Array.from({ length: 12 }, (_, index) => ({
      id: `template-${index + 1}`,
      scope: 'user' as const,
      scopeId: gmUser.id,
      title: `Minute template ${index + 1}`,
      contentHtml: `<p>Preview for template ${index + 1}</p>`,
      contentText: `Preview for template ${index + 1}`,
      createdBy: gmUser.id,
      updatedBy: gmUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateType: 'minute' as const,
      actionType: 'any' as const,
    }));
    mockGetTemplatesForUser.mockImplementation(() => Promise.resolve(templates));
    mockGetDraftByCorrespondence.mockResolvedValue({
      id: 'draft-test',
      content: 'Draft minute',
      forwardTo: '',
      actionType: 'minute',
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 480 });
    setupMocks();
    renderModal();

    const minuteInput = await screen.findByRole('textbox', { name: 'Minute text' });
    await waitFor(() => expect(minuteInput).toHaveProperty('value', 'Draft minute'));
    await user.click(await screen.findByRole('button', { name: /templates/i }));

    const menu = await screen.findByRole('menu');
    expect(menu.className).toContain('max-h-[var(--radix-dropdown-menu-content-available-height)]');
    expect(menu.className).toContain('overflow-y-auto');
    const menuItems = within(menu).getAllByRole('menuitem');
    expect(menuItems).toHaveLength(templates.length + 1);
    for (const template of templates) {
      expect(within(menu).getByText(template.title)).toBeDefined();
    }
    const saveItem = within(menu).getByRole('menuitem', { name: /save this minute as a template/i });
    expect(saveItem).toBeDefined();
    await user.keyboard('{ArrowDown}'.repeat(templates.length + 1));
    expect(document.activeElement).toBe(saveItem);
    await user.keyboard('{Escape}');
  });

  it('disables sending while no destination is selected', async () => {
    setupMocks({ officeMemberships: [] });
    renderModal();

    const send = await screen.findByRole('button', { name: /send minute/i });
    expect(send.hasAttribute('disabled')).toBe(true);
    expect(await screen.findByText(/select a destination to send/i)).toBeDefined();
  });

  it('opens with no destination preselected, even when the record already sits in an office', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderModal({ currentOfficeId: 'office-fin', owningOfficeId: 'office-fin' });

    const send = await screen.findByRole('button', { name: /send minute/i });
    expect(send.hasAttribute('disabled')).toBe(true);
    // The office the record is currently in must not look like a chosen destination.
    expect(screen.queryByText(/· office inbox/i)).toBeNull();
    expect(screen.queryByText(/^1 office$/i)).toBeNull();

    await user.click(screen.getByRole('radio', { name: 'Office' }));
    expect(screen.getByRole('combobox', { name: /select office/i }).textContent).toContain('Select office');
    expect(screen.queryByText(/· office inbox/i)).toBeNull();
    expect(send.hasAttribute('disabled')).toBe(true);
  });

  it('shows the chosen card only for the active route type and humanises the office type', async () => {
    const user = userEvent.setup();
    setupMocks({
      offices: [
        {
          id: 'office-md',
          name: 'MD Office',
          isActive: true,
          officeType: 'md',
          directorateId: 'dir-1',
        },
      ],
    });
    renderModal();

    await user.click(await screen.findByRole('radio', { name: 'Office' }));
    await user.click(await screen.findByRole('combobox', { name: /select office/i }));
    await user.click(await screen.findByRole('option', { name: /md office/i }));

    expect(await screen.findByText('Managing Director · Office inbox')).toBeDefined();
    expect(screen.queryByText(/^md · office inbox$/i)).toBeNull();

    // Switching to Person drops the office card with the destination.
    await user.click(screen.getByRole('radio', { name: 'Person' }));
    await waitFor(() => expect(screen.queryByText(/· office inbox/i)).toBeNull());
    expect(screen.getByRole('button', { name: /send minute/i }).hasAttribute('disabled')).toBe(true);
  });

  it('enables sending once a destination is chosen', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderModal({ currentOfficeId: 'office-fin', owningOfficeId: 'office-fin' });

    const send = await screen.findByRole('button', { name: /send minute/i });
    expect(send.hasAttribute('disabled')).toBe(true);

    await user.click(await screen.findByRole('combobox', { name: 'Recipient' }));
    await user.click(await screen.findByRole('option', { name: /next person/i }));

    await waitFor(() => expect(send.hasAttribute('disabled')).toBe(false));
    expect(screen.queryByText(/select a destination to send/i)).toBeNull();
  });

  it('keeps the optional distribution collapsed until it is opened', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderModal({ currentOfficeId: 'office-fin', owningOfficeId: 'office-fin' });

    const toggle = await screen.findByRole('button', { name: /distribution \(cc\)/i });
    expect(screen.queryByText(/no distribution recipients added yet/i)).toBeNull();

    await user.click(toggle);
    expect(await screen.findByText(/no distribution recipients added yet/i)).toBeDefined();
  });

  it('derives the direction from the recipient instead of asking for it', async () => {
    setupMocks();
    renderModal({ currentOfficeId: 'office-fin', owningOfficeId: 'office-fin' });

    expect(await screen.findByText(/minute type/i)).toBeDefined();
    expect(screen.queryByText(/^direction/i)).toBeNull();
    expect(screen.queryByText(/downward only/i)).toBeNull();
    expect(screen.queryByText(/^upward$/i)).toBeNull();
    expect(screen.queryByText(/^lateral$/i)).toBeNull();
  });

  it('presents routing mode as a segmented choice, not a dropdown', async () => {
    setupMocks();
    renderModal({ currentOfficeId: 'office-fin', owningOfficeId: 'office-fin' });

    const group = await screen.findByRole('radiogroup', { name: /routing mode/i });
    expect(within(group).getByRole('radio', { name: /single route/i })).toBeDefined();
    expect(within(group).getByRole('radio', { name: /assign separately/i })).toBeDefined();
    expect(within(group).queryByRole('radio', { name: /single recipient/i })).toBeNull();
  });

  it('gates an approval on its single destination, not the minute routing mode', async () => {
    const user = userEvent.setup();
    setupMocks({ user: mdUser });
    renderModal({
      currentOfficeId: 'office-fin',
      owningOfficeId: 'office-fin',
      currentApproverId: mdUser.id,
    });

    await user.click(await screen.findByRole('radio', { name: /assign separately/i }));
    await user.click(screen.getByRole('radio', { name: 'Executive Approval' }));
    await user.click(screen.getByRole('combobox', { name: 'Recipient' }));
    await user.click(await screen.findByRole('option', { name: /Next Person/ }));

    expect(screen.getByRole('button', { name: 'Approve and route' }).hasAttribute('disabled')).toBe(false);
  });

  it('labels what is recorded separately from what the recipient must do', async () => {
    setupMocks();
    renderModal({ currentOfficeId: 'office-fin', owningOfficeId: 'office-fin' });

    expect(await screen.findByText(/minute type/i)).toBeDefined();
    expect(screen.queryByText(/action type/i)).toBeNull();
    expect(screen.queryByText(/recipient action/i)).toBeNull();

    const informationOnly = await screen.findByRole('checkbox', { name: /send for information only/i });
    expect(informationOnly.getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByRole('radio', { name: /for approval/i })).toBeNull();
    expect(screen.queryByText(/^for action$/i)).toBeNull();
    expect(screen.queryByText(/^for info$/i)).toBeNull();

    // Default is an actionable minute; ticking the box makes it informational.
    expect(await screen.findByText(/expected to act and respond/i)).toBeDefined();
    await userEvent.setup().click(informationOnly);
    expect(await screen.findByText(/no response is expected/i)).toBeDefined();
  });

  it('omits an empty From field instead of showing a bare separator', async () => {
    setupMocks();
    renderModal({ currentOfficeId: 'office-fin', owningOfficeId: 'office-fin' });

    expect(await screen.findByText(/ref: NPA\/TEST\/001/i)).toBeDefined();
    expect(screen.queryByText('From:')).toBeNull();
  });

  it('still names the sender when one is recorded', async () => {
    setupMocks();
    renderModal({
      currentOfficeId: 'office-fin',
      owningOfficeId: 'office-fin',
      senderName: 'External Contractor',
    });

    expect(await screen.findByText(/from: external contractor/i)).toBeDefined();
  });
});
