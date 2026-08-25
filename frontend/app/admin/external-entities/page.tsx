"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExternalEntitiesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/organization/entities");
  }, [router]);
  return null;
}
