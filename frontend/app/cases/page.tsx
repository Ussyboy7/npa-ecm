"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HubTabList, type HubTabLink } from "@/components/admin/HubTabList";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { CasesListContent } from "./components/CasesListContent";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageSuspenseFallback } from "@/components/shared/PageSuspenseFallback";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

function CasesHub() {
  const searchParams = useSearchParams();
  const visibility = useSidebarVisibility();
  const requestedTab = searchParams.get("tab") || "my";
  const canMy = visibility.showMyCases;
  const canOffice = visibility.showOfficeCases;
  const canAll = visibility.showAllCases;
  const tab = requestedTab === "office" && canOffice
    ? "office"
    : requestedTab === "all" && canAll
      ? "all"
      : canMy ? "my" : canOffice ? "office" : "all";

  const tabs: HubTabLink[] = [];
  if (canMy) tabs.push({ href: "/cases?tab=my", label: "My", isActive: (_path, key) => (key || "my") === "my" });
  if (canOffice) tabs.push({ href: "/cases?tab=office", label: "Office", isActive: (_path, key) => key === "office" });
  if (canAll) tabs.push({ href: "/cases?tab=all", label: "All", isActive: (_path, key) => key === "all" });
  const tabList = tabs.length > 1 ? <HubTabList tabs={tabs} /> : null;

  if (!canMy && !canOffice && !canAll) {
    return <QueuePageShell title="Cases" subtitle="Case management is not available for your account.">{null}</QueuePageShell>;
  }
  return (
    <ErrorBoundary>
      <CasesListContent
        scope={tab}
        title={tab === "my" ? "My Cases" : tab === "office" ? "Office Cases" : "All Cases"}
        description={tab === "my" ? "Cases assigned to you personally" : tab === "office" ? "Cases assigned to your office" : "Cases within your authorised organisation scope"}
        tabs={tabList}
      />
    </ErrorBoundary>
  );
}

export default function CasesPage() {
  return <Suspense fallback={<PageSuspenseFallback message="Loading cases…" />}><CasesHub /></Suspense>;
}
