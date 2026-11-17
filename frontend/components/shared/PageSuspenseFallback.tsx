import { NpaLoading } from "./NpaLoading";

/**
 * Content-area fallback for routes inside the app shell. Public routes that
 * render without the shell should opt into `fullScreen`.
 */
export function PageSuspenseFallback({
  message = "Loading…",
  fullScreen = false,
}: {
  message?: string;
  fullScreen?: boolean;
}) {
  return <NpaLoading message={message} fullScreen={fullScreen} />;
}
