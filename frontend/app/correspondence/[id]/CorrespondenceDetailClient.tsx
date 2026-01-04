"use client";

import { useEffect, useMemo, useState, useCallback, useReducer, useRef } from 'react';
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { handleAuthenticationError } from '@/lib/auth-errors';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  User as UserIcon,
  Calendar,
  Building2,
  ArrowDown,
  ArrowUp,
  MessageSquare,
  CheckCircle,
  Send,
  Archive,
  Download,
  Printer,
  ChevronRight,
  Users,
  Image as ImageIcon,
  Link as LinkIcon,
  ExternalLink,
  X,
  Eye,
  Upload,
  File,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileCode,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Mail,
  Phone,
  Info,
  Maximize2,
  Minimize2,
  Filter,
  Plus,
  Clock,
  RotateCcw as RotateCcwIcon,
  Shield,
} from 'lucide-react';
import type { Minute, DistributionRecipient, Correspondence, ParallelRoutingGroup } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { fetchDocumentById, type DocumentRecord } from '@/lib/dms-storage';
import type { Delegation } from '@/lib/delegation-storage';
import { apiFetch } from '@/lib/api-client';
import { MinuteModal } from '@/components/correspondence/MinuteModal';
import { EditMinuteModal } from '@/components/correspondence/EditMinuteModal';
import { ParallelBranchStatus } from '@/components/correspondence/ParallelBranchStatus';
import { AdditionalMinuteModal } from '@/components/correspondence/AdditionalMinuteModal';
import { RecallMinuteModal } from '@/components/correspondence/RecallMinuteModal';
import { TreatmentModal } from '@/components/correspondence/TreatmentModal';
import { MinuteDetailModal } from '@/components/correspondence/MinuteDetailModal';
import { CompletionSummaryModal } from '@/components/correspondence/CompletionSummaryModal';
import { DelegateModal } from '@/components/correspondence/DelegateModal';
import { PrintPreviewModal } from '@/components/correspondence/PrintPreviewModal';
import { DocumentPreviewModal } from '@/components/correspondence/DocumentPreviewModal';
import { WorkflowProgressIndicator } from '@/components/correspondence/WorkflowProgressIndicator';
import { SealBadge } from '@/components/seals/SealBadge';
import { downloadAsPDF, downloadAsWord } from '@/lib/document-generator';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import { LinkDocumentDialog } from '@/components/correspondence/LinkDocumentDialog';
import { LinkCaseDialog } from '@/components/correspondence/LinkCaseDialog';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { mapApiCorrespondence, mapApiMinute } from '@/contexts/CorrespondenceContext';
// Forms moved to DMS - FormsChecklistCard removed
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildDownloadUrl, fixMediaUrl, ensureAbsoluteUrl } from '@/lib/correspondence-url-utils';
import { getBaseUrl } from '@/lib/api-client';
import { useModalState } from '@/hooks/use-modal-state';
import { useApiRetry } from '@/hooks/use-api-retry';
import { correspondenceDetailReducer, initialState } from './correspondence-state-reducer';
import { CorrespondenceHeader } from './components/CorrespondenceHeader';
import { MinuteThreadPanel } from './components/MinuteThreadPanel';
import { ActionsPanel } from './components/ActionsPanel';

