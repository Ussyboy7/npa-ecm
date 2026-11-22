import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrganizationContextType } from '@/lib/organization-types';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 'user-a' },
  fetchActiveUsers: vi.fn(async () => []),
  fetchAllCatalogPaginated: vi.fn(async (_path: string) => [] as Record<string, unknown>[]),
}));

vi.mock('@/hooks/use-current-user', () => ({
  subscribeToStore: () => () => {},
  getCurrentUserSnapshot: () => mocks.currentUser,
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
  hasTokens: () => true,
}));

vi.mock('@/lib/pagination-utils', () => ({
  fetchAllCatalogPaginated: mocks.fetchAllCatalogPaginated,
}));

vi.mock('@/lib/users-api', () => ({
  fetchActiveUsers: mocks.fetchActiveUsers,
}));

vi.mock('@/lib/office-memberships-client', () => ({
  listOfficeMemberships: vi.fn(async () => ({ count: 0, results: [] })),
  listOfficeMembershipsForUser: vi.fn(async () => []),
}));

import { OrganizationProvider, useOrganization } from '../OrganizationContext';

describe('OrganizationProvider startup', () => {
  beforeEach(() => {
    mocks.fetchActiveUsers.mockClear();
    mocks.fetchAllCatalogPaginated.mockReset();
    mocks.fetchAllCatalogPaginated.mockImplementation(async () => []);
  });

  afterEach(() => {
    cleanup();
  });

  it.each(['slow', 'failed'] as const)(
    'publishes offices before an unrelated catalog is %s',
    async (unrelatedCatalogState) => {
      const slowCatalog = new Promise<Record<string, unknown>[]>(() => {});
      let resolveOffices!: (rows: Record<string, unknown>[]) => void;
      const officesRequest = new Promise<Record<string, unknown>[]>((resolve) => {
        resolveOffices = resolve;
      });
      mocks.fetchAllCatalogPaginated.mockImplementation(async (path) => {
        if (path === '/organization/directorates/?ordering=name') {
          if (unrelatedCatalogState === 'failed') throw new Error('Directorates unavailable');
          return slowCatalog;
        }
        if (path === '/organization/offices/?ordering=name') return officesRequest;
        return [];
      });

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

      if (unrelatedCatalogState === 'failed') {
        await waitFor(() => expect(organization?.isOrganizationReady).toBe(true));
        expect(organization?.offices).toEqual([]);
        expect(organization?.officeCatalogLoaded).toBe(false);
      }

      resolveOffices([{ id: 'office-1', name: 'Active Office', is_active: true }]);
      await waitFor(() => expect(organization?.offices).toEqual([
        expect.objectContaining({ id: 'office-1', name: 'Active Office', isActive: true }),
      ]));
      expect(organization?.officeCatalogLoaded).toBe(true);
      if (unrelatedCatalogState === 'slow') {
        expect(organization?.isOrganizationReady).toBe(false);
      }
    },
  );

  it('marks the office catalog settled when the office request fails', async () => {
    mocks.fetchAllCatalogPaginated.mockImplementation(async (path) => {
      if (path === '/organization/offices/?ordering=name') throw new Error('Offices unavailable');
      return [];
    });

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

    await waitFor(() => expect(organization?.officeCatalogLoaded).toBe(true));
    expect(organization?.offices).toEqual([]);
  });

  it('loads organization data without fetching every active user', async () => {
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

    await waitFor(() => expect(organization?.isOrganizationReady).toBe(true));

    expect(mocks.fetchAllCatalogPaginated).toHaveBeenCalled();
    expect(mocks.fetchActiveUsers).not.toHaveBeenCalled();
  });
});
