"use client";

import { logError } from '@/lib/client-logger';
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SearchHighlightBanner } from '@/components/search/SearchHighlightBanner';
import {
  readSearchHighlight,
  SEARCH_MATCH_PARAM,
  SEARCH_Q_PARAM,
} from '@/lib/search-highlight';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { toast } from "@/components/ui/sonner";
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgUsers } from '@/hooks/use-org-users';
import { ShareDocumentDialog } from '@/components/dms/ShareDocumentDialog';
import { DocumentVersionPreviewModal } from '@/components/dms/DocumentVersionPreviewModal';
import { ReplaceVersionDialog } from '@/components/dms/ReplaceVersionDialog';
import { DocumentCommentsDialog } from '@/components/dms/DocumentCommentsDialog';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import {
  fetchDocumentById,
  getDocumentComments,
  getDocumentAccessLogs,
  downloadDocumentVersion,
  canDownloadDocument,
  type DocumentRecord,
  type DocumentVersion,
  type DocumentAccessLog,
} from '@/lib/api/dms';
import { CorrespondenceProvider } from '@/contexts/CorrespondenceContext';
import { DocumentMobileTabBar, DocumentWorkspace } from '@/app/dms/[id]/components/DocumentWorkspace';
import { DocumentMobileStickyBar } from '@/app/dms/[id]/components/DocumentMobileStickyBar';
import { LinkCaseDialog } from '@/components/correspondence/LinkCaseDialog';
import { unlinkDocumentFromCase } from '@/lib/api/cases';
import { DocumentHeader } from '@/components/dms/DocumentHeader';
import { DocumentMetadataEditDialog } from '@/components/dms/DocumentMetadataEditDialog';
import { DocumentStatusStrip } from '@/components/dms/DocumentStatusStrip';
import { AccessActivityDetailsDialog } from '@/components/dms/AccessActivityDetailsDialog';
import { useDocumentDetail } from '@/app/dms/[id]/hooks/use-document-detail';
import { useDocumentOcr } from '@/app/dms/[id]/hooks/use-document-ocr';
import { ResourceAccessDenied } from '@/components/shared/ResourceAccessDenied';
import { useAccessExplanation } from '@/hooks/use-access-explanation';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';

