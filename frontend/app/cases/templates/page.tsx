import { redirect } from "next/navigation";

export default function CaseTemplatesPage() {
  redirect("/admin/templates-hub?tab=cases");
}
