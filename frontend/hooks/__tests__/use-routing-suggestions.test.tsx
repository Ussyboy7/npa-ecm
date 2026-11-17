import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/npa-structure';

const fetchSuggestionsMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/routing-suggestions', () => ({
  fetchRoutingSuggestions: fetchSuggestionsMock,
}));

import { useRoutingSuggestions } from '../use-routing-suggestions';

const suggestion: User = {
  id: 'user-next',
  name: 'Next Approver',
  email: 'next@example.com',
  employeeId: 'N-1',
  gradeLevel: 'MSS2',
  systemRole: 'Assistant General Manager',
  active: true,
};

afterEach(() => {
  cleanup();
  fetchSuggestionsMock.mockReset();
});

describe('useRoutingSuggestions', () => {
  it('loads the server hierarchy suggestions when the modal is open', async () => {
    fetchSuggestionsMock.mockResolvedValue([suggestion]);

    const { result } = renderHook(() =>
      useRoutingSuggestions({
        enabled: true,
        correspondenceId: 'corr-1',
        direction: 'upward',
      }),
    );

    await waitFor(() => expect(result.current).toEqual([suggestion]));

    expect(fetchSuggestionsMock).toHaveBeenCalledWith(
      'corr-1',
      'upward',
      expect.any(AbortSignal),
    );
  });
});
