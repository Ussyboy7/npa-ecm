import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CaseScope } from '../use-scope-checks';

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  AUTH_BROADCAST_CHANNEL: 'auth',
  AUTH_CHANGED_EVENT: 'auth-changed',
  apiFetch: apiFetchMock,
  clearTokens: vi.fn(),
  ensureAuthSession: vi.fn(async () => true),
  hasTokens: () => true,
  isImpersonatingUser: () => false,
}));

import { useCurrentUser } from '../use-current-user';
import { useRoleChecks } from '../use-role-checks';
import { useScopeChecks } from '../use-scope-checks';

const executiveDirector = {
  id: 'user-ed',
  username: 'ed',
  email: 'ed@example.com',
  first_name: 'Ella',
  middle_name: '',
  last_name: 'Director',
  employee_id: 'NPA-002',
  personnel_number: '',
  honorific: 'Mrs.',
  designation: 'Executive Director',
  grade_level: 'EDCS',
  system_role_name: 'Executive Director',
  permissions: {},
  directorate: 'dir-1',
  division: 'div-1',
  department: 'dept-1',
  is_active: true,
  is_superuser: false,
};

const servedGrades = {
  grades: [
    {
      code: 'MDCS',
      rank: 0,
      management: true,
      senior_management: true,
      executive: true,
      leadership: true,
      directorate_leadership: true,
      division_leadership: false,
      department_leadership: false,
    },
    {
      code: 'EDCS',
      rank: 1,
      management: true,
      senior_management: true,
      executive: true,
      leadership: true,
      directorate_leadership: true,
      division_leadership: false,
      department_leadership: false,
    },
    {
      code: 'GMCS',
      rank: 2,
      management: true,
      senior_management: false,
      executive: false,
      leadership: true,
      directorate_leadership: false,
      division_leadership: true,
      department_leadership: false,
    },
    {
      code: 'AGMCS',
      rank: 3,
      management: true,
      senior_management: false,
      executive: false,
      leadership: true,
      directorate_leadership: false,
      division_leadership: false,
      department_leadership: true,
    },
    {
      code: 'MSS1',
      rank: 4,
      management: true,
      senior_management: true,
      executive: true,
      leadership: true,
      directorate_leadership: false,
      division_leadership: true,
      department_leadership: false,
    },
    {
      code: 'MSS3',
      rank: 6,
      management: true,
      senior_management: true,
      executive: false,
      leadership: false,
      directorate_leadership: false,
      division_leadership: false,
      department_leadership: false,
    },
    {
      code: 'MSS4',
      rank: 7,
      management: true,
      senior_management: false,
      executive: false,
      leadership: false,
      directorate_leadership: false,
      division_leadership: false,
      department_leadership: false,
    },
  ],
};

type Snapshot = { isED: boolean; caseScope: CaseScope };
const firstAuthenticatedRenders: Snapshot[] = [];

const gradeRequests = () =>
  apiFetchMock.mock.calls.filter(([path]) => path === '/organization/grades/');

function RoleGatedScreen() {
  const { currentUser } = useCurrentUser();
  const { isED } = useRoleChecks();
  const { caseScope } = useScopeChecks();
  firstAuthenticatedRenders.push({ isED, caseScope });
  return <div data-testid="scope">{`${currentUser?.gradeLevel}:${caseScope}`}</div>;
}

function Shell() {
  const { currentUser, hydrated } = useCurrentUser();
  // The authenticated shell mounts role-gated screens only after the user
  // hydrate, which is the moment the grade flags must already be correct.
  if (!hydrated || !currentUser) return null;
  return <RoleGatedScreen />;
}

beforeEach(() => {
  firstAuthenticatedRenders.length = 0;
  apiFetchMock.mockReset();
  apiFetchMock.mockImplementation((path: string) => {
    if (path === '/accounts/auth/me/') return Promise.resolve(executiveDirector);
    if (path === '/organization/grades/') return Promise.resolve(servedGrades);
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
});

afterEach(() => {
  cleanup();
});

describe('grade catalogue bootstrap', () => {
  it('has the served catalogue before it publishes the signed-in user', async () => {
    render(<Shell />);

    await waitFor(() =>
      expect(screen.getByTestId('scope').textContent).toBe('EDCS:directorate'),
    );

    expect(firstAuthenticatedRenders.length).toBeGreaterThan(0);
    expect(
      firstAuthenticatedRenders.filter((render) => !render.isED),
    ).toEqual([]);
    expect(
      firstAuthenticatedRenders.filter((render) => render.caseScope !== 'directorate'),
    ).toEqual([]);
    expect(gradeRequests()).toHaveLength(1);
  });
});
