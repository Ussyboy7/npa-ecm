import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockQueryDocuments = vi.hoisted(() => vi.fn());
const mockUseOrganizationCatalogs = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/dms', () => ({
  queryDocuments: mockQueryDocuments,
}));

vi.mock('@/hooks/use-organization-catalogs', () => ({
  useOrganizationCatalogs: mockUseOrganizationCatalogs,
}));

vi.mock('@/lib/client-logger', () => ({
  logError: mockLogError,
}));

import { LinkDocumentDialog } from '../LinkDocumentDialog';

const documentRecord = {
  id: 'doc-1',
  title: 'Wharf rehabilitation invoice',
  referenceNumber: 'NPA/DMS/2026/001',
  documentType: 'invoice',
  status: 'published',
  divisionId: 'div-eng',
  departmentId: 'dept-eng',
  description: 'Contractor invoice for the wharf works.',
  updatedAt: '2026-11-12T09:00:00Z',
  tags: [],
  versions: [{ versionNumber: 3 }],
};

const renderDialog = () =>
  render(
    <LinkDocumentDialog
      open
      onOpenChange={vi.fn()}
      onSave={vi.fn()}
      divisionId="div-eng"
      subject="Wharf rehabilitation"
    />,
  );

beforeEach(() => {
  mockQueryDocuments.mockReset();
  mockLogError.mockReset();
  mockUseOrganizationCatalogs.mockReturnValue({
    divisions: [{ id: 'div-eng', name: 'Engineering' }],
    departments: [{ id: 'dept-eng', name: 'Civil Works' }],
  });
});

afterEach(() => {
  cleanup();
});

describe('LinkDocumentDialog load failures', () => {
  it('reports a failed load with retry instead of the empty result state', async () => {
    mockQueryDocuments.mockRejectedValue(new Error('offline'));
    renderDialog();

    expect(await screen.findByText("Couldn't load documents")).toBeDefined();
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
    expect(screen.queryByText(/no documents found/i)).toBeNull();
  });

  it('keeps loaded documents on screen when a later search fails', async () => {
    const user = userEvent.setup();
    mockQueryDocuments.mockResolvedValueOnce({
      results: [documentRecord],
      count: 1,
      next: null,
      previous: null,
    });
    renderDialog();

    expect(await screen.findByText('Wharf rehabilitation invoice')).toBeDefined();

    mockQueryDocuments.mockRejectedValueOnce(new Error('offline'));
    await user.type(screen.getByLabelText('Search documents'), 'wharf');

    expect(await screen.findByText(/couldn't refresh documents/i)).toBeDefined();
    expect(screen.getByText('Wharf rehabilitation invoice')).toBeDefined();
    expect(screen.queryByText(/no documents found/i)).toBeNull();
  });

  it('loads the list again when retry succeeds', async () => {
    const user = userEvent.setup();
    mockQueryDocuments.mockRejectedValueOnce(new Error('offline'));
    renderDialog();

    await screen.findByText("Couldn't load documents");

    mockQueryDocuments.mockResolvedValueOnce({
      results: [documentRecord],
      count: 1,
      next: null,
      previous: null,
    });
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Wharf rehabilitation invoice')).toBeDefined();
    await waitFor(() => expect(screen.queryByText("Couldn't load documents")).toBeNull());
  });
});