const DocumentDetailContent = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { query: highlightQuery, matchField } = readSearchHighlight(searchParams);
  const documentId = params?.id;

  const {
    document,
    setDocument,
    loading,
    error: documentError,
    accessDenied,
    formDocumentId,
    comments,
    setComments,
    accessLogs,
    setAccessLogs,
    relatedCorrespondence,
    refreshDocument,
  } = useDocumentDetail(documentId);
  // Dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [versionUploadOpen, setVersionUploadOpen] = useState(false);
  const [linkCaseDialogOpen, setLinkCaseDialogOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [replaceVersionId, setReplaceVersionId] = useState<string | null>(null);
  const [selectedAccessLog, setSelectedAccessLog] = useState<DocumentAccessLog | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<'document' | 'details'>('document');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [documentFocus, setDocumentFocus] = useState(false);
  const [metadataEditOpen, setMetadataEditOpen] = useState(false);
  const [unreadComments, setUnreadComments] = useState(0);
  const seenCommentsRef = useRef<number | null>(null);
  const notifiedCommentsRef = useRef(0);

  // Mark known comments as seen (resets unread count and notification baseline).
  const markCommentsSeen = useCallback(() => {
    seenCommentsRef.current = comments.length;
    notifiedCommentsRef.current = comments.length;
    setUnreadComments(0);
  }, [comments.length]);

  const { currentUser, hydrated } = useCurrentUser();
  const { result: accessExplanation, loading: accessExplanationLoading } = useAccessExplanation(
    'document_view',
    accessDenied,
  );
  const { divisions, departments } = useOrganization();
  const { users: organizationUsers } = useOrgUsers();
  const userLookup = useMemo(() => new Map(organizationUsers.map((user) => [user.id, user])), [organizationUsers]);
  const divisionLookup = useMemo(() => new Map(divisions.map((division) => [division.id, division.name])), [divisions]);
  const departmentLookup = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    [departments],
  );
  const uploadUser = useMemo(
    () => currentUser ?? organizationUsers.find((user) => user.active) ?? null,
    [currentUser, organizationUsers],
  );

  useEffect(() => {
    setSelectedVersionId(null);
  }, [documentId]);

  const handleVersionUploadComplete = useCallback((updated: DocumentRecord) => {
    setVersionUploadOpen(false);
    startTransition(() => {
      setDocument(updated);
      toast.success('Document updated successfully');
    });
  }, [setDocument]);

  const openVersionUpload = useCallback(() => {
    if (!document || !uploadUser) return;
    setVersionUploadOpen(true);
  }, [document, uploadUser]);

  const openShareDialog = useCallback(() => setShareDialogOpen(true), []);

  const { ocrState, handleVersionOCR, handleCancelOCR } = useDocumentOcr({
    document,
    refreshDocument,
  });

  // Memoize access logs refresh handler
  const handleRefreshAccessLogs = useCallback(async () => {
    if (!document?.id) return;
    const logs = await getDocumentAccessLogs(document.id);
    setAccessLogs(logs);
  }, [document?.id, setAccessLogs]);

  // Memoize open comments dialog handler
  const handleOpenCommentsDialog = useCallback(() => {
    markCommentsSeen();
    setCommentsDialogOpen(true);
  }, [markCommentsSeen]);

  // Get user initials for avatar
  const getUserInitials = (userId: string) => {
    const user = userLookup.get(userId);
    if (!user) return '?';
    const parts = user.name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const author = document ? userLookup.get(document.authorId) : undefined;
  const versions = useMemo(
    () => (Array.isArray(document?.versions) ? document.versions : []),
    [document?.versions],
  );
  const selectedVersion = useMemo(() => {
    if (!versions.length) return null;
    if (selectedVersionId) {
      return versions.find((v) => v.id === selectedVersionId) ?? versions[0];
    }
    return versions[0];
  }, [versions, selectedVersionId]);

  // ---- Comments live updates (polling + unread + toast) ----
  useEffect(() => {
    if (!document?.id) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const latest = await getDocumentComments(document.id);
        if (cancelled) return;
        setComments(latest);
        const count = latest.length;
        if (seenCommentsRef.current === null) {
          seenCommentsRef.current = count;
          notifiedCommentsRef.current = count;
          return;
        }
        if (count > seenCommentsRef.current) {
          setUnreadComments(count - seenCommentsRef.current);
        }
        if (count > notifiedCommentsRef.current) {
          notifiedCommentsRef.current = count;
          const newCount = count - seenCommentsRef.current;
          toast.info(
            `${newCount} new comment${newCount === 1 ? "" : "s"} on “${
              document.title || "document"
            }”`,
            { id: "document-new-comment" },
          );
        }
      } catch {
        /* ignore transient poll errors */
      }
    };
    void poll();
    const id = window.setInterval(poll, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [document?.id, document?.title, setComments]);

  const handleDownloadVersion = useCallback(async (version: DocumentVersion | null | undefined) => {
    if (!document) return;
    if (!canDownloadDocument(document)) {
      toast.error(document.drmRights?.message || 'Download blocked by DRM policy');
      return;
    }
    if (!version?.id) {
      toast.error('No file available to download');
      return;
    }
    try {
      await downloadDocumentVersion(version.id, version.fileName || 'document');
    } catch (err) {
      logError('Failed to download document version', err);
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  }, [document]);

  const handleDownloadLatest = useCallback(() => {
    void handleDownloadVersion(selectedVersion);
  }, [handleDownloadVersion, selectedVersion]);

  const handleSelectVersion = useCallback((version: DocumentVersion) => {
    setSelectedVersionId(version.id);
  }, []);

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center h-full min-h-[50vh] p-6">
          <LoadingState message="Loading document…" />
        </div>
      ) : accessDenied ? (
        <ResourceAccessDenied
          title="Document Unavailable"
          check={accessExplanation}
          loading={accessExplanationLoading}
          backHref="/dms"
          backLabel="Back to Documents"
        />
      ) : documentError || !document ? (
        <div className="flex items-center justify-center h-full min-h-[50vh] p-6 animate-in fade-in duration-300 motion-reduce:animate-none">
          <EmptyState
            icon="file"
            title="Document not found"
            message={
              documentError ||
              'This document may have been removed, or you may not have access.'
            }
            actionLabel="Back to Documents"
            onAction={() => router.push('/dms')}
            variant="dashed"
          />
        </div>
      ) : (
        <ClientErrorBoundary>
          <div className="flex flex-col min-w-0 flex-1 min-h-0 overflow-hidden">
            <div className="flex-shrink-0">
              <DocumentHeader
                document={document}
                onUnlinkCase={async (caseId: string) => {
                  try {
                    await unlinkDocumentFromCase(caseId, document.id);
                    toast.success("Document unlinked from case");
                    if (params?.id) {
                      const updated = await fetchDocumentById(params.id);
                      setDocument(updated);
                    }
                  } catch (err) {
                    logError("Failed to unlink document from case", err);
                    toast.error("Failed to unlink from case");
                  }
                }}
              />

              <DocumentStatusStrip
                document={document}
                authorName={author?.name}
                versionCount={versions.length}
                linkedCorrespondenceCount={relatedCorrespondence.length}
                divisionName={
                  document.divisionId ? divisionLookup.get(document.divisionId) : undefined
                }
                departmentName={
                  document.departmentId ? departmentLookup.get(document.departmentId) : undefined
                }
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

              <DocumentMobileTabBar
                commentsCount={unreadComments > 0 ? unreadComments : comments.length}
                mobileActiveTab={mobileActiveTab}
                onSetMobileActiveTab={setMobileActiveTab}
              />
            </div>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <DocumentWorkspace
                mobileActiveTab={mobileActiveTab}
                documentFocus={documentFocus}
                onSetDocumentFocus={setDocumentFocus}
                previewProps={{
                  document,
                  documentId: params.id,
                  formDocumentId,
                  versions,
                  selectedVersion,
                  onSelectVersion: handleSelectVersion,
                  onDownload: handleDownloadVersion,
                  canDownload: canDownloadDocument(document),
                  highlightQuery,
                  matchField,
                  versionsManage: {
                    userLookup,
                    uploadUser,
                    ocrState,
                    onCreateVersion: openVersionUpload,
                    onQuickVersionUpload: openVersionUpload,
                    onPreviewVersion: (version: DocumentVersion) => setPreviewVersion(version),
                    onDownloadVersion: handleDownloadVersion,
                    onReplaceVersion: setReplaceVersionId,
                    onVersionOCR: handleVersionOCR,
                    onCancelOCR: handleCancelOCR,
                  },
                }}
                sidebarProps={{
                  document,
                  versions,
                  comments,
                  accessLogs,
                  relatedCorrespondence,
                  userLookup,
                  uploadUser,
                  ocrState,
                  onQuickVersionUpload: openVersionUpload,
                  onCreateVersion: openVersionUpload,
                  onOpenCommentsDialog: handleOpenCommentsDialog,
                  onShare: openShareDialog,
                  onViewActivityDetails: (log: DocumentAccessLog) => setSelectedAccessLog(log),
                  onRefreshAccessLogs: handleRefreshAccessLogs,
                  onPreviewVersion: (version: DocumentVersion) => setPreviewVersion(version),
                  onDownloadVersion: handleDownloadVersion,
                  onReplaceVersion: setReplaceVersionId,
                  onVersionOCR: handleVersionOCR,
                  onCancelOCR: handleCancelOCR,
                  getUserInitials,
                  divisionNameById: divisionLookup,
                  departmentNameById: departmentLookup,
                  unreadComments,
                  onActiveTabChange: (tab) => {
                    if (tab === "comments") markCommentsSeen();
                  },
                  onEditMetadata: () => setMetadataEditOpen(true),
                  onLinkCase: () => setLinkCaseDialogOpen(true),
                }}
              />
            </div>

            <DocumentMobileStickyBar
              canDownload={canDownloadDocument(document) && Boolean(selectedVersion)}
              canUpload={Boolean(uploadUser)}
              onDownload={handleDownloadLatest}
              onShare={openShareDialog}
              onAddVersion={openVersionUpload}
              onComments={handleOpenCommentsDialog}
            />
          </div>

          <DocumentCommentsDialog
            open={commentsDialogOpen}
            onOpenChange={setCommentsDialogOpen}
            documentId={document.id}
            version={selectedVersion}
            currentUser={uploadUser}
            onCommentsUpdated={(updatedComments) => {
              setComments(updatedComments);
            }}
          />

      {metadataEditOpen && document && (
        <DocumentMetadataEditDialog
          open={metadataEditOpen}
          onOpenChange={setMetadataEditOpen}
          document={document}
          onDocumentUpdate={(updated) => {
            setDocument(updated);
          }}
        />
      )}

      {hydrated && uploadUser && document && versionUploadOpen && (
        <DocumentUploadDialog
          key={`upload-version-${document.id}`}
          open={versionUploadOpen}
          onOpenChange={setVersionUploadOpen}
          mode="version"
          currentUser={uploadUser}
          document={document}
          onComplete={handleVersionUploadComplete}
        />
      )}

      {shareDialogOpen && document && (
      <ShareDocumentDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        document={document}
        currentUserId={currentUser?.id}
        onShared={(updated) => {
          if (updated) {
            setDocument(updated);
            return;
          }
          void refreshDocument();
        }}
        />
      )}
      {linkCaseDialogOpen && document && (
        <LinkCaseDialog
          open={linkCaseDialogOpen}
          onOpenChange={setLinkCaseDialogOpen}
          documentId={document.id}
          document={document}
          onLinked={async () => {
            if (params?.id) {
              const updated = await fetchDocumentById(params.id);
              setDocument(updated);
            }
          }}
        />
      )}

      {previewVersion && document && (
        <DocumentVersionPreviewModal
          version={previewVersion}
          isOpen={!!previewVersion}
          onClose={() => setPreviewVersion(null)}
          documentId={document.id}
          allowDownload={canDownloadDocument(document)}
          onVersionCreated={async (updated) => {
            setDocument(updated);
            setPreviewVersion(null);
            toast.success('New version created from edited OCR text');
          }}
        />
      )}

      {replaceVersionId && document && (
        <ReplaceVersionDialog
          open={!!replaceVersionId}
          onOpenChange={(open) => {
            if (!open) setReplaceVersionId(null);
          }}
          version={versions.find(v => v.id === replaceVersionId) || null}
          document={document}
          onComplete={(updated) => {
            setDocument(updated);
            setReplaceVersionId(null);
          }}
        />
      )}

      <AccessActivityDetailsDialog
        log={selectedAccessLog}
        accessLogs={accessLogs}
        userLookup={userLookup}
        onClose={() => setSelectedAccessLog(null)}
      />

      </ClientErrorBoundary>
    )}
  </>
  );
};

const DocumentDetailPage = () => (
  <ClientErrorBoundary>
    <CorrespondenceProvider>
      <DocumentDetailContent />
    </CorrespondenceProvider>
  </ClientErrorBoundary>
);

export const dynamic = "force-dynamic";

export default DocumentDetailPage;
