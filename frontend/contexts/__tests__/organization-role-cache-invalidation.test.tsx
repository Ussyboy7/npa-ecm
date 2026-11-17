import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OrganizationContextType } from '@/lib/organization-types';

const apiFetchMock = vi.hoisted(() => vi.fn(async () => ({
  id: 'role-1',
  name: 'Records Officer',
  description: '',
  is_active: true,
  permissions: { can_access_analytics: false },
  user_count: 1,
})));

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
  hasTokens: () => false,
}));

vi.mock('@/hooks/use-current-user', () => ({
  subscribeToStore: () => () => {},
  getCurrentUserSnapshot: () => null,
}));

import {
  invalidatePagePermissionsCache,
  loadPagePermissions,
} from '@/lib/page-permissions-cache';
import { OrganizationProvider, useOrganization } from '../OrganizationContext';

describe('OrganizationContext role permissions', () => {
  afterEach(() => {
    cleanup();
    invalidatePagePermissionsCache();
    apiFetchMock.mockClear();
  });

  it('invalidates cached page access when a role permission changes', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ analytics: { allowed: true } })
      .mockResolvedValueOnce({ analytics: { allowed: false } });

    await expect(loadPagePermissions('user-1', fetcher)).resolves.toEqual({
      analytics: { allowed: true },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    let organization: OrganizationContextType | undefined;
    const Harness = () => {
      organization = useOrganization();
      return null;
    };

    render(
      <OrganizationProvider>
        <Harness />
      </OrganizationProvider>,
    );

    await act(async () => {
      await organization?.updateRole('role-1', {
        permissions: { can_access_analytics: false },
      });
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/organization/roles/role-1/', expect.objectContaining({
      method: 'PATCH',
    }));

    await expect(loadPagePermissions('user-1', fetcher)).resolves.toEqual({
      analytics: { allowed: false },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
