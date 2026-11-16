"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasTokens } from "@/lib/api-client";
import { LoadingState } from "@/components/shared/LoadingState";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("sso_error");

    if (error) {
      router.replace(`/login?sso_error=${encodeURIComponent(error)}`);
      return;
    }

    if (hasTokens()) {
      router.replace("/dashboard");
      return;
    }

    router.replace("/login");
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoadingState message="Completing sign-in…" />
    </div>
  );
}
