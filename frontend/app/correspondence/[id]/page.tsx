"use client";

import { useEffect, useMemo, useCallback, useReducer, useRef, useState, Suspense } from 'react';
import { logError, logWarn } from '@/lib/client-logger';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CorrespondenceProvider, useCorrespondence } from '@/contexts/CorrespondenceContext';
import { toast } from "@/components/ui/sonner";
import { MessageSquare, CheckCircle, Send, Search, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Minute, Correspondence } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getSelectableOffices } from '@/lib/office-choice-utils';
import { usePaginatedUserSearch } from '@/hooks/use-paginated-user-search';
import { logDocumentAccess, type DocumentAccessLog, type DocumentRecord } from '@/lib/api/dms';
import { apiFetch } from '@/lib/api-client';
import { hasRolePermission } from '@/lib/permissions';
import { bumpSidebarCounts } from '@/hooks/use-sidebar-counts';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getCorrespondencePreviewContext, getPrimaryLinkedDocument, resolveCorrespondenceDmsAccessTarget } from '@/lib/correspondence-preview-target';
import { useModalState } from '@/hooks/use-modal-state';
import { useApiRetry } from '@/hooks/use-api-retry';
import { correspondenceDetailReducer, initialState } from './correspondence-state-reducer';
import { CorrespondenceHeader } from './components/CorrespondenceHeader';
import { CorrespondenceWorkspace, CorrespondenceMobileTabBar } from './components/CorrespondenceWorkspace';
import { CorrespondenceDetailModals } from './components/CorrespondenceDetailModals';
import { MobileStickyActionBar } from './components/MobileStickyActionBar';
import { CompactStatusStrip } from '@/components/correspondence/CompactStatusStrip';
import { PhysicalCopySection } from './components/PhysicalCopySection';
import { useCorrespondenceDetailData } from './hooks/use-correspondence-detail-data';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ResourceAccessDenied } from '@/components/shared/ResourceAccessDenied';
import { DetailSkeleton } from '@/components/shared/PageSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAccessExplanation } from '@/hooks/use-access-explanation';
import { isCorrespondenceClosed } from '@/lib/correspondence-helpers';
import { SearchHighlightBanner } from '@/components/search/SearchHighlightBanner';
import {
  readSearchHighlight,
  SEARCH_MATCH_PARAM,
  SEARCH_Q_PARAM,
} from '@/lib/search-highlight';

