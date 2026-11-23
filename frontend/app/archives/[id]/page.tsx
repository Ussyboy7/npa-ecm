"use client";

import { Suspense, useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  Download,
  FileText,
  FolderTree,
  LockKeyhole,
  MessageSquare,
  Package,
  Paperclip,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { MinuteDetailModal } from "@/components/correspondence/MinuteDetailModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { DetailSkeleton } from "@/components/shared/PageSkeleton";
import { ResourceAccessDenied } from "@/components/shared/ResourceAccessDenied";
import { useAccessExplanation } from "@/hooks/use-access-explanation";
import { useApiRetry } from "@/hooks/use-api-retry";
import { useCurrentUser } from "@/hooks/use-current-user";
import { logError, logWarn } from "@/lib/client-logger";
import { logDocumentAccess, type DocumentAccessLog } from "@/lib/api/dms";
import { getDocumentAccessLogs } from "@/lib/dms-logs";
import {
  getCorrespondencePreviewContext,
  resolveCorrespondenceDmsAccessTarget,
} from "@/lib/correspondence-preview-target";
import { formatDateShort, isCorrespondenceClosed } from "@/lib/correspondence-helpers";
import { formatFileSize } from "@/lib/file-utils";
import type { Minute } from "@/lib/npa-structure";
import { CorrespondenceInfoPanel } from "@/app/correspondence/[id]/components/CorrespondenceInfoPanel";
import { DocumentPreviewPanel } from "@/app/correspondence/[id]/components/DocumentPreviewPanel";
import { MinuteThreadPanel } from "@/app/correspondence/[id]/components/MinuteThreadPanel";
import { PhysicalCopySection } from "@/app/correspondence/[id]/components/PhysicalCopySection";
import { corrType } from "@/app/correspondence/[id]/correspondence-type";
import {
  correspondenceDetailReducer,
  initialState,
} from "@/app/correspondence/[id]/correspondence-state-reducer";
import { useCorrespondenceDetailData } from "@/app/correspondence/[id]/hooks/use-correspondence-detail-data";

const ARCHIVES_BACK_HREF = "/correspondence/records";

function retainedFileType(fileType?: string, fileName?: string): string {
  if (fileType === "application/pdf" || fileName?.toLowerCase().endsWith(".pdf")) return "PDF";
  const subtype = fileType?.split("/").pop();
  return subtype ? subtype.toUpperCase() : "File";
}

const ArchiveRecordContent = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { currentUser: activeUser } = useCurrentUser();
  const { fetchWithRetry } = useApiRetry();

  const [state, dispatch] = useReducer(correspondenceDetailReducer, {
    ...initialState,
    detailLoading: true,
  });
  const {
    minutes,
    remoteCorrespondence: correspondence,
    detailLoading,
    linkedDocuments,
    withheldLinkedDocumentCount,
    selectedMinute,
    selectedAttachmentIndex,
    selectedLinkedDocumentId,
    attachmentSearchQuery,
    selectedLinkedDocVersion,
    isPreviewFullscreen,
  } = state;

  const [accessDenied, setAccessDenied] = useState(false);
  const { result: accessExplanation, loading: accessExplanationLoading } = useAccessExplanation(
    "correspondence_view",
    accessDenied,
  );

  const [setMinutes, setRemoteCorrespondence, setDetailLoading, setLinkedDocuments,
    setWithheldLinkedDocumentCount, setSelectedMinute, setSelectedAttachmentIndex, setSelectedLinkedDocumentId,
    setAttachmentSearchQuery, setIsPreviewFullscreen] = useMemo(() => [
    (m: Minute[]) => dispatch({ type: "SET_MINUTES", payload: m }),
    (value: typeof correspondence) => dispatch({ type: "SET_REMOTE_CORRESPONDENCE", payload: value }),
    (value: boolean) => dispatch({ type: "SET_DETAIL_LOADING", payload: value }),
    (value: typeof linkedDocuments) => dispatch({ type: "SET_LINKED_DOCUMENTS", payload: value }),
    (count: number) => dispatch({ type: "SET_WITHHELD_LINKED_DOCUMENT_COUNT", payload: count }),
    (value: Minute | null) => dispatch({ type: "SET_SELECTED_MINUTE", payload: value }),
    (value: number | null) => dispatch({ type: "SET_SELECTED_ATTACHMENT_INDEX", payload: value }),
    (value: string | null) => dispatch({ type: "SET_SELECTED_LINKED_DOCUMENT_ID", payload: value }),
    (value: string) => dispatch({ type: "SET_ATTACHMENT_SEARCH_QUERY", payload: value }),
    (value: boolean) => dispatch({ type: "SET_PREVIEW_FULLSCREEN", payload: value }),
  ], [dispatch]);

  const isCompleted = isCorrespondenceClosed(correspondence?.status);

  const noop = useCallback(() => {}, []);
  const mergeMinutes = useCallback(() => {}, []);
  const closeModal = useCallback(() => {}, []);

  const { refreshDetail } = useCorrespondenceDetailData({
    id,
    correspondence,
    minutes,
    activeUserId: activeUser?.id,
    isCompleted,
    detailLoading,
    readOnly: true,
    fetchWithRetry,
    mergeMinutes,
    closeModal,
    setMinutes,
    setRemoteCorrespondence,
    setDetailLoading,
    setBackendDelegation: noop,
    setLinkedDocuments,
    setWithheldLinkedDocumentCount,
    setAccessDenied,
  });

  const getActionIcon = useCallback((actionType: string) => {
    switch (actionType) {
      case "approve":
      case "treat":
        return CheckCircle;
      case "forward":
        return Send;
      case "minute":
      default:
        return MessageSquare;
    }
  }, []);

  const previewContext = useMemo(
    () => getCorrespondencePreviewContext(correspondence, linkedDocuments, selectedAttachmentIndex, true),
    [correspondence, linkedDocuments, selectedAttachmentIndex],
  );

  const completionGeneratedAt =
    correspondence?.completionPackage?.generatedAt ??
    correspondence?.completionSummaryGeneratedAt ??
    correspondence?.completedAt;
  const hasCompletionPackage = Boolean(correspondence?.completionPackage?.versionId);
  const primaryLinkedDocId = correspondence?.linkedDocumentIds?.[0] ?? null;
  const [accessLogs, setAccessLogs] = useState<DocumentAccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const refreshAccessLogs = useCallback(async () => {
    if (!primaryLinkedDocId) {
      setAccessLogs([]);
      return;
    }
    setLogsLoading(true);
    try {
      setAccessLogs(await getDocumentAccessLogs(primaryLinkedDocId));
    } catch (error: unknown) {
      logWarn("Failed to load archive document access history", error);
      setAccessLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [primaryLinkedDocId]);

  useEffect(() => {
    void refreshAccessLogs();
  }, [refreshAccessLogs]);

  const logArchiveDmsAccess = useCallback(
    async (action: DocumentAccessLog["action"]) => {
      if (!activeUser?.id || !correspondence) return;
      const target = resolveCorrespondenceDmsAccessTarget(
        correspondence,
        linkedDocuments,
        previewContext.source,
      );
      if (!target) return;

      try {
        await logDocumentAccess({
          documentId: target.documentId,
          userId: activeUser.id,
          action,
          sensitivity: target.sensitivity,
        });
      } catch (error: unknown) {
        logWarn("Failed to write archive DMS access log", error);
      }
    },
    [activeUser?.id, correspondence, linkedDocuments, previewContext.source],
  );

  const handleCompletionPackageDownload = useCallback(
    async (filename: string) => {
      if (!correspondence?.completionPackage?.versionId) {
        toast.error("Completion package is not available for download");
        return;
      }
      await logArchiveDmsAccess("download");
      try {
        const versionId = correspondence.completionPackage.versionId;
        const { downloadCanonicalDocument } = await import("@/lib/canonical-document");
        await downloadCanonicalDocument({
          kind: "dms-version",
          versionId,
          fileName: filename,
        });
        toast.success("Completion summary downloaded");
      } catch (error: unknown) {
        logError("Failed to download completion package", error);
        toast.error("Unable to download completion summary");
      }
    },
    [correspondence?.completionPackage?.versionId, logArchiveDmsAccess],
  );

  const handleAttachmentDownload = useCallback(
    async (attachmentId: string, fileName?: string) => {
      try {
        const { downloadCanonicalDocument } = await import("@/lib/canonical-document");
        await downloadCanonicalDocument({
          kind: "corr-attachment",
          attachmentId,
          fileName: fileName || "attachment",
        });
      } catch (error: unknown) {
        logError("Failed to download archive attachment", error);
        toast.error("Unable to download attachment");
      }
    },
    [],
  );

  const documentPanelProps = {
    linkedDocuments,
    withheldLinkedDocumentCount,
    selectedLinkedDocVersion,
    selectedAttachmentIndex,
    selectedLinkedDocumentId,
    attachmentSearchQuery,
    isPreviewFullscreen,
    isCompleted: true,
    readOnly: true,
    onSetAttachmentSearchQuery: setAttachmentSearchQuery,
    onSetIsPreviewFullscreen: setIsPreviewFullscreen,
    onSetSelectedAttachmentIndex: setSelectedAttachmentIndex,
    onSetSelectedLinkedDocumentId: setSelectedLinkedDocumentId,
    onOpenLinkDocument: noop,
    onSyncFromApi: refreshDetail,
  };

  if (!activeUser) return null;

  if (!correspondence) {
    if (detailLoading) {
      return (
        <div className="p-6">
          <DetailSkeleton />
        </div>
      );
    }
    if (accessDenied) {
      return (
        <ResourceAccessDenied
          title="Archive record unavailable"
          check={accessExplanation}
          loading={accessExplanationLoading}
          backHref={ARCHIVES_BACK_HREF}
          backLabel="Back to Archives"
        />
      );
    }
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center p-6 animate-in fade-in duration-300">
        <EmptyState
          icon="file"
          title="Archive record not found"
          message="This record may not be completed or filed, or it may be outside your archive scope."
          actionLabel="Back to Archives"
          onAction={() => router.push(ARCHIVES_BACK_HREF)}
          variant="dashed"
        />
      </div>
    );
  }

  const isArchived = correspondence.status === "archived";
  const archiveLevel = correspondence.archiveLevel
    ? correspondence.archiveLevel.charAt(0).toUpperCase() + correspondence.archiveLevel.slice(1)
    : null;
  const completionDate = correspondence.completedAt ?? completionGeneratedAt;
  const attachmentCount = correspondence.attachments?.length ?? 0;
  const priorityLabel = correspondence.priority?.trim().toUpperCase();

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <header className="border-b border-border/60 bg-gradient-to-b from-muted/40 via-muted/10 to-background">
            <div className="px-4 pb-3 pt-3 md:px-6 md:pb-4 md:pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => router.push(ARCHIVES_BACK_HREF)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Archives
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-6 gap-1 border-primary/20 bg-background/70 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    <LockKeyhole className="h-3 w-3" />
                    Read-only
                  </Badge>
                  {hasCompletionPackage ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() =>
                        void handleCompletionPackageDownload(
                          `completion-package-${correspondence.referenceNumber || correspondence.id}.pdf`,
                        )
                      }
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download completion package
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-primary/15 bg-background p-2 shadow-sm">
                  <Archive className="h-5 w-5 text-primary/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Archive record
                    </span>
                    <Badge variant="secondary" className="h-5 gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      {isArchived ? "Archived" : "Completed"}
                    </Badge>
                  </div>
                  <h1 className={`${corrType.pageTitle} mt-0.5 truncate`}>{correspondence.referenceNumber}</h1>
                  <p className="mt-1 text-sm font-medium leading-snug text-foreground/90 md:text-[15px]">
                    {correspondence.subject}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 bg-background/50 px-4 py-2 md:px-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                {completionDate ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3" />
                    Completed <span className="font-medium text-foreground">{formatDateShort(completionDate)}</span>
                  </span>
                ) : null}
                {archiveLevel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <FolderTree className="h-3 w-3" />
                    Filed at <span className="font-medium text-foreground">{archiveLevel}</span> level
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Paperclip className="h-3 w-3" />
                  <span className="font-medium text-foreground">{attachmentCount}</span>
                  {attachmentCount === 1 ? "attachment" : "attachments"}
                </span>
                {correspondence.currentOfficeName ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    Last with <span className="truncate font-medium text-foreground">{correspondence.currentOfficeName}</span>
                  </span>
                ) : null}
                {priorityLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                    <span className="font-medium text-foreground">{priorityLabel}</span> priority
                  </span>
                ) : null}
              </div>
            </div>
          </header>

        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/10">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-3 py-4 md:px-6 md:py-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)] xl:items-start">
            <div className="min-w-0 space-y-4">
              <PhysicalCopySection documents={correspondence.physicalDocuments ?? []} />

              <section className="flex h-[min(76vh,880px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm sm:min-h-[480px]">
                <DocumentPreviewPanel correspondence={correspondence} {...documentPanelProps} />
              </section>
            </div>

            <aside className="min-w-0 space-y-4">
              <section className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <h2 className="truncate text-[13px] font-semibold tracking-tight">Retained files</h2>
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {attachmentCount + (hasCompletionPackage ? 1 : 0)}
                  </span>
                </div>
                <div className="divide-y divide-border/50">
                  {correspondence.attachments?.map((attachment, index) => (
                    <div
                      key={attachment.id || index}
                      className="flex items-center gap-2 px-3 py-2.5"
                    >
                      <FileText className="h-4 w-4 flex-shrink-0 text-primary/80" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium" title={attachment.fileName || "Attachment"}>
                          {attachment.fileName || "Attachment"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {retainedFileType(attachment.fileType, attachment.fileName)}
                          {attachment.fileSize ? ` · ${formatFileSize(attachment.fileSize)}` : ""}
                        </p>
                      </div>
                      {attachment.id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          aria-label={`Download ${attachment.fileName || "attachment"}`}
                          onClick={() => void handleAttachmentDownload(attachment.id, attachment.fileName)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  ))}

                  {hasCompletionPackage ? (
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <Package className="h-4 w-4 flex-shrink-0 text-primary/80" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium">Completion package</p>
                        <p className="text-[10px] text-muted-foreground">
                          PDF{completionDate ? ` · ${formatDateShort(completionDate)}` : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        aria-label="Download completion package"
                        onClick={() =>
                          void handleCompletionPackageDownload(
                            `completion-package-${correspondence.referenceNumber || correspondence.id}.pdf`,
                          )
                        }
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}

                  {attachmentCount === 0 && !hasCompletionPackage ? (
                    <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">
                      No files were retained with this record.
                    </div>
                  ) : null}
                </div>
              </section>

              <section
                id="archive-minute-history"
                className="scroll-mt-4 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm"
              >
                <MinuteThreadPanel
                  minutes={minutes}
                  activeUserId={activeUser.id}
                  isCompleted
                  isCurrentUserTurn={false}
                  getActionIcon={getActionIcon}
                  embedded
                  scrollable={false}
                  onMinuteClick={setSelectedMinute}
                  onEditMinute={noop}
                  onRecallMinute={noop}
                  onAddNote={noop}
                  readOnly
                />
              </section>

              <section className="min-w-0 space-y-2">
                <div className="px-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Record details & audit
                  </p>
                </div>
                <CorrespondenceInfoPanel
                  correspondence={correspondence}
                  minutes={minutes}
                  linkedDocuments={linkedDocuments}
                  primaryLinkedDocId={primaryLinkedDocId}
                  accessLogs={accessLogs}
                  logsLoading={logsLoading}
                  onRefreshAccessLogs={refreshAccessLogs}
                  onOpenLinkDocument={noop}
                  onViewThread={() =>
                    document
                      .getElementById("archive-minute-history")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  showFiles={false}
                  isCompleted
                />
              </section>
            </aside>
          </div>
        </div>
      </div>

      {selectedMinute ? (
        <MinuteDetailModal
          minute={selectedMinute}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedMinute(null);
          }}
          authorName={selectedMinute.userName}
          showDelegationInfo={false}
        />
      ) : null}
    </>
  );
};

const ArchiveRecordPage = () => (
  <ClientErrorBoundary>
    <Suspense fallback={null}>
      <ArchiveRecordContent />
    </Suspense>
  </ClientErrorBoundary>
);

export const dynamic = "force-dynamic";

export default ArchiveRecordPage;
