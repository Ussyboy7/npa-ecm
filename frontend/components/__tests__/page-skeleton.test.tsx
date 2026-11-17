import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DetailSkeleton, ListSkeleton } from '../shared/PageSkeleton';

describe('page content skeletons', () => {
  it.each([
    ['list', <ListSkeleton rows={2} />],
    ['detail', <DetailSkeleton />],
  ])('keeps the %s skeleton aria-busy without a status loader', (_name, skeleton) => {
    const { container } = render(skeleton);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });
});