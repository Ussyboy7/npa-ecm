import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listActingAppointments: vi.fn(async () => []),
  listActingRequests: vi.fn(async () => [{
    id: "request-1",
    office: "office-1",
    officeName: "ICT",
    officeCode: "ICT",
    principal: "principal-1",
    principalName: "Principal One",
    requestedBy: "member-1",
    requestedByName: "Member One",
    suggestedActingUser: null,
    suggestedActingUserName: "",
    reason: "Leave",
    pendingItemCount: 2,
    status: "pending" as const,
    resolvedBy: null,
    resolvedByName: "",
    resolvedAt: null,
    resolutionNote: "",
    appointment: null,
    createdAt: "2026-11-16T00:00:00Z",
  }]),
}));

const session = vi.hoisted(() => ({
  user: { id: "principal-1", isSuperuser: false, rolePermissions: {} as Record<string, boolean> },
  officeMemberships: [] as Array<{ id: string; officeId: string; officeName: string; userId: string; assignmentRole: string; isActive: boolean }>,
  users: [] as unknown[],
}));

vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => ({
    offices: [],
    officeMemberships: session.officeMemberships,
    myOfficeMemberships: session.officeMemberships,
    myOfficeMembershipsLoaded: true,
  }),
}));
vi.mock("@/hooks/use-org-users", () => ({ useOrgUsers: () => ({ users: session.users, loading: false }) }));
vi.mock("@/hooks/use-current-user", () => ({ useCurrentUser: () => ({ currentUser: session.user }) }));
vi.mock("@/lib/api/acting-appointments", () => ({
  appointActing: vi.fn(),
  dismissActingRequest: vi.fn(),
  endActingAppointment: vi.fn(),
  getEligibleActingCandidates: vi.fn(async () => []),
  getMyActingAppointments: vi.fn(async () => []),
  getMyPrincipalActingAppointments: vi.fn(async () => []),
  listActingAppointments: api.listActingAppointments,
  listActingRequests: api.listActingRequests,
}));
vi.mock("@/lib/office-memberships-client", () => ({
  listOfficeMembershipsForOffice: vi.fn(async () => []),
}));
vi.mock("@/components/admin/OrganizationTabList", () => ({ OrganizationTabList: () => null }));
vi.mock("@/components/shared/AdminPageShell", () => ({
  AdminPageShell: ({ actions, children }: React.PropsWithChildren<{ actions?: React.ReactNode }>) => (
    <main>{actions}{children}</main>
  ),
}));
vi.mock("@/components/shared/ListRowCard", () => ({
  ListRowCard: ({ actions, children }: React.PropsWithChildren<{ actions?: React.ReactNode }>) => (
    <article>{children}{actions}</article>
  ),
}));
vi.mock("@/components/shared/PermissionDeniedCard", () => ({
  PermissionDeniedCard: ({ title, fallbackMessage }: { title: string; fallbackMessage: string }) => (
    <div><h1>{title}</h1><p>{fallbackMessage}</p></div>
  ),
}));
vi.mock("@/components/ui/sonner", () => ({ toast: vi.fn() }));

import ActingAppointmentsPage from "../page";

beforeEach(() => {
  session.user = { id: "principal-1", isSuperuser: false, rolePermissions: {} };
  session.officeMemberships = [];
  session.users = [];
  api.listActingAppointments.mockClear();
  api.listActingRequests.mockClear();
});

afterEach(() => cleanup());

describe("Organization Acting access", () => {
  it("gives an office member only self-service data and actions", async () => {
    session.officeMemberships = [{ id: "member-1", officeId: "office-1", officeName: "ICT", userId: "principal-1", assignmentRole: "principal", isActive: true }];

    render(<ActingAppointmentsPage />);

    expect(await screen.findByRole("tab", { name: "My appointments" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Appoint acting" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Request acting" })).toBeTruthy();
    expect(api.listActingAppointments).not.toHaveBeenCalled();
    expect(api.listActingRequests).toHaveBeenCalledWith({ requestedBy: "principal-1" });
    expect(api.listActingRequests).toHaveBeenCalledWith({ principal: "principal-1" });
  });

  it("denies users who are neither admins nor active office members", () => {
    render(<ActingAppointmentsPage />);

    expect(screen.getByText("Organization Acting access required")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "My appointments" })).toBeNull();
    expect(api.listActingAppointments).not.toHaveBeenCalled();
    expect(api.listActingRequests).not.toHaveBeenCalled();
  });

  it("allows user managers to appoint and dismiss acting requests", async () => {
    session.user = {
      id: "admin-1",
      isSuperuser: false,
      rolePermissions: { can_manage_users: true },
    };

    render(<ActingAppointmentsPage />);

    expect(await screen.findByRole("button", { name: "Appoint acting" })).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: /Requests/ }));
    expect(await screen.findByRole("button", { name: "Dismiss" })).toBeTruthy();
    await waitFor(() => {
      expect(api.listActingRequests).toHaveBeenCalledWith({ status: "pending" });
    });
  });
});