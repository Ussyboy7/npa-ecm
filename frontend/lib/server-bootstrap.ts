/**
 * Server-side bootstrap data fetch.
 * Fetches user + org data in parallel for protected routes.
 * Call from Server Components only (uses cookies()).
 */
import { cookies, headers } from "next/headers";

// Server-side fetch: use INTERNAL_API_URL in Docker (backend hostname), else NEXT_PUBLIC_API_URL
const BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002/api/v1";

import { isPublicAppPath } from "./app-shell-paths";

function isPublicPath(pathname: string): boolean {
  return isPublicAppPath(pathname);
}

async function fetchWithToken(
  path: string,
  token: string
): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    // Network errors (backend down, wrong INTERNAL_API_URL, DNS) must not crash RootLayout
    console.warn(`[server-bootstrap] fetch failed for ${url}:`, error);
    return null;
  }
}

function unwrapResults(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: unknown }).results;
    return Array.isArray(results) ? results : [];
  }
  return [];
}

async function fetchAllCatalog(
  path: string,
  token: string,
  pageSize = 500,
): Promise<unknown[]> {
  const all: unknown[] = [];
  let page = 1;
  for (;;) {
    const separator = path.includes("?") ? "&" : "?";
    const payload = await fetchWithToken(
      `${path}${separator}page=${page}&page_size=${pageSize}`,
      token,
    );
    if (payload == null) break;
    const batch = unwrapResults(payload);
    all.push(...batch);
    if (
      payload &&
      typeof payload === "object" &&
      "next" in payload &&
      (payload as { next?: string | null }).next
    ) {
      page += 1;
      continue;
    }
    if (batch.length < pageSize) break;
    page += 1;
  }
  return all;
}

export interface BootstrapData {
  user: Record<string, unknown> | null;
  directorates: unknown[];
  divisions: unknown[];
  departments: unknown[];
  offices: unknown[];
  roles: unknown[];
  officeMemberships: unknown[];
  users: unknown[];
  assistantAssignments: unknown[];
  sidebarCounts?: Record<string, number> | null;
}

export async function fetchBootstrap(): Promise<BootstrapData | null> {
  const cookieStore = await cookies();
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (isPublicPath(pathname)) return null;

  const token = cookieStore.get("npa_ecm_access_token")?.value
    ?? cookieStore.get("access_token")?.value;
  if (!token) return null;

  try {
    const [
      userRes,
      directorates,
      divisions,
      departments,
      delegationsRes,
      roles,
      offices,
      officeMemberships,
      users,
      sidebarCountsRes,
    ] = await Promise.all([
      fetchWithToken("/accounts/auth/me/", token),
      fetchAllCatalog("/organization/directorates/?ordering=name", token),
      fetchAllCatalog("/organization/divisions/?ordering=name", token),
      fetchAllCatalog("/organization/departments/?ordering=name", token),
      fetchAllCatalog("/correspondence/delegations/", token),
      fetchAllCatalog("/organization/roles/?ordering=name", token),
      fetchAllCatalog("/organization/offices/?ordering=name", token),
      fetchAllCatalog("/organization/office-memberships/?ordering=office__name", token),
      fetchAllCatalog("/accounts/users/?is_active=true&ordering=username", token),
      fetchWithToken("/correspondence/items/sidebar-counts/", token),
    ]);

    const sidebarCounts = sidebarCountsRes && typeof sidebarCountsRes === "object" && !Array.isArray(sidebarCountsRes)
      ? (sidebarCountsRes as Record<string, number>)
      : null;

    const delegations = Array.isArray(delegationsRes) ? delegationsRes : unwrapResults(delegationsRes);

    return {
      user: userRes && typeof userRes === "object" ? (userRes as Record<string, unknown>) : null,
      directorates,
      divisions,
      departments,
      offices,
      roles,
      officeMemberships,
      users,
      assistantAssignments: delegations,
      sidebarCounts,
    };
  } catch (error) {
    console.warn("[server-bootstrap] bootstrap failed:", error);
    return null;
  }
}
