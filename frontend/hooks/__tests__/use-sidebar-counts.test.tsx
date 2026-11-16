import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  apiFetch,
}));

import {
  bumpSidebarCounts,
  invalidateSidebarCounts,
  useSidebarCounts,
} from '../use-sidebar-counts';

beforeEach(() => {
  apiFetch.mockReset();
  invalidateSidebarCounts();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});

describe('useSidebarCounts', () => {
  it('normalizes partial and non-numeric API values before exposing them', async () => {
    apiFetch.mockResolvedValue({
      officeInbox: '3',
      myInbox: 2,
      delegated: null,
    });

    const { result } = renderHook(() => useSidebarCounts());

    await waitFor(() => {
      expect(result.current).toEqual({
        officeInbox: 3,
        myInbox: 2,
        delegated: 0,
        pendingApprovals: 0,
        pendingSignatures: 0,
      });
    });
  });

  it('shares one in-flight request across simultaneous consumers', async () => {
    let resolveRequest: (value: Record<string, number>) => void = () => {};
    apiFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { result } = renderHook(() => ({
      sidebar: useSidebarCounts(),
      badge: useSidebarCounts(),
    }));

    expect(apiFetch).toHaveBeenCalledTimes(1);

    resolveRequest({ myInbox: 4 });

    await waitFor(() => {
      expect(result.current.sidebar.myInbox).toBe(4);
      expect(result.current.badge.myInbox).toBe(4);
    });
  });

  it('forces a server refresh after a sidebar count bump', async () => {
    apiFetch.mockResolvedValue({ myInbox: 1 });

    const { result } = renderHook(() => useSidebarCounts());
    await waitFor(() => expect(result.current.myInbox).toBe(1));

    apiFetch.mockResolvedValue({ myInbox: 2 });
    bumpSidebarCounts();

    await waitFor(() => expect(result.current.myInbox).toBe(2));

    expect(apiFetch).toHaveBeenLastCalledWith(
      '/correspondence/items/sidebar-counts/?refresh=1',
      expect.any(Object),
    );
  });
});
