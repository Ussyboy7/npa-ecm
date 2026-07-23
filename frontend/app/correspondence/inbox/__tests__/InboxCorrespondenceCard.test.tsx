import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InboxCorrespondenceCard } from '../components/InboxCorrespondenceCard';
import type { Correspondence, User } from '@/lib/npa-structure';
import type { UserOrgIds } from '../components/InboxCorrespondenceCard';

const mockUseOrg = vi.hoisted(() => vi.fn(() => ({
  divisions: [],
  users: [] as User[],
})));

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: mockUseOrg,
}));

const baseCorr: Correspondence = {
  id: 'corr-1',
  referenceNumber: 'NPA/HR/2025/001',
  subject: 'Test Correspondence Subject',
  source: 'internal',
  receivedDate: '2025-03-15T10:00:00Z',
  senderName: 'John Doe',
  senderOrganization: 'HR Department',
  status: 'in-progress',
  priority: 'high',
  direction: 'upward',
};

const emptyUserOrgIds: UserOrgIds = {
  officeIds: new Set(),
  divisionIds: new Set(),
  departmentIds: new Set(),
  directorateIds: new Set(),
};

describe('InboxCorrespondenceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders subject', () => {
    render(<InboxCorrespondenceCard corr={baseCorr} userOrgIds={emptyUserOrgIds} />);
    expect(screen.getByText('Test Correspondence Subject')).toBeDefined();
  });

  it('renders sender name', () => {
    render(<InboxCorrespondenceCard corr={baseCorr} userOrgIds={emptyUserOrgIds} />);
    expect(screen.getByText(/From: John Doe/)).toBeDefined();
  });

  it('renders reference number', () => {
    render(<InboxCorrespondenceCard corr={baseCorr} userOrgIds={emptyUserOrgIds} />);
    expect(screen.getByText(/Ref: NPA\/HR\/2025\/001/)).toBeDefined();
  });

  it('shows priority badge with correct variant', () => {
    render(<InboxCorrespondenceCard corr={baseCorr} userOrgIds={emptyUserOrgIds} />);
    const priority = screen.getByText('HIGH');
    expect(priority).toBeDefined();
  });

  it('shows status badge', () => {
    render(<InboxCorrespondenceCard corr={baseCorr} userOrgIds={emptyUserOrgIds} />);
    expect(screen.getByText('in progress')).toBeDefined();
  });

  it('shows direction badge', () => {
    render(<InboxCorrespondenceCard corr={baseCorr} userOrgIds={emptyUserOrgIds} />);
    expect(screen.getByText('Upward')).toBeDefined();
  });

  it('shows SLA Breach badge when item is overdue', () => {
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const oldCorr: Correspondence = {
      ...baseCorr,
      priority: 'urgent',
      receivedDate: pastDate,
    };
    render(<InboxCorrespondenceCard corr={oldCorr} userOrgIds={emptyUserOrgIds} />);
    expect(screen.getByText('SLA Breach')).toBeDefined();
  });

  it('does not show SLA Breach badge for recent items', () => {
    const recent = new Date().toISOString();
    const recentCorr: Correspondence = {
      ...baseCorr,
      priority: 'urgent',
      receivedDate: recent,
    };
    render(<InboxCorrespondenceCard corr={recentCorr} userOrgIds={emptyUserOrgIds} />);
    expect(screen.queryByText('SLA Breach')).toBeNull();
  });

  it('shows CC badge when user org is in distribution', () => {
    const corrWithCC: Correspondence = {
      ...baseCorr,
      distribution: [
        { id: 'd1', type: 'office', officeId: 'office-1', purpose: 'information' },
      ],
    };
    const orgIds: UserOrgIds = {
      ...emptyUserOrgIds,
      officeIds: new Set(['office-1']),
    };
    render(<InboxCorrespondenceCard corr={corrWithCC} userOrgIds={orgIds} />);
    expect(screen.getByText('For Info')).toBeDefined();
  });

  it('renders assigned approver when present', () => {
    mockUseOrg.mockImplementationOnce(() => ({
      divisions: [],
      users: [
        { id: 'user-1', name: 'Jane Approver', email: 'jane@npa.gov', employeeId: 'EMP001', gradeLevel: 'GM', systemRole: 'GM', active: true },
        { id: 'user-2', name: 'Other User', email: 'other@npa.gov', employeeId: 'EMP002', gradeLevel: 'AGM', systemRole: 'AGM', active: true },
      ] as User[],
    }));

    const corrWithApprover: Correspondence = {
      ...baseCorr,
      currentApproverId: 'user-1',
    };
    render(<InboxCorrespondenceCard corr={corrWithApprover} userOrgIds={emptyUserOrgIds} />);
    expect(screen.getByText(/Current: Jane Approver/)).toBeDefined();
  });

  it('renders days pending badge', () => {
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const corr: Correspondence = { ...baseCorr, receivedDate: past };
    render(<InboxCorrespondenceCard corr={corr} userOrgIds={emptyUserOrgIds} />);
    expect(screen.getByText(/3 days pending/)).toBeDefined();
  });

  it('renders fallback for missing senderName', () => {
    const corr: Correspondence = { ...baseCorr, senderName: '' };
    render(<InboxCorrespondenceCard corr={corr} userOrgIds={emptyUserOrgIds} />);
    expect(screen.getByText(/From: —/)).toBeDefined();
  });
});
