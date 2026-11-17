import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => navigation.searchParams,
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({
    currentUser: {
      id: "user-1",
      name: "Records Officer",
      gradeLevel: "MSS3",
      officeMemberships: [],
    },
    hydrated: true,
  }),
}));

vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => ({
    directorates: [],
    divisions: [],
    departments: [],
    offices: [],
    officeMemberships: [],
  }),
}));

vi.mock("@/contexts/CorrespondenceContext", () => ({
  CorrespondenceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCorrespondence: () => ({ dataVersion: 0 }),
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

vi.mock("../components/RecordCard", () => ({
  RecordCard: ({ corr }: { corr: { subject?: string } }) => <div>{corr.subject}</div>,
}));

import RecordsArchivePage from "../page";

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

const recordResponse = (subject: string, count = 150) => ({
  results: [{ id: `corr-${subject}`, subject, status: "completed" }],
  count,
  summary: { total: count },
});

const calledUrls = () => api.apiFetch.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
  navigation.searchParams = new URLSearchParams();
  navigation.push.mockClear();
  api.apiFetch.mockReset();
  api.apiFetch.mockResolvedValue(recordResponse("Initial record"));
});

afterEach(() => cleanup());

describe("Registry Records pagination and stale responses", () => {
  it("resets to page 1 before requesting a changed filter", async () => {
    render(<RecordsArchivePage />);
    await screen.findByText("Initial record");

    fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
    await waitFor(() => expect(calledUrls().some((url) => url.includes("page=2"))).toBe(true));

    api.apiFetch.mockClear();
    fireEvent.change(screen.getByPlaceholderText("Search records..."), {
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

  it("aborts and ignores an older response that resolves after a newer search", async () => {
    const alpha = deferred<unknown>();
    const beta = deferred<unknown>();
    const signals = new Map<string, AbortSignal | undefined>();

    api.apiFetch.mockImplementation((url: string, options?: { signal?: AbortSignal }) => {
      if (url.includes("search=alpha")) {
        signals.set("alpha", options?.signal);
        return alpha.promise;
      }
      if (url.includes("search=beta")) {
        signals.set("beta", options?.signal);
        return beta.promise;
      }
      return Promise.resolve(recordResponse("Initial record"));
    });

    render(<RecordsArchivePage />);
    await screen.findByText("Initial record");

    const search = screen.getByPlaceholderText("Search records...");
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
    expect(signals.get("alpha")?.aborted).toBe(true);

    await act(async () => beta.resolve(recordResponse("Beta record", 1)));
    expect(await screen.findByText("Beta record")).toBeTruthy();

    await act(async () => alpha.resolve(recordResponse("Alpha record", 1)));
    expect(screen.queryByText("Alpha record")).toBeNull();
    expect(screen.getByText("Beta record")).toBeTruthy();
  });
});