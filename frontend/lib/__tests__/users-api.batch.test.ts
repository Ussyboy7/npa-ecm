import { afterEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}));

import { fetchUsersByIds } from '../users-api';

afterEach(() => {
  apiFetchMock.mockReset();
});

describe('fetchUsersByIds', () => {
  it('requests the ID set from the list endpoint instead of one detail URL per user', async () => {
    apiFetchMock.mockResolvedValue({
      count: 1,
      next: null,
      results: [
        {
          id: 1,
          username: 'amina',
          first_name: 'Amina',
          last_name: 'Example',
          email: 'amina@example.com',
          is_active: true,
        },
      ],
    });

    const users = await fetchUsersByIds(['2', '1', '2']);

    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ id: '1', name: 'Amina Example' });
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/accounts/users/?ids=1%2C2&page=1&page_size=500',
    );
  });
});
