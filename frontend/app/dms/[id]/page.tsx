"use client";

import { logError } from '@/lib/client-logger';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useMemo, useState, useReducer, useRef, startTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  fetchDocumentById,
  fetchWorkspaces,
  updateDocumentWorkspaces,
  getDocumentAccessLogs,
  runOCROnVersion,
  type DocumentRecord,
  type DocumentVersion,
  type DocumentWorkspace,
  type DocumentComment,
  type DocumentAccessLog,
} from '@/lib/dms-storage';
import { CorrespondenceProvider } from '@/contexts/CorrespondenceContext';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { ArrowLeft, User as UserIcon, Clock, Eye, Activity, Shield, Loader2, AlertCircle, Download as DownloadIcon } from 'lucide-react';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ShareDocumentDialog } from '@/components/dms/ShareDocumentDialog';
import { DocumentVersionPreviewModal } from '@/components/dms/DocumentVersionPreviewModal';
import { ReplaceVersionDialog } from '@/components/dms/ReplaceVersionDialog';
import { DocumentCommentsDialog } from '@/components/dms/DocumentCommentsDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { DmsDocumentWorkspace, DocumentMobileTabBar } from '@/app/dms/[id]/components/DocumentWorkspace';
import { DocumentMobileStickyBar } from '@/app/dms/[id]/components/DocumentMobileStickyBar';
import { apiFetch } from '@/lib/api-client';
import { LinkCaseDialog } from '@/components/correspondence/LinkCaseDialog';
import { MinuteModal } from '@/components/correspondence/MinuteModal';
import { unlinkDocumentFromCase } from '@/lib/api/cases';
import { processOCR, getCaptureJob, cancelCaptureJob, type CaptureJob } from '@/lib/capture-storage';
import { DocumentHeader } from '@/components/dms/DocumentHeader';
import { useDocumentDetail } from '@/app/dms/[id]/hooks/use-document-detail';
import { Correspondence } from '@/lib/npa-structure';

type OCRState = Record<string, { isProcessing: boolean; currentJob: CaptureJob | null; error: string | null }>;

type OCRAction =
  | { type: 'SET_PROCESSING'; versionId: string; isProcessing: boolean }
  | { type: 'SET_JOB'; versionId: string; job: CaptureJob | null }
  | { type: 'SET_ERROR'; versionId: string; error: string | null }
  | { type: 'RESET'; versionId: string }
  | { type: 'RESET_ALL' };

const ocrReducer = (state: OCRState, action: OCRAction): OCRState => {
  switch (action.type) {
    case 'SET_PROCESSING':
      return {
        ...state,
        [action.versionId]: {
          ...state[action.versionId],
          isProcessing: action.isProcessing,
        },
      };
    case 'SET_JOB':
      return {
        ...state,
        [action.versionId]: {
          ...state[action.versionId] ?? { isProcessing: false, currentJob: null, error: null },
          currentJob: action.job,
        },
      };
    case 'SET_ERROR':
      return {
        ...state,
        [action.versionId]: {
          ...state[action.versionId] ?? { isProcessing: false, currentJob: null, error: null },
          error: action.error,
          isProcessing: false,
        },
      };
    case 'RESET': {
      const { [action.versionId]: _, ...rest } = state;
      return rest;
    }
    case 'RESET_ALL':
      return {};
    default:
      return state;
  }
};

