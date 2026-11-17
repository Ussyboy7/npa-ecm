import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navState = vi.hoisted(() => ({
  pathname: '/dashboard',
  replace: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  hydrated: false,
  currentUser: null as null | { id: string },
}));

const visibilityState = vi.hoisted(() => ({
  isVisibilityReady: false,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
  useRouter: () => ({ replace: navState.replace }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}));

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => authState,
}));

vi.mock('@/hooks/use-sidebar-visibility', () => ({
  useSidebarVisibility: () => visibilityState,
}));

import { AuthzGate } from '../shared/Providers';

describe('AuthzGate boot gate', () => {
  beforeEach(() => {
    navState.pathname = '/dashboard';
    navState.replace.mockClear();
    authState.hydrated = false;
    authState.currentUser = null;
    visibilityState.isVisibilityReady = false;
  });

  it('shows one branded loader until auth and sidebar visibility are both ready', () => {
    const renderGate = () => (
      <AuthzGate>
        <div>Route content</div>
      </AuthzGate>
    );
    const { rerender } = render(renderGate());

    expect(screen.getByRole('status').textContent).toContain('Loading workspace');
    expect(screen.queryByText('Route content')).toBeNull();

    authState.hydrated = true;
    authState.currentUser = { id: 'user-1' };
    rerender(renderGate());

    expect(screen.getByRole('status').textContent).toContain('Loading workspace');
    expect(screen.queryByText('Route content')).toBeNull();

    visibilityState.isVisibilityReady = true;
    rerender(renderGate());

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Route content')).not.toBeNull();
  });

  it.each(['/', '/login', '/set-password', '/verify/serial-1', '/foia/public', '/auth/callback'])(
    'never shows the boot loader on public route %s',
    (pathname) => {
      navState.pathname = pathname;

      render(
        <AuthzGate>
          <div>Public route content</div>
        </AuthzGate>,
      );

      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.getByText('Public route content')).not.toBeNull();
    },
  );
});