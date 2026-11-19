import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockCheckSealDocument = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/seal-verification', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/seal-verification')>();
  return {
    ...actual,
    checkSealDocument: mockCheckSealDocument,
  };
});

import { SealVerificationResult } from '../SealVerificationResult';
import type { SealVerification } from '@/lib/api/seal-verification';

const baseVerification: SealVerification = {
  valid: true,
  serial_number: 'NPA-20241201-A8F3B2C1',
  sealed_by: 'Test Signer',
  office_name: 'Nigerian Ports Authority',
  office_title: 'Managing Director',
  sealed_at: '2024-12-01T10:00:00Z',
  pdf_sha256: 'archived-hash',
  lookup_status: 'found',
};

const renderResult = (verification: SealVerification) =>
  render(<SealVerificationResult verification={verification} serial="NPA-20241201-A8F3B2C1" />);

describe('SealVerificationResult states', () => {
  beforeEach(() => {
    mockCheckSealDocument.mockReset();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8002/api/v1';
  });

  it('shows the issued seal image instead of a drawn preview', () => {
    renderResult(baseVerification);

    const image = screen.getByAltText(/seal/i);
    expect(image.getAttribute('src')).toContain(
      '/accounts/seal/public-image/NPA-20241201-A8F3B2C1/',
    );
  });

  it('loads a small display rendition rather than the full artifact', () => {
    renderResult(baseVerification);

    const image = screen.getByAltText(/seal/i);
    expect(image.getAttribute('src')).toContain('?width=440');
    expect(image.getAttribute('srcset')).toContain('?width=220 1x');
    expect(image.getAttribute('srcset')).toContain('?width=440 2x');
  });

  it('says the seal image is unavailable rather than drawing a substitute', async () => {
    renderResult(baseVerification);

    fireEvent(screen.getByAltText(/seal/i), new Event('error', { bubbles: true }));

    await waitFor(() => expect(screen.getByText(/Seal image unavailable/)).toBeDefined());
    expect(screen.queryByAltText(/seal/i)).toBeNull();
  });

  it('says a matching record is not by itself proof of authenticity', () => {
    renderResult(baseVerification);

    expect(screen.getByText('Seal record found')).toBeDefined();
    expect(screen.getByText(/not, by itself, a determination/i)).toBeDefined();
    expect(screen.getByText('Record found')).toBeDefined();
  });

  it('reports an invalidated seal without calling it missing', () => {
    renderResult({
      ...baseVerification,
      valid: false,
      invalidated_at: '2025-01-05T09:00:00Z',
      invalidated_reason: 'Superseded by a corrected approval',
      lookup_status: 'found',
    });

    expect(screen.getByText('Seal record invalidated')).toBeDefined();
    expect(screen.getByText(/Superseded by a corrected approval/)).toBeDefined();
    expect(screen.queryByText('No seal record found')).toBeNull();
  });

  it('reports a serial with no record separately from a failed check', () => {
    renderResult({
      ...baseVerification,
      valid: false,
      lookup_status: 'not_found',
    });

    expect(screen.getByText('No seal record found')).toBeDefined();
    expect(screen.getByText(/NPA ECM has no seal record for this serial/i)).toBeDefined();
    expect(screen.queryByText('Check could not be completed')).toBeNull();
  });

  it('does not report a conclusion when the check could not be completed', () => {
    renderResult({
      ...baseVerification,
      valid: false,
      lookup_status: 'unavailable',
      error: 'Network error',
    });

    expect(screen.getByText('Check could not be completed')).toBeDefined();
    expect(screen.getByText(/no record was checked/i)).toBeDefined();
    expect(screen.queryByText('Invalid Seal')).toBeNull();
    expect(screen.queryByText('No seal record found')).toBeNull();
  });
});

describe('SealVerificationResult archived-copy comparison', () => {
  beforeEach(() => {
    mockCheckSealDocument.mockReset();
  });

  it('starts as not checked and explains the scope of the comparison', () => {
    renderResult(baseVerification);

    expect(screen.getByText('Not checked')).toBeDefined();
    expect(screen.getByText(/not legal validity/i)).toBeDefined();
  });

  it('downloads the issued seal image, not a browser-drawn one', () => {
    renderResult(baseVerification);

    expect(screen.getByText('Download seal image')).toBeDefined();
  });

  it('downloads the full-resolution seal, not the display rendition', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['png']),
    });
    vi.stubGlobal('fetch', fetchMock);
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:seal'),
      revokeObjectURL: vi.fn(),
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderResult(baseVerification);

    await user.click(screen.getByText('Download seal image'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain('/accounts/seal/public-image/NPA-20241201-A8F3B2C1/');
    expect(requested).not.toContain('width=');
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('reports a matched file', async () => {
    mockCheckSealDocument.mockResolvedValue({
      matches: true,
      expected_sha256: 'archived-hash',
      actual_sha256: 'archived-hash',
      detail: 'Document matches the archived approved copy.',
    });
    const user = userEvent.setup();
    renderResult(baseVerification);

    await user.upload(
      screen.getByLabelText(/approved-copy PDF/i),
      new File(['pdf'], 'approved.pdf', { type: 'application/pdf' }),
    );

    await waitFor(() => expect(screen.getByText('Matched')).toBeDefined());
  });

  it('reports a different file without asserting it is fake', async () => {
    mockCheckSealDocument.mockResolvedValue({
      matches: false,
      expected_sha256: 'archived-hash',
      actual_sha256: 'other-hash',
      detail: 'Document differs from the archived approved copy.',
    });
    const user = userEvent.setup();
    renderResult(baseVerification);

    await user.upload(
      screen.getByLabelText(/approved-copy PDF/i),
      new File(['pdf'], 'edited.pdf', { type: 'application/pdf' }),
    );

    await waitFor(() => expect(screen.getByText('Different')).toBeDefined());
    expect(screen.queryByText(/fraudulent/i)).toBeNull();
  });

  it('says the comparison is unavailable when the seal has no archived copy', () => {
    renderResult({ ...baseVerification, pdf_sha256: undefined });

    expect(screen.getByText(/no archived approved copy/i)).toBeDefined();
  });
});
