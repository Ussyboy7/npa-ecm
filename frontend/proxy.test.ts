import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { PUBLIC_ROUTE_PATHS } from "./lib/app-routes";
import { proxy } from "./proxy";

const redirectTarget = (response: Response) =>
  new URL(response.headers.get("location") || "", "http://localhost:3000").searchParams.get("redirect");

describe("proxy public routes", () => {
  it.each(PUBLIC_ROUTE_PATHS)("lets %s through without a session", (path) => {
    const response = proxy(new NextRequest(new URL(path, "http://localhost:3000")));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    if (path !== "/") {
      const child = proxy(new NextRequest(new URL(`${path}/nested`, "http://localhost:3000")));
      expect(child.status).toBe(200);
      expect(child.headers.get("location")).toBeNull();
    }
  });
});

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
