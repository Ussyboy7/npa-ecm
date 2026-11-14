import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mockUseOrganization = vi.hoisted(() => vi.fn());
const mockUseOrgUsers = vi.hoisted(() => vi.fn());
const mockUseCurrentUser = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: mockUseOrganization,
}));
vi.mock("@/hooks/use-org-users", () => ({
  useOrgUsers: mockUseOrgUsers,
}));
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: mockUseCurrentUser,
}));
vi.mock("@/components/admin/AssistantAssignmentModal", () => ({
  AssistantAssignmentModal: () => null,
}));

import { AssistantsManagementTab } from "../AssistantsManagementTab";

const user = (id: string, name: string, gradeLevel: string) => ({
  id,
  name,
  email: `${id}@npa.gov.ng`,
  employeeId: id,
  gradeLevel,
  systemRole: "Assistant General Manager",
  active: true,
});

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
  mockUseCurrentUser.mockReturnValue({
    currentUser: { id: "exec-covered", systemRole: "Super Admin", isSuperuser: true },
  });
  mockUseOrgUsers.mockReturnValue({
    loading: false,
    users: [
      user("exec-covered", "Dr. Covered", "MDCS"),
      user("exec-uncovered-1", "Mr. Uncovered One", "MSS1"),
      user("exec-uncovered-2", "Mr. Uncovered Two", "EDCS"),
      user("asst-1", "Grace Assistant", "SSS2"),
    ],
  });
  mockUseOrganization.mockReturnValue({
    assistantAssignments: [
      {
        id: "assignment-1",
        executiveId: "exec-covered",
        assistantId: "asst-1",
        type: "TA",
        permissions: ["minute"],
        specialization: "General",
      },
    ],
    deleteAssignment: vi.fn(),
  });
});

describe("AssistantsManagementTab By Executive view", () => {
  it("shows only executives with assistants until uncovered ones are requested", () => {
    render(<AssistantsManagementTab />);

    expect(screen.getByText("Dr. Covered")).toBeTruthy();
    expect(screen.queryByText("Mr. Uncovered One")).toBeNull();
    expect(screen.queryByText("Mr. Uncovered Two")).toBeNull();
    expect(screen.getByText("1 executive")).toBeTruthy();

    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByText("Mr. Uncovered One")).toBeTruthy();
    expect(screen.getByText("Mr. Uncovered Two")).toBeTruthy();
    expect(screen.getByText("3 executives")).toBeTruthy();
  });

  it("hides the toggle when every executive already has an assistant", () => {
    mockUseOrgUsers.mockReturnValue({
      loading: false,
      users: [user("exec-covered", "Dr. Covered", "MDCS"), user("asst-1", "Grace Assistant", "SSS2")],
    });

    render(<AssistantsManagementTab />);

    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText("Dr. Covered")).toBeTruthy();
  });
});
