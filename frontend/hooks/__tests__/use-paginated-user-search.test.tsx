import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchUsersMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin-api', () => ({
  fetchUsers: fetchUsersMock,
}));

import { usePaginatedUserSearch } from '../use-paginated-user-search';

const apiUser = (id: string, firstName: string) => ({
  id,
  username: id,
  email: `${id}@example.com`,
  first_name: firstName,
  last_name: 'Example',
  middle_name: '',
  employee_id: id,
  personnel_number: '',
  honorific: '',
  designation: '',
  grade_level: 'MSS5',
  system_role: null,
  system_role_name: 'Manager',
  directorate: null,
  division: null,
  department: null,
  is_active: true,
});

const page = (results: ReturnType<typeof apiUser>[], count: number) => ({
  count,
  next: null,
  previous: null,
  results,
});

beforeEach(() => {
  fetchUsersMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('usePaginatedUserSearch', () => {
  it('loads pages and searches on the server without fetching the whole directory', async () => {
    fetchUsersMock.mockImplementation(
      async ({ page: pageNumber, search }: { page: number; search?: string }) => {
        if (search === 'amina') return page([apiUser('user-3', 'Amina')], 1);
        return pageNumber === 1
          ? page([apiUser('user-1', 'A')], 2)
          : page([apiUser('user-2', 'B')], 2);
      },
    );

    const { result } = renderHook(() =>
      usePaginatedUserSearch({ pageSize: 1 }),
    );

    await waitFor(() => expect(result.current.users).toHaveLength(1));
    expect(fetchUsersMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, page_size: 1, is_active: true, search: undefined }),
    );
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.users).toHaveLength(2));
    expect(fetchUsersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, page_size: 1 }),
    );

    act(() => result.current.setQuery('amina'));
    await waitFor(
      () =>
        expect(fetchUsersMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ page: 1, search: 'amina' }),
        ),
      { timeout: 2000 },
    );
    await waitFor(() => expect(result.current.users).toHaveLength(1));
    expect(result.current.users[0]?.name).toContain('Amina');
  });
});
