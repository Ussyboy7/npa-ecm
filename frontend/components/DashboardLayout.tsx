"use client";

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';

const SidebarProvider = dynamic(
  () => import('@/components/ui/sidebar').then((mod) => ({ default: mod.SidebarProvider })),
  { ssr: false }
);

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => (
  <SidebarProvider>
    <div className="h-screen flex w-full bg-muted/30 overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 min-h-0 min-w-0 overflow-auto overscroll-contain flex flex-col">
          {children}
        </main>
      </div>
    </div>
  </SidebarProvider>
);
