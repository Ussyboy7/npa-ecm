import { redirect } from "next/navigation";

export default function AuditFormsPage() {
  redirect("/dms?tab=forms");
}
