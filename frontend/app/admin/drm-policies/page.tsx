"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DrmPoliciesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/records-governance/drm");
  }, [router]);
  return null;
}
