import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OfficeMembership } from "@/lib/organization-types";

const workspace = vi.hoisted(() => ({
  renders: [] as Array<{ mode: string; membershipIds: string[] }>,
}));

const session = vi.hoisted(() => ({
  user: { id: "member-1", isSuperuser: false, rolePermissions: {} as Record<string, boolean> },
  myOfficeMemberships: [] as OfficeMembership[],
  myOfficeMembershipsLoaded: true,
}));

// Capture the scope the page hands to the workspace: mode and which memberships.
vi.mock("@/components/acting/ActingWorkspace", async () => {
  const ReactModule = await import("react");
  return {
    ActingWorkspace: ReactModule.forwardRef(function MockActingWorkspace(
      props: { mode: string; officeMemberships: OfficeMembership[] },
      _ref,
    ) {
      void _ref;
      workspace.renders.push({
        mode: props.mode,
        membershipIds: (props.officeMemberships ?? []).map((membership) => membership.id),
      });
      return null;
    }),
  };
});
vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => ({
    offices: [],
    myOfficeMemberships: session.myOfficeMemberships,
    myOfficeMembershipsLoaded: session.myOfficeMembershipsLoaded,
  }),
}));
vi.mock("@/hooks/use-org-users", () => ({ useOrgUsers: () => ({ users: [], loading: false }) }));
vi.mock("@/hooks/use-current-user", () => ({ useCurrentUser: () => ({ currentUser: session.user }) }));
vi.mock("@/components/admin/OrganizationTabList", () => ({ OrganizationTabList: () => null }));
vi.mock("@/components/shared/AdminPageShell", () => ({
  AdminPageShell: ({ actions, children }: React.PropsWithChildren<{ actions?: React.ReactNode }>) => (
    <main>{actions}{children}</main>
  ),
}));
vi.mock("@/components/shared/PermissionDeniedCard", () => ({
  PermissionDeniedCard: ({ title, fallbackMessage }: { title: string; fallbackMessage: string }) => (
    <div><h1>{title}</h1><p>{fallbackMessage}</p></div>
  ),
}));

import ActingAppointmentsPage from "../page";

function membership(id: string, userId: string): OfficeMembership {
  return {
    id,
    userId,
    officeId: `office-${id}`,
    officeName: id,
    assignmentRole: "principal",
    isPrimary: false,
    canRegister: false,
    canRoute: false,
    canApprove: false,
    isActive: true,
  };
}

const lastRender = () => workspace.renders[workspace.renders.length - 1];

beforeEach(() => {
  workspace.renders.length = 0;
  session.user = { id: "member-1", isSuperuser: false, rolePermissions: {} };
  session.myOfficeMemberships = [];
  session.myOfficeMembershipsLoaded = true;
});

afterEach(() => cleanup());

describe("Organization Acting data scope", () => {
  it("keeps an office member to their own memberships without loading the organization table", async () => {
    session.myOfficeMemberships = [membership("own", "member-1")];

    render(<ActingAppointmentsPage />);

    await waitFor(() => expect(workspace.renders.length).toBeGreaterThan(0));
    expect(lastRender()).toEqual({ mode: "self-service", membershipIds: ["own"] });
  });

  it("renders the admin workspace without loading organization-wide memberships", async () => {
    session.user = { id: "admin-1", isSuperuser: false, rolePermissions: { can_manage_users: true } };
    session.myOfficeMemberships = [membership("admin-own", "admin-1")];
    session.myOfficeMembershipsLoaded = false;

    render(<ActingAppointmentsPage />);

    await waitFor(() => expect(workspace.renders.length).toBeGreaterThan(0));
    expect(lastRender()).toEqual({ mode: "admin", membershipIds: [] });
  });

});