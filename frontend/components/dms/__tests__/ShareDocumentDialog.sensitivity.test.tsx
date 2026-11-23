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

// The clearance rule is served by the backend; the dialog reads it through the
// hook, so the test supplies the payload the endpoint returns.
vi.mock('@/hooks/use-classification-policy', () => ({
  useClassificationPolicy: () => ({
    public: { value: 'public', label: 'Public', grades: [], unrestricted: true },
    internal: { value: 'internal', label: 'Internal', grades: [], unrestricted: true },
    confidential: {
      value: 'confidential',
      label: 'Confidential',
      grades: ['MDCS', 'EDCS', 'MSS1', 'MSS2', 'MSS3', 'MSS4', 'MSS5'],
      unrestricted: false,
    },
    restricted: {
      value: 'restricted',
      label: 'Restricted',
      grades: ['MDCS', 'EDCS', 'MSS1'],
      unrestricted: false,
    },
  }),
}));

import { ShareDocumentDialog } from '../ShareDocumentDialog';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const apiUser = (id: string, firstName: string) => ({
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
  system_role_name: 'Manager',
  directorate: null,
  division: null,
  department: null,
  is_active: true,
});

const documentWithSensitivity = (sensitivity: string) =>
  ({
    id: 'doc-1',
    title: 'Share target document',
    status: 'draft',
    sensitivity,
  }) as unknown as DocumentRecord;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  fetchUsersMock.mockReset();
  apiFetchMock.mockReset();
  apiFetchMock.mockResolvedValue({ results: [] });
  fetchUsersMock.mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    results: [apiUser('user-2', 'Bala')],
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ShareDocumentDialog classification warning', () => {
  it('names selected people whose grade cannot reach a restricted document', async () => {
    const user = userEvent.setup();
    render(
      <ShareDocumentDialog
        open
        onOpenChange={vi.fn()}
        document={documentWithSensitivity('restricted')}
        currentUserId="current-user"
      />,
    );

    await user.click(await screen.findByText('Bala Example'));

    await waitFor(() =>
      expect(document.body.textContent).toContain(
        '1 selected person cannot open this document',
      ),
    );
    expect(document.body.textContent).toContain('Bala Example');
    expect(document.body.textContent).toContain('Restricted documents: limited to MDCS, EDCS, MSS1');
    expect(screen.getByText('Share Document')).toBeDefined();
  });

  it('stays quiet when the grade can reach the classification', async () => {
    const user = userEvent.setup();
    render(
      <ShareDocumentDialog
        open
        onOpenChange={vi.fn()}
        document={documentWithSensitivity('confidential')}
        currentUserId="current-user"
      />,
    );

    await user.click(await screen.findByText('Bala Example'));

    await waitFor(() =>
      expect(document.body.textContent).toContain('Bala Example · read access'),
    );
    expect(document.body.textContent).not.toContain('cannot open this document');
  });
});
