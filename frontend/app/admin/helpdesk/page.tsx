"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HelpdeskRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/platform/support");
  }, [router]);
  return null;
}
