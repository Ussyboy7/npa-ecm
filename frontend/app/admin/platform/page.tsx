"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

/** Platform hub lands on the first tab the user can access. */
export default function PlatformIndexPage() {
  const router = useRouter();
  const visibility = useSidebarVisibility();

  useEffect(() => {
    if (visibility.showSystemHealth) {
      router.replace("/admin/platform/health");
      return;
    }
    if (visibility.showHelpdeskQueue) {
      router.replace("/admin/platform/support");
      return;
    }
    if (visibility.showIntegrationHub) {
      router.replace("/admin/platform/integrations");
      return;
    }
    if (visibility.showLegacyImport) {
      router.replace("/admin/platform/legacy-import");
    }
  }, [router, visibility]);

  return null;
}
