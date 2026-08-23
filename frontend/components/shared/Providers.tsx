"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { TooltipProvider } from "@/components/ui/tooltip";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      enableColorScheme={false}
      storageKey="npa-ecm-theme"
      disableTransitionOnChange
    >
      <OrganizationProvider>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}
