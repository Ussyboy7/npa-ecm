"use client";

import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-muted/30 overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
