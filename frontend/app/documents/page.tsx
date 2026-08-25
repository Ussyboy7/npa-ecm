"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function DocumentsLegacyRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `/dms?${qs}` : "/dms");
  }, [router, searchParams]);

  return (
    <div className="container mx-auto p-6">
      <div className="rounded-xl border border-border/60 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Redirecting to Document Management…</p>
      </div>
    </div>
  );
}

export default function DocumentsLegacyRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6">
          <div className="rounded-xl border border-border/60 py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Redirecting to Document Management…</p>
          </div>
        </div>
      }
    >
      <DocumentsLegacyRedirect />
    </Suspense>
  );
}
