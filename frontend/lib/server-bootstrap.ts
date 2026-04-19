/**
 * Server-side bootstrap data fetch.
 * Fetches user + org data in parallel for protected routes.
 * Call from Server Components only (uses cookies()).
 */
import { cookies, headers } from "next/headers";

// Server-side fetch: use INTERNAL_API_URL in Docker (backend hostname), else NEXT_PUBLIC_API_URL
const BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002/api/v1";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/verify")) return true;
  return false;
}

async function fetchWithToken(
  path: string,
  token: string
): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

function unwrapResults(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: unknown }).results;
    return Array.isArray(results) ? results : [];
  }
  return [];
}

export interface SidebarCounts {
  officeInbox: number;
  myInbox: number;
  outbox: number;
  officeOutbox: number;
  delegated: number;
  secretaryInbox?: number;
  myCases: number;
  officeCases: number;
  allCases: number;
  executiveApprovals: number;
  myDocuments: number;
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
  sidebarCounts?: SidebarCounts | null;
}

export async function fetchBootstrap(): Promise<BootstrapData | null> {
  const cookieStore = await cookies();
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (isPublicPath(pathname)) return null;

  const token = cookieStore.get("npa_ecm_access_token")?.value;
  if (!token) return null;

  try {
    // Slim bootstrap: user + sidebarCounts + delegations only. Org data (directorates, divisions, etc.)
    // is fetched on-demand by OrganizationProvider to avoid slow startup.
    const sidebarCountsPromise = fetchWithToken("/correspondence/items/sidebar-counts/", token).catch(() => null);

    const [userRes, delegationsRes, sidebarCountsRes] = await Promise.all([
      fetchWithToken("/accounts/auth/me/", token),
      fetchWithToken("/correspondence/delegations/", token),
      sidebarCountsPromise,
    ]);

    const sidebarCounts = sidebarCountsRes && typeof sidebarCountsRes === "object" && !Array.isArray(sidebarCountsRes)
      ? (sidebarCountsRes as SidebarCounts)
      : null;

    const delegations = delegationsRes ? unwrapResults(delegationsRes) : [];

    return {
      user: userRes && typeof userRes === "object" ? (userRes as Record<string, unknown>) : null,
      directorates: [],
      divisions: [],
      departments: [],
      offices: [],
      roles: [],
      officeMemberships: [],
      users: [],
      assistantAssignments: delegations,
      sidebarCounts,
    };
  } catch (err) {
    console.warn("[server-bootstrap] Failed to fetch bootstrap data:", err);
    return null;
  }
}
