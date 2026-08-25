"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyImportRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/platform/legacy-import");
  }, [router]);
  return null;
}
