import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchUsersMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin-api', () => ({
  fetchUsers: fetchUsersMock,
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    divisions: [],
    departments: [],
  }),
}));

vi.mock('@/hooks/use-user-lookup', () => ({
  useUserLookup: (ids: string[]) => {
    const users = new Map<string, { id: string; name: string }>();
    if (ids.includes('user-1')) {
      users.set('user-1', { id: 'user-1', name: 'Amina Yusuf' });
    }
    return users;
  },
}));

vi.mock('@/lib/api/search', () => ({
  search: vi.fn(),
  getSearchSuggestions: vi.fn().mockResolvedValue([]),
  createSavedSearch: vi.fn(),
  getSavedSearches: vi.fn().mockResolvedValue([]),
  getSearchHistory: vi.fn().mockResolvedValue([]),
}));

import { AdvancedSearch } from '../AdvancedSearch';

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
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  fetchUsersMock.mockReset();
  fetchUsersMock.mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    results: [apiUser('user-2', 'Bala')],
  });
  window.history.replaceState({}, '', '/search?filters%5Bauthor_id%5D=user-1');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
});

describe('AdvancedSearch author filter', () => {
  it('keeps the URL-selected author while searching the paginated user list', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch context="all" />);

    const trigger = await screen.findByRole('combobox', { name: 'Filter by author' });
    expect(fetchUsersMock).not.toHaveBeenCalled();
    await user.click(trigger);

    expect(await screen.findByRole('option', { name: /Amina Yusuf/ })).toBeDefined();
    const search = screen.getByPlaceholderText('Search authors...');
    await user.type(search, 'bala');

    await waitFor(() =>
      expect(fetchUsersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'bala', is_active: true }),
      ),
    );
    expect(screen.getByRole('option', { name: /Amina Yusuf/ })).toBeDefined();
  });
});
