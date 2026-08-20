"use client";

import { logError } from '@/lib/client-logger';
import { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { toast } from "@/components/ui/sonner";
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ShareDocumentDialog } from '@/components/dms/ShareDocumentDialog';
import { DocumentVersionPreviewModal } from '@/components/dms/DocumentVersionPreviewModal';
import { ReplaceVersionDialog } from '@/components/dms/ReplaceVersionDialog';
import { DocumentCommentsDialog } from '@/components/dms/DocumentCommentsDialog';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import {
  fetchDocumentById,
  getDocumentAccessLogs,
  downloadDocumentVersion,
  canDownloadDocument,
  canShareDocument,
  type DocumentRecord,
  type DocumentVersion,
  type DocumentAccessLog,
} from '@/lib/api/dms';
import { CorrespondenceProvider } from '@/contexts/CorrespondenceContext';
import { DocumentMobileTabBar, DocumentWorkspace } from '@/app/dms/[id]/components/DocumentWorkspace';
import { DocumentMobileStickyBar } from '@/app/dms/[id]/components/DocumentMobileStickyBar';
import { LinkCaseDialog } from '@/components/correspondence/LinkCaseDialog';
import { MinuteModal } from '@/components/correspondence/MinuteModal';
import { unlinkDocumentFromCase } from '@/lib/api/cases';
import { DocumentHeader } from '@/components/dms/DocumentHeader';
import { DocumentStatusStrip } from '@/components/dms/DocumentStatusStrip';
import { AccessActivityDetailsDialog } from '@/components/dms/AccessActivityDetailsDialog';
import { useDocumentDetail } from '@/app/dms/[id]/hooks/use-document-detail';
import { useDocumentOcr } from '@/app/dms/[id]/hooks/use-document-ocr';
import { Correspondence } from '@/lib/npa-structure';
import { ResourceAccessDenied } from '@/components/shared/ResourceAccessDenied';
import { useAccessExplanation } from '@/hooks/use-access-explanation';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';

const DocumentDetailContent = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
  const [minuteDocumentModalOpen, setMinuteDocumentModalOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [replaceVersionId, setReplaceVersionId] = useState<string | null>(null);
  const [minuteDocumentCorrespondence, setMinuteDocumentCorrespondence] = useState<Correspondence | null>(null);
  const [selectedAccessLog, setSelectedAccessLog] = useState<DocumentAccessLog | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<'document' | 'details'>('document');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [documentFocus, setDocumentFocus] = useState(false);

  const { currentUser, hydrated } = useCurrentUser();
  const { result: accessExplanation, loading: accessExplanationLoading } = useAccessExplanation(
    'document_view',
    accessDenied,
  );
  const { users: organizationUsers, divisions, departments } = useOrganization();
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
    setCommentsDialogOpen(true);
  }, []);

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

  const handleOpenFullscreen = useCallback((version?: DocumentVersion | null) => {
    const target = version ?? selectedVersion;
    if (target) setPreviewVersion(target);
  }, [selectedVersion]);

  const handleSelectVersion = useCallback((version: DocumentVersion) => {
    setSelectedVersionId(version.id);
  }, []);

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center h-full min-h-[50vh] p-6 animate-in fade-in duration-300 motion-reduce:animate-none">
          <LoadingState message="Loading document…" size="md" />
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
                author={author}
                currentUser={currentUser}
                divisionLookup={divisionLookup}
                departmentLookup={departmentLookup}
                divisions={divisions}
                departments={departments}
                hasLinkedCorrespondence={relatedCorrespondence.length > 0}
                canDownload={canDownloadDocument(document) && Boolean(selectedVersion)}
                canShare={canShareDocument(document)}
                canFullscreen={Boolean(selectedVersion)}
                onFullscreen={() => handleOpenFullscreen()}
                onDownload={handleDownloadLatest}
                onShare={openShareDialog}
                onDocumentUpdate={(updated) => {
                  setDocument(updated);
                }}
                onLinkCase={() => setLinkCaseDialogOpen(true)}
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
                onMinuteDocument={() => {
                  if (!document || !currentUser) return;
                  if (relatedCorrespondence.length === 0) {
                    toast.error(
                      'This document is not linked to any correspondence. Link it to a correspondence item to minute.'
                    );
                    return;
                  }
                  setMinuteDocumentCorrespondence(relatedCorrespondence[0].correspondence);
                  setMinuteDocumentModalOpen(true);
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

              <DocumentMobileTabBar
                commentsCount={comments.length}
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
      {minuteDocumentCorrespondence && (
        <MinuteModal
          correspondence={minuteDocumentCorrespondence}
          isOpen={minuteDocumentModalOpen}
          onClose={() => {
            setMinuteDocumentModalOpen(false);
            setMinuteDocumentCorrespondence(null);
            if (document) {
              void fetchDocumentById(document.id).then(setDocument).catch((err) => {
                logError('Failed to refresh document', err);
              });
            }
          }}
          direction="upward"
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
