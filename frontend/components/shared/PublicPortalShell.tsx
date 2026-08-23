import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";

interface PublicPortalShellProps {
  children: ReactNode;
  /** Short label under the NPA ECM title, e.g. "FOIA Request Portal" */
  portalSubtitle?: string;
}

export function PublicPortalShell({
  children,
  portalSubtitle = "Public Portal",
}: PublicPortalShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Image
              src={NPA_LOGO_URL}
              alt={NPA_BRAND_NAME}
              width={40}
              height={40}
              className="rounded"
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">NPA ECM</h1>
              <p className="text-xs text-muted-foreground">{portalSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-16 border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Nigerian Ports Authority. All rights reserved.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/70">
            Electronic Correspondence Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
