import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActingAppointment, ActingCandidate, ActingRequest } from "@/lib/api/acting-appointments";
import type { Office, OfficeMembership } from "@/lib/organization-types";
import type { User } from "@/lib/npa-structure";

const api = vi.hoisted(() => ({
  appointActing: vi.fn(async (): Promise<ActingAppointment> => ({}) as ActingAppointment),
  getEligibleActingCandidates: vi.fn(async (): Promise<ActingCandidate[]> => []),
  listOfficeMembershipsForOffice: vi.fn(async (_officeId: string): Promise<OfficeMembership[]> => []),
}));

vi.mock("@/lib/api/acting-appointments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/acting-appointments")>()),
  appointActing: api.appointActing,
  getEligibleActingCandidates: api.getEligibleActingCandidates,
}));

vi.mock("@/lib/office-memberships-client", () => ({
  listOfficeMembershipsForOffice: api.listOfficeMembershipsForOffice,
}));

vi.mock("@/components/ui/sonner", () => ({ toast: vi.fn() }));

import { ActingAppointmentDialog } from "../ActingAppointmentDialog";

const admin = { id: "admin-9", name: "Admin Nine" } as User;
const principalUser = { id: "user-1", name: "User One" } as User;

const offices = [
  { id: "office-1", name: "ICT Office", isActive: true },
  { id: "office-2", name: "Finance Office", isActive: true },
] as Office[];

const principalMembership = {
  id: "membership-1",
  officeId: "office-1",
  officeName: "ICT Office",
  userId: "user-1",
  assignmentRole: "principal",
  isActive: true,
} as OfficeMembership;

const candidate = {
  id: "candidate-1",
  username: "candidate",
  name: "Candidate One",
  email: "",
  gradeLevel: "",
  officeName: "ICT Office",
} as ActingCandidate;

const pendingRequest = {
  id: "request-1",
  office: "office-1",
  officeName: "ICT Office",
  principal: "user-1",
  principalName: "User One",
  suggestedActingUser: "candidate-1",
  reason: "Annual leave",
} as ActingRequest;

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  offices,
  principalOffices: [principalMembership],
  officeMemberships: [principalMembership],
  users: [principalUser, { id: "user-2", name: "User Two" } as User],
  onCompleted: vi.fn(),
};

beforeEach(() => {
  api.appointActing.mockReset().mockResolvedValue({} as ActingAppointment);
  api.getEligibleActingCandidates.mockReset().mockResolvedValue([candidate]);
  api.listOfficeMembershipsForOffice.mockReset().mockResolvedValue([principalMembership]);
  baseProps.onOpenChange.mockClear();
  baseProps.onCompleted.mockClear();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => cleanup());

describe("ActingAppointmentDialog admin mode", () => {
  it("appoints for the selected request principal instead of the signed-in admin", async () => {
    const user = userEvent.setup();
    render(
      <ActingAppointmentDialog
        {...baseProps}
        mode="admin"
        currentUser={admin}
        initialRequest={pendingRequest}
      />,
    );

    await waitFor(() => {
      expect(api.listOfficeMembershipsForOffice).toHaveBeenCalledWith("office-1");
    });
    await user.click(screen.getByRole("button", { name: "Appoint" }));

    expect(api.appointActing).toHaveBeenCalledWith({
      office: "office-1",
      principal: "user-1",
      actingUser: "candidate-1",
      startsAt: undefined,
      endsAt: undefined,
      reason: "Annual leave",
    });
    expect(baseProps.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("resets the absent principal when the admin changes office", async () => {
    const user = userEvent.setup();
    api.listOfficeMembershipsForOffice.mockImplementation(async (officeId: string) =>
      officeId === "office-1"
        ? [principalMembership]
        : [
            {
              ...principalMembership,
              id: "membership-9",
              officeId: "office-2",
              officeName: "Finance Office",
              userId: "user-2",
            },
          ],
    );

    render(<ActingAppointmentDialog {...baseProps} mode="admin" currentUser={admin} />);

    await user.click(screen.getByRole("combobox", { name: "Office" }));
    await user.click(await screen.findByRole("option", { name: "ICT Office" }));
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Principal (absent)" }).textContent).toContain(
        "User One",
      );
    });

    await user.click(screen.getByRole("combobox", { name: "Office" }));
    await user.click(await screen.findByRole("option", { name: "Finance Office" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Principal (absent)" }).textContent).toContain(
        "User Two",
      );
    });
  });

  it("offers only members of the selected office as the absent principal", async () => {
    const user = userEvent.setup();
    api.listOfficeMembershipsForOffice.mockResolvedValue([
      principalMembership,
      {
        id: "membership-2",
        officeId: "office-1",
        officeName: "ICT Office",
        userId: "staff-2",
        assignmentRole: "staff",
        isActive: true,
      } as OfficeMembership,
    ]);

    render(<ActingAppointmentDialog {...baseProps} mode="admin" currentUser={admin} />);

    await user.click(screen.getByRole("combobox", { name: "Office" }));
    await user.click(await screen.findByRole("option", { name: "ICT Office" }));

    await waitFor(() => {
      expect(api.listOfficeMembershipsForOffice).toHaveBeenCalledWith("office-1");
    });
    await user.click(screen.getByRole("combobox", { name: "Principal (absent)" }));

    expect(await screen.findByRole("option", { name: "User One" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Staff Two" })).toBeNull();
  });
});

describe("ActingAppointmentDialog self-service mode", () => {
  it("offers only offices where the signed-in user is principal", async () => {
    const user = userEvent.setup();
    render(
      <ActingAppointmentDialog
        {...baseProps}
        mode="self-service"
        currentUser={principalUser}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Your office" }));

    expect(await screen.findByRole("option", { name: "ICT Office" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Finance Office" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Principal (absent)" })).toBeNull();
  });

  it("clears the form when the dialog is cancelled", async () => {
    const user = userEvent.setup();
    render(
      <ActingAppointmentDialog
        {...baseProps}
        mode="self-service"
        currentUser={principalUser}
      />,
    );

    await user.type(screen.getByLabelText("Reason"), "Temporary coverage");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect((screen.getByLabelText("Reason") as HTMLTextAreaElement).value).toBe("");
  });

  it("submits the acting appointment for the signed-in principal with a trimmed reason", async () => {
    const user = userEvent.setup();
    render(
      <ActingAppointmentDialog
        {...baseProps}
        mode="self-service"
        currentUser={principalUser}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Your office" }));
    await user.click(await screen.findByRole("option", { name: "ICT Office" }));

    await user.click(await screen.findByRole("combobox", { name: "Acting officer" }));
    await user.click(await screen.findByRole("option", { name: /Candidate One/ }));

    await user.type(screen.getByLabelText("Reason"), "  On leave  ");
    await user.click(screen.getByRole("button", { name: "Appoint" }));

    expect(api.appointActing).toHaveBeenCalledWith({
      office: "office-1",
      principal: "user-1",
      actingUser: "candidate-1",
      startsAt: undefined,
      endsAt: undefined,
      reason: "On leave",
    });
  });
});
