import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/analytics/executive",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/use-sidebar-visibility", () => ({
  useSidebarVisibility: () => ({
    showExecutiveDashboard: true,
    showPerformanceAnalytics: true,
    showDivisionAnalytics: true,
    showCaseAnalytics: true,
  }),
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({
    currentUser: { id: "admin-1", systemRole: "Super Admin" },
    hydrated: true,
  }),
}));

vi.mock("@/components/shared/PermissionGate", () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/shared/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ClientErrorBoundary", () => ({
  ClientErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/help/ContextualHelp", () => ({
  ContextualHelp: () => null,
}));

vi.mock("@/lib/analytics-client", () => ({
  fetchExecutiveAnalytics: vi.fn(async () => ({
    metadata: { rangeDays: 30, generatedAt: "2026-11-16T00:00:00Z" },
    divisionMetrics: [],
    departmentActivity: [],
    delayedApprovals: [],
    pendingLeadership: [],
    weeklyTrend: [],
    sensitivityBreakdown: [],
  })),
}));

vi.mock("@/lib/sla-client", () => ({
  fetchEnhancedSLAAnalytics: vi.fn(async () => ({
    metadata: { rangeDays: 30, generatedAt: "2026-11-16T00:00:00Z" },
    summary: {
      total: 1,
      compliant: 1,
      breached: 0,
      atRisk: 0,
      complianceRate: 100,
      avgDaysToBreach: 0,
    },
    byPriority: [],
    byDivision: [],
    slaTargets: {},
  })),
  fetchEfficiencyAnalysis: vi.fn(async () => ({
    metadata: { rangeDays: 30, generatedAt: "2026-11-16T00:00:00Z" },
    processEfficiency: {
      avgHandoffs: 0,
      firstTouchResolutionRate: 0,
      totalCorrespondence: 0,
      totalCompleted: 0,
    },
    timeAnalysis: {
      avgProcessingHours: 0,
      peakActivityHours: [],
      weekendActivityPercent: 0,
    },
    staffMetrics: {
      activeStaff: 0,
      avgItemsPerStaff: 0,
      utilizationRate: 0,
      topPerformers: [],
    },
    bottlenecks: [],
  })),
  fetchEscalations: vi.fn(async () => []),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(async () => ({
    summary: {
      total_cases: 1,
      open_cases: 1,
      in_progress_cases: 0,
      resolved_cases: 0,
      closed_cases: 0,
      archived_cases: 0,
      cases_with_packages: 0,
      avg_resolution_days: null,
    },
    breakdown: {
      by_status: { open: 1 },
      by_type: { complaint: 1 },
      by_priority: { medium: 1 },
    },
    trends: { cases_over_time: [] },
    top_assignments: {
      by_division: [],
      by_department: [],
      by_user: [],
    },
    range_days: 30,
  })),
}));

vi.mock("recharts", () => ({
  Area: () => null,
  AreaChart: () => null,
  Bar: () => null,
  BarChart: () => null,
  CartesianGrid: () => null,
  Cell: () => null,
  LabelList: () => null,
  Legend: () => null,
  Line: () => null,
  LineChart: () => null,
  Pie: () => null,
  PieChart: () => null,
  ResponsiveContainer: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

import ExecutiveDashboardPage from "../executive/page";
import CaseAnalyticsPage from "../cases/page";

const precedes = (earlier: Element, later: Element) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("Analytics layout", () => {
  it("keeps Executive header actions and statistics above the tab strip", async () => {
    render(<ExecutiveDashboardPage />);

    const refresh = await screen.findByRole("button", { name: "Refresh" });
    const stats = await screen.findByRole("group", { name: "Summary statistics" });
    const tabs = screen.getByRole("tablist");
    const range = screen.getByRole("group", { name: "Analytics date range" });

    expect(precedes(refresh, stats)).toBe(true);
    expect(precedes(stats, tabs)).toBe(true);
    expect(precedes(tabs, range)).toBe(true);
  });

  it("keeps Cases header actions and statistics above the tab strip", async () => {
    render(<CaseAnalyticsPage />);

    const refresh = await screen.findByRole("button", { name: "Refresh" });
    const stats = await screen.findByRole("group", { name: "Summary statistics" });
    const tabs = screen.getByRole("tablist");
    const period = screen.getByRole("combobox", { name: "Case analytics period" });

    expect(precedes(refresh, stats)).toBe(true);
    expect(precedes(stats, tabs)).toBe(true);
    expect(precedes(tabs, period)).toBe(true);
  });
});
