"use client";

import { ThemeProvider } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isPublicAppPath } from "@/lib/app-shell-paths";

function AuthzGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, hydrated } = useCurrentUser();

  const isPublicRoute = isPublicAppPath(pathname);

  const canRender = useMemo(() => {
    if (isPublicRoute) return true;
    if (!hydrated || !currentUser) return false;
    return true;
  }, [currentUser, hydrated, isPublicRoute]);

  useEffect(() => {
    if (isPublicRoute || !hydrated) return;
    if (!currentUser) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("redirect_after_login", window.location.pathname);
      }
      router.replace("/login");
    }
  }, [currentUser, hydrated, isPublicRoute, router, pathname]);

  if (!canRender) return null;
  return <>{children}</>;
}

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
          <AuthzGate>{children}</AuthzGate>
          <Toaster />
        </TooltipProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}
