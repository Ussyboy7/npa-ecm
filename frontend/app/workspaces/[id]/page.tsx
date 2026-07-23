import { redirect } from "next/navigation";

/** Workspaces feature removed — land on dashboard per product docs. */
export default function WorkspaceDetailPage() {
  redirect("/dashboard");
}
