"use client";

import { useEffect, useMemo, useCallback, useReducer, useRef } from 'react';
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { useParams, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CorrespondenceProvider, useCorrespondence } from '@/contexts/CorrespondenceContext';
import { toast } from 'sonner';
import { MessageSquare, CheckCircle, Send } from 'lucide-react';
import type { Minute, Correspondence, ParallelRoutingGroup } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { logDocumentAccess, type DocumentRecord } from '@/lib/dms-storage';
import { apiFetch } from '@/lib/api-client';
import { bumpSidebarCounts } from '@/hooks/use-sidebar-counts';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { useCurrentUser } from '@/hooks/use-current-user';
import { buildDownloadUrl } from '@/lib/correspondence-url-utils';
import { useModalState } from '@/hooks/use-modal-state';
import { useApiRetry } from '@/hooks/use-api-retry';
import { correspondenceDetailReducer, initialState } from './correspondence-state-reducer';
import { CorrespondenceHeader } from './components/CorrespondenceHeader';
import { CorrespondenceWorkspace, CorrespondenceMobileTabBar } from './components/CorrespondenceWorkspace';
import { CorrespondenceDetailModals } from './components/CorrespondenceDetailModals';
import { MobileStickyActionBar } from './components/MobileStickyActionBar';
import { CompactStatusStrip } from '@/components/correspondence/CompactStatusStrip';
import { useCorrespondenceDetailData } from './hooks/use-correspondence-detail-data';

