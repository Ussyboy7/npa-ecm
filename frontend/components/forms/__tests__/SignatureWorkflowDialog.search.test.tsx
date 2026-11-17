import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormSubmission } from '@/lib/types/forms';

const fetchUsersMock = vi.hoisted(() => vi.fn());
const createSignatureWorkflowMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin-api', () => ({
  fetchUsers: fetchUsersMock,
}));

vi.mock('@/lib/api/forms', () => ({
  createSignatureWorkflow: createSignatureWorkflowMock,
}));

vi.mock('@/components/ui/sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { SignatureWorkflowDialog } from '../SignatureWorkflowDialog';

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

const submission = {
  id: 'submission-1',
  template: {
    id: 'template-1',
    name: 'Signature form',
    slug: 'signature-form',
    category: 'general',
    is_active: true,
    structure: {
      fields: [
        {
          id: 'field-1',
          name: 'signature',
          label: 'Signature',
          type: 'file',
        },
      ],
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  data: {},
  is_draft: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
} as unknown as FormSubmission;

const twoFieldSubmission = {
  ...submission,
  template: {
    ...submission.template,
    structure: {
      ...submission.template.structure,
      fields: [
        ...submission.template.structure.fields,
        {
          id: 'field-2',
          name: 'countersignature',
          label: 'Countersignature',
          type: 'file',
        },
      ],
    },
  },
} as FormSubmission;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  Element.prototype.scrollIntoView = vi.fn();
  fetchUsersMock.mockReset();
  createSignatureWorkflowMock.mockReset();
  createSignatureWorkflowMock.mockResolvedValue({ id: 'workflow-1' });
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

describe('SignatureWorkflowDialog user picker', () => {
  it('searches on the server, keeps the selected signer, and submits only the user id', async () => {
    const user = userEvent.setup();
    render(
      <SignatureWorkflowDialog
        open
        onOpenChange={vi.fn()}
        submission={submission}
        onWorkflowCreated={vi.fn()}
      />,
    );

    const trigger = await screen.findByRole('combobox');
    expect(fetchUsersMock).not.toHaveBeenCalled();

    await user.click(trigger);
    await waitFor(() =>
      expect(fetchUsersMock).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          page_size: 50,
          is_active: true,
          search: undefined,
        }),
      ),
    );
    const search = await screen.findByPlaceholderText('Search users...');
    await user.type(search, 'amina');

    await waitFor(() =>
      expect(fetchUsersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'amina' }),
      ),
    );
    expect(await screen.findByText('Amina Example')).toBeDefined();
    expect(screen.queryByText('Bala Example')).toBeNull();

    await user.click(screen.getByText('Amina Example'));
    await waitFor(() => expect(trigger.textContent).toContain('Amina Example'));

    await user.click(trigger);
    const secondSearch = await screen.findByPlaceholderText('Search users...');
    await user.type(secondSearch, 'bala');

    await waitFor(() =>
      expect(fetchUsersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'bala' }),
      ),
    );
    expect(await screen.findByText('Bala Example')).toBeDefined();
    expect(trigger.textContent).toContain('Amina Example');

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Create Workflow' }));

    await waitFor(() =>
      expect(createSignatureWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          submission_id: 'submission-1',
          routing_mode: 'parallel',
          signature_assignments: [
            {
              field_name: 'signature',
              field_label: 'Signature',
              user_id: 'user-1',
            },
          ],
        }),
      ),
    );
    expect(createSignatureWorkflowMock.mock.calls[0][0].signature_assignments[0]).not.toHaveProperty(
      'user_name',
    );
  });

  it('keeps signer searches independent across assignments', async () => {
    const user = userEvent.setup();
    render(
      <SignatureWorkflowDialog
        open
        onOpenChange={vi.fn()}
        submission={twoFieldSubmission}
        onWorkflowCreated={vi.fn()}
      />,
    );

    const triggers = await screen.findAllByRole('combobox');
    expect(triggers).toHaveLength(2);

    await user.click(triggers[0]);
    await user.type(await screen.findByPlaceholderText('Search users...'), 'amina');
    await waitFor(() =>
      expect(fetchUsersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'amina' }),
      ),
    );
    await user.click(await screen.findByText('Amina Example'));
    await waitFor(() => expect(triggers[0].textContent).toContain('Amina Example'));

    await user.click(triggers[1]);
    const secondSearch = await screen.findByPlaceholderText('Search users...');
    expect((secondSearch as HTMLInputElement).value).toBe('');
    await user.type(secondSearch, 'bala');
    await waitFor(() =>
      expect(fetchUsersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'bala' }),
      ),
    );

    expect(triggers[0].textContent).toContain('Amina Example');
    expect(await screen.findByText('Bala Example')).toBeDefined();
  });
});
