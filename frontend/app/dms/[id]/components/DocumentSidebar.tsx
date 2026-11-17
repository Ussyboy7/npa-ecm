"use client";

import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
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
import { DocumentAccessCard } from "@/components/dms/DocumentAccessCard";
import type { OCRState } from "@/app/dms/[id]/hooks/use-document-ocr";
import Link from "next/link";
import { unlinkDocumentFromCase } from "@/lib/api/cases";
import { toast } from "@/components/ui/sonner";
import { logError } from "@/lib/client-logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { detailType } from "@/lib/detail-type";
import { FileStack, MessageSquare, Link2, Info, Pencil, FolderTree, Briefcase, Unlink } from "lucide-react";

export type SidebarTab = "versions" | "comments" | "related" | "details";

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
  uploadUser: User | null;
  ocrState: OCRState;
  activeTab?: SidebarTab;
  onActiveTabChange?: (tab: SidebarTab) => void;
  onQuickVersionUpload: () => void;
  onCreateVersion?: () => void;
  onOpenCommentsDialog: () => void;
  onShare?: () => void;
  /** Re-fetch the document after access is changed from the Details rail. */
  onPermissionsChanged?: () => unknown;
  /** Re-fetch the document after a case link changes. */
  onRelatedChanged?: () => unknown;
  /** Whether the viewer may change or revoke existing access. */
  canManageAccess?: boolean;
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
}

