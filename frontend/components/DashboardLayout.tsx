"use client";

import { useState, useEffect, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';

// Dynamically import SidebarProvider with SSR disabled
const SidebarProvider = dynamic(
  () => import('@/components/ui/sidebar').then((mod) => ({ default: mod.SidebarProvider })),
  { ssr: false }
);

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render SidebarProvider, but it will be client-only due to dynamic import
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-muted/30 overflow-hidden">
        {mounted && <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 min-h-0 min-w-0 overflow-auto flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
