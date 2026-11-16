import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/npa-structure';

const state = vi.hoisted(() => ({
  currentUser: { id: 'user-a' } as { id: string } | null,
  listeners: new Set<() => void>(),
}));

const fetchActiveUsersMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-current-user', () => ({
  subscribeToStore: (listener: () => void) => {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  },
  getCurrentUserSnapshot: () => state.currentUser,
}));

vi.mock('@/lib/api-client', () => ({
  hasTokens: () => true,
}));

vi.mock('@/lib/users-api', () => ({
  fetchActiveUsers: fetchActiveUsersMock,
}));

import { clearIdentityCaches } from '@/lib/identity-cache';
import {
  getOrganizationSnapshot,
  updateOrganizationCache,
} from '@/lib/organization-cache';
import { clearOrgUsersCache, fetchAllUsers, useOrgUsers } from '../use-org-users';

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

const switchTo = (currentUser: { id: string } | null) => {
  state.currentUser = currentUser;
  state.listeners.forEach((listener) => listener());
};

beforeEach(() => {
  clearIdentityCaches();
  clearOrgUsersCache();
  fetchActiveUsersMock.mockReset();
  state.currentUser = { id: 'user-a' };
  state.listeners.clear();
});

afterEach(() => {
  cleanup();
  clearIdentityCaches();
  clearOrgUsersCache();
});

describe('useOrgUsers identity cache', () => {
  it('drops the previous user directory when the active user changes', async () => {
    fetchActiveUsersMock
      .mockResolvedValueOnce([userA])
      .mockResolvedValueOnce([userB]);

    const { result } = renderHook(() => useOrgUsers());

    await waitFor(() => expect(result.current.users).toEqual([userA]));

    act(() => switchTo({ id: 'user-b' }));

    await waitFor(() => expect(result.current.users).toEqual([userB]));
    expect(result.current.users.some((user) => user.id === userA.id)).toBe(false);
    expect(fetchActiveUsersMock).toHaveBeenCalledTimes(2);
  });

  it('clears cached offices and users on an identity cache reset', () => {
    updateOrganizationCache({
      offices: [
        {
          id: 'office-a',
          name: 'Office A',
          code: 'OA',
          directorateId: 'directorate-a',
          divisionId: 'division-a',
          departmentId: 'department-a',
          officeType: 'department',
          isActive: true,
          allowExternalIntake: false,
          allowLateralRouting: true,
        },
      ],
      users: [userA],
    });

    expect(getOrganizationSnapshot().offices).toHaveLength(1);
    expect(getOrganizationSnapshot().users).toHaveLength(1);

    clearIdentityCaches();

    expect(getOrganizationSnapshot().offices).toEqual([]);
    expect(getOrganizationSnapshot().users).toEqual([]);
  });

  it('does not let an in-flight directory repopulate the cache after a reset', async () => {
    let resolveOldRequest: ((users: User[]) => void) | undefined;
    fetchActiveUsersMock
      .mockImplementationOnce(() => new Promise<User[]>((resolve) => {
        resolveOldRequest = resolve;
      }))
      .mockResolvedValue([userB]);

    const oldRequest = fetchAllUsers('user-a');
    clearOrgUsersCache();
    await expect(fetchAllUsers('user-b')).resolves.toEqual([userB]);

    resolveOldRequest?.([userA]);
    await oldRequest;

    // The stale A result must not be cached, so asking for A fetches again.
    await expect(fetchAllUsers('user-a')).resolves.toEqual([userB]);
    expect(fetchActiveUsersMock).toHaveBeenCalledTimes(3);
  });
});