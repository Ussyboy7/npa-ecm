import { redirect } from "next/navigation";

export default function CaseAnalyticsPage() {
  redirect("/dashboard?tab=cases");
}
