"use client";

import { useRef } from "react";
import { ThemeProvider } from "next-themes";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { BootstrapData } from "@/lib/server-bootstrap";
import { seedSidebarCounts } from "@/hooks/use-sidebar-counts";

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
  if (initialSidebarCounts && !sidebarSeededRef.current) {
    seedSidebarCounts(initialSidebarCounts);
    sidebarSeededRef.current = true;
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
