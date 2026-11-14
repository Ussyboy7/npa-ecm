import { redirect } from "next/navigation";

export default function AllCasesPage() {
  redirect("/cases?tab=all");
}
