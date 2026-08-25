"use client";

import Image from "next/image";
import { ThemeProvider } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isPublicAppPath } from "@/lib/app-shell-paths";
import { NPA_BRAND_NAME, NPA_LOGO_URL } from "@/lib/branding";

function AuthzGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, hydrated } = useCurrentUser();

  const isPublicRoute = isPublicAppPath(pathname);

  useEffect(() => {
    if (isPublicRoute || !hydrated) return;
    if (!currentUser) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("redirect_after_login", window.location.pathname);
      }
      router.replace("/login");
    }
  }, [currentUser, hydrated, isPublicRoute, router, pathname]);

  if (isPublicRoute) return <>{children}</>;
  // Hydration: branded full-screen loader — shell + route appear atomically after.
  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6">
        <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border flex-shrink-0">
          <Image src={NPA_LOGO_URL} alt={NPA_BRAND_NAME} fill unoptimized className="object-contain p-1.5" sizes="48px" priority />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading workspace…
        </div>
      </div>
    );
  }
  // Authenticated app → AppShell + route. Logout is hard nav to /login, no intermediate loader.
  if (!currentUser) return null;
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
