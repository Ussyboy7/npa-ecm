/**
 * Post-login redirect resolution. Only same-origin app routes may be targeted,
 * so a crafted ?redirect= value cannot bounce a signed-in user off-site.
 * Unknown paths fall back to the default route to avoid 404s.
 *
 * The allowed prefixes come from the route registry, so a new top-level route
 * is redirectable as soon as it is registered.
 */
import { APP_ROUTE_ROOTS, DEFAULT_APP_ROUTE } from "./app-routes";

const ALLOWED_REDIRECT_PREFIXES = APP_ROUTE_ROOTS.map((root) => `/${root}`);

export function resolveRedirectPath(raw: string | null | undefined): string {
  const s = (raw || "").trim();
  // Browsers treat "\" like "/" in http(s) URLs, so reject it before it can
  // turn a same-origin path into a protocol-relative redirect.
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("//") || s.includes("\\") || s.includes("..")) {
    return DEFAULT_APP_ROUTE;
  }
  const pathname = s.split(/[?#]/)[0];
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/verify")) {
    return DEFAULT_APP_ROUTE;
  }
  const allowed = ALLOWED_REDIRECT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  return allowed ? s : DEFAULT_APP_ROUTE;
}
