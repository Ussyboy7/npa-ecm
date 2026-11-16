import { registerIdentityCacheClearer } from './identity-cache';

export type PageAccessMap = Record<string, { allowed: boolean }>;
export type PagePermissionsSnapshot = {
  userId: string | null;
  pages: PageAccessMap | null;
  /** Bumped on invalidation so mounted consumers refetch immediately. */
  version: number;
};

type CachedPageAccess = { userId: string; pages: PageAccessMap; cachedAt: number };

const PAGE_ACCESS_TTL_MS = 60_000;
const SERVER_PAGE_PERMISSIONS_SNAPSHOT: PagePermissionsSnapshot = {
  userId: null,
  pages: null,
  version: 0,
};

let pagePermissionsSnapshot: PagePermissionsSnapshot = SERVER_PAGE_PERMISSIONS_SNAPSHOT;
let cachedPageAccess: CachedPageAccess | null = null;
let pageAccessPromise: { userId: string; promise: Promise<PageAccessMap> } | null = null;
let cacheGeneration = 0;
let snapshotVersion = 0;
const pageAccessListeners = new Set<() => void>();

export const getPagePermissionsSnapshot = () => pagePermissionsSnapshot;
export const getServerPagePermissionsSnapshot = () => SERVER_PAGE_PERMISSIONS_SNAPSHOT;

const publishPageAccess = (userId: string | null, pages: PageAccessMap | null) => {
  const current = pagePermissionsSnapshot;
  if (
    current.userId === userId &&
    current.pages === pages &&
    current.version === snapshotVersion
  ) {
    return;
  }
  pagePermissionsSnapshot = { userId, pages, version: snapshotVersion };
  pageAccessListeners.forEach((listener) => listener());
};

export const subscribePagePermissions = (listener: () => void) => {
  pageAccessListeners.add(listener);
  return () => pageAccessListeners.delete(listener);
};

/**
 * Load page access for a user, sharing one in-flight request and a short-lived
 * cache across every consumer. The fetcher is injected so auth code can import
 * invalidation without depending on the API client.
 */
export const loadPagePermissions = (
  userId: string,
  fetcher: () => Promise<PageAccessMap>,
): Promise<PageAccessMap> => {
  if (
    cachedPageAccess?.userId === userId &&
    Date.now() - cachedPageAccess.cachedAt < PAGE_ACCESS_TTL_MS
  ) {
    publishPageAccess(userId, cachedPageAccess.pages);
    return Promise.resolve(cachedPageAccess.pages);
  }

  if (pageAccessPromise?.userId === userId) {
    return pageAccessPromise.promise;
  }

  const stalePages = cachedPageAccess?.userId === userId ? cachedPageAccess.pages : null;
  publishPageAccess(userId, stalePages);

  const generation = cacheGeneration;
  const promise = fetcher()
    .then((pages) => {
      if (generation !== cacheGeneration) return pages;
      cachedPageAccess = { userId, pages, cachedAt: Date.now() };
      if (pagePermissionsSnapshot.userId === userId) publishPageAccess(userId, pages);
      return pages;
    })
    .catch(() => {
      if (generation === cacheGeneration && pagePermissionsSnapshot.userId === userId) {
        publishPageAccess(userId, {});
      }
      return {};
    })
    .finally(() => {
      if (pageAccessPromise?.promise === promise) pageAccessPromise = null;
    });

  pageAccessPromise = { userId, promise };
  return promise;
};

/** Drop cached page access after auth or role-permission changes. */
export function invalidatePagePermissionsCache(): void {
  if (
    !cachedPageAccess &&
    !pageAccessPromise &&
    pagePermissionsSnapshot.userId === null &&
    pagePermissionsSnapshot.pages === null
  ) {
    return;
  }

  cacheGeneration += 1;
  cachedPageAccess = null;
  pageAccessPromise = null;
  snapshotVersion += 1;
  publishPageAccess(null, null);
}

registerIdentityCacheClearer(invalidatePagePermissionsCache);