// Download handler that forces download instead of opening in new tab
const handleDownload = async (url: string, filename: string) => {
  try {
    // Fix URL using utility function
    let fixedUrl = fixMediaUrl(url);
    
    // Ensure we have a full URL
    if (!fixedUrl.startsWith('http')) {
      fixedUrl = ensureAbsoluteUrl(fixedUrl);
    }
    
    logInfo('[handleDownload] Original URL:', url);
    logInfo('[handleDownload] Fixed URL:', fixedUrl);
    
    const token = localStorage.getItem('npa_ecm_access_token');
    const abortController = new AbortController();
    
    const response = await fetch(fixedUrl, {
      credentials: 'include',
      headers: token ? {
        'Authorization': `Bearer ${token}`,
      } : {},
      signal: abortController.signal,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      logWarn('Download aborted');
      return;
    }
    logError('Download error', error);
    // Fallback: try to fix URL and open in new tab
    const fallbackUrl = fixMediaUrl(url);
    const absoluteUrl = fallbackUrl.startsWith('http') ? fallbackUrl : ensureAbsoluteUrl(fallbackUrl);
    window.open(absoluteUrl, '_blank');
  }
};
const CorrespondenceDetailContent = () => {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { getCorrespondenceById, getMinutesByCorrespondenceId, updateCorrespondence, refreshData, syncFromApi } =
    useCorrespondence();
  const cachedCorrespondence = id ? getCorrespondenceById(id) : null;
  const contextMinutes = id ? getMinutesByCorrespondenceId(id) : [];
  const { currentUser: activeUser } = useCurrentUser();
  const {
    directorates,
    divisions,
    departments,
    users: organizationUsers,
    offices,
    officeMemberships,
    assistantAssignments,
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
    parallelRoutingGroups,
    selectedMinute,
    selectedAttachmentIndex,
    attachmentSearchQuery,
    selectedLinkedDocVersion,
    isPreviewFullscreen,
    dragActive,
    mobileActiveTab,
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
  const setAttachmentSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_ATTACHMENT_SEARCH_QUERY', payload: query });
  }, []);
  const setSelectedLinkedDocVersion = useCallback((version: Record<string, number>) => {
    dispatch({ type: 'SET_SELECTED_LINKED_DOC_VERSION', payload: version });
  }, []);
  const setIsPreviewFullscreen = useCallback((fullscreen: boolean) => {
    dispatch({ type: 'SET_PREVIEW_FULLSCREEN', payload: fullscreen });
  }, []);
  const setDragActive = useCallback((active: boolean) => {
    dispatch({ type: 'SET_DRAG_ACTIVE', payload: active });
  }, []);
  const setMobileActiveTab = useCallback((tab: 'document' | 'thread' | 'actions') => {
    dispatch({ type: 'SET_MOBILE_ACTIVE_TAB', payload: tab });
  }, []);
  
  const searchParams = useSearchParams();
  const statusParam = searchParams?.get('status');
  const initialStatus = statusParam ?? cachedCorrespondence?.status;
  const correspondence = remoteCorrespondence ?? cachedCorrespondence;
  const isCompleted = (remoteCorrespondence?.status ?? initialStatus) === 'completed';

  // Use modal state hook to consolidate modal states
  const { activeModal, openModal, closeModal, isOpen } = useModalState();
  
  // Use API retry hook for critical requests
  const { fetchWithRetry } = useApiRetry({ maxRetries: 3 });
  
  // Track if we've already fetched parallel routing groups for this correspondence ID
  const fetchedParallelGroupsRef = useRef<string | null>(null);

  // Document preview is handled by DocumentPreviewPanel component

  useEffect(() => {
    const linkedIds = correspondence?.linkedDocumentIds ?? [];
    if (linkedIds.length === 0) {
      setLinkedDocuments([]);
      return;
    }

    let ignore = false;

    const loadLinkedDocs = async () => {
      try {
        const results = await Promise.all(
          linkedIds.map(async (docId) => {
            try {
              const document = await fetchDocumentById(docId);
              return document;
            } catch (error: unknown) {
              logWarn(`Failed to load linked document ${docId}`, error);
              return null;
            }
          }),
        );

        if (!ignore) {
          setLinkedDocuments(results.filter((doc): doc is DocumentRecord => Boolean(doc)));
        }
      } catch (error: unknown) {
        logError('Failed to load linked documents', error);
      }
    };

    void loadLinkedDocs();

    return () => {
      ignore = true;
    };
  }, [correspondence?.linkedDocumentIds]);

  // Document preview is now handled by useDocumentPreview hook (see above)

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    const abortController = new AbortController();
    
    const hydrateFromApi = async () => {
      setDetailLoading(true);
      try {
        // Use retry logic for critical API calls
        type MinutesResponse = Array<Record<string, unknown>> | { results: Array<Record<string, unknown>> };
        const [corrResponse, minutesResponse, delegationResponse] = await Promise.all([
          fetchWithRetry(() => apiFetch<Record<string, unknown>>(`/correspondence/items/${id}/`)),
          fetchWithRetry(() => apiFetch<MinutesResponse>(`/correspondence/minutes/?correspondence=${id}`)),
          fetchWithRetry(() => {
            type DelegationItem = {
              id: string;
              status: string;
              assistant?: { id: string };
              assistant_id?: string;
              principal?: { id: string };
              principal_id?: string;
              delegated_at?: string;
              delegatedAt?: string;
            };
            type DelegationResponse = Array<DelegationItem> | { results: Array<DelegationItem> };
            return apiFetch<DelegationResponse>(`/correspondence/correspondence-delegations/?correspondence=${id}&status=active`);
          }).catch(() => []),
        ]);
        if (!ignore && !abortController.signal.aborted) {
          setRemoteCorrespondence(mapApiCorrespondence(corrResponse));
          // Handle paginated response (DRF may return {count, next, previous, results: [...]})
          const minutesData = Array.isArray(minutesResponse) 
            ? minutesResponse 
            : (minutesResponse?.results || []);
          const mappedMinutes = minutesData.map(mapApiMinute);
          logInfo('[CorrespondenceDetail] Fetched minutes:', {
            rawCount: minutesData.length,
            mappedCount: mappedMinutes.length,
            correspondenceId: id,
            minutes: mappedMinutes.map(m => ({ id: m.id, actionType: m.actionType, stepNumber: m.stepNumber }))
          });
          setMinutes(mappedMinutes);
          
          // Set active delegation from backend
          const delegations: Array<{
            id: string;
            status: string;
            assistant?: { id: string };
            assistant_id?: string;
            principal?: { id: string };
            principal_id?: string;
            delegated_at?: string;
            delegatedAt?: string;
          }> = Array.isArray(delegationResponse) 
            ? delegationResponse 
            : (delegationResponse?.results || []);
          const activeDel = delegations.find((d) => d.status === 'active');
          if (activeDel) {
            setBackendDelegation({
              id: activeDel.id,
              assistantId: activeDel.assistant?.id || activeDel.assistant_id || '',
              principalId: activeDel.principal?.id || activeDel.principal_id || '',
              status: activeDel.status,
              delegatedAt: activeDel.delegated_at || activeDel.delegatedAt || '',
            });
          } else {
            setBackendDelegation(null);
          }
        }
      } catch (error: unknown) {
        // Handle authentication errors - redirect to login
        if (handleAuthenticationError(error)) {
          return; // Redirect is happening, exit early
        }
        if (!ignore && !abortController.signal.aborted) {
        logWarn('Failed to refresh correspondence detail', error);
        // Fallback to context minutes if API fetch fails
          if (id) {
          const fallbackMinutes = getMinutesByCorrespondenceId(id);
          setMinutes(fallbackMinutes);
          }
        }
      } finally {
        if (!ignore && !abortController.signal.aborted) {
          setDetailLoading(false);
        }
      }
    };
    void hydrateFromApi();
    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [id, getMinutesByCorrespondenceId]);

  useEffect(() => {
    if (!isCompleted) return;
    closeModal(); // Close any open modal when completed
  }, [isCompleted, closeModal]);

  // Mark minutes as opened when user views correspondence detail
  // Track which minutes have been marked as opened to prevent duplicate API calls
  const markedAsOpenedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!correspondence || !activeUser?.id || detailLoading) return;

    // Find minutes directed to current user that haven't been opened
    const unopenedMinutes = minutes.filter(
      (m: Minute) => 
        !m.isOpened && 
        !markedAsOpenedRef.current.has(m.id) &&
        m.toOfficeId === correspondence.currentOfficeId &&
        correspondence.currentApproverId === activeUser.id
    );

    // Mark each unopened minute as opened (batch API calls)
    if (unopenedMinutes.length > 0) {
      // Mark IDs immediately to prevent duplicate calls
      unopenedMinutes.forEach(m => markedAsOpenedRef.current.add(m.id));
      
      // Batch all API calls using Promise.allSettled to handle failures gracefully
      Promise.allSettled(
        unopenedMinutes.map(minute =>
          apiFetch(`/correspondence/minutes/${minute.id}/mark-opened/`, {
            method: 'POST',
          }).catch(error => {
            // Silently fail - opening tracking is not critical
            logWarn('Failed to mark minute as opened', error);
            // Remove from set on failure so it can be retried
            markedAsOpenedRef.current.delete(minute.id);
          })
        )
      );
    }
  }, [correspondence?.id, activeUser?.id, correspondence?.currentOfficeId, correspondence?.currentApproverId, detailLoading]);

  // Fetch parallel routing groups
  // Only fetch when id changes or when detailLoading becomes false (data loaded)
  useEffect(() => {
    if (!id || detailLoading) return;
    
    // Prevent duplicate fetches for the same ID
    if (fetchedParallelGroupsRef.current === id) {
      return;
    }
    
    // Mark that we're fetching for this ID
    fetchedParallelGroupsRef.current = id;
    let ignore = false;
    const fetchParallelGroups = async () => {
      try {
        const response = await fetchWithRetry(() => apiFetch(`/correspondence/parallel-routing-groups/?correspondence=${id}`));
        if (ignore) return;
        
        // Handle paginated response (DRF may return {count, next, previous, results: [...]})
        let groups: ParallelRoutingGroup[] = [];
        if (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) {
          groups = response.results as ParallelRoutingGroup[];
        } else if (Array.isArray(response)) {
          groups = response as ParallelRoutingGroup[];
        }
        
        // Log raw response for debugging
        logInfo('[ParallelRouting] Raw API response:', response);
        logInfo('[ParallelRouting] Extracted groups:', groups);
        logInfo('[ParallelRouting] Group IDs:', groups.map(g => g.id));
        
        // Deduplicate by ID using a Set for more reliable deduplication
        const seenIds = new Set<string>();
        const uniqueGroups = groups.filter((group) => {
          const groupId = String(group.id);
          if (seenIds.has(groupId)) {
            logWarn('[ParallelRouting] Duplicate group ID detected', { groupId, group });
            return false;
          }
          seenIds.add(groupId);
          return true;
        });
        
        // Log for debugging
        logInfo('[ParallelRouting] Unique groups after deduplication', { 
          unique: uniqueGroups.length, 
          total: groups.length 
        });
        if (groups.length !== uniqueGroups.length) {
          logWarn(`[ParallelRouting] Filtered ${groups.length - uniqueGroups.length} duplicate groups`);
        }
        
        if (!ignore) {
          logInfo('[ParallelRouting] Setting parallel routing groups', uniqueGroups);
          setParallelRoutingGroups(uniqueGroups);
        }
      } catch (error: unknown) {
        // Handle authentication errors - redirect to login
        if (handleAuthenticationError(error)) {
          return; // Redirect is happening, exit early
        }
        logError('[ParallelRouting] Failed to fetch parallel routing groups', error);
      }
    };
    void fetchParallelGroups();
    return () => {
      ignore = true;
    };
  }, [id, detailLoading]); // Removed fetchWithRetry from deps - it's stable from useApiRetry hook

  // Function to refresh minutes from API with retry logic
  const refreshMinutes = useCallback(async () => {
    if (!id) return;
    try {
      type MinutesResponseType = Array<Record<string, unknown>> | { results: Array<Record<string, unknown>> };
      const minutesResponse = await fetchWithRetry(() => apiFetch<MinutesResponseType>(`/correspondence/minutes/?correspondence=${id}`));
      const minutesData = Array.isArray(minutesResponse) 
        ? minutesResponse 
        : (minutesResponse?.results || []);
      const mappedMinutes = minutesData.map(mapApiMinute);
      
      // Debug logging for seal data and recall status
      logInfo('[CorrespondenceDetail] Refreshed minutes', mappedMinutes.map((m: Minute) => ({
        id: m.id,
        actionType: m.actionType,
        stepNumber: m.stepNumber,
        hasSealData: !!m.sealData,
        hasSignature: !!m.signature,
        isRecalled: m.isRecalled,
        recalledAt: m.recalledAt,
        canBeRecalled: m.canBeRecalled,
        sealData: m.sealData,
      })));
      
      setMinutes(mappedMinutes);
    } catch (error: unknown) {
      // Handle authentication errors - redirect to login
      if (handleAuthenticationError(error)) {
        return; // Redirect is happening, exit early
      }
      logWarn('Failed to refresh minutes', error);
      // Fallback to context minutes if API fetch fails
      const fallbackMinutes = getMinutesByCorrespondenceId(id);
      setMinutes(fallbackMinutes);
    }
  }, [id, getMinutesByCorrespondenceId, fetchWithRetry, setMinutes]);

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
  }, [minutes, activeUser?.id, correspondence?.currentApproverId, correspondence?.currentOfficeId]);

  // Determine which parallel routing groups to show in the UI.
  // We avoid clutter by:
  // - de-duplicating by id
  // - if there are active (incomplete) groups, showing only the most recent one
  // - otherwise, showing only the most recently completed group
  const visibleParallelGroups = useMemo(() => {
    if (!parallelRoutingGroups || parallelRoutingGroups.length === 0) {
      return [] as ParallelRoutingGroup[];
    }

    // De-duplicate by id
    const seenIds = new Set<string>();
    const unique = (parallelRoutingGroups as Array<Record<string, unknown>>).filter((group) => {
      const groupId = String(group.id);
      if (seenIds.has(groupId)) {
        logWarn('[ParallelRouting] Duplicate in state', { groupId });
        return false;
      }
      seenIds.add(groupId);
      return true;
    });

    // Sort by createdAt / updatedAt to find the most recent group(s)
    const sorted = [...unique].sort((a, b) => {
      const aTime = new Date((a.createdAt as string | number | undefined) ?? (a.updatedAt as string | number | undefined) ?? 0).getTime();
      const bTime = new Date((b.createdAt as string | number | undefined) ?? (b.updatedAt as string | number | undefined) ?? 0).getTime();
      return aTime - bTime;
    });

    const active = sorted.filter((g) => !g.isComplete);
    if (active.length > 0) {
      // Show only the most recent active group
      return [active[active.length - 1]];
    }

    // All groups complete – show only the most recent completed one
    return [sorted[sorted.length - 1]];
  }, [parallelRoutingGroups]);

  if (!correspondence) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading correspondence…</p>
          ) : (
            <p>Correspondence not found</p>
          )}
        </div>
      </DashboardLayout>
    );
  }

  if (!activeUser) {
    return null;
  }

  const division = correspondence.divisionId
    ? divisions.find((entry) => entry.id === correspondence.divisionId) ?? null
    : null;
  const department = correspondence.departmentId
    ? departments.find((entry) => entry.id === correspondence.departmentId) ?? null
    : null;
  // Use backend delegation (loaded from API)
  const activeDelegation = backendDelegation;
  
  // User can act if they are the current approver OR if they are the active delegatee
  // For delegatees: they can only act if the correspondence is STILL with the principal
  // (Once routed to someone else, the delegatee can no longer act on it)
  const isDelegateeAndPrincipalTurn = 
    activeDelegation && 
    String(activeDelegation.assistantId) === String(activeUser.id) && 
    activeDelegation.status === 'active' &&
    String(correspondence.currentApproverId) === String(activeDelegation.principalId);
  
  const isCurrentUserTurn: boolean = 
    Boolean(correspondence.currentApproverId === activeUser?.id || isDelegateeAndPrincipalTurn);

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
  const completionPackageUrl = buildDownloadUrl(correspondence.completionPackage?.fileUrl ?? null) ?? null;
  const completionGeneratedAt =
    correspondence.completionPackage?.generatedAt ??
    correspondence.completionSummaryGeneratedAt ??
    correspondence.completedAt;

  const lookupUser = (userId?: string) => {
    if (!userId) return undefined;
    return organizationUsers.find((user) => user.id === userId);
  };

  // Wrapper for CorrespondenceTreeView that expects specific return type
  const lookupUserForTree = (userId: string): { name: string; email?: string } | null => {
    const user = organizationUsers.find((u) => u.id === userId);
    if (!user) return null;
    return { name: user.name, email: user.email };
  };

  // Helper functions moved to DocumentPreviewPanel component

  const handleLinkDocumentsSave = async (documentIds: string[]) => {
    try {
      // Update correspondence via API with linked document IDs
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

  const handleRemoveLink = async (docId: string) => {
    try {
      const updatedIds = (correspondence.linkedDocumentIds ?? []).filter((idValue) => idValue !== docId);
      // Update correspondence via API with updated linked document IDs
      await apiFetch(`/correspondence/items/${correspondence.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          linked_document_ids: updatedIds,
        }),
      });
      toast.success('Document unlinked');
      await syncFromApi();
    } catch (error: unknown) {
      logError('Failed to unlink document', error);
      toast.error('Unable to unlink document', {
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

  return (
    <DashboardLayout>
      <div className="flex flex-col min-w-0">
        {/* Header - Full Width */}
        <div className="flex-shrink-0">
          <CorrespondenceHeader
            correspondence={correspondence}
            minutes={minutes}
            linkedDocuments={linkedDocuments}
            onOpenDocumentPreview={() => openModal('document-preview')}
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

          {/* Help guide - hidden on mobile */}
          <div className="border-b border-border bg-background/70 px-4 md:px-6 py-2 hidden md:block">
            <HelpGuideCard
              title="Correspondence Workspace"
              description="Review the routing history and use the Actions panel to route, respond, or complete this item."
              links={[
                { label: 'Help & Guides', href: '/help' },
              ]}
              className="bg-background"
              dismissible
              dismissKey="correspondence-detail"
            />
          </div>

          {/* Mobile Tab Navigation */}
          <div className="md:hidden border-b border-border bg-background px-2 py-1">
            <div className="flex gap-1">
              <Button
                variant={mobileActiveTab === 'thread' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setMobileActiveTab('thread')}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Thread
                {minutes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {minutes.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={mobileActiveTab === 'actions' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setMobileActiveTab('actions')}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                Actions
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area - 2-Panel Layout: Thread | Actions */}
        <div className="flex flex-col md:flex-row md:gap-4 px-0 md:px-4 lg:px-6 py-4 md:py-6">
          {/* Left Panel - Minute Thread (60%) */}
          <MinuteThreadPanel
            minutes={minutes}
            activeUserId={activeUser.id}
            isCompleted={isCompleted}
            isCurrentUserTurn={isCurrentUserTurn}
            lookupUser={lookupUser}
            getActionIcon={getActionIcon}
            onMinuteClick={(minute) => {
              setSelectedMinute(minute);
              openModal('minute-detail');
            }}
            onEditMinute={(minute) => {
              setSelectedMinute(minute);
              openModal('edit-minute');
            }}
            onRecallMinute={(minute) => {
              // Prevent opening recall modal if minute is already recalled
              if (minute.isRecalled || minute.recalledAt) {
                logWarn('[CorrespondenceDetail] Cannot recall already recalled minute', { minuteId: minute.id });
                toast.error('This minute has already been recalled.');
                return;
              }
              setSelectedMinute(minute);
              openModal('recall-minute');
            }}
            onAddNote={(minute) => {
              setSelectedMinute(minute);
              openModal('additional-minute');
            }}
          />

          {/* Right Panel - Actions (40%) */}
          <ActionsPanel
            correspondence={correspondence}
            minutes={minutes}
            activeUser={activeUser}
            onOpenParallelRouteModal={() => openModal('parallel-route')}
            onOpenLinkCaseModal={() => openModal('link-case')}
            isCompleted={isCompleted}
            isCurrentUserTurn={isCurrentUserTurn}
            isForInformationOnly={isForInformationOnly}
            isExecutive={isExecutive}
            turnRestrictedDisabled={turnRestrictedDisabled}
            completionPackageUrl={completionPackageUrl}
            completionGeneratedAt={completionGeneratedAt}
            activeDelegation={activeDelegation}
            organizationUsers={organizationUsers}
            offices={offices}
            officeMemberships={officeMemberships}
            lookupUser={lookupUser}
            onOpenMinuteModal={() => openModal('minute')}
            onOpenTreatmentModal={() => openModal('treatment')}
            onOpenCompletionModal={() => openModal('completion')}
            // onOpenParallelRouteModal removed - Use Distribution (CC) in MinuteModal instead
            onOpenDelegateModal={() => openModal('delegate')}
            // onOpenLinkCaseModal moved to CorrespondenceHeader
            onDownloadCompletionPackage={handleDownload}
            onSyncFromApi={syncFromApi}
                              />
                            </div>
                            </div>

      {/* Mobile Tab Content */}
      {mobileActiveTab === 'thread' && (
        <div className="md:hidden">
          <MinuteThreadPanel
            minutes={minutes}
            activeUserId={activeUser.id}
            isCompleted={isCompleted}
            isCurrentUserTurn={isCurrentUserTurn}
            lookupUser={lookupUser}
            getActionIcon={getActionIcon}
            onMinuteClick={(minute) => {
              setSelectedMinute(minute);
              openModal('minute-detail');
            }}
            onEditMinute={(minute) => {
              setSelectedMinute(minute);
              openModal('edit-minute');
            }}
            onRecallMinute={(minute) => {
              // Prevent opening recall modal if minute is already recalled
              if (minute.isRecalled || minute.recalledAt) {
                logWarn('[CorrespondenceDetail] Cannot recall already recalled minute', { minuteId: minute.id });
                toast.error('This minute has already been recalled.');
                return;
              }
              setSelectedMinute(minute);
              openModal('recall-minute');
            }}
            onAddNote={(minute) => {
              setSelectedMinute(minute);
              openModal('additional-minute');
            }}
          />
                                    </div>
      )}
      {mobileActiveTab === 'actions' && (
        <div className="md:hidden">
          <ActionsPanel
            correspondence={correspondence}
            minutes={minutes}
            activeUser={activeUser}
            onOpenParallelRouteModal={() => openModal('parallel-route')}
            onOpenLinkCaseModal={() => openModal('link-case')}
            isCompleted={isCompleted}
            isCurrentUserTurn={isCurrentUserTurn}
            isForInformationOnly={isForInformationOnly}
            isExecutive={isExecutive}
            turnRestrictedDisabled={turnRestrictedDisabled}
            completionPackageUrl={completionPackageUrl}
            completionGeneratedAt={completionGeneratedAt}
            activeDelegation={activeDelegation}
            organizationUsers={organizationUsers}
                  offices={offices}
                  officeMemberships={officeMemberships}
            lookupUser={lookupUser}
            onOpenMinuteModal={() => openModal('minute')}
            onOpenTreatmentModal={() => openModal('treatment')}
            onOpenCompletionModal={() => openModal('completion')}
            // onOpenParallelRouteModal removed - Use Distribution (CC) in MinuteModal instead
            onOpenDelegateModal={() => openModal('delegate')}
            // onOpenLinkCaseModal moved to CorrespondenceHeader
            onDownloadCompletionPackage={handleDownload}
            onSyncFromApi={syncFromApi}
          />
                    </div>
                  )}

      {/* Modals */}
      <MinuteModal
        correspondence={correspondence}
        isOpen={isOpen('minute')}
        onClose={handleMinuteClose}
        direction={correspondence.direction}
      />


      <TreatmentModal
        correspondence={correspondence}
        isOpen={isOpen('treatment')}
        onClose={handleTreatmentClose}
      />


      {selectedMinute && (
        <>
          <MinuteDetailModal
            minute={selectedMinute}
            open={isOpen('minute-detail')}
            onOpenChange={(open) => open ? openModal('minute-detail') : closeModal()}
            authorName={lookupUser(selectedMinute.userId)?.name ?? selectedMinute.userName}
            showDelegationInfo={String(selectedMinute.userId) === String(activeUser.id)}
          />
          <EditMinuteModal
            minute={selectedMinute}
            isOpen={isOpen('edit-minute')}
            onClose={() => {
              closeModal();
              setSelectedMinute(null);
            }}
            onSuccess={() => {
              setSelectedMinute(null);
              refreshData();
              void refreshMinutes();
            }}
          />
          <RecallMinuteModal
            minute={selectedMinute}
            isOpen={isOpen('recall-minute')}
            onClose={() => {
              closeModal();
              setSelectedMinute(null);
            }}
            onSuccess={async () => {
              setSelectedMinute(null);
              // Force refresh of correspondence and minutes data
              await syncFromApi();
              refreshData();
              await refreshMinutes();
              // Also fetch the correspondence detail again to get updated routing
              if (correspondence?.id) {
                try {
                  const updated = await apiFetch<Record<string, unknown>>(`/correspondence/${correspondence.id}/`);
                  if (updated) {
                    setRemoteCorrespondence(mapApiCorrespondence(updated as Record<string, unknown>));
                  }
                } catch (error: unknown) {
                  logWarn('Failed to refresh correspondence after recall', error);
                }
              }
            }}
          />
          <AdditionalMinuteModal
            correspondence={correspondence}
            isOpen={isOpen('additional-minute')}
            onClose={() => {
              closeModal();
              setSelectedMinute(null);
            }}
            onSuccess={() => {
              setSelectedMinute(null);
              refreshData();
              void syncFromApi();
              void refreshMinutes();
            }}
            preSelectedMinuteId={selectedMinute?.id}
          />
        </>
      )}

      <CompletionSummaryModal
        open={isOpen('completion')}
        onOpenChange={(open) => {
          if (open) {
            openModal('completion');
          } else {
            handleCompletionClose();
          }
        }}
        correspondence={correspondence}
        minutes={minutes}
      />

      <DocumentPreviewModal
        correspondence={correspondence}
        minutes={minutes}
        isOpen={isOpen('document-preview')}
        onClose={() => {
          closeModal();
          setSelectedAttachmentIndex(null);
        }}
        documentContentHtml={linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1]?.contentHtml}
        attachmentUrl={
          buildDownloadUrl(
            selectedAttachmentIndex !== null && correspondence.attachments?.[selectedAttachmentIndex]
              ? correspondence.attachments[selectedAttachmentIndex].fileUrl
              : correspondence.attachments?.[0]?.fileUrl
          )
        }
        attachmentFileName={
          selectedAttachmentIndex !== null && correspondence.attachments?.[selectedAttachmentIndex]
            ? correspondence.attachments[selectedAttachmentIndex].fileName
            : correspondence.attachments?.[0]?.fileName
        }
      />

      <PrintPreviewModal
        correspondence={correspondence}
        minutes={minutes}
        isOpen={isOpen('print-preview')}
        onClose={() => closeModal()}
        documentContentHtml={linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1]?.contentHtml}
        attachmentUrl={buildDownloadUrl(correspondence.attachments?.[0]?.fileUrl)}
        attachmentFileName={correspondence.attachments?.[0]?.fileName}
      />

      <DelegateModal
        open={isOpen('delegate')}
        onOpenChange={(open) => open ? openModal('delegate') : closeModal()}
        correspondenceId={correspondence.id}
        executiveId={activeUser.id}
        onDelegate={handleDelegate}
      />

      <LinkDocumentDialog
        open={isOpen('link-document')}
        onOpenChange={(open) => open ? openModal('link-document') : closeModal()}
        linkedDocumentIds={correspondence.linkedDocumentIds}
        onSave={handleLinkDocumentsSave}
        divisionId={correspondence.divisionId}
        departmentId={correspondence.departmentId}
        subject={correspondence.subject}
      />

      <LinkCaseDialog
        open={isOpen('link-case')}
        onOpenChange={(open) => open ? openModal('link-case') : closeModal()}
        correspondenceId={correspondence.id}
        onLinked={async () => {
          await refreshData();
          await syncFromApi();
        }}
      />

      {/* Mobile Sticky Action Bar */}
      {!isCompleted && isCurrentUserTurn && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-3 z-40 safe-area-inset-bottom">
          <div className="flex gap-2 max-w-lg mx-auto">
            {isForInformationOnly ? (
              <div className="flex-1 p-2 bg-muted/50 border border-border rounded-lg text-center">
                <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  For Information Only
                </span>
              </div>
            ) : (
              <>
                <Button
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                  size="sm"
                  onClick={() => {
                    setMobileActiveTab('actions');
                    openModal('minute');
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  Minute
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setMobileActiveTab('actions');
                    openModal('treatment');
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Treat
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => {
                      setMobileActiveTab('actions');
                      openModal('completion');
                    }}>
                      <Archive className="h-4 w-4 mr-2" />
                      Complete & Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setMobileActiveTab('actions');
                      openModal('delegate');
                    }}>
                      <UserIcon className="h-4 w-4 mr-2" />
                      Delegate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

// Export the content component directly - Suspense is handled by Next.js for useSearchParams
export default CorrespondenceDetailContent;