const DocumentDetailContent = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const documentId = params?.id;

  const {
    document,
    setDocument,
    loading,
    error: documentError,
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
  const [shareDialogInitialView, setShareDialogInitialView] = useState<'share' | 'permissions'>('share');
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

  const [ocrState, dispatchOCR] = useReducer(ocrReducer, {});
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { currentUser, hydrated } = useCurrentUser();
  const { users: organizationUsers, divisions, departments } = useOrganization();
  const userLookup = useMemo(() => new Map(organizationUsers.map((user) => [user.id, user])), [organizationUsers]);
  const divisionLookup = useMemo(() => new Map(divisions.map((division) => [division.id, division.name])), [divisions]);
  const departmentLookup = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    [departments],
  );
  const uploadUser = useMemo(
    () => currentUser ?? organizationUsers.find((user) => user.active) ?? null,
    [currentUser?.id, organizationUsers],
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

  // OCR handlers
  const handleVersionOCR = async (versionId: string) => {
    if (!document) return;

    // Find the version
    const version = document.versions.find(v => v.id === versionId);
    if (!version) return;

    // Check if this is a Word document
    const isWordDoc = version.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                      version.fileType === 'application/msword' ||
                      version.fileName?.toLowerCase().endsWith('.docx') ||
                      version.fileName?.toLowerCase().endsWith('.doc');

    // For HTML content or Word documents, extract text directly using backend API
    if ((version.contentHtml && version.contentHtml.trim() !== '') || isWordDoc) {
      try {
        dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: true });
        dispatchOCR({ type: 'SET_JOB', versionId, job: null });
        dispatchOCR({ type: 'SET_ERROR', versionId, error: null });

        // Call backend API to extract text (works for both HTML and Word documents)
        const result = await runOCROnVersion(versionId);
        
        dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
        dispatchOCR({ type: 'SET_JOB', versionId, job: null });
        dispatchOCR({ type: 'SET_ERROR', versionId, error: null });
        
        const method = isWordDoc ? 'Word document' : 'HTML content';
        toast.success(`Text extracted from ${method} (${result.characters} characters)`);
        await refreshDocument();
        return;
      } catch (err: unknown) {
        const errorMsg = (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') ? err.message : (isWordDoc ? 'Failed to extract text from Word document' : 'Failed to extract text from HTML');
        dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
        dispatchOCR({ type: 'SET_JOB', versionId, job: null });
        dispatchOCR({ type: 'SET_ERROR', versionId, error: errorMsg });
        toast.error(errorMsg);
        logError(`Failed to extract text from ${isWordDoc ? 'Word document' : 'HTML'}`, err);
        return;
      }
    }

    // For files (PDFs/images), use OCR
    if (!version.fileUrl || version.fileUrl.trim() === '') {
      toast.error('No file available for OCR processing');
      return;
    }

    // Initialize OCR state for this version
    dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: true });
    dispatchOCR({ type: 'SET_JOB', versionId, job: null });
    dispatchOCR({ type: 'SET_ERROR', versionId, error: null });

    try {
      const job = await processOCR(document.id, {
        language: 'eng',
        extract_metadata: true,
      });

      dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: true });
      dispatchOCR({ type: 'SET_JOB', versionId, job });
      dispatchOCR({ type: 'SET_ERROR', versionId, error: null });

      // If job is already completed, handle immediately
      if (job.status === 'completed') {
        dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
        dispatchOCR({ type: 'SET_JOB', versionId, job });
        dispatchOCR({ type: 'SET_ERROR', versionId, error: null });
        toast.success('OCR processing completed');
        await refreshDocument();
      } else {
        toast.info('OCR processing started. This may take a few moments...');
        // Start polling for status updates
        pollOCRJobStatus(versionId, job.id);
      }
    } catch (err: unknown) {
      const errorMsg = (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') ? err.message : 'Failed to start OCR processing. Ensure Celery worker is running.';
      dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
      dispatchOCR({ type: 'SET_JOB', versionId, job: null });
      dispatchOCR({ type: 'SET_ERROR', versionId, error: errorMsg });
      toast.error(errorMsg);
      logError('Failed to process OCR', err);
    }
  };

  const pollOCRJobStatus = async (versionId: string, jobId: string) => {
    // Clear any existing poll for this version
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    let pollCount = 0;
    const maxPolls = 150; // 5 minutes max (150 * 2 seconds)
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      try {
        const updatedJob = await getCaptureJob(jobId);
        
        if (pollIntervalRef.current !== pollInterval) return; // stale interval
        
        dispatchOCR({ 
          type: 'SET_PROCESSING', 
          versionId, 
          isProcessing: updatedJob.status !== 'completed' && updatedJob.status !== 'failed' && updatedJob.status !== 'cancelled' 
        });
        dispatchOCR({ type: 'SET_JOB', versionId, job: updatedJob });
        dispatchOCR({ 
          type: 'SET_ERROR', 
          versionId, 
            error: updatedJob.status === 'failed' ? (updatedJob.error_message || 'OCR processing failed') : null
        });

        if (updatedJob.status === 'completed') {
          clearInterval(pollInterval);
          pollIntervalRef.current = null;
          toast.success('OCR processing completed');
          await refreshDocument();
        } else if (updatedJob.status === 'failed' || updatedJob.status === 'cancelled') {
          clearInterval(pollInterval);
          pollIntervalRef.current = null;
          if (updatedJob.status === 'failed') {
            toast.error(updatedJob.error_message || 'OCR processing failed');
          }
        } else if (pollCount >= maxPolls) {
          // Timeout after max polls
          clearInterval(pollInterval);
          pollIntervalRef.current = null;
          dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
          dispatchOCR({ type: 'SET_JOB', versionId, job: updatedJob });
          dispatchOCR({ type: 'SET_ERROR', versionId, error: 'OCR processing timed out. The job may still be running in the background.' });
          toast.warning('OCR processing is taking longer than expected. Please check back later.');
        }
      } catch (err: unknown) {
        logError('Failed to poll OCR job status', err);
        // Don't clear interval on first error, but clear after multiple failures
        if (pollCount >= 10) {
        clearInterval(pollInterval);
        pollIntervalRef.current = null;
          dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
          dispatchOCR({ type: 'SET_JOB', versionId, job: null });
          const errorMsg = (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') ? err.message : 'Failed to check OCR status. The Celery worker may not be running.';
          dispatchOCR({ type: 'SET_ERROR', versionId, error: errorMsg });
          toast.error('Failed to check OCR status. Please ensure the backend worker is running.');
        }
      }
    }, 2000);
    pollIntervalRef.current = pollInterval;

    // Cleanup after 5 minutes
    setTimeout(() => {
      if (pollIntervalRef.current === pollInterval) {
        clearInterval(pollInterval);
        pollIntervalRef.current = null;
      }
      // Check final status
      getCaptureJob(jobId).then((finalJob) => {
        if (finalJob.status === 'processing') {
          dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
          dispatchOCR({ type: 'SET_JOB', versionId, job: finalJob });
          dispatchOCR({ type: 'SET_ERROR', versionId, error: 'OCR processing timed out. The job may still be running in the background.' });
        }
      }).catch((err) => {
        console.warn("[OCR] Final status check failed:", err);
      });
    }, 5 * 60 * 1000);
  };

  const handleCancelOCR = async (versionId: string) => {
    const state = ocrState[versionId];
    if (!state?.currentJob) return;

    try {
      await cancelCaptureJob(state.currentJob.id);
      dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
      dispatchOCR({ type: 'SET_JOB', versionId, job: null });
      dispatchOCR({ type: 'SET_ERROR', versionId, error: null });
      toast.info('OCR processing cancelled');
    } catch (err) {
      logError('Failed to cancel OCR job', err);
      toast.error('Failed to cancel OCR processing');
    }
  };

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
  }, [document?.id]);

  // Memoize workspaces refresh handler
  const handleWorkspacesRefreshed = useCallback(async () => {
    const ws = await fetchWorkspaces();
    setWorkspaces(ws);
  }, []);

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
  }, [document]);

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
  }, [document]);

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
    <DashboardLayout>
      {loading ? (
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading document...</p>
            </CardContent>
          </Card>
        </div>
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
                <Button onClick={() => router.push('/documents')} variant="default">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <ClientErrorBoundary>
          <div className="flex flex-col min-w-0 flex-1 min-h-0">
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
            onShare={() => {
              setShareDialogInitialView('share');
              setShareDialogOpen(true);
            }}
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

          <HelpGuideCard
            title="Document workspace"
            description="Expand the preview from the toolbar. Use the header icon for the full viewer with OCR."
            links={[{ label: 'Help & Guides', href: '/help' }]}
            dismissible
            dismissKey="dms-document-workspace"
          />

          <DocumentMobileTabBar
            mobileActiveTab={mobileActiveTab}
            onSetMobileActiveTab={setMobileActiveTab}
            commentsCount={comments.length}
          />

          <DmsDocumentWorkspace
            mobileActiveTab={mobileActiveTab}
            onSetMobileActiveTab={setMobileActiveTab}
            commentsCount={comments.length}
            hideMobileTabBar
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
              divisionLookup,
              departmentLookup,
              uploadUser,
              ocrState,
              workspaceManageOpen,
              onWorkspaceManageOpenChange: setWorkspaceManageOpen,
              onShare: () => {
                setShareDialogInitialView('share');
                setShareDialogOpen(true);
              },
              onLinkCase: () => setLinkCaseDialogOpen(true),
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

          <DocumentMobileStickyBar
            canDownload={Boolean(selectedVersion?.fileUrl?.trim())}
            canUpload={Boolean(uploadUser)}
            onDownload={handleDownloadLatest}
            onShare={() => {
              setShareDialogInitialView('share');
              setShareDialogOpen(true);
            }}
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
          initialView={shareDialogInitialView}
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

      {/* Access Activity Details Dialog */}
      {selectedAccessLog && (
        <Dialog open={!!selectedAccessLog} onOpenChange={(open) => !open && setSelectedAccessLog(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Access Activity Details
              </DialogTitle>
              <DialogDescription>Detailed information about this access activity</DialogDescription>
            </DialogHeader>
            {(() => {
              const user = userLookup.get(selectedAccessLog.userId);
              const displayUserName = user?.name ?? selectedAccessLog.userName ?? 'Unknown User';
              const actionLabel =
                selectedAccessLog.action === 'download'
                  ? 'Downloaded'
                  : selectedAccessLog.action === 'attempted-download'
                    ? 'Attempted Download'
                    : 'Viewed';
              const actionIcon = selectedAccessLog.action === 'download' ? DownloadIcon : Eye;
              
              // Check if this was the user's first access
              const userLogs = accessLogs.filter((log) => log.userId === selectedAccessLog.userId);
              const sortedUserLogs = [...userLogs].sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              const isFirstAccess = sortedUserLogs.length > 0 && sortedUserLogs[0].id === selectedAccessLog.id;
              
              // Format relative time
               const relativeTime = formatDistanceToNow(new Date(selectedAccessLog.timestamp), { addSuffix: true });

              return (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      {actionIcon === DownloadIcon ? (
                        <DownloadIcon className="h-5 w-5 text-primary" />
                      ) : (
                        <Eye className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">Action</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">{actionLabel}</p>
                          {selectedAccessLog.action === 'attempted-download' && (
                            <Badge variant="destructive" className="text-[10px]">
                              Failed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">User</p>
                        <p className="text-sm text-muted-foreground">{displayUserName}</p>
                        {user?.gradeLevel && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {user.gradeLevel}
                          </p>
                        )}
                        {isFirstAccess && (
                          <Badge variant="secondary" className="text-[10px] mt-1">
                            First Access
                          </Badge>
                        )}
                    </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Timestamp</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(selectedAccessLog.timestamp)}
                        </p>
                        {relativeTime && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {relativeTime}
                          </p>
                        )}
                    </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Document Sensitivity</p>
                        <Badge variant="outline" className="mt-1">
                          {selectedAccessLog.sensitivity || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      </ClientErrorBoundary>
    )}
  </DashboardLayout>
  );
};

const DocumentDetailPage = () => (
  <CorrespondenceProvider>
    <DocumentDetailContent />
  </CorrespondenceProvider>
);

export default DocumentDetailPage;
