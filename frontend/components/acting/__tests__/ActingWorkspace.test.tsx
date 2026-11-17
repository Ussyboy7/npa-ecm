import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
      />,
    );

    await waitFor(() => {
      expect(api.getMyActingAppointments).toHaveBeenCalledTimes(1);
      expect(api.getMyPrincipalActingAppointments).toHaveBeenCalledTimes(1);
      expect(api.listActingRequests).toHaveBeenCalledWith({ requestedBy: "user-1" });
      expect(api.listActingRequests).toHaveBeenCalledWith({ principal: "user-1" });
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
});