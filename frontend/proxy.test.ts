import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

const redirectTarget = (response: Response) =>
  new URL(response.headers.get("location") || "", "http://localhost:3000").searchParams.get("redirect");

describe("proxy login redirect", () => {
  it("keeps the query string of the requested page", () => {
    const request = new NextRequest(
      new URL("http://localhost:3000/dms?tab=forms&segment=submissions"),
    );

    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(redirectTarget(response)).toBe("/dms?tab=forms&segment=submissions");
  });
});
