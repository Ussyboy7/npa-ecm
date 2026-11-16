import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTokens, storeTokens } from '../api-client';
import {
  getOrganizationSnapshot,
  updateOrganizationCache,
} from '../organization-cache';
import {
  invalidatePagePermissionsCache,
  loadPagePermissions,
} from '../page-permissions-cache';

const initialPages = { dashboard: { allowed: true } };
const changedPages = { dashboard: { allowed: false } };

beforeEach(() => {
  clearTokens();
  invalidatePagePermissionsCache();
});

afterEach(() => {
  clearTokens();
  invalidatePagePermissionsCache();
});

describe('page permissions cache', () => {
  it('refetches cached permissions after auth tokens change', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(initialPages)
      .mockResolvedValueOnce(changedPages);

    await expect(loadPagePermissions('user-1', fetcher)).resolves.toEqual(initialPages);
    await expect(loadPagePermissions('user-1', fetcher)).resolves.toEqual(initialPages);
    expect(fetcher).toHaveBeenCalledTimes(1);

    storeTokens('new-access-token', 'new-refresh-token');

    await expect(loadPagePermissions('user-1', fetcher)).resolves.toEqual(changedPages);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not let an in-flight response from before invalidation repopulate the cache', async () => {
    let resolveStaleRequest: ((pages: typeof initialPages) => void) | undefined;
    const staleRequest = loadPagePermissions('user-1', () => new Promise((resolve) => {
      resolveStaleRequest = resolve;
    }));

    invalidatePagePermissionsCache();

    const fetcher = vi.fn().mockResolvedValue(changedPages);
    await expect(loadPagePermissions('user-1', fetcher)).resolves.toEqual(changedPages);

    resolveStaleRequest?.(initialPages);
    await expect(staleRequest).resolves.toEqual(initialPages);

    await expect(loadPagePermissions('user-1', fetcher)).resolves.toEqual(changedPages);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('clears identity-scoped organization data when tokens are removed', () => {
    updateOrganizationCache({
      offices: [
        {
          id: 'office-a',
          name: 'Office A',
          code: 'OA',
          officeType: 'department',
          isActive: true,
          allowExternalIntake: false,
          allowLateralRouting: true,
        },
      ],
    });

    expect(getOrganizationSnapshot().offices).toHaveLength(1);

    clearTokens();

    expect(getOrganizationSnapshot().offices).toEqual([]);
  });
});
