import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const routeState = vi.hoisted(() => ({
  search: "tab=audit",
  router: { replace: vi.fn(), push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routeState.router,
  useSearchParams: () => new URLSearchParams(routeState.search),
  usePathname: () => "/admin/records-governance",
}));

vi.mock("@/hooks/use-sidebar-visibility", () => ({
  useSidebarVisibility: () => ({
    showRecordsGovernance: false,
    showDrmPolicies: false,
    showAuditCompliance: true,
  }),
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({
    currentUser: { id: "admin-1", systemRole: "Super Admin" },
    hydrated: true,
  }),
}));

vi.mock("@/hooks/use-org-users", () => ({
  useOrgUsers: () => ({ users: [] }),
}));

vi.mock("@/components/ClientErrorBoundary", () => ({
  ClientErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/help/ContextualHelp", () => ({
  ContextualHelp: () => null,
}));

vi.mock("@/lib/api/audit", () => ({
  getActivityLogs: vi.fn(async (params: { action?: string; success?: boolean }) => ({
    count: params.action === "user_login" ? 56 : params.success === false ? 0 : 323,
    results: [],
    totalPages: 1,
  })),
  downloadComplianceExport: vi.fn(),
}));

vi.mock("@/lib/records-api", () => ({
  approveDisposalRequest: vi.fn(),
  completeDisposalRequest: vi.fn(),
  createLegalHold: vi.fn(),
  createRetentionSchedule: vi.fn(),
  downloadEdiscoveryExport: vi.fn(),
  fetchDisposalRequests: vi.fn(async () => []),
  fetchLegalHolds: vi.fn(async () => []),
  fetchRecordsSummary: vi.fn(async () => ({})),
  fetchRetentionSchedules: vi.fn(async () => []),
  generateDueDisposalRequests: vi.fn(),
  rejectDisposalRequest: vi.fn(),
  releaseLegalHold: vi.fn(),
}));

import RecordsGovernancePage from "../page";

const precedes = (earlier: Element, later: Element) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

beforeEach(() => {
  routeState.router.replace.mockReset();
  routeState.router.push.mockReset();
});

describe("Records and security audit layout", () => {
  it("keeps audit statistics and the More menu above the tab strip", async () => {
    render(<RecordsGovernancePage />);

    const tabList = await screen.findByRole("tablist");
    const moreButton = await screen.findByRole("button", { name: "More" });
    const statsLabel = await screen.findByText("Total Events");

    await waitFor(() => {
      expect(precedes(moreButton, tabList)).toBe(true);
      expect(precedes(statsLabel, tabList)).toBe(true);
    });
  });
});
