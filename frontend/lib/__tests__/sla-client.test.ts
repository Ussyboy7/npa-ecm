import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('../api-client', () => ({
  apiFetch: apiFetchMock,
}));

import {
  DEFAULT_SLA_TARGETS,
  fetchSLATargets,
  invalidateSLATargetsCache,
} from '../sla-client';

describe('fetchSLATargets', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    invalidateSLATargetsCache();
  });

  it('falls back to defaults when the API denies SLA configuration access', async () => {
    apiFetchMock.mockRejectedValueOnce(new Error('can_manage_org_structure'));

    await expect(fetchSLATargets(true)).resolves.toEqual(DEFAULT_SLA_TARGETS);
    expect(apiFetchMock).toHaveBeenCalledWith('/analytics/sla-config/targets/');
  });

  it('clears an in-flight request after a failed fetch', async () => {
    apiFetchMock
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ urgent: 24, high: 48, medium: 96, low: 144 });

    await expect(fetchSLATargets(true)).resolves.toEqual(DEFAULT_SLA_TARGETS);
    await expect(fetchSLATargets(true)).resolves.toEqual({
      urgent: 24,
      high: 48,
      medium: 96,
      low: 144,
    });
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
  });
});
