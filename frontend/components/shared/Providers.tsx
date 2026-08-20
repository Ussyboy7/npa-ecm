"use client";

import { useRef } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { BootstrapData } from "@/lib/server-bootstrap";
import { seedSidebarCounts } from "@/hooks/use-sidebar-counts";
import { seedCurrentUserFromApi } from "@/hooks/use-current-user";

type ProvidersProps = {
  children: React.ReactNode;
  initialOrgData?: BootstrapData | null;
  initialSidebarCounts?: Record<string, number> | null;
};

export function Providers({
  children,
  initialOrgData = null,
  initialSidebarCounts = null,
}: ProvidersProps) {
  const sidebarSeededRef = useRef(false);
  const userSeededRef = useRef(false);

  // Populate module caches during render (before children mount) without notifying
  // listeners — notify would call setState in already-mounted subscribers.
  if (initialSidebarCounts && !sidebarSeededRef.current) {
    seedSidebarCounts(initialSidebarCounts, { notify: false });
    sidebarSeededRef.current = true;
  }
  if (initialOrgData?.user && !userSeededRef.current) {
    seedCurrentUserFromApi(initialOrgData.user, { notify: false });
    userSeededRef.current = true;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="npa-ecm-theme"
      disableTransitionOnChange
    >
      <OrganizationProvider initialData={initialOrgData}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}
