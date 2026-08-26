"use client";

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { isPublicAppPath } from '@/lib/app-shell-paths';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // During the first render Next may not have resolved the pathname yet.
  // Avoid flashing the authenticated dashboard shell on public routes.
  if (!pathname || isPublicAppPath(pathname)) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
