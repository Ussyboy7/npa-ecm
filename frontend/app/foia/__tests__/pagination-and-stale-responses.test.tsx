import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/api-client", () => ({ apiFetch: api.apiFetch }));

vi.mock("@/components/shared/QueuePageShell", () => ({
  QueuePageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/components/shared/PaginationControls", () => ({
  PaginationControls: ({
    pagination,
  }: {
    pagination: { page: number; goToPage: (page: number) => void };
  }) => (
    <div>
      <span data-testid="current-page">{pagination.page}</span>
      <button type="button" onClick={() => pagination.goToPage(2)}>Go to page 2</button>
    </div>
  ),
}));

import FOIAListPage from "../page";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
};

const request = (requester: string) => ({
  id: `foia-${requester}`,
  request_number: "FOIA-1",
  requester_name: requester,
  status: "submitted",
  received_date: "2026-11-17T10:00:00.000Z",
  deadline_date: null,
});

const responseFor = (requester: string, count = 150) => ({
  results: [request(requester)],
  count,
});

const stats = {
  total: 0,
  submitted: 0,
  in_processing: 0,
  overdue: 0,
  closed_this_month: 0,
};

const calledUrls = () => api.apiFetch.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  router.push.mockClear();
  api.apiFetch.mockReset();
  api.apiFetch.mockImplementation((url: string) => {
    if (url.includes("/stats/")) return Promise.resolve(stats);
    return Promise.resolve(responseFor("Initial Requester"));
  });
});

afterEach(() => cleanup());

describe("FOIA pagination and stale responses", () => {
  it("resets to page 1 before requesting a changed filter", async () => {
    render(<FOIAListPage />);
    await screen.findByText("Initial Requester");

    fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
    await waitFor(() => expect(calledUrls().some((url) => url.includes("page=2"))).toBe(true));

    api.apiFetch.mockClear();
    fireEvent.change(screen.getByPlaceholderText("Search requests..."), {
      target: { value: "budget" },
    });

    await waitFor(
      () => expect(calledUrls().some((url) => url.includes("search=budget"))).toBe(true),
      { timeout: 2000 },
    );
    const filteredCalls = calledUrls().filter((url) => url.includes("search=budget"));
    expect(filteredCalls.every((url) => url.includes("page=1"))).toBe(true);
    expect(screen.getByTestId("current-page").textContent).toBe("1");
  });

  it("ignores an older response that resolves after a newer search", async () => {
    const alpha = deferred<unknown>();
    const beta = deferred<unknown>();
    api.apiFetch.mockImplementation((url: string) => {
      if (url.includes("/stats/")) return Promise.resolve(stats);
      if (url.includes("search=alpha")) return alpha.promise;
      if (url.includes("search=beta")) return beta.promise;
      return Promise.resolve(responseFor("Initial Requester"));
    });

    render(<FOIAListPage />);
    await screen.findByText("Initial Requester");

    const search = screen.getByPlaceholderText("Search requests...");
    fireEvent.change(search, { target: { value: "alpha" } });
    await waitFor(
      () => expect(calledUrls().some((url) => url.includes("search=alpha"))).toBe(true),
      { timeout: 2000 },
    );

    fireEvent.change(search, { target: { value: "beta" } });
    await waitFor(
      () => expect(calledUrls().some((url) => url.includes("search=beta"))).toBe(true),
      { timeout: 2000 },
    );

    await act(async () => beta.resolve(responseFor("Beta Requester", 1)));
    expect(await screen.findByText("Beta Requester")).toBeTruthy();

    await act(async () => alpha.resolve(responseFor("Alpha Requester", 1)));
    expect(screen.queryByText("Alpha Requester")).toBeNull();
    expect(screen.getByText("Beta Requester")).toBeTruthy();
  });
});