import { redirect } from "next/navigation";

export default function DivisionAnalyticsPage() {
  redirect("/dashboard?tab=divisions");
}
