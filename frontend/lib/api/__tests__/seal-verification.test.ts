import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiFetch = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  apiFetch: mockApiFetch,
  isAbortError: (error: unknown) =>
    error instanceof Error && error.name === 'AbortError',
}));

vi.mock('@/lib/client-logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

import {
  getSealResultState,
  verifySeal,
  type SealVerification,
} from '../seal-verification';

const baseVerification: SealVerification = {
  valid: true,
  serial_number: 'NPA-20241201-A8F3B2C1',
  sealed_by: 'Test Signer',
  office_name: 'Nigerian Ports Authority',
  office_title: 'Managing Director',
  sealed_at: '2024-12-01T10:00:00Z',
};

const httpError = (status: number, message: string) => {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
};

describe('verifySeal lookup status', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('marks a successful lookup as found', async () => {
    mockApiFetch.mockResolvedValue({ ...baseVerification });

    const result = await verifySeal('NPA-20241201-A8F3B2C1');

    expect(result.lookup_status).toBe('found');
  });

  it('distinguishes a missing seal record from other failures', async () => {
    mockApiFetch.mockRejectedValue(httpError(404, 'Not found'));

    const result = await verifySeal('NPA-20241201-A8F3B2C1');

    expect(result.lookup_status).toBe('not_found');
    expect(result.valid).toBe(false);
  });

  it('marks server and network failures as an incomplete check', async () => {
    mockApiFetch.mockRejectedValue(httpError(500, 'Server error'));

    const result = await verifySeal('NPA-20241201-A8F3B2C1');

    expect(result.lookup_status).toBe('unavailable');
  });
});

describe('getSealResultState', () => {
  it('reports a matching record when the seal is valid', () => {
    expect(getSealResultState({ ...baseVerification, lookup_status: 'found' })).toBe('matched');
  });

  it('reports an invalidated seal ahead of a generic failure', () => {
    expect(
      getSealResultState({
        ...baseVerification,
        valid: false,
        invalidated_at: '2025-01-05T09:00:00Z',
        invalidated_reason: 'Superseded',
        lookup_status: 'found',
      }),
    ).toBe('invalidated');
  });

  it('reports a missing record', () => {
    expect(
      getSealResultState({ ...baseVerification, valid: false, lookup_status: 'not_found' }),
    ).toBe('not_found');
  });

  it('reports an incomplete check when the failure is unknown', () => {
    expect(getSealResultState({ ...baseVerification, valid: false })).toBe('unavailable');
  });
});
