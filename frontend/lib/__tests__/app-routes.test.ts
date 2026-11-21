import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { APP_ROUTE_ROOTS, APP_ROUTES, DEFAULT_APP_ROUTE } from "../app-routes";
import { resolveRedirectPath } from "../auth-redirect";

const appDir = resolve(process.cwd(), "app");

// Public auth flows are not post-login destinations, so they stay out of the
// redirect registry even though they have pages under app/.
const NON_REDIRECT_ROOTS = new Set(["auth", "verify"]);

// Sections such as archives/[id] and correspondence/inbox only have pages in
// nested folders, so look through the whole subtree.
const hasPageFile = (routeDir: string): boolean =>
  readdirSync(routeDir, { withFileTypes: true }).some((entry) =>
    entry.isDirectory()
      ? hasPageFile(join(routeDir, entry.name))
      : entry.name === "page.tsx",
  );

const discoverRouteRoots = (): string[] =>
  readdirSync(appDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    // Route groups such as (auth) do not appear in URLs.
    .filter((name) => !name.startsWith("(") && !NON_REDIRECT_ROOTS.has(name))
    .filter((name) => hasPageFile(join(appDir, name)))
    .sort();

describe("app route registry", () => {
  it("registers every top-level route that has a page", () => {
    expect([...APP_ROUTE_ROOTS].sort()).toEqual(discoverRouteRoots());
  });

  it("points the default post-login route at a registered root", () => {
    expect(APP_ROUTE_ROOTS).toContain(DEFAULT_APP_ROUTE.replace(/^\//, ""));
  });

  it("only names paths under a registered root", () => {
    const roots = APP_ROUTE_ROOTS.map((root) => `/${root}`);
    const publicRoots = ["/login", "/verify"];

    const unregistered = Object.entries(APP_ROUTES)
      .map(([name, path]) => [name, path.split(/[?#]/)[0]] as const)
      .filter(([, pathname]) =>
        ![...roots, ...publicRoots].some(
          (root) => pathname === root || pathname.startsWith(`${root}/`),
        ),
      );

    expect(unregistered).toEqual([]);
  });

  it.each(APP_ROUTE_ROOTS)("keeps the /%s deep link instead of falling back", (root) => {
    expect(resolveRedirectPath(`/${root}`)).toBe(`/${root}`);
    expect(resolveRedirectPath(`/${root}/detail?tab=open`)).toBe(`/${root}/detail?tab=open`);
  });
});
