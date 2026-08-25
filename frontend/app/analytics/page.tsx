"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

/** Analytics hub lands on the first tab the user can access. */
export default function AnalyticsPage() {
  const router = useRouter();
  const visibility = useSidebarVisibility();

  useEffect(() => {
    if (visibility.showExecutiveDashboard) {
      router.replace("/analytics/executive");
      return;
    }
    if (visibility.showPerformanceAnalytics) {
      router.replace("/analytics/performance");
      return;
    }
    if (visibility.showDivisionAnalytics) {
      router.replace("/analytics/divisions");
      return;
    }
    if (visibility.showCaseAnalytics) {
      router.replace("/analytics/cases");
    }
  }, [router, visibility]);

  return null;
}
