/** Routes that render without the authenticated app shell (sidebar + top bar). */
export function isPublicAppPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/') return true;
  if (pathname === '/foia/public' || pathname.startsWith('/foia/public/')) return true;
  if (pathname.startsWith('/login')) return true;
  return false;
}