const CorrespondenceDetailContent = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { query: highlightQuery, matchField } = readSearchHighlight(searchParams);
  const id = params.id as string;
  const { getCorrespondenceById, refreshData, syncFromApi, mergeMinutes } = useCorrespondence();
  const cachedCorrespondence = id ? getCorrespondenceById(id) : null;
  const { currentUser: activeUser } = useCurrentUser();
  const {
    offices,
    officeMemberships,
    refreshOrganizationData,
  } = useOrganization();

  // Current user's own office memberships, fetched directly (filtered by user)
  // to avoid depending on the paginated global officeMemberships list, which
  // may not include this user's office on the first page.
  const [myOfficeIds, setMyOfficeIds] = useState<string[]>([]);
  useEffect(() => {
    if (!activeUser?.id) {
      setMyOfficeIds([]);
      return;
    }
    let cancelled = false;
    apiFetch<{ results: Array<{ office?: string | null; is_active?: boolean }> }>(
      `/organization/office-memberships/?user=${activeUser.id}`
    )
      .then((res) => {
        if (cancelled) return;
        setMyOfficeIds(
          (res.results ?? [])
            .filter((m) => m.is_active !== false && m.office)
            .map((m) => m.office as string)
        );
      })
      .catch(() => {
        if (!cancelled) setMyOfficeIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeUser?.id]);
  
  // Use reducer for related state groups
  const [state, dispatch] = useReducer(correspondenceDetailReducer, initialState);
  
  // Destructure state for easier access
  const {
    minutes,
    remoteCorrespondence,
    detailLoading,
    backendDelegation,
    linkedDocuments,
    withheldLinkedDocumentCount,
    selectedMinute,
    selectedAttachmentIndex,
    selectedLinkedDocumentId,
    mobileActiveTab,
    attachmentSearchQuery,
    selectedLinkedDocVersion,
    isPreviewFullscreen,
    documentFocus,
  } = state;
  
  // Stable dispatch helpers (useMemo avoids individual useCallback sprawl)
  const [setMinutes, setRemoteCorrespondence, setDetailLoading, setBackendDelegation,
    setLinkedDocuments, setWithheldLinkedDocumentCount, setSelectedMinute, setSelectedAttachmentIndex,
    setSelectedLinkedDocumentId,
    setMobileActiveTab, setAttachmentSearchQuery,
    setIsPreviewFullscreen, setDocumentFocus] = useMemo(() => [
    (m: Minute[]) => dispatch({ type: 'SET_MINUTES', payload: m }),
    (c: Correspondence | null) => dispatch({ type: 'SET_REMOTE_CORRESPONDENCE', payload: c }),
    (l: boolean) => dispatch({ type: 'SET_DETAIL_LOADING', payload: l }),
    (d: typeof backendDelegation) => dispatch({ type: 'SET_BACKEND_DELEGATION', payload: d }),
    (d: DocumentRecord[]) => dispatch({ type: 'SET_LINKED_DOCUMENTS', payload: d }),
    (count: number) => dispatch({ type: 'SET_WITHHELD_LINKED_DOCUMENT_COUNT', payload: count }),
    (m: Minute | null) => dispatch({ type: 'SET_SELECTED_MINUTE', payload: m }),
    (i: number | null) => dispatch({ type: 'SET_SELECTED_ATTACHMENT_INDEX', payload: i }),
    (id: string | null) => dispatch({ type: 'SET_SELECTED_LINKED_DOCUMENT_ID', payload: id }),
    (t: 'document' | 'routing') => dispatch({ type: 'SET_MOBILE_ACTIVE_TAB', payload: t }),
    (q: string) => dispatch({ type: 'SET_ATTACHMENT_SEARCH_QUERY', payload: q }),
    (f: boolean) => dispatch({ type: 'SET_PREVIEW_FULLSCREEN', payload: f }),
    (f: boolean) => dispatch({ type: 'SET_DOCUMENT_FOCUS', payload: f }),
  ], [dispatch]);
  
  const statusParam = searchParams?.get('status');
  const initialStatus = statusParam ?? cachedCorrespondence?.status;
  const correspondence = remoteCorrespondence ?? cachedCorrespondence;
  // Audit Case detection for hard product rule: Case owns work, not Minute
  const [caseAuditState, setCaseAuditState] = useState<string | null>(null);
  const [isAuditCase, setIsAuditCase] = useState(false);
  useEffect(() => {
    if (!correspondence?.caseId) {
      setIsAuditCase(false);
      setCaseAuditState(null);
      return;
    }
    let cancelled = false;
    apiFetch(`/correspondence/cases/${correspondence.caseId}/`)
      .then((caseData: unknown) => {
        if (cancelled) return;
        const data = caseData as Record<string, unknown>;
        const caseType = (data.case_type as string) || (data.caseType as string) || '';
        const isAudit = caseType === 'audit';
        setIsAuditCase(isAudit);
        const meta = data.metadata as Record<string, unknown> | undefined;
        const auditState = (meta?.audit_state as string) || (data.audit_state as string) || (data.auditState as string) || null;
        setCaseAuditState(auditState ? String(auditState).toUpperCase() : null);
      })
      .catch(() => {
        if (!cancelled) {
          setIsAuditCase(false);
          setCaseAuditState(null);
        }
      });
    return () => { cancelled = true; };
  }, [correspondence?.caseId]);
  // Closed = completed / dispatched / acknowledged / archived / withdrawn (not only status===completed)
  const isCompleted = isCorrespondenceClosed(remoteCorrespondence?.status ?? initialStatus ?? correspondence?.status);

  // Use modal state hook to consolidate modal states
  const { openModal, closeModal, isOpen } = useModalState();
  
  // Use API retry hook for critical requests
  const { fetchWithRetry } = useApiRetry({ maxRetries: 3 });
  const wasDocumentPreviewOpenRef = useRef(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const { result: accessExplanation, loading: accessExplanationLoading } = useAccessExplanation(
    'correspondence_view',
    accessDenied,
  );

  const [showReassign, setShowReassign] = useState(false);
  const [reassignOffice, setReassignOffice] = useState('');
  const [reassignUser, setReassignUser] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showNoResponseConfirm, setShowNoResponseConfirm] = useState(false);
  const [noResponseNote, setNoResponseNote] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const canReassign = Boolean(activeUser?.isSuperuser);
  const {
    query: reassignUserQuery,
    setQuery: setReassignUserQuery,
    users: reassignUserOptions,
    userById: reassignUserById,
    loading: reassignUsersLoading,
    loadingMore: reassignUsersLoadingMore,
    error: reassignUsersError,
    hasMore: reassignUsersHasMore,
    loadMore: loadMoreReassignUsers,
  } = usePaginatedUserSearch({ enabled: showReassign, pageSize: 50 });

  const handleCompleteCorrespondence = async () => {
    if (!correspondence) return;
    setIsCompleting(true);
    try {
      await apiFetch(`/correspondence/items/${correspondence.id}/complete/`, {
        method: 'POST',
      });
      setShowCompleteConfirm(false);
      toast.success('Correspondence completed');
      await syncFromApi();
      await refreshDetail();
      await refreshMinutes();
      openModal('completion');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not complete correspondence');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCompleteWithoutResponse = async () => {
    if (!correspondence || !noResponseNote.trim()) return;
    setIsCompleting(true);
    try {
      await apiFetch(`/correspondence/items/${correspondence.id}/complete-no-response/`, {
        method: 'POST',
        body: JSON.stringify({ minute_text: noResponseNote.trim() }),
      });
      setShowNoResponseConfirm(false);
      setNoResponseNote('');
      toast.success('Correspondence completed — no reply required');
      await syncFromApi();
      await refreshDetail();
      await refreshMinutes();
      openModal('completion');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not finish correspondence');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReassign = async () => {
    if (!correspondence || !reassignReason.trim()) {
      toast.error('Reason is required');
      return;
    }
    if (!reassignOffice && !reassignUser) {
      toast.error('Select a target office or user');
      return;
    }
    setReassigning(true);
    try {
      await apiFetch(`/correspondence/items/${correspondence.id}/reassign/`, {
        method: 'POST',
        body: JSON.stringify({
          target_office_id: reassignOffice || undefined,
          target_user_id: reassignUser || undefined,
          reason: reassignReason.trim(),
        }),
      });
      toast.success('Correspondence reassigned');
      setShowReassign(false);
      setReassignOffice('');
      setReassignUser('');
      setReassignReason('');
      await syncFromApi();
      await refreshDetail();
      await refreshMinutes();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reassign failed');
    } finally {
      setReassigning(false);
    }
  };

  const { refreshMinutes, refreshDetail } = useCorrespondenceDetailData({
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
    setWithheldLinkedDocumentCount,
    setAccessDenied,
  });

  const handleModalRefreshClose = (result?: { createdResponseId?: string }) => {
    closeModal();
    if (result?.createdResponseId) {
      window.location.href = `/correspondence/${result.createdResponseId}`;
      return;
    }
    refreshData();
    void syncFromApi();
    void refreshMinutes();
    void refreshDetail();
  };

  const handleDelegate = async (
    assistantId: string, 
    assistantType: 'TA' | 'PA', 
    notes: string,
    duration?: string,
    expiresAt?: string
  ) => {
    if (!correspondence || !activeUser) {
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

    try {
      // Create the correspondence delegation (sends notification to assistant)
      const response = await apiFetch<{
        id: string;
        status: string;
        delegated_at: string;
        assistant?: {
          first_name?: string;
          middle_name?: string;
          last_name?: string;
          username?: string;
        };
      }>('/correspondence/correspondence-delegations/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Backend persists delegations, so no client cache is needed here.
      await refreshOrganizationData();
      await syncFromApi();
      bumpSidebarCounts();
      
      const assistant = response.assistant;
      const assistantName =
        [assistant?.first_name, assistant?.middle_name, assistant?.last_name]
          .filter((part): part is string => Boolean(part?.trim()))
          .join(' ')
          .trim() ||
        assistant?.username ||
        assistantType;
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

  // Find the distribution entry that targets the current user, either directly
  // (user-type) or via an office they belong to (office-type CC).
  const userDistribution = useMemo(() => {
    if (!activeUser?.id || !correspondence?.distribution) return undefined;
    const userOfficeIds = [
      ...myOfficeIds,
      ...officeMemberships
        .filter((m) => m.userId === activeUser.id && m.isActive)
        .map((m) => m.officeId),
    ];
    const found = correspondence.distribution.find(
      (d) =>
        (d.type === 'user' && d.userId === activeUser.id) ||
        (d.type === 'office' && d.officeId != null && userOfficeIds.includes(d.officeId))
    );
    return found;
  }, [correspondence?.distribution, activeUser?.id, myOfficeIds, officeMemberships]);

  // A CC recipient has a distribution entry targeting them (user- or office-type).
  const isCCRecipient = !!userDistribution;
  // Only CC/distribution recipients have a purpose; routed users must not be
  // treated as CC for action branching.
  const distributionPurpose: 'action' | 'information' | null = isCCRecipient
    ? ((userDistribution?.purpose as 'action' | 'information') ?? 'action')
    : null;
  const distributionEntryId = userDistribution?.id ?? null;

  const handleMarkRead = useCallback(async () => {
    if (!distributionEntryId) return;
    try {
      await apiFetch(`/correspondence/distribution/${distributionEntryId}/mark_read/`, {
        method: 'POST',
      });
      toast.success('Marked as read');
      await syncFromApi();
      await refreshDetail();
    } catch (err) {
      logError('Failed to mark as read', err);
      toast.error('Failed to mark as read');
    }
  }, [distributionEntryId, syncFromApi, refreshDetail]);

  const previewContext = useMemo(
    () => getCorrespondencePreviewContext(correspondence, linkedDocuments, selectedAttachmentIndex, isCompleted),
    [correspondence, linkedDocuments, selectedAttachmentIndex, isCompleted],
  );

  const logCorrespondenceDmsAccess = useCallback(async (action: DocumentAccessLog['action']) => {
    if (!activeUser?.id) return;
    const target = resolveCorrespondenceDmsAccessTarget(correspondence, linkedDocuments, previewContext.source);
    if (!target) return;

    try {
      await logDocumentAccess({
        documentId: target.documentId,
        userId: activeUser.id,
        action,
        sensitivity: target.sensitivity,
      });
    } catch (error: unknown) {
      logWarn('Failed to write DMS access log from correspondence view', error);
    }
  }, [activeUser?.id, correspondence, linkedDocuments, previewContext.source]);

  const handleCompletionPackageDownload = useCallback(
    async (filename: string) => {
      if (!correspondence?.id) return;
      await logCorrespondenceDmsAccess('download');
      try {
        const versionId = correspondence.completionPackage?.versionId;
        if (versionId) {
          const { downloadCanonicalDocument } = await import('@/lib/canonical-document');
          await downloadCanonicalDocument({
            kind: 'dms-version',
            versionId,
            fileName: filename,
          });
        } else {
          toast.error('Completion package is not available for download');
          return;
        }
        toast.success('Completion summary downloaded');
      } catch (error) {
        logError('Failed to download completion PDF', error);
        toast.error('Unable to download completion summary');
      }
    },
    [correspondence?.id, correspondence?.completionPackage?.versionId, logCorrespondenceDmsAccess]
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
    Boolean(
      correspondence?.currentApproverId === activeUser?.id ||
      isDelegateeAndPrincipalTurn ||
      correspondence?.canTakeInitialAction
    );

  // Check if last minute was recalled and routing was reverted
  const lastMinute = minutes[minutes.length - 1];
  const isLastMinuteRecalled = lastMinute?.isRecalled ?? false;
  const routingActions = ['minute', 'forward', 'approve', 'treat'];
  const isRecalledAndReverted = isLastMinuteRecalled && 
                                 lastMinute?.userId === activeUser?.id &&
                                 routingActions.includes(lastMinute?.actionType ?? '');
  
  // If routing was reverted after recall, enable actions for the sender
  const actionsDisabled = detailLoading || (isCompleted && !isRecalledAndReverted) || isForInformationOnly;
  // CC recipients (user has a distribution entry) can always act on what was
  // circulated to them — the "your turn" restriction only applies to routed users.
  const turnRestrictedDisabled = isCCRecipient
    ? false
    : (actionsDisabled || (!isCurrentUserTurn && !isRecalledAndReverted));

  // Mobile sticky bar must offer the same labels and gates as the desktop
  // ActionsPanel. Update both together when action rules change.
  const nonRecalledMinutes = minutes.filter((m) => !m.isRecalled);
  const allMinutesAcknowledged =
    nonRecalledMinutes.length > 0 && nonRecalledMinutes.every((m) => m.acknowledgedAt);
  const allRoutedMinutesAcknowledged = nonRecalledMinutes
    .filter((minute) => minute.toOfficeId || minute.toUserId)
    .every((minute) => minute.acknowledgedAt);
  const markedAsRead = Boolean(userDistribution?.readAt);
  const mobilePrimaryLabel = isCCRecipient
    ? 'Minute / Route'
    : isAuditCase
      ? 'Minute'
      : correspondence?.direction === 'downward'
        ? 'Minute & Route'
        : activeUser?.gradeLevel === 'MDCS'
          ? 'Minute & Approve'
          : 'Endorse & Forward';
  const mobileShowTreat = isForInformationOnly && !isCCRecipient
    ? false
    : isAuditCase
      ? caseAuditState !== 'CLOSED'
      : isCCRecipient
        ? distributionPurpose === 'action'
        : true;
  const mobileTreatLabel = isAuditCase ? 'Respond' : 'Treat & Respond';
  const mobileCanComplete = Boolean(
    !isCompleted &&
    !isCCRecipient &&
    !isForInformationOnly &&
    isCurrentUserTurn &&
    hasRolePermission(activeUser, 'can_minute_correspondence') &&
    allMinutesAcknowledged
  );
  const mobileCanCompleteNoResponse = Boolean(
    !isCompleted &&
    !isCCRecipient &&
    !isForInformationOnly &&
    isCurrentUserTurn &&
    hasRolePermission(activeUser, 'can_minute_correspondence') &&
    nonRecalledMinutes.length > 0 &&
    allRoutedMinutesAcknowledged
  );
  const mobileCanDelegate = !activeDelegation;

  const hasCompletionPackage = previewContext.hasCompletionPackage;
  const completionGeneratedAt =
    correspondence?.completionPackage?.generatedAt ??
    correspondence?.completionSummaryGeneratedAt ??
    correspondence?.completedAt;
  const defaultPreviewAttachmentFileName = previewContext.previewFileName;
  const defaultPreviewAttachmentSource = previewContext.source;
  const previewAttachmentId = previewContext.attachmentId;
  const previewDocumentVersionId = useMemo(() => {
    if (previewContext.selectedAttachment) return undefined;
    return previewContext.documentVersionId;
  }, [previewContext.selectedAttachment, previewContext.documentVersionId]);
  const printDocumentVersionId = useMemo(() => {
    // Prefer DRM print stream for linked DMS docs (not raw attachment selection).
    if (previewContext.selectedAttachment) return undefined;
    const primary = getPrimaryLinkedDocument(linkedDocuments);
    const version = primary?.versions?.[primary.versions.length - 1];
    return version?.id ?? previewContext.completionVersionId;
  }, [linkedDocuments, previewContext.selectedAttachment, previewContext.completionVersionId]);

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

  const openPrintPreview = useCallback(() => openModal('print-preview'), [openModal]);

  const documentPanelProps = {
    linkedDocuments,
    withheldLinkedDocumentCount,
    selectedLinkedDocVersion,
    selectedAttachmentIndex,
    selectedLinkedDocumentId,
    attachmentSearchQuery,
    isPreviewFullscreen,
    isCompleted,
    onSetAttachmentSearchQuery: setAttachmentSearchQuery,
    onSetIsPreviewFullscreen: setIsPreviewFullscreen,
    onSetSelectedAttachmentIndex: setSelectedAttachmentIndex,
    onSetSelectedLinkedDocumentId: setSelectedLinkedDocumentId,
    onOpenLinkDocument: () => openModal('link-document'),
    onOpenPrintPreview: openPrintPreview,
    onSyncFromApi: syncFromApi,
  };

  const routingPanelProps = correspondence && activeUser ? {
    correspondence,
    minutes,
    activeUser,
    isCompleted,
    isCurrentUserTurn,
    isForInformationOnly,
    distributionPurpose,
    distributionEntryId,
    turnRestrictedDisabled,
    hasCompletionPackage,
    completionGeneratedAt,
    linkedDocuments,
    onOpenLinkDocument: () => openModal('link-document'),
    activeDelegation,
    officeMemberships,
    getActionIcon,
    isAuditCase,
    caseAuditState,
    onViewAuditCase: () => correspondence.caseId && router.push(`/cases/${correspondence.caseId}`),
    onOpenLinkCaseModal: () => openModal('link-case'),
    canReassign,
    onReassign: () => setShowReassign(true),
    onOpenMinuteModal: () => openModal('minute'),
    onOpenTreatmentModal: () => openModal('treatment'),
    onOpenCompletionModal: () => setShowCompleteConfirm(true),
    onOpenNoResponseCompletionModal: () => {
      setNoResponseNote('');
      setShowNoResponseConfirm(true);
    },
    onOpenDelegateModal: () => openModal('delegate'),
    onDownloadCompletionPackage: handleCompletionPackageDownload,
    onSyncFromApi: syncFromApi,
    onMinuteClick: handleMinuteClick,
    onEditMinute: handleEditMinute,
    onRecallMinute: handleRecallMinute,
    onAddNote: handleAddNote,
  } : null;

  const goToRoutingTab = useCallback(() => setMobileActiveTab('routing'), [setMobileActiveTab]);

  return (
    <>
      {!correspondence ? (
        detailLoading ? (
          <div className="p-4 md:p-6">
            <DetailSkeleton />
          </div>
        ) : accessDenied ? (
          <ResourceAccessDenied
            title="Correspondence Unavailable"
            check={accessExplanation}
            loading={accessExplanationLoading}
            backHref="/correspondence/inbox"
            backLabel="Back to Inbox"
          />
        ) : (
        <div className="flex items-center justify-center h-full min-h-[50vh] p-6 animate-in fade-in duration-300">
            <EmptyState
              icon="file"
              title="Correspondence not found"
              message="This item may have been removed, or you may not have access."
              actionLabel="Back to Inbox"
              onAction={() => router.push('/correspondence/inbox')}
              variant="dashed"
            />
        </div>
        )
      ) : !activeUser ? null : (
        <>
      <div className="flex flex-col min-w-0 flex-1 min-h-0 overflow-hidden">
        {/* Header - Full Width */}
        <div className="flex-shrink-0">
          <CorrespondenceHeader
            correspondence={correspondence}
            isAuditCase={isAuditCase}
            onCaseUnlinked={async () => {
              await refreshData();
              await syncFromApi();
            }}
            onDistributionShared={async () => {
              await refreshData();
              await syncFromApi();
            }}
          />

          <CorrespondenceMobileTabBar
            minutesCount={minutes.length}
            mobileActiveTab={mobileActiveTab}
            onSetMobileActiveTab={setMobileActiveTab}
          />
        </div>

        {isAuditCase && correspondence?.caseId && (
          <div className="px-4 py-2 bg-primary/[0.04] border-b border-primary/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium">
              {caseAuditState ? `${caseAuditState} · ` : ''}Case {correspondence.caseId.slice(0,8)} — Audit Query
            </span>
            <span className="text-muted-foreground">
              Owner: {correspondence.currentOfficeName || '—'} {correspondence.currentApproverId ? `· Attention: ${correspondence.currentApproverName || String(correspondence.currentApproverId).slice(0,8)}` : '· Attention: —'}
            </span>
          </div>
        )}
        <CompactStatusStrip
          status={correspondence.status}
          receivedDate={correspondence.receivedDate}
          direction={correspondence.direction as 'upward' | 'downward' | 'lateral' | 'internal' | undefined}
          priority={correspondence.priority}
          currentOffice={correspondence.currentOfficeName}
          senderName={correspondence.senderName}
          senderOrganization={correspondence.senderOrganization}
          attachmentCount={correspondence.attachments?.length ?? 0}
          hasPhysicalCopy={Boolean(correspondence.hasPhysicalCopy)}
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

        <PhysicalCopySection documents={correspondence.physicalDocuments ?? []} />

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <CorrespondenceWorkspace
            correspondence={correspondence}
            mobileActiveTab={mobileActiveTab}
            documentFocus={documentFocus}
            onSetDocumentFocus={setDocumentFocus}
            documentPanelProps={documentPanelProps}
            routingPanelProps={routingPanelProps}
          />
        </div>
      </div>

      <Dialog open={showReassign} onOpenChange={setShowReassign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign correspondence</DialogTitle>
            <DialogDescription>Choose a new assignee for this correspondence.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Target office (optional)</Label>
              <Select value={reassignOffice || '__none__'} onValueChange={(v) => setReassignOffice(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {getSelectableOffices(offices, { selectedOfficeId: reassignOffice }).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target user (optional)</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={reassignUserQuery}
                  onChange={(event) => setReassignUserQuery(event.target.value)}
                  placeholder="Search users by name, email, or role…"
                  className="pl-8"
                  autoComplete="off"
                />
              </div>
              {reassignUser ? (
                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="truncate">
                    {reassignUserById.get(reassignUser)?.name ?? 'Selected user'}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReassignUser('')}>
                    Clear
                  </Button>
                </div>
              ) : null}
              <div className="max-h-52 overflow-y-auto rounded-md border p-1">
                {reassignUsersLoading && reassignUserOptions.length === 0 ? (
                  <p className="flex items-center justify-center gap-2 px-2 py-5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading users…
                  </p>
                ) : reassignUserOptions.length === 0 ? (
                  <p className="px-2 py-5 text-center text-sm text-muted-foreground">
                    {reassignUsersError ?? 'No users match your search.'}
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {reassignUserOptions.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setReassignUser(user.id)}
                        className={`flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                          reassignUser === user.id ? 'bg-primary/10' : 'hover:bg-muted/60'
                        }`}
                      >
                        <span className="font-medium">{user.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user.username}
                          {user.systemRole ? ` · ${user.systemRole}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {reassignUsersHasMore ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 w-full"
                    onClick={loadMoreReassignUsers}
                    disabled={reassignUsersLoadingMore}
                  >
                    {reassignUsersLoadingMore ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Load more users
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} placeholder="Handover, misroute, etc." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReassign(false)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={reassigning}>{reassigning ? 'Reassigning…' : 'Reassign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this correspondence?</AlertDialogTitle>
            <AlertDialogDescription>
              This closes routing for this item and creates its completion record. It will not archive the item. Outward correspondence can still be dispatched separately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCompleting}
              onClick={(event) => {
                event.preventDefault();
                void handleCompleteCorrespondence();
              }}
            >
              {isCompleting ? 'Completing…' : 'Complete correspondence'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showNoResponseConfirm}
        onOpenChange={(open) => {
          if (!isCompleting) setShowNoResponseConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish this memo without a reply?</AlertDialogTitle>
            <AlertDialogDescription>
              Record why no further reply is needed and close routing. Previous routed minutes must be acknowledged. This completes the memo and generates its completion package, but does not create a response memo or archive the record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="no-response-final-note">Final action note *</Label>
            <Textarea
              id="no-response-final-note"
              value={noResponseNote}
              onChange={(event) => setNoResponseNote(event.target.value)}
              placeholder="Explain why no further reply or action is required."
              rows={4}
              maxLength={5000}
              disabled={isCompleting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCompleting || !noResponseNote.trim()}
              onClick={(event) => {
                event.preventDefault();
                void handleCompleteWithoutResponse();
              }}
            >
              {isCompleting ? 'Finishing…' : 'Finish — no reply required'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CorrespondenceDetailModals
        correspondence={correspondence}
        minutes={minutes}
        activeUser={activeUser}
        selectedMinute={selectedMinute}
        linkedDocuments={linkedDocuments}
        isOpen={isOpen}
        openModal={openModal}
        closeModal={closeModal}
        onMinuteClose={handleModalRefreshClose}
        onTreatmentClose={handleModalRefreshClose}
        onCompletionClose={handleModalRefreshClose}
        onDelegate={handleDelegate}
        onLinkDocumentsSave={handleLinkDocumentsSave}
        onSetSelectedMinute={setSelectedMinute}
        onSetSelectedAttachmentIndex={setSelectedAttachmentIndex}
        onSetRemoteCorrespondence={setRemoteCorrespondence}
        refreshData={refreshData}
        refreshMinutes={refreshMinutes}
        syncFromApi={syncFromApi}
        defaultPreviewAttachmentFileName={defaultPreviewAttachmentFileName}
        defaultPreviewAttachmentSource={defaultPreviewAttachmentSource}
        previewDocumentVersionId={previewDocumentVersionId}
        previewAttachmentId={previewAttachmentId}
        printDocumentVersionId={printDocumentVersionId}
        onPrintLogged={() => {
          void logCorrespondenceDmsAccess('print');
        }}
      />

      {!isCompleted && (isCurrentUserTurn || isCCRecipient) && (
        <MobileStickyActionBar
          isForInformationOnly={isForInformationOnly}
          distributionPurpose={distributionPurpose}
          primaryLabel={mobilePrimaryLabel}
          showTreat={mobileShowTreat}
          treatLabel={mobileTreatLabel}
          canComplete={mobileCanComplete}
          canCompleteNoResponse={mobileCanCompleteNoResponse}
          canDelegate={mobileCanDelegate}
          markedAsRead={markedAsRead}
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
            setShowCompleteConfirm(true);
          }}
          onCompleteNoResponse={() => {
            goToRoutingTab();
            setNoResponseNote('');
            setShowNoResponseConfirm(true);
          }}
          onDelegate={() => {
            goToRoutingTab();
            openModal('delegate');
          }}
          onMarkRead={handleMarkRead}
        />
      )}
        </>
      )}
    </>
  );
};

const CorrespondenceDetailPage = () => (
  <ClientErrorBoundary>
    <CorrespondenceProvider>
      <Suspense fallback={null}>
        <CorrespondenceDetailContent />
      </Suspense>
    </CorrespondenceProvider>
  </ClientErrorBoundary>
);

export const dynamic = "force-dynamic";

export default CorrespondenceDetailPage;
