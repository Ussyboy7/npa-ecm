import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DistributionRecipient } from '@/lib/npa-structure';

const fixture = vi.hoisted(() => ({ grade: 'MSS4' }));

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({
    currentUser: { id: 'current-user', gradeLevel: fixture.grade },
  }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    offices: [],
    divisions: [],
    departments: [],
    directorates: [],
  }),
}));

vi.mock('@/hooks/use-paginated-user-search', () => ({
  usePaginatedUserSearch: () => ({
    query: '',
    setQuery: vi.fn(),
    users: [],
    userById: new Map(),
    totalCount: 0,
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: false,
    loadMore: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-grade-catalog', () => ({
  useGradeCatalog: () => ({
    grades: [],
    byCode: {
      MSS3: {
        code: 'MSS3',
        rank: 2,
        management: true,
        seniorManagement: true,
        executive: false,
        leadership: false,
        directorateLeadership: false,
        divisionLeadership: false,
        departmentLeadership: false,
      },
      MSS4: {
        code: 'MSS4',
        rank: 3,
        management: true,
        seniorManagement: false,
        executive: false,
        leadership: false,
        directorateLeadership: false,
        divisionLeadership: false,
        departmentLeadership: false,
      },
    },
  }),
}));

import { DistributionSelector } from '../DistributionSelector';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  fixture.grade = 'MSS4';
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  Element.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const choosePersonForAction = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getAllByRole('combobox')[0]);
  await user.click(await screen.findByRole('option', { name: 'Person' }));

  await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(3));
  await user.click(screen.getAllByRole('combobox')[2]);
  await user.click(await screen.findByRole('option', { name: /For Action/ }));
};

const renderSelector = (onDistributionChange = vi.fn()) => {
  render(
    <DistributionSelector
      selectedDistribution={[] as DistributionRecipient[]}
      onDistributionChange={onDistributionChange}
    />,
  );
  return onDistributionChange;
};

describe('DistributionSelector parallel routing', () => {
  it('does not offer person-based For Action on an MSS4 grade', async () => {
    const user = userEvent.setup();
    renderSelector();

    await choosePersonForAction(user);

    expect(
      await screen.findByText(/cannot create parallel routing/i),
    ).toBeDefined();
  });

  it('offers person-based For Action on a senior management grade', async () => {
    fixture.grade = 'MSS3';
    const user = userEvent.setup();
    renderSelector();

    await choosePersonForAction(user);

    expect(screen.queryByText(/cannot create parallel routing/i)).toBeNull();
  });
});
