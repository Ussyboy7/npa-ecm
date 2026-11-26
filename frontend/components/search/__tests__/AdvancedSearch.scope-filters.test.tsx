import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/search', () => ({
  search: vi.fn().mockResolvedValue({
    results: [],
    total_count: 0,
    limit: 50,
    offset: 0,
    has_more: false,
  }),
  getSearchSuggestions: vi.fn().mockResolvedValue([]),
  createSavedSearch: vi.fn(),
  getSavedSearches: vi.fn().mockResolvedValue([]),
  getSearchHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/hooks/use-organization-catalogs', () => ({
  useOrganizationCatalogs: () => ({
    divisions: [
      { id: 'div-fin', name: 'Finance', isActive: true, directorateId: 'dir-1' },
      { id: 'div-legal', name: 'Legal', isActive: true, directorateId: 'dir-1' },
    ],
    departments: [
      { id: 'dept-budget', name: 'Budget', isActive: true, divisionId: 'div-fin' },
      { id: 'dept-litigation', name: 'Litigation', isActive: true, divisionId: 'div-legal' },
    ],
  }),
}));

vi.mock('@/hooks/use-user-lookup', () => ({
  useUserLookup: () => new Map(),
}));

import { AdvancedSearch } from '../AdvancedSearch';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
});

describe('AdvancedSearch unit filters', () => {
  it('offers only the divisions and departments inside the search scope', async () => {
    const user = userEvent.setup();
    render(
      <AdvancedSearch
        context="all"
        scope={{
          level: 'department',
          unit: 'Budget',
          division_ids: ['div-fin'],
          department_ids: ['dept-budget'],
        }}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Filter by division' }));
    const divisionList = await screen.findByRole('listbox');
    expect(within(divisionList).getByRole('option', { name: 'Finance' })).toBeDefined();
    expect(within(divisionList).queryByRole('option', { name: 'Legal' })).toBeNull();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('combobox', { name: 'Filter by department' }));
    const departmentList = await screen.findByRole('listbox');
    expect(within(departmentList).getByRole('option', { name: 'Budget' })).toBeDefined();
    expect(within(departmentList).queryByRole('option', { name: 'Litigation' })).toBeNull();
  });

  it('keeps the full catalog when no scope has loaded yet', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch context="all" />);

    await user.click(screen.getByRole('combobox', { name: 'Filter by division' }));
    const divisionList = await screen.findByRole('listbox');
    expect(within(divisionList).getByRole('option', { name: 'Finance' })).toBeDefined();
    expect(within(divisionList).getByRole('option', { name: 'Legal' })).toBeDefined();
  });
});
