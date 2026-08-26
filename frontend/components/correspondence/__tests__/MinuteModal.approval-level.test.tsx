import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Hoisted mocks
const mockUseCurrentUser = vi.hoisted(() => vi.fn());
const mockUseOrganization = vi.hoisted(() => vi.fn());
const mockUseOrgUsers = vi.hoisted(() => vi.fn());
const mockUseUserPermissions = vi.hoisted(() => vi.fn());
const mockUseSignature = vi.hoisted(() => vi.fn());
const mockGetTemplatesForUser = vi.hoisted(() => vi.fn(() => Promise.resolve([])));
const mockFetchSLATargets = vi.hoisted(() => vi.fn(() => Promise.resolve({ urgent: 24, high: 72, medium: 120, low: 168 })));

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: mockUseCurrentUser,
}));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: mockUseOrganization,
}));
vi.mock('@/hooks/use-org-users', () => ({
  useOrgUsers: mockUseOrgUsers,
}));
vi.mock('@/hooks/use-user-permissions', () => ({
  useUserPermissions: mockUseUserPermissions,
}));
vi.mock('@/hooks/use-signature', () => ({
  useSignature: mockUseSignature,
}));
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
vi.mock('@/hooks/use-keyboard-shortcuts', () => ({
  useKeyboardShortcuts: () => {},
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
  getDraftByCorrespondence: vi.fn(() => Promise.resolve(null)),
  deleteDraft: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/correspondence-helpers', () => ({
  generateId: (p: string) => `${p}-test`,
  getNextStepNumber: () => 1,
}));
vi.mock('@/lib/seal-cache', () => ({
  ensureSealImageCached: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import { MinuteModal } from '../MinuteModal';

const baseCorrespondence = {
  id: 'corr-1',
  referenceNumber: 'NPA/TEST/001',
  subject: 'Test subject',
  source: 'internal' as const,
  receivedDate: new Date().toISOString(),
  senderName: 'Sender',
  senderOrganization: 'Org',
  status: 'in-progress' as const,
  priority: 'medium' as const,
  direction: 'downward' as const,
  divisionId: 'div-fin',
  departmentId: 'dept-fin',
  currentApproverId: 'user-gm',
  currentOfficeId: 'office-fin',
  owningOfficeId: 'office-fin',
  distribution: [] as unknown[],
  requiredApprovalLevel: 'executive' as const,
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

const gmUser = {
  id: 'user-gm',
  name: 'GM User',
  email: 'gm@npa.gov',
  employeeId: 'GM001',
  gradeLevel: 'GMCS',
  systemRole: 'General Manager',
  active: true,
  rolePermissions: { can_approve: true, can_minute_correspondence: true },
  directorate: 'dir-1',
  division: 'div-fin',
  department: 'dept-fin',
};

const clerkUser = {
  id: 'user-clerk',
  name: 'Clerk',
  email: 'clerk@npa.gov',
  employeeId: 'CLK001',
  gradeLevel: 'SSS1',
  systemRole: 'Officer',
  active: true,
  rolePermissions: { can_approve: false, can_minute_correspondence: true },
  division: 'div-fin',
  department: 'dept-fin',
};

function setupMocks(activeUser: typeof mdUser) {
  const isMD = activeUser.gradeLevel === 'MDCS';
  mockUseCurrentUser.mockReturnValue({ currentUser: activeUser, hydrated: true });
  mockUseOrganization.mockReturnValue({
    offices: [
      { id: 'office-fin', name: 'Finance Office', isActive: true, officeType: 'division', directorateId: 'dir-1', divisionId: 'div-fin' },
      { id: 'office-md', name: 'MD Office', isActive: true, officeType: 'md' },
    ],
    officeMemberships: [
      { userId: activeUser.id, officeId: 'office-fin', isPrimary: true, isActive: true },
      { userId: 'user-gm', officeId: 'office-fin', isPrimary: true, isActive: true },
      { userId: 'user-md', officeId: 'office-md', isPrimary: true, isActive: true },
    ],
    directorates: [{ id: 'dir-1', name: 'Dir', isActive: true }],
    divisions: [
      { id: 'div-fin', name: 'Finance', directorateId: 'dir-1', isActive: true },
      { id: 'div-legal', name: 'Legal', directorateId: 'dir-1', isActive: true },
    ],
    assistantAssignments: [],
    users: [activeUser as unknown],
  });
  mockUseOrgUsers.mockReturnValue({ users: [activeUser as unknown, gmUser as unknown, mdUser as unknown] });
  const canApprove = Boolean(activeUser.rolePermissions?.can_approve);
  mockUseUserPermissions.mockReturnValue({ canApprove, canDistribute: false });
  mockUseSignature.mockReturnValue({
    signature: canApprove ? { imageData: 'data:image/png;base64,xxx', fileName: 'sig.png' } : null,
    templates: [],
    preferences: {},
    isLoading: false,
  });
}

describe('MinuteModal approval-level', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GM sees Endorse on executive track', async () => {
    setupMocks(gmUser as unknown as typeof mdUser);
    const corr = { ...baseCorrespondence, requiredApprovalLevel: 'executive', currentApproverId: gmUser.id } as unknown as import('@/lib/npa-structure').Correspondence;
    render(<MinuteModal correspondence={corr as unknown as import('@/lib/npa-structure').Correspondence} isOpen onClose={vi.fn()} direction="downward" />);
    // Endorse label for GM – use more specific text that appears in the endorsement card
    expect(await screen.findByText(/Reviewed and endorsed/i)).toBeDefined();
    expect(screen.queryByText('Executive Approval')).toBeNull();
  });

  it('MD sees Executive Approval on executive track', async () => {
    setupMocks(mdUser as unknown as typeof mdUser);
    const corr = { ...baseCorrespondence, requiredApprovalLevel: 'executive', currentApproverId: mdUser.id } as unknown as import('@/lib/npa-structure').Correspondence;
    render(<MinuteModal correspondence={corr as unknown as import('@/lib/npa-structure').Correspondence} isOpen onClose={vi.fn()} direction="downward" />);
    expect(await screen.findByText('Executive Approval')).toBeDefined();
  });

  it('GM sees Departmental Approval on departmental track', async () => {
    setupMocks(gmUser as unknown as typeof mdUser);
    const corr = { ...baseCorrespondence, requiredApprovalLevel: 'departmental', currentApproverId: gmUser.id } as unknown as import('@/lib/npa-structure').Correspondence;
    render(<MinuteModal correspondence={corr as unknown as import('@/lib/npa-structure').Correspondence} isOpen onClose={vi.fn()} direction="downward" />);
    expect(await screen.findByText('Departmental Approval')).toBeDefined();
  });

  it('clerk sees no approve option', async () => {
    setupMocks(clerkUser as unknown as typeof mdUser);
    const corr = { ...baseCorrespondence, requiredApprovalLevel: 'departmental', currentApproverId: clerkUser.id } as unknown as import('@/lib/npa-structure').Correspondence;
    render(<MinuteModal correspondence={corr as unknown as import('@/lib/npa-structure').Correspondence} isOpen onClose={vi.fn()} direction="downward" />);
    // Clerk lacks can_approve, so no approval radio should be present
    // Add Minute is always present
    expect(await screen.findByText('Add Minute')).toBeDefined();
    expect(screen.queryByText('Executive Approval')).toBeNull();
    expect(screen.queryByText('Departmental Approval')).toBeNull();
    expect(screen.queryByText(/Endorse/i)).toBeNull();
  });
});
