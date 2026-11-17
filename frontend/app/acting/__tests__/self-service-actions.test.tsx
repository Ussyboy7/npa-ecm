import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));

import ActingSelfServicePage from "../page";

describe("former Tools Acting route", () => {
  beforeEach(() => redirect.mockClear());

  it("redirects to the single Organization Acting destination", () => {
    ActingSelfServicePage();

    expect(redirect).toHaveBeenCalledWith("/admin/organization/acting");
  });
});
