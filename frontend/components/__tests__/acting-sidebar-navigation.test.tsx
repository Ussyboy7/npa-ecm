import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SidebarVisibility } from "@/hooks/use-sidebar-visibility";

const state = vi.hoisted(() => ({
  pathname: "/dashboard",
  user: { id: "member-1", name: "Member" },
}));

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("@/hooks/use-current-user", () => ({ useCurrentUser: () => ({ currentUser: state.user, hydrated: true }) }));
vi.mock("@/hooks/use-sidebar-counts", () => ({ useSidebarCounts: () => ({ myInbox: 0, officeInbox: 0, pendingSignatures: 0, pendingApprovals: 0 }) }));
vi.mock("@/hooks/use-home-path", () => ({ useHomePath: () => "/dashboard" }));
vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SidebarContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SidebarHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SidebarGroup: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SidebarMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  useSidebar: () => ({ state: "expanded", toggleSidebar: vi.fn() }),
}));
vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CollapsibleContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("@/components/shared/SidebarNavItem", () => ({
  SidebarNavItem: ({ href, label }: { href: string; label: string }) => <a href={href}>{label}</a>,
  AdminNavItem: ({ href, label }: { href: string; label: string }) => <a href={href}>{label}</a>,
}));

import { AppSidebar } from "../AppSidebar";

function visibility(overrides: Partial<SidebarVisibility> = {}): SidebarVisibility {
  return {
    isVisibilityReady: true,
    showDashboard: true,
    showMyInbox: false,
    showMySent: false,
    showExecutiveApprovals: false,
    showDepartmentalApprovals: false,
    showNotifications: false,
    showOfficeInbox: false,
    showRegisterCorrespondence: false,
    showRegisteredCorrespondence: false,
    showOfficeSent: false,
    showMyCases: false,
    showOfficeCases: false,
    showAllCases: false,
    showCreateCase: false,
    showCaseTemplates: false,
    showSearchDocuments: false,
    showContentCapture: false,
    showFOIA: false,
    showFormsLibrary: false,
    showVerifySeal: false,
    showRecordsArchives: false,
    showPhysicalRecords: false,
    showDocumentsList: false,
    showNewDocument: false,
    showAssistantCalendar: false,
    showAnalyticsReports: false,
    showExecutiveDashboard: false,
    showPerformanceAnalytics: false,
    showDivisionAnalytics: false,
    showCaseAnalytics: false,
    showAdministration: true,
    showAdminDashboard: false,
    showOrganizationOffices: false,
    showOrganizationActing: true,
    showUsersRoles: false,
    showWorkflowSLA: false,
    showRecordsGovernance: false,
    showTemplates: false,
    showAuditCompliance: false,
    showAuditForms: false,
    showSystemHealth: false,
    showExternalEntities: false,
    showIntegration: false,
    showIntegrationHub: false,
    showSettings: true,
    showHelpGuides: true,
    showHelpdeskSubmit: false,
    showHelpdeskQueue: false,
    showDrmPolicies: false,
    showLegacyImport: false,
    ...overrides,
  };
}

afterEach(() => cleanup());

describe("Organization Acting sidebar entry", () => {
  it("routes office members to Acting without leaving a Tools duplicate", () => {
    render(<AppSidebar visibility={visibility()} />);

    expect(screen.getByRole("link", { name: "Organization" }).getAttribute("href")).toBe(
      "/admin/organization/acting",
    );
    expect(screen.queryByRole("link", { name: "Acting" })).toBeNull();
  });

  it("keeps admins at the Organization hub", () => {
    render(<AppSidebar visibility={visibility({ showOrganizationOffices: true })} />);

    expect(screen.getByRole("link", { name: "Organization" }).getAttribute("href")).toBe(
      "/admin/organization",
    );
    expect(screen.queryByRole("link", { name: "Acting" })).toBeNull();
  });

  it("sends external-entity-only users to External entities", () => {
    render(
      <AppSidebar
        visibility={visibility({ showOrganizationActing: false, showExternalEntities: true })}
      />,
    );

    expect(screen.getByRole("link", { name: "Organization" }).getAttribute("href")).toBe(
      "/admin/organization/entities",
    );
  });

  it("prefers Acting when both Acting and External entities are available", () => {
    render(
      <AppSidebar
        visibility={visibility({ showOrganizationActing: true, showExternalEntities: true })}
      />,
    );

    expect(screen.getByRole("link", { name: "Organization" }).getAttribute("href")).toBe(
      "/admin/organization/acting",
    );
  });
});