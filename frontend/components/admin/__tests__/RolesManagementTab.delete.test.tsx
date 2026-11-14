import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUseOrganization = vi.hoisted(() => vi.fn());
const mockDeleteRole = vi.hoisted(() => vi.fn());
const mockRefreshOrganizationData = vi.hoisted(() => vi.fn());
const mockApiFetch = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
);

vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: mockUseOrganization,
}));
vi.mock("@/hooks/use-org-users", () => ({
  useOrgUsers: () => ({ users: [], loading: false }),
}));
vi.mock("@/hooks/use-permission-catalog", () => ({
  usePermissionCatalog: () => ({ permissions: [], presets: [], loading: false }),
}));
vi.mock("@/lib/api-client", () => ({
  apiFetch: mockApiFetch,
  hasTokens: () => true,
}));
vi.mock("@/components/ui/sonner", () => ({
  toast: mockToast,
}));

import { RolesManagementTab } from "../RolesManagementTab";

const role = {
  id: "role-1",
  name: "Assistant",
  description: "",
  isActive: true,
  permissions: {},
  userCount: 3,
};

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseOrganization.mockReturnValue({
    roles: [role],
    refreshOrganizationData: mockRefreshOrganizationData,
    deleteRole: mockDeleteRole,
  });
});

const openDeleteConfirmation = async () => {
  render(<RolesManagementTab />);
  fireEvent.click(screen.getByRole("button", { name: "Delete role Assistant" }));
  fireEvent.click(await screen.findByRole("button", { name: "Delete Role" }));
};

describe("RolesManagementTab role deletion", () => {
  it("deletes the role without writing to user records first", async () => {
    mockDeleteRole.mockResolvedValue(undefined);

    await openDeleteConfirmation();

    await waitFor(() => expect(mockDeleteRole).toHaveBeenCalledWith("role-1"));
    expect(mockApiFetch).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mockRefreshOrganizationData).toHaveBeenCalled(),
    );
  });

  it("leaves assignments untouched when the delete is rejected", async () => {
    mockDeleteRole.mockRejectedValue(new Error("Role could not be deleted"));

    await openDeleteConfirmation();

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Delete failed", variant: "destructive" }),
      ),
    );
    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockRefreshOrganizationData).not.toHaveBeenCalled();
  });
});
