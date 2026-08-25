"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SystemHealthRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/platform/health");
  }, [router]);
  return null;
}
