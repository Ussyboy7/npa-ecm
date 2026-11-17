import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentRecord } from '@/lib/dms-types';

const fetchUsersMock = vi.hoisted(() => vi.fn());
const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin-api', () => ({
  fetchUsers: fetchUsersMock,
}));

vi.mock('@/lib/api/dms', () => ({
  apiFetch: apiFetchMock,
  canShareDocument: () => true,
  hasTokens: () => true,
  shareDocument: vi.fn(),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    divisions: [],
    officeMemberships: [],
  }),
}));

vi.mock('@/components/dms/CorrespondenceRoutingView', () => ({
  CorrespondenceRoutingView: React.forwardRef(() => null),
}));

import { ShareDocumentDialog } from '../ShareDocumentDialog';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const apiUser = (id: string, firstName: string, systemRole = 'Manager') => ({
  id,
  username: id,
  email: `${id}@example.com`,
  first_name: firstName,
  middle_name: '',
  last_name: 'Example',
  employee_id: id,
  personnel_number: '',
  honorific: '',
  designation: '',
  grade_level: 'MSS4',
  system_role: null,
  system_role_name: systemRole,
  directorate: null,
  division: null,
  department: null,
  is_active: true,
});

const sharedDocument = {
  id: 'doc-1',
  title: 'Share target document',
  status: 'draft',
  sensitivity: 'internal',
} as unknown as DocumentRecord;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  fetchUsersMock.mockReset();
  apiFetchMock.mockReset();
  apiFetchMock.mockResolvedValue({ results: [] });
  fetchUsersMock.mockImplementation(async ({ search }: { search?: string }) => {
    if (search === 'amina') {
      return { count: 1, next: null, previous: null, results: [apiUser('user-1', 'Amina')] };
    }
    return {
      count: 20,
      next: null,
      previous: null,
      results: [apiUser('user-1', 'Amina'), apiUser('user-2', 'Bala')],
    };
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ShareDocumentDialog direct-share picker', () => {
  it('searches users on the server and keeps the selected user name in the footer summary', async () => {
    const user = userEvent.setup();
    render(
      <ShareDocumentDialog
        open
        onOpenChange={vi.fn()}
        document={sharedDocument}
        currentUserId="current-user"
      />,
    );

    expect(await screen.findByText('Amina Example')).toBeDefined();
    expect(fetchUsersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        page_size: 50,
        is_active: true,
        search: undefined,
      }),
    );

    await user.click(screen.getByText('Bala Example'));
    await waitFor(() =>
      expect(document.body.textContent).toContain('Bala Example · read access'),
    );

    const search = screen.getByPlaceholderText('Search person by name, email, role...');
    await user.type(search, 'amina');

    await waitFor(() =>
      expect(fetchUsersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'amina' }),
      ),
    );
    expect(await screen.findByText('Amina Example')).toBeDefined();
    expect(screen.getByText('1 selected')).toBeDefined();

    // Bala is no longer in the search result list, but the selected-user cache
    // still supplies the footer summary.
    expect(document.body.textContent).toContain('Bala Example · read access');
  });
});
