"use client";

import { ThemeProvider } from "next-themes";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <OrganizationProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}