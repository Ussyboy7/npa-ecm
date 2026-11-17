import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}));

import { NpaLoading } from '../shared/NpaLoading';
import { PageSuspenseFallback } from '../shared/PageSuspenseFallback';

describe('canonical NPA loading', () => {
  it('renders the NPA logo, spinner, and message', () => {
    render(<NpaLoading message="Loading records…" />);

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Loading records…');
    expect(screen.getByRole('img', { name: /Nigerian Ports Authority|NPA/i })).not.toBeNull();
  });

  it('keeps page fallbacks in the content area instead of the viewport', () => {
    render(<PageSuspenseFallback message="Loading page…" />);

    const status = screen.getByRole('status');
    expect(status.className).not.toContain('min-h-screen');
    expect(status.className).toContain('min-h-[50vh]');
  });

  it('reserves the full viewport only when explicitly requested', () => {
    render(<PageSuspenseFallback fullScreen message="Signing in…" />);

    expect(screen.getByRole('status').className).toContain('min-h-screen');
  });
});