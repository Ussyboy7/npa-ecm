import { describe, expect, it } from "vitest";
import { getOrganizationActingCapabilities } from "../acting-permissions";

describe("organization Acting permissions", () => {
  it.each([
    ["organization structure manager", { can_manage_org_structure: true }],
    ["user manager", { can_manage_users: true }],
  ])("grants organization management and request resolution to a %s", (_label, rolePermissions) => {
    expect(getOrganizationActingCapabilities({ rolePermissions })).toEqual({
      canAccess: true,
      canManageAppointments: true,
      canResolveRequests: true,
    });
  });

  it("does not grant admin capabilities based only on office-principal status", () => {
    expect(getOrganizationActingCapabilities({
      rolePermissions: {},
    })).toEqual({
      canAccess: false,
      canManageAppointments: false,
      canResolveRequests: false,
    });
  });

  it("grants all organization Acting capabilities to a superuser", () => {
    expect(getOrganizationActingCapabilities({ isSuperuser: true })).toEqual({
      canAccess: true,
      canManageAppointments: true,
      canResolveRequests: true,
    });
  });
});