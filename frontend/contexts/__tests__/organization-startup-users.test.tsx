import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrganizationContextType } from '@/lib/organization-types';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 'user-a' },
  fetchActiveUsers: vi.fn(async () => []),
  fetchAllCatalogPaginated: vi.fn(async () => []),
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
    mocks.fetchAllCatalogPaginated.mockClear();
  });

  afterEach(() => {
    cleanup();
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
