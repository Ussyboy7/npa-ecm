import { redirect } from "next/navigation";

export default function PerformanceAnalyticsPage() {
  redirect("/dashboard?tab=performance");
}
