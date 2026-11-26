import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const searchMock = vi.hoisted(() => vi.fn());
const suggestionsMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/search', () => ({
  search: searchMock,
  getSearchSuggestions: suggestionsMock,
  createSavedSearch: vi.fn(),
  getSavedSearches: vi.fn().mockResolvedValue([]),
  getSearchHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    divisions: [],
    departments: [],
    offices: [],
    directorates: [],
    ensureCatalogs: vi.fn(),
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

const emptyPage = {
  results: [],
  total_count: 0,
  limit: 50,
  offset: 0,
  has_more: false,
};

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  searchMock.mockReset();
  searchMock.mockResolvedValue(emptyPage);
  suggestionsMock.mockReset();
  suggestionsMock.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
});

describe('AdvancedSearch request state', () => {
  it('searches with the query and filters present in the URL on first load', async () => {
    window.history.replaceState(
      {},
      '',
      '/search?q=budget&search_type=documents&filters%5Bdocument_type%5D=memo',
    );

    render(<AdvancedSearch context="all" />);

    await waitFor(() => expect(searchMock).toHaveBeenCalled(), { timeout: 2000 });

    expect(searchMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        query: 'budget',
        filters: { document_type: 'memo' },
        search_type: 'documents',
        offset: 0,
      }),
    );
  });

  it('searches for the clicked tag instead of the previous query and filters', async () => {
    searchMock.mockResolvedValueOnce({
      results: [
        {
          id: 'doc-1',
          title: 'Budget memo',
          document_type: 'memo',
          tags: ['urgent'],
        },
      ],
      total_count: 1,
      limit: 50,
      offset: 0,
      has_more: false,
    });

    const user = userEvent.setup();
    render(<AdvancedSearch context="all" />);

    await user.type(screen.getByLabelText('Search input'), 'budget{Enter}');

    const tagChip = await screen.findByText('#urgent');
    await user.click(tagChip);

    await waitFor(() => expect(searchMock).toHaveBeenCalledTimes(2));

    expect(searchMock.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        query: 'urgent',
        filters: { tags: ['urgent'] },
        offset: 0,
      }),
    );
  });

  it('ignores a repeat submission while the same request is pending, but allows a later re-submit', async () => {
    let resolveSearch: (value: typeof emptyPage) => void = () => {};
    searchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<AdvancedSearch context="all" />);

    await user.type(screen.getByLabelText('Search input'), 'budget');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(searchMock).toHaveBeenCalledTimes(1));

    // Second Enter while the first request is still outstanding.
    await user.keyboard('{Enter}');
    expect(searchMock).toHaveBeenCalledTimes(1);

    resolveSearch(emptyPage);
    await waitFor(() => expect(screen.getByText(/Search Results/)).toBeTruthy());

    // An explicit re-submit after the response is not a duplicate.
    await user.keyboard('{Enter}');
    await waitFor(() => expect(searchMock).toHaveBeenCalledTimes(2));
  });

  it('searches once for the settled query after the user pauses typing', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch context="all" />);

    await user.type(screen.getByLabelText('Search input'), 'budget');

    await waitFor(() => expect(searchMock).toHaveBeenCalledTimes(1), { timeout: 2000 });
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ query: 'budget', filters: {}, offset: 0 }),
    );
  });

  it('searches immediately on Enter and does not repeat it when the typing pause elapses', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch context="all" />);

    await user.type(screen.getByLabelText('Search input'), 'budget');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(searchMock).toHaveBeenCalledTimes(1), { timeout: 250 });
    expect(searchMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ query: 'budget', offset: 0 }),
    );

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it('does not auto-search a query picked from suggestions', async () => {
    suggestionsMock.mockResolvedValue(['budget report']);

    const user = userEvent.setup();
    render(<AdvancedSearch context="all" />);

    await user.type(screen.getByLabelText('Search input'), 'budg');
    await user.click(await screen.findByText('budget report'));

    const callsAfterClick = searchMock.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(searchMock).toHaveBeenCalledTimes(callsAfterClick);
  });

  it('does not auto-search an untouched empty query', async () => {
    render(<AdvancedSearch context="all" />);

    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(searchMock).not.toHaveBeenCalled();
  });
});
