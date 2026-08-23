"use client";

import { useCallback, useEffect, useState } from "react";
import { useAbortController } from "@/hooks/use-abort-controller";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { SearchHighlightBanner } from "@/components/search/SearchHighlightBanner";
import {
  readSearchHighlight,
  SEARCH_MATCH_PARAM,
  SEARCH_Q_PARAM,
} from "@/lib/search-highlight";
import { Button } from "@/components/ui/button";
import { LinkCorrespondenceDialog } from "@/components/cases/LinkCorrespondenceDialog";
import { LinkDocumentDialog } from "@/components/cases/LinkDocumentDialog";
import { LinkFormDialog } from "@/components/cases/LinkFormDialog";
import { CaseHeader } from "./components/CaseHeader";
import { CaseStatusStrip } from "./components/CaseStatusStrip";
import { CaseMobileTabBar, CaseWorkspace } from "./components/CaseWorkspace";
import { CaseMobileStickyBar } from "./components/CaseMobileStickyBar";
import { CaseCommentsDialog } from "./components/CaseCommentsDialog";
import { CaseFormPreviewDialog } from "./components/CaseFormPreviewDialog";
import { DocumentVersionPreviewModal } from "@/components/dms/DocumentVersionPreviewModal";
import { DocumentPreviewModal } from "@/components/correspondence/DocumentPreviewModal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgUsers } from "@/hooks/use-org-users";
import {
  getCaseById,
  updateCaseStatus,
  generateCaseCompletionPackage,
  downloadCaseCompletionPackage,
  unlinkCorrespondenceFromCase,
  unlinkDocumentFromCase,
  unlinkFormFromCase,
  importCases,
  getCaseSLAStatus,
  getCaseComments,
} from "@/lib/api/cases";
import type { CaseDetail, Correspondence } from "@/lib/npa-structure";
import {
  canDownloadDocument,
  fetchDocumentById,
  type DocumentRecord,
  type DocumentVersion,
} from "@/lib/api/dms";
import { apiFetch } from "@/lib/api-client";
import { mapApiCorrespondence } from '@/lib/api/correspondence-mappers';
import type { ApiCorrespondence } from "@/lib/api/correspondence";
import { isCorrespondenceClosed } from "@/lib/correspondence-helpers";
import {
  getCorrespondencePreviewContext,
  getPrimaryLinkedDocument,
} from "@/lib/correspondence-preview-target";
import { logError, logWarn } from "@/lib/client-logger";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { toast } from "@/components/ui/sonner";

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

const CaseDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { query: highlightQuery, matchField } = readSearchHighlight(searchParams);
  const caseId = params.id as string;
  const { currentUser, hydrated } = useCurrentUser();
  const { offices } = useOrganization();
  const { users } = useOrgUsers();
  const { getSignal } = useAbortController();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [itemToUnlink, setItemToUnlink] = useState<{
    type: "correspondence" | "document" | "form";
    id: string;
    name: string;
  } | null>(null);
  const [slaStatus, setSlaStatus] = useState<{
    status: "ok" | "warning" | "critical" | "breach";
    target_date: string;
    target_days: number;
    breached: boolean;
  } | null>(null);
  const [slaError, setSlaError] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showLinkCorrespondenceDialog, setShowLinkCorrespondenceDialog] = useState(false);
  const [showLinkDocumentDialog, setShowLinkDocumentDialog] = useState(false);
  const [showLinkFormDialog, setShowLinkFormDialog] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0);
  const [mobileActiveTab, setMobileActiveTab] = useState<"overview" | "details">("overview");
  const [overviewFocus, setOverviewFocus] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | null>(null);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [corrPreview, setCorrPreview] = useState<{
    correspondence: Correspondence;
    documentContentHtml?: string;
    attachmentFileName?: string;
    attachmentSource: "attachment" | "completion-package";
    documentVersionId?: string;
    attachmentId?: string;
  } | null>(null);
  const [formPreviewId, setFormPreviewId] = useState<string | null>(null);
  const [formPreviewTitle, setFormPreviewTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId || !currentUser?.id) {
      return;
    }

    const signal = getSignal();

    const fetchCase = async () => {
      setLoading(true);
      setError(null);
      setSlaError(null);
      try {
        const data = await getCaseById(caseId, signal);

        if (signal.aborted) return;

        setCaseData(data);

        try {
          const sla = await getCaseSLAStatus(caseId, signal);
          if (signal.aborted) return;
          setSlaStatus(sla);
        } catch (err: unknown) {
          if (err && typeof err === "object" && "name" in err && err.name === "AbortError") return;
          logError("Failed to load SLA status", err);
          setSlaError("SLA status unavailable");
        }
      } catch (err: unknown) {
        if (err && typeof err === "object" && "name" in err && err.name === "AbortError") return;
        logError("Failed to load case", err);
        const status = (err as Record<string, unknown>).status;
        if (status === 404) {
          setError(
            "Case not found. It may have been deleted or you may have followed an invalid link.",
          );
        } else {
          setError("Failed to load case. Please try again.");
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchCase();
  }, [hydrated, currentUser?.id, caseId, refreshKey, getSignal]);

  useEffect(() => {
    if (!caseId || !currentUser?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const comments = await getCaseComments(caseId);
        if (!cancelled) setCommentsCount(comments.length);
      } catch {
        if (!cancelled) setCommentsCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, currentUser?.id, commentsRefreshKey, refreshKey]);

  const handleStatusUpdate = async (newStatus: CaseDetail["status"]) => {
    if (!caseData) return;

    setUpdatingStatus(true);
    try {
      const updated = await updateCaseStatus(caseData.id, newStatus);
      setCaseData({ ...caseData, ...updated });
      toast.success("Case status updated successfully");
    } catch (err) {
      logError("Failed to update case status", err);
      toast.error("Failed to update case status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateCompletionPackage = async () => {
    if (!caseData) return;

    try {
      const updated = await generateCaseCompletionPackage(caseData.id);
      setCaseData({ ...caseData, ...updated });
      toast.success("Completion package generated successfully");
    } catch (err) {
      logError("Failed to generate completion package", err);
      toast.error("Failed to generate completion package");
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importCases(data);

      if (result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} case(s)`);
        if (result.failed > 0) {
          toast.warning(`${result.failed} case(s) failed to import`);
        }
        router.push("/cases");
      } else {
        toast.error("No cases were imported");
      }
    } catch (err) {
      logError("Failed to import cases", err);
      toast.error("Failed to import cases. Please check the file format.");
    }
  };

  const handleUnlinkClick = (
    type: "correspondence" | "document" | "form",
    id: string,
    name: string,
  ) => {
    setItemToUnlink({ type, id, name });
    setShowUnlinkConfirm(true);
  };

  const handleUnlinkConfirm = async () => {
    if (!itemToUnlink || !caseData) return;

    try {
      if (itemToUnlink.type === "correspondence") {
        await unlinkCorrespondenceFromCase(caseData.id, itemToUnlink.id);
      } else if (itemToUnlink.type === "document") {
        await unlinkDocumentFromCase(caseData.id, itemToUnlink.id);
      } else if (itemToUnlink.type === "form") {
        await unlinkFormFromCase(caseData.id, itemToUnlink.id);
      }

      const updated = await getCaseById(caseData.id);
      setCaseData(updated);
      toast.success(
        `${itemToUnlink.type.charAt(0).toUpperCase() + itemToUnlink.type.slice(1)} unlinked successfully`,
      );
      setShowUnlinkConfirm(false);
      setItemToUnlink(null);
    } catch (err) {
      logError(`Failed to unlink ${itemToUnlink.type}`, err);
      toast.error(`Failed to unlink ${itemToUnlink.type}`);
    }
  };

  const handleItemLinked = async () => {
    if (!caseData) return;
    try {
      const updated = await getCaseById(caseData.id);
      setCaseData(updated);
    } catch (err) {
      logError("Failed to reload case data", err);
    }
  };

  const handleCommentsCountChange = useCallback((count: number) => {
    setCommentsCount(count);
  }, []);

  const handlePreviewDocument = useCallback(async (documentId: string) => {
    const toastId = toast.loading("Opening document…");
    try {
      const doc = await fetchDocumentById(documentId);
      const version = doc.versions?.[0];
      if (!version) {
        toast.error("This document has no file version to preview", { id: toastId });
        return;
      }
      setPreviewDocument(doc);
      setPreviewVersion(version);
      toast.dismiss(toastId);
    } catch (err) {
      logError("Failed to load document for preview", err);
      toast.error("Could not open document preview", { id: toastId });
    }
  }, []);

  const closeDocumentPreview = useCallback(() => {
    setPreviewVersion(null);
    setPreviewDocument(null);
  }, []);

  const handlePreviewCorrespondence = useCallback(async (correspondenceId: string) => {
    const toastId = toast.loading("Opening correspondence…");
    try {
      const raw = await apiFetch<ApiCorrespondence>(`/correspondence/items/${correspondenceId}/`);
      const correspondence = mapApiCorrespondence(raw);
      const linkedIds = correspondence.linkedDocumentIds ?? [];
      const linkedDocs = (
        await Promise.all(
          linkedIds.map(async (docId) => {
            try {
              return await fetchDocumentById(docId);
            } catch (err) {
              logWarn(`Failed to load linked document ${docId}`, err);
              return null;
            }
          }),
        )
      ).filter((doc): doc is DocumentRecord => Boolean(doc));

      const isCompleted = isCorrespondenceClosed(correspondence.status);
      const preview = getCorrespondencePreviewContext(
        correspondence,
        linkedDocs,
        null,
        isCompleted,
      );
      const primaryDoc = getPrimaryLinkedDocument(linkedDocs);
      const documentContentHtml =
        primaryDoc?.versions?.[primaryDoc.versions.length - 1]?.contentHtml;

      if (!preview.documentVersionId && !preview.attachmentId && !documentContentHtml?.trim() && !correspondence.treatmentResponse?.trim()) {
        toast.error("No file available to preview for this correspondence", { id: toastId });
        return;
      }

      setCorrPreview({
        correspondence,
        documentContentHtml,
        attachmentFileName: preview.previewFileName,
        attachmentSource: preview.source,
        documentVersionId: preview.documentVersionId,
        attachmentId: preview.attachmentId,
      });
      toast.dismiss(toastId);
    } catch (err) {
      logError("Failed to load correspondence for preview", err);
      toast.error("Could not open correspondence preview", { id: toastId });
    }
  }, []);

  const closeCorrespondencePreview = useCallback(() => {
    setCorrPreview(null);
  }, []);

  if (!currentUser?.id) {
    return null;
  }

  const owningOffice = caseData
    ? offices.find((o) => o.id === caseData.owningOfficeId)
    : undefined;
  const assignedTo = caseData ? users.find((u) => u.id === caseData.assignedToId) : undefined;
  const createdBy = caseData ? users.find((u) => u.id === caseData.createdById) : undefined;

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-6">
        <LoadingState message="Loading case…" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="px-4 md:px-6 py-6">
        <ErrorState
          message={error || "Case not found"}
          onRetry={
            error && error.includes("not found")
              ? undefined
              : () => setRefreshKey((k) => k + 1)
          }
        />
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={() => router.push("/cases/my")}>
            Back to Cases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-w-0 flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <CaseHeader
            caseData={caseData}
            updatingStatus={updatingStatus}
            onStatusUpdate={handleStatusUpdate}
            onGenerateCompletionPackage={handleGenerateCompletionPackage}
            onDownloadCompletionPackage={() => {
              void downloadCaseCompletionPackage(
                caseData.id,
                `${caseData.completionPackage?.title || 'completion-package'}.pdf`,
              ).catch((err) => {
                logError('Package download failed', err);
                toast.error(err instanceof Error ? err.message : 'Download failed');
              });
            }}
            onImport={() => setShowImportDialog(true)}
          />
          <CaseStatusStrip
            caseData={caseData}
            slaStatus={slaStatus}
            slaError={slaError}
            owningOfficeName={owningOffice?.name}
            assignedToName={assignedTo?.name}
          />
          {highlightQuery ? (
            <div className="px-4 py-2 border-b border-border/40">
              <SearchHighlightBanner
                query={highlightQuery}
                matchField={matchField}
                onDismiss={() => {
                  const next = new URLSearchParams(searchParams.toString());
                  next.delete(SEARCH_Q_PARAM);
                  next.delete(SEARCH_MATCH_PARAM);
                  const qs = next.toString();
                  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                }}
              />
            </div>
          ) : null}
          <CaseMobileTabBar
            commentsCount={commentsCount}
            mobileActiveTab={mobileActiveTab}
            onSetMobileActiveTab={setMobileActiveTab}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <CaseWorkspace
            mobileActiveTab={mobileActiveTab}
            overviewFocus={overviewFocus}
            onSetOverviewFocus={setOverviewFocus}
            overviewProps={{
              caseData,
              onLinkCorrespondence: () => setShowLinkCorrespondenceDialog(true),
              onLinkDocument: () => setShowLinkDocumentDialog(true),
              onLinkForm: () => setShowLinkFormDialog(true),
            }}
            sidebarProps={{
              caseId,
              caseData,
              commentsCount,
              commentsRefreshKey,
              onCommentsCountChange: handleCommentsCountChange,
              onOpenCommentsDialog: () => setCommentsDialogOpen(true),
              onLinkCorrespondence: () => setShowLinkCorrespondenceDialog(true),
              onLinkDocument: () => setShowLinkDocumentDialog(true),
              onLinkForm: () => setShowLinkFormDialog(true),
              onUnlink: handleUnlinkClick,
              onPreviewDocument: (documentId) => {
                void handlePreviewDocument(documentId);
              },
              onPreviewCorrespondence: (correspondenceId) => {
                void handlePreviewCorrespondence(correspondenceId);
              },
              onPreviewForm: (formDocumentId, title) => {
                setFormPreviewId(formDocumentId);
                setFormPreviewTitle(title ?? null);
              },
              slaStatus,
              slaError,
              owningOfficeName: owningOffice?.name,
              assignedToName: assignedTo?.name,
              createdByName: createdBy?.name ?? caseData.createdByName,
            }}
          />
        </div>

        <CaseMobileStickyBar
          canPackage={caseData.status === "closed" && !caseData.completionPackage}
          canDownloadPackage={Boolean(caseData.completionPackage)}
          onDownloadPackage={() => {
            void downloadCaseCompletionPackage(
              caseData.id,
              `${caseData.completionPackage?.title || 'completion-package'}.pdf`,
            ).catch((err: unknown) => {
              logError('Case completion package download failed', err);
              toast.error(err instanceof Error ? err.message : 'Download failed');
            });
          }}
          onPackage={handleGenerateCompletionPackage}
          onLink={() => setShowLinkCorrespondenceDialog(true)}
          onComments={() => setCommentsDialogOpen(true)}
        />
      </div>

      <CaseCommentsDialog
        open={commentsDialogOpen}
        onOpenChange={(open) => {
          setCommentsDialogOpen(open);
          if (!open) setCommentsRefreshKey((k) => k + 1);
        }}
        caseId={caseId}
      />

      {previewVersion && previewDocument ? (
        <DocumentVersionPreviewModal
          version={previewVersion}
          isOpen
          onClose={closeDocumentPreview}
          documentId={previewDocument.id}
          allowDownload={canDownloadDocument(previewDocument)}
        />
      ) : null}

      {corrPreview ? (
        <DocumentPreviewModal
          correspondence={corrPreview.correspondence}
          minutes={[]}
          isOpen
          onClose={closeCorrespondencePreview}
          documentContentHtml={corrPreview.documentContentHtml}
          attachmentFileName={corrPreview.attachmentFileName}
          attachmentSource={corrPreview.attachmentSource}
          documentVersionId={corrPreview.documentVersionId}
          attachmentId={corrPreview.attachmentId}
        />
      ) : null}

      <CaseFormPreviewDialog
        open={Boolean(formPreviewId)}
        onOpenChange={(open) => {
          if (!open) {
            setFormPreviewId(null);
            setFormPreviewTitle(null);
          }
        }}
        formDocumentId={formPreviewId}
        titleHint={formPreviewTitle}
      />

      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Cases</AlertDialogTitle>
            <AlertDialogDescription>
              Select a JSON file exported from the case management system to import cases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleImport(file);
                  setShowImportDialog(false);
                }
              }}
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LinkCorrespondenceDialog
        open={showLinkCorrespondenceDialog}
        onOpenChange={setShowLinkCorrespondenceDialog}
        caseId={caseData.id}
        caseNumber={caseData.caseNumber}
        onLinked={handleItemLinked}
      />
      <LinkDocumentDialog
        open={showLinkDocumentDialog}
        onOpenChange={setShowLinkDocumentDialog}
        caseId={caseData.id}
        caseNumber={caseData.caseNumber}
        onLinked={handleItemLinked}
      />
      <LinkFormDialog
        open={showLinkFormDialog}
        onOpenChange={setShowLinkFormDialog}
        caseId={caseData.id}
        caseNumber={caseData.caseNumber}
        onLinked={handleItemLinked}
      />

      <AlertDialog open={showUnlinkConfirm} onOpenChange={setShowUnlinkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Unlink</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink <strong>{itemToUnlink?.name}</strong> from case{" "}
              <strong>{caseData.caseNumber}</strong>? This action can be undone by linking it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleUnlinkConfirm()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorBoundary>
  );
};

export default CaseDetailPage;
