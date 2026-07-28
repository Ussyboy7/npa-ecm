"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AccessActivityCard } from "@/components/dms/AccessActivityCard";
import { RelatedCorrespondenceCard } from "@/components/dms/RelatedCorrespondenceCard";
import { DocumentCommentsCard } from "@/components/dms/DocumentCommentsCard";
import { DocumentThreadCard } from "@/components/dms/DocumentThreadCard";
import type {
  DocumentRecord,
  DocumentComment,
  DocumentAccessLog,
  DocumentVersion,
} from "@/lib/api/dms";
import type { Correspondence, Minute, User } from "@/lib/npa-structure";
import { DocumentMetadataCard } from "./DocumentMetadataCard";
import { DocumentSummaryCard } from "@/components/dms/DocumentSummaryCard";
import { RelatedItemsPanel } from "@/components/search/RelatedItemsPanel";
import { DocumentVersionsPanel } from "./DocumentVersionsPanel";
import { DocumentDrmBanner } from "@/components/dms/DocumentDrmBanner";
import { CollaborationPanel } from "@/components/dms/CollaborationPanel";
import type { OCRState } from "@/app/dms/[id]/hooks/use-document-ocr";
import { cn } from "@/lib/utils";
import { detailType } from "@/lib/detail-type";
import { FileStack, MessageSquare, Link2, Info } from "lucide-react";

export type SidebarTab = "versions" | "comments" | "links" | "details";

export interface DocumentSidebarProps {
  document: DocumentRecord;
  versions: DocumentVersion[];
  comments: DocumentComment[];
  accessLogs: DocumentAccessLog[];
  relatedCorrespondence: Array<{
    correspondence: Correspondence;
    minutes: Minute[];
    linkNotes?: string;
  }>;
  userLookup: Map<string, User>;
  uploadUser: User | null;
  ocrState: OCRState;
  activeTab?: SidebarTab;
  onActiveTabChange?: (tab: SidebarTab) => void;
  onQuickVersionUpload: () => void;
  onCreateVersion?: () => void;
  onOpenCommentsDialog: () => void;
  onShare?: () => void;
  onViewActivityDetails: (log: DocumentAccessLog) => void;
  onRefreshAccessLogs: () => Promise<void>;
  onPreviewVersion: (version: DocumentVersion) => void;
  onDownloadVersion?: (version: DocumentVersion) => void;
  onReplaceVersion: (versionId: string) => void;
  onVersionOCR: (versionId: string) => void;
  onCancelOCR: (versionId: string) => void;
  getUserInitials: (userId: string) => string;
  divisionNameById?: Map<string, string>;
  departmentNameById?: Map<string, string>;
}

export function DocumentSidebar({
  document,
  versions,
  comments,
  accessLogs,
  relatedCorrespondence,
  userLookup,
  uploadUser,
  ocrState,
  activeTab: controlledTab,
  onActiveTabChange,
  onQuickVersionUpload,
  onCreateVersion,
  onOpenCommentsDialog,
  onShare,
  onViewActivityDetails,
  onRefreshAccessLogs,
  onPreviewVersion,
  onDownloadVersion,
  onReplaceVersion,
  onVersionOCR,
  onCancelOCR,
  getUserInitials,
  divisionNameById,
  departmentNameById,
}: DocumentSidebarProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState<SidebarTab>("versions");
  const activeTab = controlledTab ?? uncontrolledTab;
  const setActiveTab = (tab: SidebarTab) => {
    onActiveTabChange?.(tab);
    if (controlledTab === undefined) setUncontrolledTab(tab);
  };

  const parentDocumentId =
    (document as DocumentRecord & { parent_document?: { id: string }; parent_document_id?: string })
      .parent_document?.id ||
    (document as DocumentRecord & { parent_document_id?: string }).parent_document_id;

  const tabs: {
    id: SidebarTab;
    label: string;
    short: string;
    icon: typeof FileStack;
    count?: number;
  }[] = [
    { id: "versions", label: "Versions", short: "Vers", icon: FileStack, count: versions.length },
    {
      id: "comments",
      label: "Comments",
      short: "Chat",
      icon: MessageSquare,
      count: comments.length || undefined,
    },
    {
      id: "links",
      label: "Links",
      short: "Links",
      icon: Link2,
      count: relatedCorrespondence.length || undefined,
    },
    { id: "details", label: "Details", short: "Info", icon: Info },
  ];

  return (
    <aside className="flex flex-col flex-1 min-w-0 min-h-0 bg-transparent md:border-l border-border/50">
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

      <ScrollArea className="flex-1 min-h-0 animate-in fade-in duration-200 motion-reduce:animate-none">
        <div className="p-3 space-y-3 pb-8 min-w-0 overflow-x-hidden">
          {activeTab === "versions" && (
            <DocumentVersionsPanel
              compact
              document={document}
              versions={versions}
              userLookup={userLookup}
              uploadUser={uploadUser}
              ocrState={ocrState}
              onCreateVersion={onCreateVersion}
              onQuickVersionUpload={onQuickVersionUpload}
              onPreviewVersion={onPreviewVersion}
              onDownloadVersion={onDownloadVersion}
              onReplaceVersion={onReplaceVersion}
              onVersionOCR={onVersionOCR}
              onCancelOCR={onCancelOCR}
            />
          )}

          {activeTab === "comments" && (
            <div className="space-y-3 min-w-0">
              <DocumentCommentsCard
                comments={comments}
                userLookup={userLookup}
                getUserInitials={getUserInitials}
                onOpenCommentsDialog={onOpenCommentsDialog}
              />
              <CollaborationPanel
                document={document}
                userLookup={userLookup}
                divisionNameById={divisionNameById}
                departmentNameById={departmentNameById}
                onShare={onShare}
                getUserInitials={getUserInitials}
              />
              <DocumentThreadCard
                documentId={document.id}
                parentDocumentId={parentDocumentId}
              />
            </div>
          )}

          {activeTab === "links" && (
            <div className="space-y-3 min-w-0">
              {relatedCorrespondence.length > 0 ? (
                <RelatedCorrespondenceCard
                  relatedCorrespondence={relatedCorrespondence}
                  userLookup={userLookup}
                />
              ) : (
                <p className={detailType.caption}>No linked correspondence yet.</p>
              )}
              <RelatedItemsPanel type="document" id={document.id} compact />
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-3 min-w-0">
              {document.drmRights?.policy_name ? (
                <DocumentDrmBanner rights={document.drmRights} />
              ) : null}
              <DocumentMetadataCard document={document} />
              <DocumentSummaryCard document={document} compact />
              <AccessActivityCard
                documentId={document.id}
                accessLogs={accessLogs}
                userLookup={userLookup}
                getUserInitials={getUserInitials}
                onViewActivityDetails={onViewActivityDetails}
                onRefresh={onRefreshAccessLogs}
                compact
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
