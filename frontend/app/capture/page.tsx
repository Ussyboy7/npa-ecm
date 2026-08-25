import { redirect } from "next/navigation";

/** Capture lives under My Documents — keep this route for bookmarks. */
export default function ContentCapturePage() {
  redirect("/dms?tab=capture");
}
