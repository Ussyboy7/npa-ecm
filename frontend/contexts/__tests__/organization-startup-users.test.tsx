import { act, cleanup, render, waitFor } from '@testing-library/react';
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

const OFFICES_PATH = '/organization/offices/?ordering=name';

const catalogPaths = (paths: string[], path: string) =>
  paths.filter((candidate) => candidate === path);

describe('OrganizationProvider startup', () => {
  beforeEach(() => {
    mocks.fetchActiveUsers.mockClear();
    mocks.fetchAllCatalogPaginated.mockReset();
    mocks.fetchAllCatalogPaginated.mockImplementation(async () => []);
  });

  afterEach(() => {
    cleanup();
  });

  const renderProvider = () => {
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

    return () => organization;
  };

  it('loads access data at startup and leaves organization catalogs unfetched', async () => {
    const getOrganization = renderProvider();

    await waitFor(() => expect(getOrganization()?.isOrganizationReady).toBe(true));

    const requestedPaths = mocks.fetchAllCatalogPaginated.mock.calls.map(([path]) => path);
    expect(requestedPaths).toContain('/organization/roles/?ordering=name');
    expect(requestedPaths).toContain('/correspondence/delegations/?assistant=user-a&active=true');
    expect(catalogPaths(requestedPaths, OFFICES_PATH)).toHaveLength(0);
    expect(catalogPaths(requestedPaths, '/organization/directorates/?ordering=name')).toHaveLength(0);
    expect(catalogPaths(requestedPaths, '/organization/divisions/?ordering=name')).toHaveLength(0);
    expect(catalogPaths(requestedPaths, '/organization/departments/?ordering=name')).toHaveLength(0);
    expect(getOrganization()?.officeCatalogLoaded).toBe(false);
    expect(mocks.fetchActiveUsers).not.toHaveBeenCalled();
  });

  it('loads principal and full assignment scopes only when requested', async () => {
    const getOrganization = renderProvider();
    await waitFor(() => expect(getOrganization()?.isOrganizationReady).toBe(true));
    mocks.fetchAllCatalogPaginated.mockClear();

    await act(async () => {
      await getOrganization()?.ensureAssistantAssignments('principal');
    });
    await act(async () => {
      await getOrganization()?.ensureAssistantAssignments('all');
    });

    expect(mocks.fetchAllCatalogPaginated.mock.calls.map(([path]) => path)).toEqual([
      '/correspondence/delegations/?principal=user-a',
      '/correspondence/delegations/',
    ]);
  });

  it('fetches only the requested catalog, once per user', async () => {
    const getOrganization = renderProvider();
    await waitFor(() => expect(getOrganization()?.isOrganizationReady).toBe(true));
    mocks.fetchAllCatalogPaginated.mockClear();

    mocks.fetchAllCatalogPaginated.mockImplementation(async (path) => {
      if (path === OFFICES_PATH) {
        return [{ id: 'office-1', name: 'Active Office', is_active: true }];
      }
      return [];
    });

    await act(async () => {
      await getOrganization()?.ensureCatalogs('offices');
    });
    await waitFor(() => expect(getOrganization()?.officeCatalogLoaded).toBe(true));

    expect(getOrganization()?.offices).toEqual([
      expect.objectContaining({ id: 'office-1', name: 'Active Office', isActive: true }),
    ]);
    expect(catalogPaths(mocks.fetchAllCatalogPaginated.mock.calls.map(([path]) => path), OFFICES_PATH))
      .toHaveLength(1);
    expect(mocks.fetchAllCatalogPaginated.mock.calls.map(([path]) => path)).not.toContain(
      '/organization/directorates/?ordering=name',
    );

    await act(async () => {
      await getOrganization()?.ensureCatalogs('offices');
    });
    expect(catalogPaths(mocks.fetchAllCatalogPaginated.mock.calls.map(([path]) => path), OFFICES_PATH))
      .toHaveLength(1);
  });

  it('marks the office catalog settled when the office request fails', async () => {
    mocks.fetchAllCatalogPaginated.mockImplementation(async (path) => {
      if (path === OFFICES_PATH) throw new Error('Offices unavailable');
      return [];
    });

    const getOrganization = renderProvider();
    await waitFor(() => expect(getOrganization()?.isOrganizationReady).toBe(true));

    await act(async () => {
      await getOrganization()?.ensureCatalogs('offices');
    });

    await waitFor(() => expect(getOrganization()?.officeCatalogLoaded).toBe(true));
    expect(getOrganization()?.offices).toEqual([]);
  });
});
