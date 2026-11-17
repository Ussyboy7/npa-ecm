"use client";

import { ThemeProvider } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { isPublicAppPath } from "@/lib/app-shell-paths";
import { WorkspaceLoading } from "@/components/shared/WorkspaceLoading";

function ProtectedAuthGate({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const { isVisibilityReady } = useSidebarVisibility();

  useEffect(() => {
    if (!hydrated) return;
    if (!currentUser) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("redirect_after_login", pathname);
      }
      router.replace("/login");
    }
  }, [currentUser, hydrated, router, pathname]);

  // One boot gate for both auth and permission data: the branded loader is
  // shown once, then the shell and route appear together.
  if (!hydrated) {
    return <WorkspaceLoading />;
  }
  if (!currentUser) return null;
  if (!isVisibilityReady) return <WorkspaceLoading />;
  return <>{children}</>;
}

export function AuthzGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicAppPath(pathname)) return <>{children}</>;

  return <ProtectedAuthGate pathname={pathname}>{children}</ProtectedAuthGate>;
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
