"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { RelatedItemsPanel } from "@/components/search/RelatedItemsPanel";
import { DocumentVersionsPanel } from "./DocumentVersionsPanel";
import { DocumentDrmBanner } from "@/components/dms/DocumentDrmBanner";
import { CollaborationPanel } from "@/components/dms/CollaborationPanel";
import type { OCRState } from "@/app/dms/[id]/hooks/use-document-ocr";
import { cn } from "@/lib/utils";
import { detailType } from "@/lib/detail-type";
import { FileStack, MessageSquare, Link2, Info, Pencil, FolderTree } from "lucide-react";

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
  onEditMetadata?: () => void;
  onLinkCase?: () => void;
  unreadComments?: number;
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
  onEditMetadata,
  onLinkCase,
  unreadComments = 0,
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
      count: unreadComments > 0 ? unreadComments : comments.length || undefined,
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
                  <span
                    className={cn(
                      "tabular-nums flex-shrink-0 text-[10px]",
                      tab.id === "comments" && unreadComments > 0
                        ? "px-1 py-0 rounded-full bg-primary text-primary-foreground font-semibold"
                        : "opacity-70",
                    )}
                  >
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
              {onLinkCase && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={onLinkCase}
                >
                  <FolderTree className="h-4 w-4 mr-2 opacity-70" />
                  Link to case
                </Button>
              )}
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
              {document.effectiveRights && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">Effective rights</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="capitalize text-[11px]">
                      Access: {document.effectiveRights.access_level ?? "None"}
                    </Badge>
                    <Badge variant={document.effectiveRights.can_download ? "secondary" : "destructive"} className="text-[11px]">
                      Download {document.effectiveRights.can_download ? "allowed" : "blocked"}
                    </Badge>
                    <Badge variant={document.effectiveRights.can_print ? "secondary" : "destructive"} className="text-[11px]">
                      Print {document.effectiveRights.can_print ? "allowed" : "blocked"}
                    </Badge>
                    {document.effectiveRights.can_replace_version && <Badge variant="secondary" className="text-[11px]">Replace versions</Badge>}
                    {document.effectiveRights.can_manage_sharing && <Badge variant="secondary" className="text-[11px]">Manage sharing</Badge>}
                  </div>
                  {document.effectiveRights.watermark_text && (
                    <p className="text-xs text-muted-foreground">Watermark: {document.effectiveRights.watermark_text}</p>
                  )}
                  {document.effectiveRights.message && (
                    <p className="text-xs text-muted-foreground leading-snug">{document.effectiveRights.message}</p>
                  )}
                </div>
              )}
              <DocumentMetadataCard document={document} />
              {onEditMetadata && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={onEditMetadata}
                >
                  <Pencil className="h-4 w-4 mr-2 opacity-70" />
                  Edit metadata
                </Button>
              )}
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
