import { redirect } from "next/navigation";

export default function OfficeCasesPage() {
  redirect("/cases?tab=office");
}
