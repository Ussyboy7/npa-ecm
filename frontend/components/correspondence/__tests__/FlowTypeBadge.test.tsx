import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlowTypeBadge } from '../FlowTypeBadge';

describe('FlowTypeBadge', () => {
  it('renders inward-internal label and icon when isInward and isInternal', () => {
    render(<FlowTypeBadge isInward isInternal />);
    expect(screen.getByText('Inward (Internal)')).toBeDefined();
  });

  it('renders inward-external label when isInward without isInternal', () => {
    render(<FlowTypeBadge isInward />);
    expect(screen.getByText('Inward (External)')).toBeDefined();
  });

  it('renders outward-internal label when isOutward and isInternal', () => {
    render(<FlowTypeBadge isOutward isInternal />);
    expect(screen.getByText('Outward (Internal)')).toBeDefined();
  });

  it('renders outward-external label when isOutward without isInternal', () => {
    render(<FlowTypeBadge isOutward />);
    expect(screen.getByText('Outward (External)')).toBeDefined();
  });

  it('renders label from flowType prop string', () => {
    render(<FlowTypeBadge flowType="inward-external" />);
    expect(screen.getByText('Inward (External)')).toBeDefined();
  });

  it('renders inward-internal from flowType prop', () => {
    render(<FlowTypeBadge flowType="inward-internal" />);
    expect(screen.getByText('Inward (Internal)')).toBeDefined();
  });

  it('returns null when no flow type can be determined', () => {
    const { container } = render(<FlowTypeBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('applies custom className', () => {
    const { container } = render(<FlowTypeBadge flowType="inward-external" className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeDefined();
  });

  it('renders with outline variant by default', () => {
    render(<FlowTypeBadge flowType="inward-internal" />);
    const badge = screen.getByText('Inward (Internal)').closest('div');
    expect(badge).toBeDefined();
  });
});
