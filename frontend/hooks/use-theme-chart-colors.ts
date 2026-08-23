"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  getComplianceChartColor,
  getDivisionComplianceColor,
  getPriorityChartColor,
  readThemeHsl,
  THEME_HSL,
} from "@/lib/theme-colors";

/** Theme-aware chart palette — re-reads CSS variables when theme changes. */
export function useThemeChartColors() {
  const { resolvedTheme } = useTheme();

  return useMemo(
    () => ({
      priorityColor: getPriorityChartColor,
      complianceColor: getComplianceChartColor,
      divisionComplianceColor: getDivisionComplianceColor,
      lineCompleted: readThemeHsl("--success", THEME_HSL.success),
      linePending: readThemeHsl("--destructive", THEME_HSL.destructive),
      lineInfo: readThemeHsl("--info", THEME_HSL.info),
      gridStroke: readThemeHsl("--border", THEME_HSL.border),
      axisFill: readThemeHsl("--muted-foreground", THEME_HSL.mutedForeground),
    }),
    [resolvedTheme],
  );
}
