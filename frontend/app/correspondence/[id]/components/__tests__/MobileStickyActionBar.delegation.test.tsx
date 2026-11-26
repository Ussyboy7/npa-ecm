import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MobileStickyActionBar } from '../MobileStickyActionBar';

afterEach(cleanup);

const baseProps = {
  isForInformationOnly: false,
  primaryLabel: 'Endorse & Forward',
  showTreat: false,
  treatLabel: 'Treat & Respond',
  canComplete: false,
  canCompleteNoResponse: false,
  canDelegate: false,
  onMinute: vi.fn(),
  onTreat: vi.fn(),
  onComplete: vi.fn(),
  onCompleteNoResponse: vi.fn(),
  onDelegate: vi.fn(),
};

/**
 * A delegate with only the view grant holds the record but may not route or
 * respond, so the bar must not offer an action the server will refuse.
 */
describe('MobileStickyActionBar delegation grants', () => {
  it('disables the primary action for a view-only delegate', () => {
    render(
      <MobileStickyActionBar
        {...baseProps}
        primaryDisabled
        showTreat={false}
      />,
    );

    const primary = screen.getByRole('button', { name: /Endorse & Forward/i });
    expect((primary as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: /Treat & Respond/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /More actions/i })).toBeNull();
  });

  it('keeps the primary action available when the assignment grants forward', () => {
    render(<MobileStickyActionBar {...baseProps} primaryDisabled={false} />);

    const primary = screen.getByRole('button', { name: /Endorse & Forward/i });
    expect((primary as HTMLButtonElement).disabled).toBe(false);
  });
});
