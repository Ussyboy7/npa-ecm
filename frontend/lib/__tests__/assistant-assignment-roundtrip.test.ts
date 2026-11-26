import { describe, expect, it } from 'vitest';

import { buildDelegationPayload, mapApiDelegation } from '@/lib/organization-data';

type AssignmentInput = {
  id: string;
  executiveId: string;
  assistantId: string;
  type: 'TA' | 'PA';
  permissions: string[];
};

const assignment: AssignmentInput = {
  id: 'assignment-1',
  executiveId: '11',
  assistantId: '22',
  type: 'TA',
  permissions: ['view', 'forward'],
};

const roundTrip = (input: AssignmentInput) =>
  mapApiDelegation({
    id: 'assignment-1',
    ...buildDelegationPayload(input),
    principal: { id: 11 },
    assistant: { id: 22 },
  });

describe('assistant assignment round trip', () => {
  it('reopens a technical assistant as a TA with only its granted permissions', () => {
    const reloaded = roundTrip(assignment);

    expect(reloaded.type).toBe('TA');
    expect(reloaded.permissions).toEqual(['view', 'forward']);
  });

  it('reopens a personal assistant as a PA with respond and minute', () => {
    const reloaded = roundTrip({
      ...assignment,
      type: 'PA',
      permissions: ['view', 'forward', 'respond', 'minute'],
    });

    expect(reloaded.type).toBe('PA');
    expect(reloaded.permissions).toEqual(['view', 'forward', 'respond', 'minute']);
  });

  it('does not turn a saved approval permission into a different assistant kind', () => {
    const reloaded = roundTrip({
      ...assignment,
      type: 'PA',
      permissions: ['view', 'forward', 'respond', 'minute', 'approve'],
    });

    expect(reloaded.type).toBe('PA');
    expect(reloaded.permissions).toContain('approve');
  });
});
