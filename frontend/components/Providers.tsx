"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Toaster as ToastToaster } from "@/components/ui/toaster";
import { CorrespondenceProvider } from "@/contexts/CorrespondenceContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

// Dynamically import TooltipProvider with SSR disabled
// Since it's already client-only, no need for mounted check
const TooltipProvider = dynamic(
  () => import("@/components/ui/tooltip").then((mod) => ({ default: mod.TooltipProvider })),
  { ssr: false }
);

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
          <ClientErrorBoundary>
            <TooltipProvider>
              {children}
              <Toaster />
              <ToastToaster />
            </TooltipProvider>
          </ClientErrorBoundary>
        </CorrespondenceProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}

