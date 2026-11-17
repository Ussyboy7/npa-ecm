import { NpaLoading } from "./NpaLoading";

export function WorkspaceLoading({ message = "Loading workspace…" }: { message?: string }) {
  return <NpaLoading message={message} fullScreen />;
}
