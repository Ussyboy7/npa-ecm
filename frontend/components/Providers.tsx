"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as ToastToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CorrespondenceProvider } from "@/contexts/CorrespondenceContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <OrganizationProvider>
        <CorrespondenceProvider>
          <TooltipProvider>
            {children}
            <Toaster />
            <ToastToaster />
          </TooltipProvider>
        </CorrespondenceProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}