export function DocumentSidebar({
  document,
  versions,
  comments,
  accessLogs,
  relatedCorrespondence,
  uploadUser,
  ocrState,
  activeTab: controlledTab,
  onActiveTabChange,
  onQuickVersionUpload,
  onCreateVersion,
  onOpenCommentsDialog,
  onShare,
  onPermissionsChanged,
  onRelatedChanged,
  canManageAccess = false,
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
}: DocumentSidebarProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState<SidebarTab>("versions");
  const [caseToUnlink, setCaseToUnlink] = useState<NonNullable<DocumentRecord["case_links"]>[number] | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const unlinkCase = async () => {
    if (!caseToUnlink) return;
    setIsUnlinking(true);
    try {
      await unlinkDocumentFromCase(caseToUnlink.case.id, document.id);
      toast.success("Case unlinked", {
        description: `${caseToUnlink.case.caseNumber} no longer references this document`,
      });
      setCaseToUnlink(null);
    } catch (error: unknown) {
      logError("Failed to unlink case", error);
      toast.error("Failed to unlink case", {
        description: "The link may have been removed already. Reloading the document.",
      });
    } finally {
      setIsUnlinking(false);
      // The server may have removed the link before failing, so always resync.
      await onRelatedChanged?.();
    }
  };
  const activeTab = controlledTab ?? uncontrolledTab;
  const setActiveTab = (tab: SidebarTab) => {
    onActiveTabChange?.(tab);
    if (controlledTab === undefined) setUncontrolledTab(tab);
  };

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Roving tab stop: arrow keys move selection and focus, Home/End jump to the
  // ends, matching the WAI-ARIA tabs pattern.
  const handleTabKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
    tabList: { id: SidebarTab }[],
  ) => {
    const lastIndex = tabList.length - 1;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = index === lastIndex ? 0 : index + 1;
    else if (event.key === "ArrowLeft") nextIndex = index === 0 ? lastIndex : index - 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = lastIndex;
    if (nextIndex === null) return;
    event.preventDefault();
    setActiveTab(tabList[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  const parentDocumentId =
    (document as DocumentRecord & { parent_document?: { id: string }; parent_document_id?: string })
      .parent_document?.id ||
    (document as DocumentRecord & { parent_document_id?: string }).parent_document_id;

  // The Comments badge counts open threads, the same number the card reports;
  // unread activity only changes its emphasis.
  const openComments = comments.filter((comment) => !comment.resolved).length;
  const caseLinks = document.case_links ?? [];
  const relatedCount = caseLinks.length + relatedCorrespondence.length;

  const tabs: {
    id: SidebarTab;
    label: string;
    icon: typeof FileStack;
    count?: number;
  }[] = [
    { id: "versions", label: "Versions", icon: FileStack, count: versions.length },
    {
      id: "comments",
      label: "Comments",
      icon: MessageSquare,
      count: openComments || undefined,
    },
    {
      id: "related",
      label: "Related",
      icon: Link2,
      count: relatedCount || undefined,
    },
    { id: "details", label: "Details", icon: Info },
  ];

  return (
    <aside className="flex flex-col flex-1 min-w-0 min-h-0 bg-transparent md:border-l border-border/50">
      <div className="border-b border-border/40 p-2 bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div
          role="tablist"
          aria-label="Document details"
          aria-orientation="horizontal"
          className="flex gap-0.5 rounded-full bg-muted/50 p-0.5 min-w-0"
        >
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                role="tab"
                id={`dms-rail-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls="dms-rail-panel"
                tabIndex={selected ? 0 : -1}
                variant={selected ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 min-w-0 flex-1 basis-0 rounded-full px-1 text-[11px] gap-1",
                  "justify-center overflow-hidden",
                )}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index, tabs)}
                title={tab.label}
              >
                <Icon className="h-3 w-3 flex-shrink-0 opacity-80" />
                <span className="truncate">{tab.label}</span>
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

      <ScrollArea
        role="tabpanel"
        id="dms-rail-panel"
        aria-labelledby={`dms-rail-tab-${activeTab}`}
        className="flex-1 min-h-0 animate-in fade-in duration-200 motion-reduce:animate-none"
      >
        <div className="p-3 space-y-3 pb-8 min-w-0 overflow-x-hidden">
          {activeTab === "versions" && (
            <DocumentVersionsPanel
              compact
              document={document}
              versions={versions}
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
                onOpenCommentsDialog={onOpenCommentsDialog}
              />
            </div>
          )}

          {activeTab === "related" && (
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

              {caseLinks.length > 0 && (
                <div className="space-y-1 min-w-0">
                  <p className="text-[13px] font-semibold tracking-tight px-0.5 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                    Cases
                    <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                      {caseLinks.length}
                    </span>
                  </p>
                  <ul className="space-y-1">
                    {caseLinks.map((link) => (
                      <li key={link.id} className="flex items-start gap-1 min-w-0">
                        <Link
                          href={`/cases/${link.case.id}`}
                          className="min-w-0 flex-1 rounded-xl px-2.5 py-2 hover:bg-muted/50 transition-colors overflow-hidden"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-primary truncate">
                                {link.case.caseNumber}
                              </p>
                              <p
                                className="text-[13px] font-medium leading-snug break-words line-clamp-2"
                                title={link.case.title}
                              >
                                {link.case.title}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] h-4 shrink-0 capitalize">
                              {link.case.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setCaseToUnlink(link)}
                          aria-label={`Unlink case ${link.case.caseNumber}`}
                        >
                          <Unlink className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {caseLinks.length === 0 && relatedCorrespondence.length === 0 ? (
                <p className={detailType.caption}>
                  Not linked to a case or correspondence yet.
                </p>
              ) : null}

              {relatedCorrespondence.length > 0 ? (
                <RelatedCorrespondenceCard
                  relatedCorrespondence={relatedCorrespondence}
                />
              ) : null}

              <DocumentThreadCard
                documentId={document.id}
                parentDocumentId={parentDocumentId}
              />

              <RelatedItemsPanel type="document" id={document.id} compact />
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-3 min-w-0">
              {(document.effectiveRights?.policy_name || document.drmRights?.policy_name) ? (
                <DocumentDrmBanner
                  rights={{
                    policy_name:
                      document.effectiveRights?.policy_name || document.drmRights?.policy_name || null,
                    view_only: Boolean(
                      document.effectiveRights?.view_only ?? document.drmRights?.view_only,
                    ),
                    watermark_text:
                      document.effectiveRights?.watermark_text ||
                      document.drmRights?.watermark_text ||
                      "",
                    expired: Boolean(
                      document.effectiveRights?.expired ?? document.drmRights?.expired,
                    ),
                    message:
                      document.effectiveRights?.message || document.drmRights?.message || "",
                    inherited: Boolean(
                      document.effectiveRights?.inherited ?? document.drmRights?.inherited,
                    ),
                  }}
                />
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
                  {document.effectiveRights.inherited ? (
                    <p className="text-[11px] text-muted-foreground">
                      Inherited from {document.sensitivity} classification
                    </p>
                  ) : null}
                </div>
              )}
              <DocumentAccessCard
                document={document}
                canManage={canManageAccess}
                onAddPeople={onShare}
                onChanged={onPermissionsChanged}
              />
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
                onViewActivityDetails={onViewActivityDetails}
                onRefresh={onRefreshAccessLogs}
                compact
              />
            </div>
          )}
        </div>
      </ScrollArea>

      <AlertDialog
        open={Boolean(caseToUnlink)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setCaseToUnlink(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink this case?</AlertDialogTitle>
            <AlertDialogDescription>
              {caseToUnlink
                ? `${caseToUnlink.case.caseNumber} will no longer reference this document. The case itself is not deleted.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void unlinkCase()}
              disabled={isUnlinking}
            >
              {isUnlinking ? "Unlinking…" : "Unlink"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
