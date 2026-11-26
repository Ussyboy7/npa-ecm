import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/correspondence/DispatchModal', () => ({
  AcknowledgeButton: () => null,
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/components/ui/sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/lib/api/acting-appointments', () => ({
  returnCorrespondenceToPrincipal: vi.fn(),
}));

import { ActionsPanel } from '../ActionsPanel';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
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

const principal = {
  id: 'principal-1',
  name: 'Grace Principal',
  gradeLevel: 'MSS1',
  systemRole: 'General Manager',
} as never;

const correspondence = {
  id: 'corr-1',
  referenceNumber: 'NPA/TEST/1',
  subject: 'Delegated record',
  status: 'in-progress',
  direction: 'upward',
  distribution: [],
} as never;

describe('ActionsPanel delegation recall', () => {
  it('lets the principal recall the delegation from the active-delegation notice', async () => {
    const onRecallDelegation = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <ActionsPanel
        correspondence={correspondence}
        minutes={[]}
        activeUser={principal}
        isCurrentUserTurn
        activeDelegation={{
          id: 'delegation-1',
          assistantId: 'assistant-1',
          assistantName: 'Ada Assistant',
          principalId: 'principal-1',
          status: 'active',
          delegatedAt: '2026-11-20T10:00:00Z',
        }}
        delegationPermissions={['view', 'forward']}
        onRecallDelegation={onRecallDelegation}
      />,
    );

    expect(await screen.findByText(/Active Delegation/i)).toBeDefined();

    await user.click(screen.getByRole('button', { name: /Recall delegation/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Recall this delegation\?/i)).toBeDefined();
    expect(within(dialog).getByText(/Ada Assistant/)).toBeDefined();

    await user.click(within(dialog).getByRole('button', { name: /^Recall delegation$/i }));

    await waitFor(() => expect(onRecallDelegation).toHaveBeenCalledTimes(1));
  });

  it('does not offer recall to the assistant acting on the principal\'s behalf', async () => {
    render(
      <ActionsPanel
        correspondence={correspondence}
        minutes={[]}
        activeUser={{ id: 'assistant-1', name: 'Ada Assistant', gradeLevel: 'SSS1' } as never}
        isCurrentUserTurn
        activeDelegation={{
          id: 'delegation-1',
          assistantId: 'assistant-1',
          assistantName: 'Ada Assistant',
          principalId: 'principal-1',
          principalName: 'Grace Principal',
          status: 'active',
          delegatedAt: '2026-11-20T10:00:00Z',
        }}
        delegationPermissions={['view', 'forward']}
        onRecallDelegation={vi.fn()}
      />,
    );

    // The notice names the principal in two places (title and body).
    expect((await screen.findAllByText(/Acting on [Bb]ehalf/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Recall delegation/i })).toBeNull();
  });
});
