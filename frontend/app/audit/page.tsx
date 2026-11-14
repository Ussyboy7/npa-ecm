"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The audit trail now lives as a tab under Records & security.
 * Keep this route as a permanent entry point for bookmarks and links.
 */
export default function AuditRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "audit");
    const query = params.toString();
    router.replace(
      `/admin/records-governance${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, [router]);

  return null;
}
