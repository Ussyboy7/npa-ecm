"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasTokens } from "@/lib/api-client";
import { NpaLoading } from "@/components/shared/NpaLoading";

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

  return <NpaLoading fullScreen message="Completing sign-in…" />;
}
