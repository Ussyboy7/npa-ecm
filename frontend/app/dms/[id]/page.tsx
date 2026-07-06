"use client";

import { logError } from '@/lib/client-logger';
import { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  fetchDocumentById,
  fetchWorkspaces,
  updateDocumentWorkspaces,
  getDocumentAccessLogs,
  type DocumentRecord,
  type DocumentVersion,
  type DocumentWorkspace,
  type DocumentAccessLog,
} from '@/lib/dms-storage';
import { CorrespondenceProvider } from '@/contexts/CorrespondenceContext';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ShareDocumentDialog } from '@/components/dms/ShareDocumentDialog';
import { DocumentVersionPreviewModal } from '@/components/dms/DocumentVersionPreviewModal';
import { ReplaceVersionDialog } from '@/components/dms/ReplaceVersionDialog';
import { DocumentCommentsDialog } from '@/components/dms/DocumentCommentsDialog';
import { DmsDocumentWorkspace, DocumentMobileTabBar } from '@/app/dms/[id]/components/DocumentWorkspace';
import { DocumentMobileStickyBar } from '@/app/dms/[id]/components/DocumentMobileStickyBar';
import { LinkCaseDialog } from '@/components/correspondence/LinkCaseDialog';
import { MinuteModal } from '@/components/correspondence/MinuteModal';
import { unlinkDocumentFromCase } from '@/lib/api/cases';
import { DocumentHeader } from '@/components/dms/DocumentHeader';
import { AccessActivityDetailsDialog } from '@/components/dms/AccessActivityDetailsDialog';
import { useDocumentDetail } from '@/app/dms/[id]/hooks/use-document-detail';
import { useDocumentOcr } from '@/app/dms/[id]/hooks/use-document-ocr';
import { Correspondence } from '@/lib/npa-structure';
import { ResourceAccessDenied } from '@/components/shared/ResourceAccessDenied';
import { useAccessExplanation } from '@/hooks/use-access-explanation';

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
    workspaces,
    setWorkspaces,
    refreshDocument,
  } = useDocumentDetail(documentId);
  // Dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [versionUploadOpen, setVersionUploadOpen] = useState(false);
  const [linkCaseDialogOpen, setLinkCaseDialogOpen] = useState(false);
  const [minuteDocumentModalOpen, setMinuteDocumentModalOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [workspaceManageOpen, setWorkspaceManageOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [replaceVersionId, setReplaceVersionId] = useState<string | null>(null);
  const [minuteDocumentCorrespondence, setMinuteDocumentCorrespondence] = useState<Correspondence | null>(null);
  const [selectedAccessLog, setSelectedAccessLog] = useState<DocumentAccessLog | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<'document' | 'details'>('document');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

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

  // Workspace management
  const workspaceLookup = useMemo(() => new Map(workspaces.map((ws) => [ws.id, ws])), [workspaces]);
  const documentWorkspaces = useMemo(() => {
    if (!document) return [];
    return document.workspaceIds
      .map((id) => workspaceLookup.get(id))
      .filter((ws): ws is DocumentWorkspace => ws !== undefined);
  }, [document, workspaceLookup]);

  // Memoize access logs refresh handler
  const handleRefreshAccessLogs = useCallback(async () => {
    if (!document?.id) return;
    const logs = await getDocumentAccessLogs(document.id);
    setAccessLogs(logs);
  }, [document?.id, setAccessLogs]);

  // Memoize workspaces refresh handler
  const handleWorkspacesRefreshed = useCallback(async () => {
    const ws = await fetchWorkspaces();
    setWorkspaces(ws);
  }, [setWorkspaces]);

  // Memoize open comments dialog handler
  const handleOpenCommentsDialog = useCallback(() => {
    setCommentsDialogOpen(true);
  }, []);

  const handleAddWorkspace = useCallback(async (workspaceId: string) => {
    if (!document) return;
    try {
      const currentIds = document.workspaceIds;
      if (currentIds.includes(workspaceId)) {
        toast.error('Workspace already assigned');
        return;
      }
      const updated = await updateDocumentWorkspaces(document.id, [...currentIds, workspaceId]);
      setDocument(updated);
      toast.success('Workspace added');
    } catch (error: unknown) {
      logError('Failed to add workspace', error);
      toast.error('Unable to add workspace');
    }
  }, [document, setDocument]);

  const handleRemoveWorkspace = useCallback(async (workspaceId: string) => {
    if (!document) return;
    try {
      const updated = await updateDocumentWorkspaces(
        document.id,
        document.workspaceIds.filter((id) => id !== workspaceId)
      );
      setDocument(updated);
      toast.success('Workspace removed');
    } catch (error: unknown) {
      logError('Failed to remove workspace', error);
      toast.error('Unable to remove workspace');
    }
  }, [document, setDocument]);

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

  const handleDownloadVersion = useCallback((version: DocumentVersion | null | undefined) => {
    if (!version?.fileUrl?.trim()) {
      toast.error('No file available to download');
      return;
    }
    const link = window.document.createElement('a');
    link.href = version.fileUrl;
    link.download = version.fileName || 'document';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  }, []);

  const handleDownloadLatest = useCallback(() => {
    handleDownloadVersion(selectedVersion);
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
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading document...</p>
            </CardContent>
          </Card>
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
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
              <p className="text-muted-foreground mb-6">
                {documentError || 'The document you are looking for does not exist or you do not have permission to view it.'}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => router.push('/dms')} variant="default">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Documents
                </Button>
              </div>
            </CardContent>
          </Card>
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
            canDownload={Boolean(selectedVersion?.fileUrl?.trim())}
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

          <DocumentMobileTabBar
            mobileActiveTab={mobileActiveTab}
            onSetMobileActiveTab={setMobileActiveTab}
            commentsCount={comments.length}
          />
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <DmsDocumentWorkspace
            mobileActiveTab={mobileActiveTab}
            previewProps={{
              document,
              documentId: params.id,
              formDocumentId,
              versions,
              selectedVersion,
              onSelectVersion: handleSelectVersion,
              onDownload: handleDownloadVersion,
            }}
            sidebarProps={{
              document,
              versions,
              documentWorkspaces,
              workspaces,
              comments,
              accessLogs,
              relatedCorrespondence,
              userLookup,
              uploadUser,
              ocrState,
              workspaceManageOpen,
              onWorkspaceManageOpenChange: setWorkspaceManageOpen,
              onQuickVersionUpload: openVersionUpload,
              onCreateVersion: openVersionUpload,
              onAddWorkspace: handleAddWorkspace,
              onRemoveWorkspace: handleRemoveWorkspace,
              onWorkspacesRefreshed: handleWorkspacesRefreshed,
              onOpenCommentsDialog: handleOpenCommentsDialog,
              onViewActivityDetails: (log: DocumentAccessLog) => setSelectedAccessLog(log),
              onRefreshAccessLogs: handleRefreshAccessLogs,
              onPreviewVersion: (version: DocumentVersion) => setPreviewVersion(version),
              onReplaceVersion: setReplaceVersionId,
              onVersionOCR: handleVersionOCR,
              onCancelOCR: handleCancelOCR,
              getUserInitials,
            }}
          />
          </div>

          <DocumentMobileStickyBar
            canDownload={Boolean(selectedVersion?.fileUrl?.trim())}
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
        />
      )}
      {minuteDocumentCorrespondence && (
        <MinuteModal
          correspondence={minuteDocumentCorrespondence}
          isOpen={minuteDocumentModalOpen}
          onClose={() => {
            setMinuteDocumentModalOpen(false);
            setMinuteDocumentCorrespondence(null);
            // Refresh document to show updated correspondence links
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
            // Reload document to get updated case links
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
