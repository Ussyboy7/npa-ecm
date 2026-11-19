import { redirect } from "next/navigation";

/**
 * Audit form submissions live in the DMS Forms tab (AuditFormsLibrary).
 * Land on the submissions segment, which is what this route's detail pages
 * return to, rather than the available-forms list.
 */
export default function AuditFormsPage() {
  redirect("/dms?tab=forms&segment=submissions");
}
