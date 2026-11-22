import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api-client", () => ({ apiFetch: api.apiFetch }));

vi.mock("@/components/shared/QueuePageShell", () => ({
  QueuePageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/components/shared/PaginationControls", () => ({
  PaginationControls: () => null,
}));

vi.mock("@/hooks/use-pagination", () => ({
  usePagination: () => ({ page: 1, pageSize: 50, goToFirstPage: vi.fn() }),
}));

import FOIAListPage from "../page";

const stats = {
  total: 3,
  submitted: 1,
  in_processing: 1,
  overdue: 1,
  closed_this_month: 0,
};

const row = (id: string, status: string, requester_name: string) => ({
  id,
  request_number: `FOIA/${id}`,
  requester_name,
  status,
  received_date: "2026-01-01",
  deadline_date: null,
  is_overdue: false,
  assigned_to: null,
});

const submitted = row("S", "submitted", "Submitted request");
const processing = row("P", "in_processing", "Processing request");
const overdue = row("O", "in_processing", "Overdue request");

const calledUrls = () => api.apiFetch.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  api.apiFetch.mockReset();
  api.apiFetch.mockImplementation((url: string) => {
    if (url.includes("/stats/")) return Promise.resolve(stats);
    if (url.includes("status=submitted")) return Promise.resolve({ results: [submitted], count: 1 });
    if (url.includes("status=in_processing")) return Promise.resolve({ results: [processing], count: 1 });
    if (url.includes("status=closed")) return Promise.resolve({ results: [], count: 0 });
    if (url.includes("overdue=true")) return Promise.resolve({ results: [overdue], count: 1 });
    return Promise.resolve({ results: [submitted, processing, overdue], count: 3 });
  });
});

afterEach(() => cleanup());

describe("FOIA status tabs", () => {
  it("requests and renders the selected status", async () => {
    render(<FOIAListPage />);

    await screen.findByText("Submitted request");
    expect(screen.getByText("Processing request")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Submitted" }));

    await waitFor(() =>
      expect(calledUrls().some((url) => url.includes("status=submitted"))).toBe(true),
    );
    await waitFor(() => expect(screen.queryByText("Processing request")).toBeNull());
    expect(screen.getByText("Submitted request")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "In Processing" }));

    await waitFor(() =>
      expect(calledUrls().some((url) => url.includes("status=in_processing"))).toBe(true),
    );
    await waitFor(() => expect(screen.queryByText("Submitted request")).toBeNull());
    expect(screen.getByText("Processing request")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Overdue" }));

    await waitFor(() => expect(calledUrls().some((url) => url.includes("overdue=true"))).toBe(true));
    await waitFor(() => expect(screen.queryByText("Processing request")).toBeNull());
    expect(screen.getByText("Overdue request")).toBeTruthy();
  });
});
