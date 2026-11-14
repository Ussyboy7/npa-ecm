import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/seals/SealBadge', () => ({
  SealBadge: () => null,
}));

import { MinuteThreadPanel } from '../MinuteThreadPanel';
import type { Minute } from '@/lib/npa-structure';

const minute = (overrides: Partial<Minute>): Minute => ({
  id: 'minute-1',
  correspondenceId: 'correspondence-1',
  userId: 'user-author',
  userName: 'Minute Author',
  gradeLevel: 'MSS2',
  actionType: 'minute',
  minuteText: 'Original instruction',
  direction: 'downward',
  stepNumber: 1,
  timestamp: '2026-11-12T10:00:00.000Z',
  canBeEdited: true,
  canBeRecalled: false,
  isRecalled: false,
  ...overrides,
});

const renderThread = (minutes: Minute[]) =>
  render(
    <MinuteThreadPanel
      minutes={minutes}
      activeUserId="user-author"
      isCompleted={false}
      isCurrentUserTurn={false}
      lookupUser={() => undefined}
      getActionIcon={() => null}
      onMinuteClick={vi.fn()}
      onEditMinute={vi.fn()}
      onRecallMinute={vi.fn()}
      onAddNote={vi.fn()}
    />,
  );

describe('MinuteThreadPanel edit lock', () => {
  it('hides Edit for an original minute when a later minute exists, even if canBeEdited is stale', () => {
    renderThread([
      minute({ id: 'minute-1', stepNumber: 1, canBeEdited: true }),
      minute({
        id: 'minute-2',
        userId: 'user-next',
        userName: 'Next Person',
        minuteText: 'Next person acted',
        actionType: 'approve',
        stepNumber: 2,
        timestamp: '2026-11-12T10:01:00.000Z',
        canBeEdited: false,
      }),
    ]);

    expect(screen.getByText('Original instruction')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('keeps Edit available for the latest own minute when its edit window is open', () => {
    renderThread([
      minute({ id: 'minute-1', stepNumber: 1, canBeEdited: true }),
    ]);

    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
  });
});
