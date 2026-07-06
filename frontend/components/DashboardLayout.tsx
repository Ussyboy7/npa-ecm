"use client";

import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { SkipToContent } from '@/components/shared/SkipToContent';
import { SidebarProvider } from '@/components/ui/sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => (
  <SidebarProvider>
    <SkipToContent />
    <div className="h-screen flex w-full bg-muted/30 overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <TopBar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-h-0 min-w-0 overflow-auto overscroll-contain flex flex-col focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  </SidebarProvider>
);
