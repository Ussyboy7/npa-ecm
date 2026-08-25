"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — Case Templates live under Template Hub. */
export default function CaseTemplatesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/templates-hub?tab=cases");
  }, [router]);

  return null;
}
