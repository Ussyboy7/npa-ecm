type IdentityCacheClearer = () => void;

const clearers = new Set<IdentityCacheClearer>();

/** Register a module-level cache that must not outlive the signed-in identity. */
export function registerIdentityCacheClearer(clearer: IdentityCacheClearer): () => void {
  clearers.add(clearer);
  return () => clearers.delete(clearer);
}

/**
 * Clear every cache keyed to the previous user. Called on logout, token
 * failures, impersonation, and any other identity switch so a new user cannot
 * inherit directory, office, or page-visibility data from the old one.
 */
export function clearIdentityCaches(): void {
  for (const clearer of Array.from(clearers)) {
    try {
      clearer();
    } catch {
      // Cache cleanup must never block logout or a failed refresh.
    }
  }
}