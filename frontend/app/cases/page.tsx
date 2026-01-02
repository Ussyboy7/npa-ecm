"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /cases to /cases/my
 * Cases are now separate pages instead of tabs
 */
export default function CasesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cases/my');
  }, [router]);

  return null;
}
