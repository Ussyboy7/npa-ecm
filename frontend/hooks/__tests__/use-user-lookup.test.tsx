import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/npa-structure';

const fetchUsersByIdsMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/users-api', () => ({
  fetchUsersByIds: fetchUsersByIdsMock,
}));

import { useUserLookup } from '../use-user-lookup';

const userA: User = {
  id: 'user-a',
  name: 'User A',
  email: 'a@example.com',
  employeeId: 'A-1',
  gradeLevel: 'MSS5',
  systemRole: 'Manager',
  active: true,
};

const userB: User = {
  id: 'user-b',
  name: 'User B',
  email: 'b@example.com',
  employeeId: 'B-1',
  gradeLevel: 'MSS5',
  systemRole: 'Manager',
  active: true,
};

afterEach(() => {
  cleanup();
  fetchUsersByIdsMock.mockReset();
});

describe('useUserLookup', () => {
  it('resolves many IDs in one batched request', async () => {
    fetchUsersByIdsMock.mockResolvedValue([userA, userB]);

    const { result } = renderHook(() =>
      useUserLookup(['user-b', 'user-a', 'user-a']),
    );

    await waitFor(() => expect(result.current.size).toBe(2));

    expect(result.current.get('user-a')).toEqual(userA);
    expect(fetchUsersByIdsMock).toHaveBeenCalledTimes(1);
    expect(fetchUsersByIdsMock).toHaveBeenCalledWith(['user-a', 'user-b']);
  });
});
