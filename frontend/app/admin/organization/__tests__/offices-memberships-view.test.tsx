import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routeState = vi.hoisted(() => ({
  search: "",
  listeners: new Set<() => void>(),
  router: { replace: vi.fn(), push: vi.fn() },
}));

const organization = vi.hoisted(() => ({
  directorates: [],
  divisions: [],
  departments: [],
  offices: [
    {
      id: "office-1",
      name: "Abuja Liaison Office",
      code: "ABJ",
      officeType: "department",
      isActive: true,
      directorateId: "",
      divisionId: "",
      departmentId: "",
      locationId: null,
      locationName: "",
      description: "",
      activeMemberCount: 2,
      activePrincipalName: "Amina Example",
    },
  ],
  officeMemberships: [],
  users: [
    { id: "user-1", name: "Amina Example", active: true },
    { id: "user-2", name: "Bala Example", active: true },
  ],
  isSyncing: false,
  deleteDirectorate: vi.fn(),
  deleteDivision: vi.fn(),
  deleteDepartment: vi.fn(),
  addOfficeMembership: vi.fn(),
  updateOfficeMembership: vi.fn(),
  deleteOfficeMembership: vi.fn(),
  refreshOrganizationData: vi.fn(),
  fetchOfficeMemberships: vi.fn(async (filters) => {
    organization.lastMembershipFilters = filters;
    return {
      count: 2,
      results: [
        {
          id: "membership-1",
          officeId: "office-1",
          officeName: "Abuja Liaison Office",
          userId: "user-1",
          userName: "Amina Example",
          assignmentRole: "principal",
          isPrimary: true,
          isActive: true,
          canRegister: false,
          canRoute: true,
          canApprove: true,
        },
        {
          id: "membership-2",
          officeId: "office-1",
          officeName: "Abuja Liaison Office",
          userId: "user-2",
          userName: "Bala Example",
          assignmentRole: "staff",
          isPrimary: false,
          isActive: true,
          canRegister: true,
          canRoute: false,
          canApprove: false,
        },
      ],
    };
  }),
  lastMembershipFilters: null as null | Record<string, unknown>,
}));

vi.mock("next/navigation", async () => {
  const React = await import("react");
  return {
    useRouter: () => routeState.router,
    useSearchParams: () => {
      const search = React.useSyncExternalStore(
        (listener) => {
          routeState.listeners.add(listener);
          return () => routeState.listeners.delete(listener);
        },
        () => routeState.search,
      );
      return new URLSearchParams(search);
    },
  };
});

vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => organization,
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({
    currentUser: { id: "admin-1", name: "Admin User", isSuperuser: true },
    hydrated: true,
  }),
}));

vi.mock("@/hooks/use-org-users", () => ({
  useOrgUsers: () => ({ users: organization.users, loading: false }),
}));

vi.mock("@/hooks/use-user-permissions", () => ({
  useUserPermissions: () => ({ canManageOrgStructure: true, canManageUsers: true, canManageRoles: true }),
}));

vi.mock("@/lib/api-client", () => ({ apiFetch: vi.fn(async () => []) }));
vi.mock("@/components/ClientErrorBoundary", () => ({
  ClientErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/help/ContextualHelp", () => ({ ContextualHelp: () => null }));
vi.mock("@/components/admin/OrganizationTabList", () => ({ OrganizationTabList: () => null }));
vi.mock("@/components/admin/PeopleAccessTab", () => ({ PeopleAccessTab: () => null }));
vi.mock("@/components/admin/DirectorateFormModal", () => ({ DirectorateFormModal: () => null }));
vi.mock("@/components/admin/DirectorateLeadershipDialog", () => ({ DirectorateLeadershipDialog: () => null }));
vi.mock("@/components/admin/DivisionFormModal", () => ({ DivisionFormModal: () => null }));
vi.mock("@/components/admin/DepartmentFormModal", () => ({ DepartmentFormModal: () => null }));
vi.mock("@/components/shared/AdminPageShell", () => ({
  AdminPageShell: ({
    title,
    subtitle,
    actions,
    stats,
    children,
  }: {
    title: string;
    subtitle: string;
    actions?: React.ReactNode;
    stats?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions}
      {stats}
      {children}
    </main>
  ),
}));

import OrganizationPage from "../page";

function renderOrganizationAt(search: string) {
  routeState.search = search;
  return render(<OrganizationPage />);
}

beforeEach(() => {
  routeState.search = "";
  routeState.router.replace.mockReset();
  routeState.router.push.mockReset();
  organization.fetchOfficeMemberships.mockClear();
  organization.lastMembershipFilters = null;
  const updateRoute = (href: string) => {
    routeState.search = href.split("?")[1] ?? "";
    routeState.listeners.forEach((listener) => listener());
  };
  routeState.router.replace.mockImplementation(updateRoute);
  routeState.router.push.mockImplementation(updateRoute);
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe("Organization offices memberships view", () => {
  it("does not redirect the obsolete memberships tab alias", async () => {
    renderOrganizationAt("tab=memberships");
    expect(await screen.findByText(/Build the hierarchy from directorates down to departments/i)).toBeDefined();
    expect(routeState.router.replace).toHaveBeenCalledWith("/admin/organization?tab=structure", { scroll: false });
    expect(screen.queryByRole("heading", { name: "Office memberships" })).toBeNull();
  });

  it("loads server-filtered memberships and preserves a selected office through Add Membership", async () => {
    const user = userEvent.setup();
    renderOrganizationAt("tab=offices&view=memberships&office=office-1&status=active&search=Amina&page=2");

    expect(await screen.findByRole("heading", { name: "Office memberships" })).toBeDefined();
    await waitFor(() => expect(organization.fetchOfficeMemberships).toHaveBeenCalled());
    expect(organization.lastMembershipFilters).toMatchObject({
      office: "office-1",
      isActive: true,
      search: "Amina",
      page: 2,
    });
    expect(screen.getByRole("combobox", { name: "Filter memberships by office" }).textContent).toContain("Abuja Liaison Office");
    expect(screen.getByText("Amina Example")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Add Membership" }));
    expect(screen.getByRole("combobox", { name: "Office" }).textContent).toContain("Abuja Liaison Office");
  });

  it("opens a selected office membership view from the office directory", async () => {
    const user = userEvent.setup();
    renderOrganizationAt("tab=offices");

    await user.click(await screen.findByRole("button", { name: "2 members" }));
    expect(await screen.findByRole("heading", { name: "Office memberships" })).toBeDefined();
    const pushedUrl = routeState.router.push.mock.calls.at(-1)?.[0] as string;
    const pushedParams = new URL(pushedUrl, "http://localhost").searchParams;
    expect(Object.fromEntries(pushedParams.entries())).toEqual({
      tab: "offices",
      view: "memberships",
      status: "active",
      page: "1",
      office: "office-1",
    });
    expect(routeState.router.push).toHaveBeenLastCalledWith(pushedUrl, { scroll: false });
  });
});
