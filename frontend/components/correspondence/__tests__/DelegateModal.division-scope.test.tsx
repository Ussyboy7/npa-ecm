import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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

const agm = {
  id: 'exec-agm',
  name: 'Ada Department',
  email: 'agm@example.com',
  employeeId: 'AGM-1',
  gradeLevel: 'MSS2',
  systemRole: 'Assistant General Manager',
  directorate: 'dir-1',
  division: 'div-1',
  department: 'dept-1',
  active: true,
};

const staffSameDivisionOtherDepartment = {
  id: 'staff-division-other-dept',
  name: 'Ife Other Dept',
  email: 'ife@example.com',
  employeeId: 'ST-3',
  gradeLevel: 'MSS4',
  systemRole: 'Officer',
  directorate: 'dir-1',
  division: 'div-1',
  department: 'dept-3',
  active: true,
};

let activeUsers = users;
let activeAssignments: Array<Record<string, unknown>> = [];

vi.mock('@/hooks/use-org-users', () => ({
  useOrgUsers: () => ({ users: activeUsers }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    assistantAssignments: activeAssignments,
    ensureAssistantAssignments: vi.fn(async () => {}),
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
  activeUsers = users;
  activeAssignments = [];
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

  it('keeps an Assistant General Manager in their department when their grade is unknown', async () => {
    activeUsers = [agm, users[1], staffSameDivisionOtherDepartment, users[2]];
    const user = userEvent.setup();
    render(
      <DelegateModal
        open
        onOpenChange={vi.fn()}
        correspondenceId="corr-1"
        executiveId="exec-agm"
        onDelegate={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole('button', { name: /Assign TA\/PA Now/i }));

    // "Assistant General Manager" contains "general manager"; the fallback must
    // not widen the scope to the division.
    expect(
      await screen.findByText(/Staff in your department \(1 available\)/),
    ).toBeDefined();

    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: /Sam Division/ })).toBeDefined();
    expect(screen.queryByRole('option', { name: /Ife Other Dept/ })).toBeNull();
  });

  it('confirms in an alert dialog and submits the delegation once', async () => {
    activeAssignments = [
      {
        id: 'assign-1',
        executiveId: 'exec-gm',
        assistantId: 'staff-same-division',
        type: 'PA',
        permissions: ['view', 'forward'],
      },
    ];
    const onDelegate = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <DelegateModal
        open
        onOpenChange={vi.fn()}
        correspondenceId="corr-1"
        executiveId="exec-gm"
        onDelegate={onDelegate}
      />,
    );

    await user.click(await screen.findByRole('combobox', { name: /Select assistant/i }));
    await user.click(await screen.findByRole('option', { name: /Sam Division/ }));
    await user.click(screen.getByRole('button', { name: /Delegate to assistant/i }));

    const alert = await screen.findByRole('alertdialog');
    expect(within(alert).getByText(/Delegate to Sam Division\?/)).toBeDefined();

    await user.click(within(alert).getByRole('button', { name: /Confirm delegation/i }));

    await waitFor(() => expect(onDelegate).toHaveBeenCalledTimes(1));
    expect(onDelegate.mock.calls[0][0]).toBe('staff-same-division');
    expect(onDelegate.mock.calls[0][1]).toBe('PA');
  });
});
