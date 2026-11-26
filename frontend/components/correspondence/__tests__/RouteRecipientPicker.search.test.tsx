import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchUsersMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin-api', () => ({
  fetchUsers: fetchUsersMock,
}));

import { RouteRecipientPicker } from '../RouteRecipientPicker';

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
  division: null,
  department: null,
  is_active: true,
});

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
      count: 2,
      next: null,
      previous: null,
      results: [apiUser('user-1', 'Amina'), apiUser('user-2', 'Bala')],
    };
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RouteRecipientPicker person search', () => {
  it('uses paginated server search and adds the selected person', async () => {
    const user = userEvent.setup();
    const onUserIdsChange = vi.fn();
    render(
      <RouteRecipientPicker
        userIds={[]}
        officeIds={[]}
        onUserIdsChange={onUserIdsChange}
        onOfficeIdsChange={vi.fn()}
        users={[]}
        offices={[]}
        directorates={[]}
        divisions={[]}
        defaultPurpose="action"
      />,
    );

    expect(fetchUsersMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('radio', { name: 'Person' }));

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

    await user.click(screen.getAllByRole('combobox')[0]);
    expect(await screen.findByRole('option', { name: /Amina Example/ })).toBeDefined();

    await user.type(screen.getByPlaceholderText('Search by name, role...'), 'bala');
    await waitFor(() =>
      expect(fetchUsersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'bala' }),
      ),
    );

    await user.click(await screen.findByRole('option', { name: /Bala Example/ }));
    expect(onUserIdsChange).toHaveBeenCalledWith(['user-2']);
  });
});
