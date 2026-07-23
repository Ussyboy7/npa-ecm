"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CaseTimeline } from "@/components/cases/CaseTimeline";
import { RelatedItemsPanel } from "@/components/search/RelatedItemsPanel";
import type { ComponentProps } from "react";
import { CaseCommentsSummaryCard } from "./CaseCommentsSummaryCard";
import { CaseInfoCard } from "./CaseInfoCard";
import { CaseLinksPanel, type CaseLinksPanelProps } from "./CaseLinksPanel";
import type { CaseDetail } from "@/lib/npa-structure";
import { cn } from "@/lib/utils";
import { Clock, Info, Link2, MessageSquare } from "lucide-react";

export type CaseSidebarTab = "links" | "comments" | "activity" | "info";

export interface CaseSidebarProps {
  caseId: string;
  caseData: CaseDetail;
  commentsCount?: number;
  commentsRefreshKey?: number;
  onCommentsCountChange?: (count: number) => void;
  onOpenCommentsDialog: () => void;
  onLinkCorrespondence: () => void;
  onLinkDocument: () => void;
  onLinkForm: () => void;
  onUnlink: CaseLinksPanelProps["onUnlink"];
  onPreviewDocument?: (documentId: string) => void;
  onPreviewCorrespondence?: (correspondenceId: string) => void;
  onPreviewForm?: (formDocumentId: string, title?: string) => void;
  slaStatus?: ComponentProps<typeof CaseInfoCard>["slaStatus"];
  slaError?: string | null;
  owningOfficeName?: string | null;
  assignedToName?: string | null;
  createdByName?: string | null;
  activeTab?: CaseSidebarTab;
  onActiveTabChange?: (tab: CaseSidebarTab) => void;
}

export function CaseSidebar({
  caseId,
  caseData,
  commentsCount,
  commentsRefreshKey = 0,
  onCommentsCountChange,
  onOpenCommentsDialog,
  onLinkCorrespondence,
  onLinkDocument,
  onLinkForm,
  onUnlink,
  onPreviewDocument,
  onPreviewCorrespondence,
  onPreviewForm,
  slaStatus,
  slaError,
  owningOfficeName,
  assignedToName,
  createdByName,
  activeTab: controlledTab,
  onActiveTabChange,
}: CaseSidebarProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState<CaseSidebarTab>("links");
  const activeTab = controlledTab ?? uncontrolledTab;
  const setActiveTab = (tab: CaseSidebarTab) => {
    onActiveTabChange?.(tab);
    if (controlledTab === undefined) setUncontrolledTab(tab);
  };

  const linkCount =
    (caseData.correspondence?.length ?? 0) +
    (caseData.documents?.length ?? 0) +
    (caseData.forms?.length ?? 0);

  const tabs: {
    id: CaseSidebarTab;
    label: string;
    short: string;
    icon: typeof Link2;
    count?: number;
  }[] = [
    { id: "links", label: "Links", short: "Links", icon: Link2, count: linkCount || undefined },
    {
      id: "comments",
      label: "Comments",
      short: "Chat",
      icon: MessageSquare,
      count: commentsCount || undefined,
    },
    { id: "activity", label: "Activity", short: "Activity", icon: Clock },
    { id: "info", label: "Details", short: "Info", icon: Info },
  ];

  return (
    <aside className="flex flex-col flex-1 min-w-0 min-h-0 max-w-full overflow-hidden bg-transparent md:border-l border-border/50">
      <div className="border-b border-border/40 p-2 bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex gap-0.5 rounded-full bg-muted/50 p-0.5 min-w-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant={selected ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 min-w-0 flex-1 basis-0 rounded-full px-1 text-[11px] gap-0.5",
                  "justify-center overflow-hidden",
                )}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
              >
                <Icon className="h-3 w-3 flex-shrink-0 opacity-80" />
                <span className="truncate max-w-[3.5rem]">{tab.short}</span>
                {tab.count != null && tab.count > 0 ? (
                  <span className="tabular-nums opacity-70 flex-shrink-0 text-[10px]">
                    {tab.count}
                  </span>
                ) : null}
              </Button>
            );
          })}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 min-w-0 animate-in fade-in duration-200 motion-reduce:animate-none">
        <div className="p-3 space-y-3 pb-8 min-w-0 max-w-full overflow-x-hidden">
          {activeTab === "links" ? (
            <div className="space-y-3 min-w-0 max-w-full overflow-x-hidden">
              <CaseLinksPanel
                caseData={caseData}
                onLinkCorrespondence={onLinkCorrespondence}
                onLinkDocument={onLinkDocument}
                onLinkForm={onLinkForm}
                onUnlink={onUnlink}
                onPreviewDocument={onPreviewDocument}
                onPreviewCorrespondence={onPreviewCorrespondence}
                onPreviewForm={onPreviewForm}
              />
              <RelatedItemsPanel type="case" id={caseId} compact />
            </div>
          ) : null}

          {activeTab === "comments" ? (
            <CaseCommentsSummaryCard
              caseId={caseId}
              refreshKey={commentsRefreshKey}
              onOpenCommentsDialog={onOpenCommentsDialog}
              onCountChange={onCommentsCountChange}
            />
          ) : null}

          {activeTab === "activity" ? (
            <div className="min-w-0 max-w-full overflow-x-hidden">
              <CaseTimeline caseId={caseId} caseData={caseData} compact />
            </div>
          ) : null}

          {activeTab === "info" ? (
            <div className="min-w-0 max-w-full overflow-x-hidden">
              <CaseInfoCard
                caseData={caseData}
                slaStatus={slaStatus}
                slaError={slaError}
                owningOfficeName={owningOfficeName}
                assignedToName={assignedToName}
                createdByName={createdByName}
              />
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}
