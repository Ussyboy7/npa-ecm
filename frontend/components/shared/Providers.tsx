"use client";

import { useRef } from "react";
import { ThemeProvider } from "next-themes";
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
  if (initialSidebarCounts && !sidebarSeededRef.current) {
    seedSidebarCounts(initialSidebarCounts);
    sidebarSeededRef.current = true;
  }
  if (initialOrgData?.user && !userSeededRef.current) {
    seedCurrentUserFromApi(initialOrgData.user);
    userSeededRef.current = true;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <OrganizationProvider initialData={initialOrgData}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}
