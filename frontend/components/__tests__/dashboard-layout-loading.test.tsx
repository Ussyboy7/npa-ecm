import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const visibilityState = vi.hoisted(() => {
  const base = {
    isVisibilityReady: false,
    showMyInbox: false,
    showOfficeInbox: false,
  };
  return { base, current: { ...base } };
});

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({
    currentUser: { id: 'user-1' },
    hydrated: true,
  }),
}));

vi.mock('@/hooks/use-sidebar-counts', () => ({
  useSidebarCounts: () => ({
    officeInbox: 0,
    myInbox: 0,
    delegated: 0,
    pendingApprovals: 0,
    pendingSignatures: 0,
  }),
}));

vi.mock('@/hooks/use-sidebar-visibility', () => ({
  useSidebarVisibility: () => visibilityState.current,
}));

vi.mock('@/hooks/use-home-path', () => ({
  useHomePath: () => '/dashboard',
}));

vi.mock('@/components/TopBar', () => ({
  TopBar: () => <header>Top bar</header>,
}));

import { DashboardLayout } from '../DashboardLayout';

describe('DashboardLayout', () => {
  it('renders the shell and page without a second full-screen loader while visibility resolves', () => {
    const renderLayout = () => (
      <DashboardLayout>
        <div>Page content</div>
      </DashboardLayout>
    );
    const { rerender } = render(renderLayout());

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Page content')).not.toBeNull();
    expect(screen.queryByRole('link', { name: /My Inbox/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Office Inbox/ })).toBeNull();

    visibilityState.current = {
      ...visibilityState.base,
      isVisibilityReady: true,
      showMyInbox: true,
      showOfficeInbox: true,
    };
    rerender(renderLayout());

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Page content')).not.toBeNull();
    expect(screen.getByRole('link', { name: /My Inbox/ })).not.toBeNull();
    expect(screen.getByRole('link', { name: /Office Inbox/ })).not.toBeNull();
  });
});
