import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({ replace: replaceMock }),
}));

const visibility = vi.hoisted(() => ({
  isVisibilityReady: true,
  showExecutiveDashboard: true,
  showPerformanceAnalytics: true,
  showDivisionAnalytics: true,
  showCaseAnalytics: true,
}));

vi.mock("@/hooks/use-sidebar-visibility", () => ({
  useSidebarVisibility: () => visibility,
}));

import AnalyticsPage from "../page";
import ExecutiveDashboardPage from "../executive/page";
import PerformanceAnalyticsPage from "../performance/page";
import DivisionAnalyticsPage from "../divisions/page";
import CaseAnalyticsPage from "../cases/page";

beforeEach(() => {
  redirectMock.mockClear();
  replaceMock.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("legacy analytics redirects", () => {
  it("sends the analytics hub to the first permitted Dashboard tab", async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard?tab=executive");
    });
  });

  it.each([
    ["executive", ExecutiveDashboardPage, "/dashboard?tab=executive"],
    ["performance", PerformanceAnalyticsPage, "/dashboard?tab=performance"],
    ["divisions", DivisionAnalyticsPage, "/dashboard?tab=divisions"],
    ["cases", CaseAnalyticsPage, "/dashboard?tab=cases"],
  ])("redirects /analytics/%s to the Dashboard tab", (_slug, Page, target) => {
    Page();

    expect(redirectMock).toHaveBeenCalledWith(target);
  });
});
