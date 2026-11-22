import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
const supportApi = vi.hoisted(() => ({
  fetchSupportTickets: vi.fn(),
  resolveSupportTicket: vi.fn(),
}));
const visibility = vi.hoisted(() => ({
  isVisibilityReady: true,
  showAdminDashboard: false,
  showSystemHealth: false,
  showHelpdeskQueue: false,
  showIntegrationHub: false,
  showLegacyImport: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/hooks/use-sidebar-visibility", () => ({
  useSidebarVisibility: () => visibility,
}));

vi.mock("@/lib/support-api", () => supportApi);
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ currentUser: { isSuperuser: false } }),
}));
vi.mock("@/hooks/use-user-permissions", () => ({
  useUserPermissions: () => ({ canAccessSystemHealth: false }),
}));

import AdminPage from "../../page";
import PlatformIndexPage from "../page";
import AdminHelpdeskPage from "../support/page";
import SystemHealthPage from "../health/page";
import LegacyImportPage from "../legacy-import/page";

beforeEach(() => {
  router.replace.mockClear();
  supportApi.fetchSupportTickets.mockReset();
  supportApi.fetchSupportTickets.mockResolvedValue([]);
  Object.assign(visibility, {
    isVisibilityReady: true,
    showAdminDashboard: false,
    showSystemHealth: false,
    showHelpdeskQueue: false,
    showIntegrationHub: false,
    showLegacyImport: false,
  });
});

afterEach(() => cleanup());

describe("Administration and Platform direct-route access", () => {
  it("shows a denial at the Administration overview", () => {
    render(<AdminPage />);

    expect(screen.getByText("Administration access required")).toBeTruthy();
  });

  it("shows a denial at the Platform index instead of redirecting", () => {
    render(<PlatformIndexPage />);

    expect(screen.getByText("Platform access required")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("denies Health without starting its polling loop", () => {
    render(<SystemHealthPage />);

    expect(screen.getByText("ICT Admin Access Required")).toBeTruthy();
  });

  it("denies Support without loading tickets", () => {
    render(<AdminHelpdeskPage />);

    expect(screen.getByText("Platform support access required")).toBeTruthy();
    expect(supportApi.fetchSupportTickets).not.toHaveBeenCalled();
  });

  it("denies Legacy import instead of exposing its controls", () => {
    render(<LegacyImportPage />);

    expect(screen.getByText("Legacy import access required")).toBeTruthy();
    expect(screen.queryByText("Download CSV template")).toBeNull();
  });
});
