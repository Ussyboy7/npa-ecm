import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActingCandidate, ActingRequest } from "@/lib/api/acting-appointments";
import type { Office, OfficeMembership } from "@/lib/organization-types";

const api = vi.hoisted(() => ({
  createActingRequest: vi.fn(async (): Promise<ActingRequest> => ({}) as ActingRequest),
  getEligibleActingCandidates: vi.fn(async (): Promise<ActingCandidate[]> => []),
}));

vi.mock("@/lib/api/acting-appointments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/acting-appointments")>()),
  createActingRequest: api.createActingRequest,
  getEligibleActingCandidates: api.getEligibleActingCandidates,
}));

vi.mock("@/components/ui/sonner", () => ({ toast: vi.fn() }));

import { ActingRequestDialog } from "../ActingRequestDialog";

const offices = [
  { id: "office-1", name: "ICT Office", isActive: true },
  { id: "office-2", name: "Finance Office", isActive: true },
  { id: "office-3", name: "Legal Office", isActive: true },
] as Office[];

const memberOffices = [
  {
    id: "membership-1",
    officeId: "office-1",
    officeName: "ICT Office",
    userId: "user-1",
    assignmentRole: "staff",
    isActive: true,
  },
  {
    id: "membership-2",
    officeId: "office-2",
    officeName: "Finance Office",
    userId: "user-1",
    assignmentRole: "staff",
    isActive: false,
  },
  {
    id: "membership-3",
    officeId: "office-3",
    officeName: "Legal Office",
    userId: "user-2",
    assignmentRole: "staff",
    isActive: true,
  },
] as OfficeMembership[];

const candidate = {
  id: "candidate-1",
  username: "candidate",
  name: "Candidate One",
  email: "",
  gradeLevel: "",
  officeName: "ICT Office",
} as ActingCandidate;

const onOpenChange = vi.fn();
const onCompleted = vi.fn();

function renderDialog() {
  return render(
    <ActingRequestDialog
      open
      onOpenChange={onOpenChange}
      memberOffices={memberOffices}
      offices={offices}
      onCompleted={onCompleted}
    />,
  );
}

beforeEach(() => {
  api.createActingRequest.mockReset().mockResolvedValue({} as ActingRequest);
  api.getEligibleActingCandidates.mockReset().mockResolvedValue([candidate]);
  onOpenChange.mockClear();
  onCompleted.mockClear();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => cleanup());

describe("ActingRequestDialog", () => {
  it("submits the selected office, optional suggestion, and trimmed reason", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("combobox", { name: "Office" }));
    await user.click(await screen.findByRole("option", { name: "ICT Office" }));

    await user.click(
      await screen.findByRole("combobox", { name: "Suggested acting officer (optional)" }),
    );
    await user.click(await screen.findByRole("option", { name: /Candidate One/ }));

    await user.type(
      screen.getByLabelText("Reason"),
      "  Seat holder unreachable  ",
    );
    await user.click(screen.getByRole("button", { name: "Send to Super Admin" }));

    expect(api.createActingRequest).toHaveBeenCalledWith({
      office: "office-1",
      suggestedActingUser: "candidate-1",
      reason: "Seat holder unreachable",
    });
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it("clears the form when the dialog is cancelled", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Reason"), "Temporary coverage");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect((screen.getByLabelText("Reason") as HTMLTextAreaElement).value).toBe("");
  });

  it("does not submit a request without an office and reason", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Send to Super Admin" }));

    expect(api.createActingRequest).not.toHaveBeenCalled();
  });
});
