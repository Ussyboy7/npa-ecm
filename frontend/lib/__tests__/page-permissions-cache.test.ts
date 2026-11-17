import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTokens, login } from '../api-client';
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
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
  clearTokens();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  clearTokens();
});

describe('page permissions cache', () => {
  it('invalidates cached permissions after login', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(initialPages)
      .mockResolvedValueOnce(changedPages);

    await expect(loadPagePermissions('user-1', fetcher)).resolves.toEqual(initialPages);
    await expect(loadPagePermissions('user-1', fetcher)).resolves.toEqual(initialPages);
    expect(fetcher).toHaveBeenCalledTimes(1);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ detail: 'Signed in.' }),
    }));
    await login('user', 'password');

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
