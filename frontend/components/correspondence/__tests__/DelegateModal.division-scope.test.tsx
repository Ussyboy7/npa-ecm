import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const users = [
  {
    id: 'exec-gm',
    name: 'Grace Manager',
    email: 'gm@example.com',
    employeeId: 'GM-1',
    gradeLevel: 'MSS1',
    systemRole: 'General Manager',
    directorate: 'dir-1',
    division: 'div-1',
    department: 'dept-1',
    active: true,
  },
  {
    id: 'staff-same-division',
    name: 'Sam Division',
    email: 'sam@example.com',
    employeeId: 'ST-1',
    gradeLevel: 'MSS4',
    systemRole: 'Officer',
    directorate: 'dir-1',
    division: 'div-1',
    department: 'dept-1',
    active: true,
  },
  {
    id: 'staff-other-division',
    name: 'Ola Elsewhere',
    email: 'ola@example.com',
    employeeId: 'ST-2',
    gradeLevel: 'MSS4',
    systemRole: 'Officer',
    directorate: 'dir-1',
    division: 'div-2',
    department: 'dept-2',
    active: true,
  },
];

vi.mock('@/hooks/use-org-users', () => ({
  useOrgUsers: () => ({ users }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    assistantAssignments: [],
    addAssignment: vi.fn(),
    divisions: [
      { id: 'div-1', name: 'Operations', directorateId: 'dir-1', isActive: true },
      { id: 'div-2', name: 'Finance', directorateId: 'dir-1', isActive: true },
    ],
    departments: [
      { id: 'dept-1', name: 'Operations Dept', divisionId: 'div-1', isActive: true },
      { id: 'dept-2', name: 'Finance Dept', divisionId: 'div-2', isActive: true },
    ],
    refreshOrganizationData: vi.fn(),
    isSyncing: false,
  }),
}));

vi.mock('@/hooks/use-grade-catalog', () => ({
  useGradeCatalog: () => ({
    grades: [],
    byCode: {
      MSS1: {
        code: 'MSS1',
        rank: 2,
        management: true,
        seniorManagement: true,
        executive: false,
        leadership: true,
        directorateLeadership: false,
        divisionLeadership: true,
        departmentLeadership: false,
      },
    },
  }),
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(() => Promise.resolve({})),
  hasTokens: () => true,
}));

import { DelegateModal } from '../DelegateModal';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  Element.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DelegateModal hierarchy', () => {
  it('offers a General Manager staff from its whole division, not another division', async () => {
    const user = userEvent.setup();
    render(
      <DelegateModal
        open
        onOpenChange={vi.fn()}
        correspondenceId="corr-1"
        executiveId="exec-gm"
        onDelegate={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole('button', { name: /Assign TA\/PA Now/i }));

    expect(
      await screen.findByText(/Staff in your division \(1 available\)/),
    ).toBeDefined();

    await user.click(screen.getByRole('combobox'));
    expect(
      await screen.findByRole('option', { name: /Sam Division/ }),
    ).toBeDefined();
    expect(screen.queryByRole('option', { name: /Ola Elsewhere/ })).toBeNull();
  });
});
