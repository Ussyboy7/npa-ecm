import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DistributionRecipient } from '@/lib/npa-structure';

const fetchUsersMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin-api', () => ({
  fetchUsers: fetchUsersMock,
}));

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({
    currentUser: { id: 'current-user', gradeLevel: 'MSS3' },
  }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    offices: [],
    divisions: [{ id: 'division-1', name: 'Operations', isActive: true }],
    departments: [],
    directorates: [],
  }),
}));

import { DistributionSelector } from '../DistributionSelector';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const apiUser = (id: string, firstName: string) => ({
  id,
  username: id,
  email: `${id}@example.com`,
  first_name: firstName,
  middle_name: '',
  last_name: 'Example',
  employee_id: id,
  personnel_number: '',
  honorific: '',
  designation: '',
  grade_level: 'MSS4',
  system_role: null,
  system_role_name: 'Manager',
  directorate: null,
  division: 'division-1',
  department: null,
  is_active: true,
});

const selectedRecipient = {
  id: 'user-1',
  type: 'user',
  userId: 'user-1',
  name: 'Amina Example',
  purpose: 'information',
} as DistributionRecipient;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  Element.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  fetchUsersMock.mockReset();
  fetchUsersMock.mockImplementation(async ({ search }: { search?: string }) => {
    if (search === 'bala') {
      return { count: 1, next: null, previous: null, results: [apiUser('user-2', 'Bala')] };
    }
    return {
      count: 10,
      next: null,
      previous: null,
      results: [
        apiUser('current-user', 'Current'),
        apiUser('user-1', 'Amina'),
        apiUser('user-2', 'Bala'),
        apiUser('user-3', 'Chidi'),
      ],
    };
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DistributionSelector person picker', () => {
  it('searches on the server and preserves selected recipients', async () => {
    const user = userEvent.setup();
    const onDistributionChange = vi.fn();
    render(
      <DistributionSelector
        selectedDistribution={[selectedRecipient]}
        onDistributionChange={onDistributionChange}
      />,
    );

    const routeType = screen.getAllByRole('combobox')[0];
    await user.click(routeType);
    await user.click(await screen.findByRole('option', { name: 'Person' }));

    await waitFor(() =>
      expect(fetchUsersMock).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          page_size: 50,
          is_active: true,
          search: undefined,
        }),
      ),
    );

    await user.click(screen.getAllByRole('combobox')[1]);
    expect(screen.queryByRole('option', { name: /Current Example/ })).toBeNull();
    expect(screen.queryByRole('option', { name: /Amina Example/ })).toBeNull();
    expect(await screen.findByRole('option', { name: /Bala Example/ })).toBeDefined();

    await user.type(screen.getByPlaceholderText('Search by name, role...'), 'bala');
    await waitFor(() =>
      expect(fetchUsersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'bala' }),
      ),
    );

    await user.click(await screen.findByRole('option', { name: /Bala Example/ }));

    expect(onDistributionChange).toHaveBeenCalledWith([
      selectedRecipient,
      {
        id: 'user-2',
        type: 'user',
        userId: 'user-2',
        name: 'Bala Example',
        purpose: 'information',
      },
    ]);
  });
});
