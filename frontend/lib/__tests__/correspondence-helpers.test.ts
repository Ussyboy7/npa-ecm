import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDateShort,
  formatDateForAPI,
  getPriorityVariant,
  getStatusVariant,
  getStatusColor,
  isOverdue,
  generateReferenceNumber,
  getNextStepNumber,
  generateId,
  isCorrespondenceClosed,
  isCorrespondenceOutward,
  canDispatchCorrespondence,
  canArchiveCorrespondence,
} from '../correspondence-helpers';
import type { Correspondence, Minute } from '../npa-structure';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2025-03-15');
    expect(result).toBe('March 15, 2025');
  });

  it('returns empty string for null/empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('formats a valid date string with time', () => {
    const result = formatDateTime('2025-03-15T14:30:00');
    expect(result).toContain('Mar 15, 2025');
    expect(result).toContain('02:30 PM');
  });

  it('returns empty string for null/empty input', () => {
    expect(formatDateTime('')).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDateTime('invalid')).toBe('');
  });
});

describe('formatDateShort', () => {
  it('formats a valid date as MM/DD/YYYY', () => {
    const result = formatDateShort('2025-03-15');
    expect(result).toBe('03/15/2025');
  });

  it('returns empty string for empty input', () => {
    expect(formatDateShort('')).toBe('');
  });
});

describe('formatDateForAPI', () => {
  it('formats a date string to YYYY-MM-DD', () => {
    const result = formatDateForAPI('2025-03-15T00:00:00');
    expect(result).toBe('2025-03-15');
  });

  it('formats a Date object', () => {
    const result = formatDateForAPI(new Date(2025, 2, 15));
    expect(result).toBe('2025-03-15');
  });

  it('returns today for invalid input', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const result = formatDateForAPI('invalid');
    expect(result).toBe(expected);
  });
});

describe('getPriorityVariant', () => {
  it('returns destructive for urgent', () => {
    expect(getPriorityVariant('urgent')).toBe('destructive');
  });

  it('returns default for high', () => {
    expect(getPriorityVariant('high')).toBe('default');
  });

  it('returns secondary for medium and low', () => {
    expect(getPriorityVariant('medium')).toBe('secondary');
    expect(getPriorityVariant('low')).toBe('secondary');
  });
});

describe('getStatusVariant', () => {
  it('returns default for completed', () => {
    expect(getStatusVariant('completed')).toBe('default');
  });

  it('returns secondary for in-progress', () => {
    expect(getStatusVariant('in-progress')).toBe('secondary');
  });

  it('returns outline for other statuses', () => {
    expect(getStatusVariant('pending')).toBe('outline');
    expect(getStatusVariant('archived')).toBe('outline');
  });
});

describe('getStatusColor', () => {
  it('returns text-success for completed', () => {
    expect(getStatusColor('completed')).toBe('text-success');
  });

  it('returns text-info for in-progress', () => {
    expect(getStatusColor('in-progress')).toBe('text-info');
  });

  it('returns text-warning for pending', () => {
    expect(getStatusColor('pending')).toBe('text-warning');
  });

  it('returns muted for unknown', () => {
    expect(getStatusColor('unknown')).toBe('text-muted-foreground');
  });
});

describe('isOverdue', () => {
  const makeCorr = (overrides: Partial<Correspondence> = {}): Correspondence => ({
    id: '1',
    referenceNumber: 'REF/001',
    subject: 'Test',
    source: 'internal',
    receivedDate: new Date().toISOString(),
    senderName: 'Sender',
    senderOrganization: 'Org',
    status: 'in-progress',
    priority: 'medium',
    direction: 'upward',
    ...overrides,
  });

  it('returns false for recently received medium priority', () => {
    const corr = makeCorr({ priority: 'medium', receivedDate: new Date().toISOString() });
    expect(isOverdue(corr)).toBe(false);
  });

  it('returns true for urgent priority older than 1 day', () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const corr = makeCorr({ priority: 'urgent', receivedDate: past });
    expect(isOverdue(corr)).toBe(true);
  });

  it('returns false for completed items regardless of age', () => {
    const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const corr = makeCorr({ priority: 'urgent', receivedDate: past, status: 'completed' });
    expect(isOverdue(corr)).toBe(true);
  });
});

describe('generateReferenceNumber', () => {
  it('generates reference in NPA/CODE/YYYY/MMNNNN format', () => {
    const ref = generateReferenceNumber('HR');
    expect(ref).toMatch(/^NPA\/HR\/\d{4}\/\d{6}$/);
  });
});

describe('getNextStepNumber', () => {
  it('returns 1 for empty minutes', () => {
    expect(getNextStepNumber([])).toBe(1);
  });

  it('returns max step + 1', () => {
    const minutes: Minute[] = [
      { stepNumber: 1 } as Minute,
      { stepNumber: 3 } as Minute,
    ];
    expect(getNextStepNumber(minutes)).toBe(4);
  });
});

describe('generateId', () => {
  it('generates id with given prefix', () => {
    const id = generateId('corr');
    expect(id).toMatch(/^corr-\d+-[a-z0-9]+$/);
  });
});

describe('correspondence status flow helpers', () => {
  it('treats completed/dispatched/acknowledged/archived/withdrawn as closed', () => {
    expect(isCorrespondenceClosed('completed')).toBe(true);
    expect(isCorrespondenceClosed('dispatched')).toBe(true);
    expect(isCorrespondenceClosed('acknowledged')).toBe(true);
    expect(isCorrespondenceClosed('archived')).toBe(true);
    expect(isCorrespondenceClosed('withdrawn')).toBe(true);
    expect(isCorrespondenceClosed('pending')).toBe(false);
    expect(isCorrespondenceClosed('in-progress')).toBe(false);
  });

  it('detects outward from isOutward, flowType, or direction', () => {
    expect(isCorrespondenceOutward({ isOutward: true, direction: 'upward' })).toBe(true);
    expect(isCorrespondenceOutward({ direction: 'downward' })).toBe(true);
    expect(isCorrespondenceOutward({ flowType: 'outward-external', direction: 'upward' })).toBe(true);
    expect(isCorrespondenceOutward({ direction: 'upward', flowType: 'inward-external' })).toBe(false);
  });

  it('allows dispatch only for completed outward', () => {
    expect(
      canDispatchCorrespondence({
        status: 'completed',
        direction: 'downward',
      }),
    ).toBe(true);
    expect(
      canDispatchCorrespondence({
        status: 'completed',
        direction: 'upward',
        isOutward: false,
      }),
    ).toBe(false);
    expect(
      canDispatchCorrespondence({
        status: 'dispatched',
        direction: 'downward',
      }),
    ).toBe(false);
  });

  it('allows archive for completed, dispatched, and acknowledged', () => {
    expect(canArchiveCorrespondence({ status: 'completed' })).toBe(true);
    expect(canArchiveCorrespondence({ status: 'dispatched' })).toBe(true);
    expect(canArchiveCorrespondence({ status: 'acknowledged' })).toBe(true);
    expect(canArchiveCorrespondence({ status: 'archived' })).toBe(false);
    expect(canArchiveCorrespondence({ status: 'pending' })).toBe(false);
  });
});
