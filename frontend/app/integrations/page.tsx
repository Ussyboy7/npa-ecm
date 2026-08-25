"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy path — Integration Hub lives under Platform. */
export default function IntegrationsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/platform/integrations");
  }, [router]);
  return null;
}
