import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActingAppointment, ActingRequest } from "@/lib/api/acting-appointments";
import type { Office, OfficeMembership } from "@/lib/organization-types";
import type { User } from "@/lib/npa-structure";

const api = vi.hoisted(() => ({
  getMyActingAppointments: vi.fn(async (): Promise<ActingAppointment[]> => []),
  getMyPrincipalActingAppointments: vi.fn(async (): Promise<ActingAppointment[]> => []),
  listActingAppointments: vi.fn(async (): Promise<ActingAppointment[]> => []),
  listActingRequests: vi.fn(async (): Promise<ActingRequest[]> => []),
}));

vi.mock("@/lib/api/acting-appointments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/acting-appointments")>()),
  getMyActingAppointments: api.getMyActingAppointments,
  getMyPrincipalActingAppointments: api.getMyPrincipalActingAppointments,
  listActingAppointments: api.listActingAppointments,
  listActingRequests: api.listActingRequests,
}));

vi.mock("@/components/ui/sonner", () => ({ toast: vi.fn() }));

import { ActingWorkspace } from "../ActingWorkspace";

const currentUser = { id: "user-1", name: "User One" } as User;
const offices: Office[] = [];
const memberships: OfficeMembership[] = [];
const users: User[] = [];
const appointments: ActingAppointment[] = [];
const requests: ActingRequest[] = [];

beforeEach(() => {
  api.getMyActingAppointments.mockReset().mockResolvedValue(appointments);
  api.getMyPrincipalActingAppointments.mockReset().mockResolvedValue(appointments);
  api.listActingAppointments.mockReset().mockResolvedValue(appointments);
  api.listActingRequests.mockReset().mockResolvedValue(requests);
});

afterEach(() => cleanup());

describe("ActingWorkspace modes", () => {
  it("loads only self-service appointments and requests in self-service mode", async () => {
    render(
      <ActingWorkspace
        mode="self-service"
        currentUser={currentUser}
        offices={offices}
        officeMemberships={memberships}
        users={users}
      />,
    );

    await waitFor(() => {
      expect(api.getMyActingAppointments).toHaveBeenCalledTimes(1);
      expect(api.getMyPrincipalActingAppointments).toHaveBeenCalledTimes(1);
      expect(api.listActingRequests).toHaveBeenCalledTimes(1);
    });
    expect(api.listActingAppointments).not.toHaveBeenCalled();
    expect(await screen.findByRole("tab", { name: "My appointments" })).toBeTruthy();
  });

  it("loads organization-wide appointments and pending requests in admin mode", async () => {
    render(
      <ActingWorkspace
        mode="admin"
        currentUser={currentUser}
        offices={offices}
        officeMemberships={memberships}
        users={users}
      />,
    );

    await waitFor(() => {
      expect(api.listActingAppointments).toHaveBeenCalledWith({ isActive: true });
      expect(api.listActingRequests).toHaveBeenCalledWith({ status: "pending" });
    });
    expect(api.getMyActingAppointments).not.toHaveBeenCalled();
    expect(api.getMyPrincipalActingAppointments).not.toHaveBeenCalled();
    expect(await screen.findByRole("tab", { name: "Appointments" })).toBeTruthy();
  });

  it("offers only the signed-in user's active offices when requesting acting", async () => {
    const user = userEvent.setup();
    const officeMemberships = [
      { id: "m1", officeId: "office-1", officeName: "ICT Office", userId: "user-1", assignmentRole: "staff", isActive: true },
      { id: "m2", officeId: "office-2", officeName: "Finance Office", userId: "user-1", assignmentRole: "staff", isActive: false },
      { id: "m3", officeId: "office-3", officeName: "Legal Office", userId: "user-2", assignmentRole: "staff", isActive: true },
    ] as OfficeMembership[];
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();

    render(
      <ActingWorkspace
        mode="self-service"
        currentUser={currentUser}
        offices={offices}
        officeMemberships={officeMemberships}
        users={users}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Request acting" }));
    await user.click(screen.getByRole("combobox", { name: "Office" }));

    expect(await screen.findByRole("option", { name: "ICT Office" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Finance Office" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Legal Office" })).toBeNull();
  });
});