/**
 * Post-login redirect resolution. Only same-origin app routes may be targeted,
 * so a crafted ?redirect= value cannot bounce a signed-in user off-site.
 */

/** Valid route prefixes for post-login redirect. Invalid or unknown paths fall back to /dashboard to avoid 404s. */
const ALLOWED_REDIRECT_PREFIXES = [
  "/inbox", "/dashboard", "/correspondence", "/cases", "/admin", "/analytics",
  "/approvals", "/audit", "/dms", "/documents", "/forms", "/help", "/integrations",
  "/notifications", "/records", "/seal-preview", "/search", "/settings",
];

export const DEFAULT_POST_LOGIN_PATH = "/dashboard";

export function resolveRedirectPath(raw: string | null | undefined): string {
  const s = (raw || "").trim();
  // Browsers treat "\" like "/" in http(s) URLs, so reject it before it can
  // turn a same-origin path into a protocol-relative redirect.
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("//") || s.includes("\\") || s.includes("..")) {
    return DEFAULT_POST_LOGIN_PATH;
  }
  const pathname = s.split(/[?#]/)[0];
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/verify")) {
    return DEFAULT_POST_LOGIN_PATH;
  }
  const allowed = ALLOWED_REDIRECT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  return allowed ? s : DEFAULT_POST_LOGIN_PATH;
}