const CorrespondenceDetailContent = () => {
  const params = useParams();
  const id = params.id as string;
  const {getCorrespondenceById, updateCorrespondence: _updateCorrespondence, refreshData, syncFromApi, mergeMinutes } =
    useCorrespondence();
  const cachedCorrespondence = id ? getCorrespondenceById(id) : null;
  const { currentUser: activeUser } = useCurrentUser();
  const {
    directorates,
    divisions,
    departments,
    users: organizationUsers,
    offices,
    officeMemberships,
    refreshOrganizationData,
  } = useOrganization();
  
  // Use reducer for related state groups
  const [state, dispatch] = useReducer(correspondenceDetailReducer, initialState);
  
  // Destructure state for easier access
  const {
    minutes,
    remoteCorrespondence,
    detailLoading,
    backendDelegation,
    linkedDocuments,
    selectedMinute,
    selectedAttachmentIndex,
    mobileActiveTab,
    attachmentSearchQuery,
    selectedLinkedDocVersion,
    isPreviewFullscreen,
  } = state;
  
  // Helper functions for dispatch
  const setMinutes = useCallback((minutes: Minute[]) => {
    dispatch({ type: 'SET_MINUTES', payload: minutes });
  }, []);
  const setRemoteCorrespondence = useCallback((corr: Correspondence | null) => {
    dispatch({ type: 'SET_REMOTE_CORRESPONDENCE', payload: corr });
  }, []);
  const setDetailLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_DETAIL_LOADING', payload: loading });
  }, []);
  const setBackendDelegation = useCallback((del: typeof backendDelegation) => {
    dispatch({ type: 'SET_BACKEND_DELEGATION', payload: del });
  }, []);
  const setLinkedDocuments = useCallback((docs: DocumentRecord[]) => {
    dispatch({ type: 'SET_LINKED_DOCUMENTS', payload: docs });
  }, []);
  const setParallelRoutingGroups = useCallback((groups: ParallelRoutingGroup[]) => {
    dispatch({ type: 'SET_PARALLEL_ROUTING_GROUPS', payload: groups });
  }, []);
  const setSelectedMinute = useCallback((minute: Minute | null) => {
    dispatch({ type: 'SET_SELECTED_MINUTE', payload: minute });
  }, []);
  const setSelectedAttachmentIndex = useCallback((index: number | null) => {
    dispatch({ type: 'SET_SELECTED_ATTACHMENT_INDEX', payload: index });
  }, []);
  const setMobileActiveTab = useCallback((tab: 'document' | 'routing') => {
    dispatch({ type: 'SET_MOBILE_ACTIVE_TAB', payload: tab });
  }, []);
  const setAttachmentSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_ATTACHMENT_SEARCH_QUERY', payload: query });
  }, []);
  const setSelectedLinkedDocVersion = useCallback((version: Record<string, number>) => {
    dispatch({ type: 'SET_SELECTED_LINKED_DOC_VERSION', payload: version });
  }, []);
  const setIsPreviewFullscreen = useCallback((fullscreen: boolean) => {
    dispatch({ type: 'SET_PREVIEW_FULLSCREEN', payload: fullscreen });
  }, []);
  
  const searchParams = useSearchParams();
  const statusParam = searchParams?.get('status');
  const initialStatus = statusParam ?? cachedCorrespondence?.status;
  const correspondence = remoteCorrespondence ?? cachedCorrespondence;
  const isCompleted = (remoteCorrespondence?.status ?? initialStatus) === 'completed';

  // Use modal state hook to consolidate modal states
  const {activeModal: _activeModal, openModal, closeModal, isOpen } = useModalState();
  
  // Use API retry hook for critical requests
  const { fetchWithRetry } = useApiRetry({ maxRetries: 3 });
  const wasDocumentPreviewOpenRef = useRef(false);

  const { refreshMinutes } = useCorrespondenceDetailData({
    id,
    correspondence,
    minutes,
    activeUserId: activeUser?.id,
    isCompleted,
    detailLoading,
    fetchWithRetry,
    mergeMinutes,
    closeModal,
    setMinutes,
    setRemoteCorrespondence,
    setDetailLoading,
    setBackendDelegation,
    setLinkedDocuments,
    setParallelRoutingGroups,
  });

  const handleMinuteClose = () => {
    closeModal();
    refreshData();
    void syncFromApi();
    void refreshMinutes();
  };

  const handleTreatmentClose = () => {
    closeModal();
    refreshData();
    void syncFromApi();
    void refreshMinutes();
  };

  const handleCompletionClose = () => {
    closeModal();
    refreshData();
    void syncFromApi();
    void refreshMinutes();
  };


  const handleDelegate = async (
    assistantId: string, 
    assistantType: 'TA' | 'PA', 
    notes: string,
    duration?: string,
    expiresAt?: string
  ) => {
    logInfo('[page.tsx handleDelegate] Called with', { assistantId, assistantType, notes, duration, expiresAt });
    
    if (!correspondence || !activeUser) {
      logWarn('[page.tsx handleDelegate] Early return - no correspondence or activeUser');
      return;
    }

    // Create per-correspondence delegation via new backend API
    const payload = {
      correspondence_id: correspondence.id,
      principal_id: activeUser.id,
      assistant_id: assistantId,
      notes: notes || '',
      expires_at: expiresAt || null,
    };
    
    logInfo('[page.tsx handleDelegate] Sending API request with payload', payload);

    try {
      // Create the correspondence delegation (sends notification to assistant)
      const response = await apiFetch<{
        id: string;
        status: string;
        delegated_at: string;
      }>('/correspondence/correspondence-delegations/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      logInfo('[page.tsx handleDelegate] API response', response);

      // Backend handles delegation storage - no need for localStorage
      await refreshOrganizationData();
      await syncFromApi();
      bumpSidebarCounts();
      
      const assistantName = organizationUsers.find(u => String(u.id) === String(assistantId))?.name || assistantType;
      toast.success(`Successfully delegated to ${assistantName}`, {
        description: notes 
          ? `Instructions sent: "${notes.substring(0, 50)}${notes.length > 50 ? '...' : ''}"` 
          : `${assistantName} will be notified and can now work on this correspondence.`,
      });
    } catch (error: unknown) {
      logError('Failed to delegate correspondence', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      
      // Handle specific error cases
      if (errorMessage.includes('already have an active delegation')) {
        toast.error('Delegation already exists', {
          description: 'You already have an active delegation for this correspondence. Revoke it first to delegate again.',
        });
      } else {
        toast.error('Unable to delegate correspondence', {
          description: errorMessage,
        });
      }
    }
  };

  // Check if user is executive (MDCS, EDCS, GMCS, AGMCS)
  // Must be called before early returns to maintain hook order
  const isExecutive = useMemo(() => {
    if (!activeUser?.gradeLevel) return false;
    const executiveGrades = ['MDCS', 'EDCS', 'GMCS', 'AGMCS'];
    return executiveGrades.includes(activeUser.gradeLevel);
  }, [activeUser?.gradeLevel]);

  // Check if current user received a minute with "For Information" purpose
  // Must be called before early returns to maintain hook order
  const isForInformationOnly = useMemo(() => {
    if (!activeUser?.id || !correspondence) return false;
    // Check if any minute directed to current user has purpose "information"
    const userMinutes = minutes.filter(
      (m) => m.toOfficeId && correspondence.currentOfficeId === m.toOfficeId
    );
    // Also check if current user is the current approver and there's a minute with purpose "information"
    const infoMinute = minutes.find(
      (m) => m.purpose === 'information' && correspondence.currentApproverId === activeUser.id
    );
    return !!infoMinute || userMinutes.some((m) => m.purpose === 'information');
  }, [minutes, activeUser?.id, correspondence]);

  // Determine which parallel routing groups to show in the UI.
  // We avoid clutter by:
  // - de-duplicating by id
  // - if there are active (incomplete) groups, showing only the most recent one
  // - otherwise, showing only the most recently completed group
  // Keep hooks above early returns to preserve stable hook order.
  const selectedAttachmentForAccess =
    selectedAttachmentIndex !== null && correspondence?.attachments?.[selectedAttachmentIndex]
      ? correspondence.attachments[selectedAttachmentIndex]
      : null;
  const completionPackageUrlForAccess = buildDownloadUrl(correspondence?.completionPackage?.fileUrl ?? null) ?? null;
  const linkedDocumentLatestVersionForAccess = linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1];
  const linkedDocumentPreviewUrlForAccess = buildDownloadUrl(linkedDocumentLatestVersionForAccess?.fileUrl);
  const defaultPreviewAttachmentSourceForAccess: 'attachment' | 'completion-package' =
    selectedAttachmentForAccess
      ? 'attachment'
      : (!linkedDocumentPreviewUrlForAccess && isCompleted && completionPackageUrlForAccess ? 'completion-package' : 'attachment');

  const resolveDmsAccessTarget = useCallback((): { documentId: string; sensitivity: string } | null => {
    if (defaultPreviewAttachmentSourceForAccess === 'completion-package' && correspondence?.completionPackage?.documentId) {
      return { documentId: correspondence.completionPackage.documentId, sensitivity: 'internal' };
    }

    const linkedDoc = linkedDocuments[0];
    if (linkedDoc?.id) {
      return { documentId: linkedDoc.id, sensitivity: linkedDoc.sensitivity ?? 'internal' };
    }

    const linkedDocId = correspondence?.linkedDocumentIds?.[0];
    if (linkedDocId) {
      return { documentId: linkedDocId, sensitivity: 'internal' };
    }

    return null;
  }, [defaultPreviewAttachmentSourceForAccess, correspondence?.completionPackage?.documentId, correspondence?.linkedDocumentIds, linkedDocuments]);

  const logCorrespondenceDmsAccess = useCallback(async (action: 'view' | 'download' | 'attempted-download') => {
    if (!activeUser?.id) return;
    const target = resolveDmsAccessTarget();
    if (!target) return;

    try {
      await logDocumentAccess({
        documentId: target.documentId,
        userId: activeUser.id,
        action,
        sensitivity: target.sensitivity,
      });
    } catch (error: unknown) {
      // Access logging should not block correspondence usage.
      logWarn('Failed to write DMS access log from correspondence view', error);
    }
  }, [activeUser?.id, resolveDmsAccessTarget]);

  const handleCompletionPackageDownload = useCallback(
    async (_url: string, filename: string) => {
      if (!correspondence?.id) return;
      await logCorrespondenceDmsAccess('download');
      try {
        const blob = await apiFetch<Blob>(
          `/correspondence/items/${correspondence.id}/completion-pdf/`,
          { responseType: 'blob' }
        );
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        toast.success('Completion summary downloaded');
      } catch (error) {
        logError('Failed to download completion PDF', error);
        toast.error('Unable to download completion summary');
      }
    },
    [correspondence?.id, logCorrespondenceDmsAccess]
  );

  useEffect(() => {
    const isOpenNow = isOpen('document-preview');
    if (isOpenNow && !wasDocumentPreviewOpenRef.current) {
      void logCorrespondenceDmsAccess('view');
    }
    wasDocumentPreviewOpenRef.current = isOpenNow;
  }, [isOpen, logCorrespondenceDmsAccess]);

  // Use backend delegation (loaded from API)
  const activeDelegation = backendDelegation;
  
  // User can act if they are the current approver OR if they are the active delegatee
  // For delegatees: they can only act if the correspondence is STILL with the principal
  // (Once routed to someone else, the delegatee can no longer act on it)
  const isDelegateeAndPrincipalTurn = 
    activeDelegation && 
    activeUser && 
    String(activeDelegation.assistantId) === String(activeUser.id) && 
    activeDelegation.status === 'active' &&
    String(correspondence?.currentApproverId) === String(activeDelegation.principalId);
  
  const isCurrentUserTurn: boolean = 
    Boolean(correspondence?.currentApproverId === activeUser?.id || isDelegateeAndPrincipalTurn);

  // Check if last minute was recalled and routing was reverted
  const lastMinute = minutes[minutes.length - 1];
  const isLastMinuteRecalled = lastMinute?.isRecalled ?? false;
  const routingActions = ['minute', 'forward', 'approve', 'treat'];
  const isRecalledAndReverted = isLastMinuteRecalled && 
                                 lastMinute?.userId === activeUser?.id &&
                                 routingActions.includes(lastMinute?.actionType ?? '');
  
  // If routing was reverted after recall, enable actions for the sender
  const actionsDisabled = detailLoading || (isCompleted && !isRecalledAndReverted) || isForInformationOnly;
  const turnRestrictedDisabled = actionsDisabled || (!isCurrentUserTurn && !isRecalledAndReverted);
  const completionPackageUrl = buildDownloadUrl(correspondence?.completionPackage?.fileUrl ?? null) ?? null;
  const completionGeneratedAt =
    correspondence?.completionPackage?.generatedAt ??
    correspondence?.completionSummaryGeneratedAt ??
    correspondence?.completedAt;
  const selectedAttachment =
    selectedAttachmentIndex !== null && correspondence?.attachments?.[selectedAttachmentIndex]
      ? correspondence?.attachments[selectedAttachmentIndex]
      : null;
  const completionPackageFileName = completionPackageUrl
    ? (
        completionPackageUrl.split('/').filter(Boolean).pop() ||
        `${correspondence?.referenceNumber || 'completion-package'}.pdf`
      )
    : undefined;
  const linkedDocumentLatestVersion = linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1];
  const linkedDocumentPreviewUrl = buildDownloadUrl(linkedDocumentLatestVersion?.fileUrl);
  const linkedDocumentPreviewFileName = linkedDocumentLatestVersion?.fileName;
  const defaultPreviewAttachmentUrl = selectedAttachment
    ? buildDownloadUrl(selectedAttachment.fileUrl)
    : (linkedDocumentPreviewUrl
        ? linkedDocumentPreviewUrl
        : (isCompleted && completionPackageUrl
            ? completionPackageUrl
            : buildDownloadUrl(correspondence?.attachments?.[0]?.fileUrl)));
  const defaultPreviewAttachmentFileName = selectedAttachment
    ? selectedAttachment.fileName
    : (linkedDocumentPreviewFileName
        ? linkedDocumentPreviewFileName
        : (isCompleted && completionPackageUrl
            ? completionPackageFileName
            : correspondence?.attachments?.[0]?.fileName));
  const defaultPreviewAttachmentSource: 'attachment' | 'completion-package' =
    selectedAttachment
      ? 'attachment'
      : (!linkedDocumentPreviewUrl && isCompleted && completionPackageUrl ? 'completion-package' : 'attachment');

  const lookupUser = (userId?: string) => {
    if (!userId) return undefined;
    return organizationUsers.find((user) => user.id === userId);
  };

  // Helper functions moved to DocumentPreviewPanel component

  const handleLinkDocumentsSave = async (documentIds: string[]) => {
    if (!correspondence) return;
    try {
      await apiFetch(`/correspondence/items/${correspondence.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          linked_document_ids: documentIds,
        }),
      });
      toast.success('Linked documents updated');
      await syncFromApi();
    } catch (error: unknown) {
      logError('Failed to update linked documents', error);
      toast.error('Unable to update linked documents', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'minute':
        return MessageSquare;
      case 'approve':
        return CheckCircle;
      case 'forward':
        return Send;
      case 'treat':
        return CheckCircle;
      default:
        return MessageSquare;
    }
  };

  const handleMinuteClick = useCallback((minute: Minute) => {
    setSelectedMinute(minute);
    openModal('minute-detail');
  }, [openModal, setSelectedMinute]);

  const handleEditMinute = useCallback((minute: Minute) => {
    setSelectedMinute(minute);
    openModal('edit-minute');
  }, [openModal, setSelectedMinute]);

  const handleRecallMinute = useCallback((minute: Minute) => {
    if (minute.isRecalled || minute.recalledAt) {
      logWarn('[CorrespondenceDetail] Cannot recall already recalled minute', { minuteId: minute.id });
      toast.error('This minute has already been recalled.');
      return;
    }
    setSelectedMinute(minute);
    openModal('recall-minute');
  }, [openModal, setSelectedMinute]);

  const handleAddNote = useCallback((minute: Minute) => {
    setSelectedMinute(minute);
    openModal('additional-minute');
  }, [openModal, setSelectedMinute]);

  const division = useMemo(
    () => divisions.find((d) => d.id === correspondence?.divisionId) ?? null,
    [divisions, correspondence?.divisionId],
  );
  const department = useMemo(
    () => departments.find((d) => d.id === correspondence?.departmentId) ?? null,
    [departments, correspondence?.departmentId],
  );

  const routingPanelProps = correspondence && activeUser ? {
    correspondence,
    minutes,
    activeUser,
    isCompleted,
    isCurrentUserTurn,
    isForInformationOnly,
    isExecutive,
    turnRestrictedDisabled,
    completionPackageUrl,
    completionGeneratedAt,
    activeDelegation,
    organizationUsers,
    offices,
    officeMemberships,
    lookupUser,
    getActionIcon,
    onOpenParallelRouteModal: () => openModal('parallel-route'),
    onOpenLinkCaseModal: () => openModal('link-case'),
    onOpenMinuteModal: () => openModal('minute'),
    onOpenTreatmentModal: () => openModal('treatment'),
    onOpenCompletionModal: () => openModal('completion'),
    onOpenDelegateModal: () => openModal('delegate'),
    onDownloadCompletionPackage: handleCompletionPackageDownload,
    onSyncFromApi: syncFromApi,
    onMinuteClick: handleMinuteClick,
    onEditMinute: handleEditMinute,
    onRecallMinute: handleRecallMinute,
    onAddNote: handleAddNote,
  } : null;

  const openFullscreenPreview = useCallback(() => openModal('document-preview'), [openModal]);

  const documentPanelProps = {
    linkedDocuments,
    selectedLinkedDocVersion,
    attachmentSearchQuery,
    isPreviewFullscreen,
    isCompleted,
    division,
    department,
    directorates,
    divisions,
    departments,
    onSetSelectedLinkedDocVersion: setSelectedLinkedDocVersion,
    onSetAttachmentSearchQuery: setAttachmentSearchQuery,
    onSetIsPreviewFullscreen: setIsPreviewFullscreen,
    onSetSelectedAttachmentIndex: setSelectedAttachmentIndex,
    onOpenLinkDocument: () => openModal('link-document'),
    onOpenDocumentPreview: openFullscreenPreview,
    onSyncFromApi: syncFromApi,
  };

  const goToRoutingTab = useCallback(() => setMobileActiveTab('routing'), [setMobileActiveTab]);

  return (
    <DashboardLayout>
      {!correspondence ? (
        <div className="flex items-center justify-center h-full">
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading correspondence…</p>
          ) : (
            <p>Correspondence not found</p>
          )}
        </div>
      ) : !activeUser ? null : (
        <>
      <div className="flex flex-col min-w-0 flex-1">
        {/* Header - Full Width */}
        <div className="flex-shrink-0">
          <CorrespondenceHeader
            correspondence={correspondence}
            minutes={minutes}
            linkedDocuments={linkedDocuments}
            onOpenFullscreenPreview={openFullscreenPreview}
            onOpenPrintPreview={() => openModal('print-preview')}
            onCaseUnlinked={async () => {
              await refreshData();
              await syncFromApi();
            }}
            onOpenLinkCaseModal={() => openModal('link-case')}
            onDistributionShared={async () => {
              await refreshData();
              await syncFromApi();
            }}
          />

          <HelpGuideCard
            title="Correspondence Workspace"
            description="Read the document on the left, then route or respond from the panel on the right."
            links={[{ label: 'Help & Guides', href: '/help' }]}
          />

          <CorrespondenceMobileTabBar
            minutesCount={minutes.length}
            mobileActiveTab={mobileActiveTab}
            onSetMobileActiveTab={setMobileActiveTab}
          />
        </div>

        <CompactStatusStrip
          status={correspondence.status}
          receivedDate={correspondence.receivedDate}
          direction={correspondence.direction as 'upward' | 'downward' | 'lateral' | 'internal' | undefined}
          currentOffice={correspondence.currentOfficeName}
          daysPending={
            correspondence.receivedDate
              ? Math.floor(
                  (Date.now() - new Date(correspondence.receivedDate).getTime()) / (1000 * 60 * 60 * 24),
                )
              : undefined
          }
          dispatchedCount={minutes.filter((m) => !m.isRecalled && m.dispatchedAt).length}
          acknowledgedCount={minutes.filter((m) => !m.isRecalled && m.acknowledgedAt).length}
        />

        <CorrespondenceWorkspace
          correspondence={correspondence}
          minutesCount={minutes.length}
          mobileActiveTab={mobileActiveTab}
          onSetMobileActiveTab={setMobileActiveTab}
          documentPanelProps={documentPanelProps}
          routingPanelProps={routingPanelProps}
          hideMobileTabBar
        />
      </div>

      <CorrespondenceDetailModals
        correspondence={correspondence}
        minutes={minutes}
        activeUser={activeUser}
        selectedMinute={selectedMinute}
        linkedDocuments={linkedDocuments}
        isOpen={isOpen}
        openModal={openModal}
        closeModal={closeModal}
        onMinuteClose={handleMinuteClose}
        onTreatmentClose={handleTreatmentClose}
        onCompletionClose={handleCompletionClose}
        onDelegate={handleDelegate}
        onLinkDocumentsSave={handleLinkDocumentsSave}
        onSetSelectedMinute={setSelectedMinute}
        onSetSelectedAttachmentIndex={setSelectedAttachmentIndex}
        onSetRemoteCorrespondence={setRemoteCorrespondence}
        refreshData={refreshData}
        refreshMinutes={refreshMinutes}
        syncFromApi={syncFromApi}
        lookupUser={lookupUser}
        defaultPreviewAttachmentUrl={defaultPreviewAttachmentUrl}
        defaultPreviewAttachmentFileName={defaultPreviewAttachmentFileName}
        defaultPreviewAttachmentSource={defaultPreviewAttachmentSource}
      />

      {!isCompleted && isCurrentUserTurn && (
        <MobileStickyActionBar
          isForInformationOnly={isForInformationOnly}
          onMinute={() => {
            goToRoutingTab();
            openModal('minute');
          }}
          onTreat={() => {
            goToRoutingTab();
            openModal('treatment');
          }}
          onComplete={() => {
            goToRoutingTab();
            openModal('completion');
          }}
          onDelegate={() => {
            goToRoutingTab();
            openModal('delegate');
          }}
        />
      )}
        </>
      )}
    </DashboardLayout>
  );
};

const CorrespondenceDetailPage = () => (
  <CorrespondenceProvider>
    <CorrespondenceDetailContent />
  </CorrespondenceProvider>
);

export default CorrespondenceDetailPage;
