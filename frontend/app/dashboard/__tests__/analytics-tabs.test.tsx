import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));

const state = vi.hoisted(() => ({
  visibility: {
    isVisibilityReady: true,
    showExecutiveDashboard: true,
    showPerformanceAnalytics: true,
    showDivisionAnalytics: true,
    showCaseAnalytics: true,
  },
}));

vi.mock("@/hooks/use-sidebar-visibility", () => ({
  useSidebarVisibility: () => state.visibility,
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({
    currentUser: {
      id: "user-1",
      name: "Test User",
      employeeId: "NPA-001",
      systemRole: "Records Officer",
    },
  }),
}));

vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => ({ divisions: [] }),
}));

vi.mock("@/hooks/use-role-checks", () => ({
  useRoleChecks: () => ({ isSecretary: false }),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(() => new Promise(() => {})),
}));

vi.mock("@/lib/sla-client", () => ({
  fetchSLATargets: vi.fn(() => new Promise(() => {})),
  DEFAULT_SLA_TARGETS: { urgent: 1, high: 2, medium: 3, low: 4 },
}));

vi.mock("@/app/dashboard/components/SecretaryDashboardContent", () => ({
  default: () => null,
}));

vi.mock("@/components/analytics/ExecutiveDashboardTab", () => ({
  ExecutiveDashboardTab: () => <div>Executive analytics panel</div>,
}));
vi.mock("@/components/analytics/PerformanceAnalyticsTab", () => ({
  PerformanceAnalyticsTab: () => <div>Performance analytics panel</div>,
}));
vi.mock("@/components/analytics/DivisionAnalyticsTab", () => ({
  DivisionAnalyticsTab: () => <div>Divisions analytics panel</div>,
}));
vi.mock("@/components/analytics/CaseAnalyticsTab", () => ({
  CaseAnalyticsTab: () => <div>Cases analytics panel</div>,
}));

vi.mock("@/components/analytics/AnalyticsHeaderSlots", () => ({
  ANALYTICS_HEADER_SLOT_IDS: {
    stats: "analytics-header-stats-slot",
    actions: "analytics-header-actions-slot",
  },
}));

import DashboardPage from "../page";

beforeEach(() => {
  searchParams = new URLSearchParams();
  router.replace.mockClear();
  state.visibility = {
    isVisibilityReady: true,
    showExecutiveDashboard: true,
    showPerformanceAnalytics: true,
    showDivisionAnalytics: true,
    showCaseAnalytics: true,
  };
});

afterEach(() => {
  cleanup();
});

describe("Dashboard analytics tabs", () => {
  it("keeps My work as the default tab", () => {
    render(<DashboardPage />);

    expect(screen.getByRole("tab", { name: "My work" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Priority Inbox")).toBeTruthy();
  });

  it("opens the analytics tab named in the URL", () => {
    searchParams = new URLSearchParams("tab=cases");

    render(<DashboardPage />);

    expect(screen.getByRole("tab", { name: "Cases" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Cases analytics panel")).toBeTruthy();
  });

  it("hides analytics tabs the user cannot access and falls back to My work", async () => {
    searchParams = new URLSearchParams("tab=executive");
    state.visibility = {
      ...state.visibility,
      showExecutiveDashboard: false,
      showPerformanceAnalytics: false,
      showDivisionAnalytics: false,
      showCaseAnalytics: false,
    };

    render(<DashboardPage />);

    expect(screen.queryByRole("tab", { name: "Executive overview" })).toBeNull();
    expect(screen.getByText("Priority Inbox")).toBeTruthy();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard", { scroll: false });
    });
  });

  it("writes tab changes to the URL", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByRole("tab", { name: "Performance" }));

    expect(router.replace).toHaveBeenCalledWith("/dashboard?tab=performance", { scroll: false });
    expect(screen.getByText("Performance analytics panel")).toBeTruthy();
  });
});
