import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
const visibility = vi.hoisted(() => ({
  isVisibilityReady: true,
  showMyInbox: false,
}));

vi.mock("@/lib/api-client", () => ({ apiFetch: api.apiFetch }));
vi.mock("@/hooks/use-sidebar-visibility", () => ({
  useSidebarVisibility: () => visibility,
}));

import InboxPage from "../page";

beforeEach(() => {
  api.apiFetch.mockReset();
  visibility.isVisibilityReady = true;
  visibility.showMyInbox = false;
});

afterEach(() => cleanup());

describe("Inbox direct-route access", () => {
  it("shows the standard denial card without loading the inbox", () => {
    render(<InboxPage />);

    expect(screen.getByText("Inbox access required")).toBeTruthy();
    expect(api.apiFetch).not.toHaveBeenCalled();
  });
});
