/** Shared Suspense fallback for full-page routes. */
export function PageSuspenseFallback({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      {message}
    </div>
  );
}
