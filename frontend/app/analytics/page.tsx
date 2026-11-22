"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

/** Analytics hub lands on the first tab the user can access. */
export default function AnalyticsPage() {
  const router = useRouter();
  const {
    isVisibilityReady,
    showExecutiveDashboard,
    showPerformanceAnalytics,
    showDivisionAnalytics,
    showCaseAnalytics,
  } = useSidebarVisibility();

  // Redirect once permissions are known, and only when one of those answers
  // changes — the hook returns a fresh object on unrelated org updates.
  useEffect(() => {
    if (!isVisibilityReady) return;
    if (showExecutiveDashboard) {
      router.replace("/dashboard?tab=executive");
      return;
    }
    if (showPerformanceAnalytics) {
      router.replace("/dashboard?tab=performance");
      return;
    }
    if (showDivisionAnalytics) {
      router.replace("/dashboard?tab=divisions");
      return;
    }
    if (showCaseAnalytics) {
      router.replace("/dashboard?tab=cases");
      return;
    }
    router.replace("/dashboard");
  }, [
    router,
    isVisibilityReady,
    showExecutiveDashboard,
    showPerformanceAnalytics,
    showDivisionAnalytics,
    showCaseAnalytics,
  ]);

  return null;
}
