"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

/** Analytics hub lands on the first tab the user can access. */
export default function AnalyticsPage() {
  const router = useRouter();
  const visibility = useSidebarVisibility();

  useEffect(() => {
    if (!visibility.isVisibilityReady) return;
    if (visibility.showExecutiveDashboard) {
      router.replace("/dashboard?tab=executive");
      return;
    }
    if (visibility.showPerformanceAnalytics) {
      router.replace("/dashboard?tab=performance");
      return;
    }
    if (visibility.showDivisionAnalytics) {
      router.replace("/dashboard?tab=divisions");
      return;
    }
    if (visibility.showCaseAnalytics) {
      router.replace("/dashboard?tab=cases");
      return;
    }
    router.replace("/dashboard");
  }, [router, visibility]);

  return null;
}
