import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));
const visibilityState = vi.hoisted(() => ({
  isVisibilityReady: true,
  showExecutiveApprovals: true,
  showDepartmentalApprovals: true,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  usePathname: () => "/approvals",
  useSearchParams: () => navigation.searchParams,
}));

vi.mock("@/hooks/use-sidebar-visibility", () => ({
  useSidebarVisibility: () => visibilityState,
}));

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

import ApprovalsPage from "../page";

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

const approval = (subject: string) => ({
  id: `minute-${subject}`,
  correspondence: "corr-1",
  correspondence_details: { subject, reference_number: "REF-1" },
  user: { first_name: "Ada", last_name: "Lovelace", system_role_name: "MD" },
  seal_data: {
    office_name: "Managing Director",
    office_title: "Managing Director",
    sealed_at: "2026-11-17T10:00:00.000Z",
    serial_number: "SEAL-1",
    is_valid: true,
  },
  timestamp: "2026-11-17T10:00:00.000Z",
});

const responseFor = (subject: string, count = 150) => ({
  results: [approval(subject)],
  count,
});

const calledUrls = () => api.apiFetch.mock.calls.map(([url]) => String(url));
const renderPage = () => render(
  <TooltipProvider>
    <ApprovalsPage />
  </TooltipProvider>,
);

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
  navigation.searchParams = new URLSearchParams();
  visibilityState.isVisibilityReady = true;
  visibilityState.showExecutiveApprovals = true;
  visibilityState.showDepartmentalApprovals = true;
  navigation.push.mockClear();
  navigation.replace.mockClear();
  api.apiFetch.mockReset();
  api.apiFetch.mockResolvedValue(responseFor("Initial approval"));
});

afterEach(() => cleanup());

describe("Approvals pagination and stale responses", () => {
  it("shows a denial card and skips approval requests without approval access", () => {
    visibilityState.showExecutiveApprovals = false;
    visibilityState.showDepartmentalApprovals = false;

    renderPage();

    expect(screen.getByText("Approvals access required")).toBeTruthy();
    expect(api.apiFetch).not.toHaveBeenCalled();
  });

  it("falls back to the allowed level when the URL requests another level", async () => {
    visibilityState.showExecutiveApprovals = false;
    navigation.searchParams = new URLSearchParams("level=executive");

    renderPage();

    await waitFor(() =>
      expect(calledUrls().some((url) => url.includes("approval_level=departmental"))).toBe(true),
    );
    expect(calledUrls().every((url) => !url.includes("approval_level=executive"))).toBe(true);
  });

  it("resets to page 1 before requesting a changed filter", async () => {
    renderPage();
    await screen.findByText("Initial approval");

    fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
    await waitFor(() => expect(calledUrls().some((url) => url.includes("page=2"))).toBe(true));

    api.apiFetch.mockClear();
    fireEvent.change(screen.getByPlaceholderText("Search approvals..."), {
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
      if (url.includes("search=alpha")) return alpha.promise;
      if (url.includes("search=beta")) return beta.promise;
      return Promise.resolve(responseFor("Initial approval"));
    });

    renderPage();
    await screen.findByText("Initial approval");

    const search = screen.getByPlaceholderText("Search approvals...");
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

    await act(async () => beta.resolve(responseFor("Beta approval", 1)));
    expect(await screen.findByText("Beta approval")).toBeTruthy();

    await act(async () => alpha.resolve(responseFor("Alpha approval", 1)));
    expect(screen.queryByText("Alpha approval")).toBeNull();
    expect(screen.getByText("Beta approval")).toBeTruthy();
  });
});