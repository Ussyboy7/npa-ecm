"use client";

import { Suspense } from 'react';
import { logError, logWarn } from '@/lib/client-logger';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
import { getDelegationByCorrespondence, revokeDelegation, addDelegation, type Delegation } from '@/lib/delegation-storage';
import { apiFetch, getStoredAccessToken } from '@/lib/api-client';
import { MinuteModal } from '@/components/correspondence/MinuteModal';
import { EditMinuteModal } from '@/components/correspondence/EditMinuteModal';
import { ParallelRouteModal } from '@/components/correspondence/ParallelRouteModal';
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
import mammoth from 'mammoth';
import { LinkDocumentDialog } from '@/components/correspondence/LinkDocumentDialog';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { mapApiCorrespondence, mapApiMinute } from '@/contexts/CorrespondenceContext';
// Forms moved to DMS - FormsChecklistCard removed
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/api\/?$/, '');
const buildDownloadUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http')) {
    // If it's already a full URL, check if it has /api/media/ and fix it
    try {
      const url = new URL(path);
      // Fix /api/media/ to /media/
      if (url.pathname.startsWith('/api/media/')) {
        url.pathname = url.pathname.replace('/api/media/', '/media/');
        return url.toString();
      }
    } catch {
      // Invalid URL, return as-is
    }
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  // Remove /api/ prefix if present in the path
  const cleanedPath = normalized.replace(/^\/api\/media\//, '/media/');
  return `${API_BASE_URL}${cleanedPath}`;
};

// Download handler that forces download instead of opening in new tab
const handleDownload = async (url: string, filename: string) => {
  try {
    // Fix URL - handle both /api/media/ and http://host/api/media/ patterns
    let fixedUrl = url;
    
    // If it's a full URL, parse and fix it
    if (url.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        if (urlObj.pathname.startsWith('/api/media/')) {
          urlObj.pathname = urlObj.pathname.replace('/api/media/', '/media/');
          fixedUrl = urlObj.toString();
        }
      } catch (e) {
        // If URL parsing fails, try string replacement
        fixedUrl = url.replace(/\/api\/media\//, '/media/');
      }
    } else {
      // Relative URL - remove /api/ prefix
      fixedUrl = url.replace(/\/api\/media\//, '/media/').replace(/^\/api\/media\//, '/media/');
    }
    
    // Ensure we have a full URL
    if (!fixedUrl.startsWith('http')) {
      const baseUrl = API_BASE_URL || 'http://localhost:8002';
      fixedUrl = `${baseUrl}${fixedUrl.startsWith('/') ? fixedUrl : `/${fixedUrl}`}`;
    }
    
    console.log('[handleDownload] Original URL:', url);
    console.log('[handleDownload] Fixed URL:', fixedUrl);
    
    const token = localStorage.getItem('npa_ecm_access_token');
    const response = await fetch(fixedUrl, {
      credentials: 'include',
      headers: token ? {
        'Authorization': `Bearer ${token}`,
      } : {},
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
  } catch (error) {
    console.error('Download error:', error);
    // Fallback: try to fix URL and open in new tab
    const fallbackUrl = url.replace(/\/api\/media\//, '/media/');
    if (fallbackUrl.startsWith('http')) {
      window.open(fallbackUrl, '_blank');
    } else {
      const baseUrl = API_BASE_URL || 'http://localhost:8002';
      window.open(`${baseUrl}${fallbackUrl.startsWith('/') ? fallbackUrl : `/${fallbackUrl}`}`, '_blank');
    }
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
  const [minutes, setMinutes] = useState<Minute[]>([]);
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
  const [remoteCorrespondence, setRemoteCorrespondence] = useState<Correspondence | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [backendDelegation, setBackendDelegation] = useState<{
    id: string;
    assistantId: string | number;
    principalId: string | number;
    status: string;
    delegatedAt: string;
  } | null>(null);
  const searchParams = useSearchParams();
  const statusParam = searchParams?.get('status');
  const initialStatus = statusParam ?? cachedCorrespondence?.status;
  const correspondence = remoteCorrespondence ?? cachedCorrespondence;
  const isCompleted = (remoteCorrespondence?.status ?? initialStatus) === 'completed';

  const [showMinuteModal, setShowMinuteModal] = useState(false);
  const [showEditMinuteModal, setShowEditMinuteModal] = useState(false);
  const [showRecallMinuteModal, setShowRecallMinuteModal] = useState(false);
  const [showAdditionalMinuteModal, setShowAdditionalMinuteModal] = useState(false);
  const [showParallelRouteModal, setShowParallelRouteModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [selectedMinute, setSelectedMinute] = useState<Minute | null>(null);
  const [showMinuteDetail, setShowMinuteDetail] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState<number | null>(null);
  const [showLinkDocumentDialog, setShowLinkDocumentDialog] = useState(false);
  const [linkedDocuments, setLinkedDocuments] = useState<DocumentRecord[]>([]);
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  const [documentPreviewError, setDocumentPreviewError] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [attachmentSearchQuery, setAttachmentSearchQuery] = useState('');
  const [selectedLinkedDocVersion, setSelectedLinkedDocVersion] = useState<Record<string, number>>({});
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [parallelRoutingGroups, setParallelRoutingGroups] = useState<ParallelRoutingGroup[]>([]);
  const [mobileActiveTab, setMobileActiveTab] = useState<'document' | 'thread' | 'actions'>('thread');

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
            } catch (error) {
              logWarn(`Failed to load linked document ${docId}`, error);
              return null;
            }
          }),
        );

        if (!ignore) {
          setLinkedDocuments(results.filter((doc): doc is DocumentRecord => Boolean(doc)));
        }
      } catch (error) {
        logError('Failed to load linked documents', error);
      }
    };

    void loadLinkedDocs();

    return () => {
      ignore = true;
    };
  }, [correspondence?.linkedDocumentIds]);

  // Load PDF or Word document as blob to avoid CORS/sandbox issues
  useEffect(() => {
    // Only run if correspondence is loaded
    if (!correspondence) {
      console.log('[PDF Preview] No correspondence yet, skipping');
      return;
    }
    
    const firstAttachment = correspondence?.attachments?.[0];
    
    console.log('[PDF Preview] useEffect triggered', {
      hasCorrespondence: !!correspondence,
      attachmentsCount: correspondence?.attachments?.length || 0,
      firstAttachment,
      attachmentFileUrl: firstAttachment?.fileUrl,
    });
    let currentBlobUrl: string | null = null;
    let abortController: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (!firstAttachment?.fileUrl) {
      console.log('[PDF Preview] No attachment fileUrl, clearing state');
      setPdfBlobUrl(null);
      setWordHtml(null);
      setDocumentPreviewLoading(false);
      setDocumentPreviewError(null);
      return;
    }

    const fileName = firstAttachment.fileName || '';
    // Allow previewing all PDF files, including completion packages

    const isPDF = firstAttachment.fileType === 'application/pdf';
    const isWordDocx = fileName.toLowerCase().endsWith('.docx');

    console.log('[PDF Preview] Starting preview check:', {
      hasAttachment: !!firstAttachment,
      fileUrl: firstAttachment?.fileUrl,
      fileType: firstAttachment?.fileType,
      fileName,
      isPDF,
      isWordDocx,
    });

    if (isPDF || isWordDocx) {
      setDocumentPreviewLoading(true);
      setDocumentPreviewError(null);

      // Build the proper download URL (handles relative paths and API prefixes)
      const fileUrl = buildDownloadUrl(firstAttachment.fileUrl);
      console.log('[PDF Preview] URL building:', {
        originalUrl: firstAttachment.fileUrl,
        builtUrl: fileUrl,
        apiBaseUrl: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api')
          .replace(/\/api\/v1\/?$/, '')
          .replace(/\/api\/?$/, ''),
      });
      
      if (!fileUrl) {
        console.error('[PDF Preview] buildDownloadUrl returned undefined for:', firstAttachment.fileUrl);
        setDocumentPreviewError('Invalid file URL');
        setDocumentPreviewLoading(false);
        return;
      }

      // Get authentication token
      const token = getStoredAccessToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Debug logging
      console.log('[PDF Preview] Fetching file:', {
        originalUrl: firstAttachment.fileUrl,
        builtUrl: fileUrl,
        hasToken: !!token,
        fileName,
      });

      // Create abort controller for cleanup
      abortController = new AbortController();
      
      // Set up timeout (30 seconds)
      timeoutId = setTimeout(() => {
        if (abortController) {
          abortController.abort();
          logError('File load timeout after 30 seconds:', { fileUrl, fileName });
          setDocumentPreviewError('File load timeout. The file may be too large or the server is slow. Please try downloading the file.');
          setDocumentPreviewLoading(false);
        }
      }, 30000);

      fetch(fileUrl, {
        credentials: 'include',
        headers,
        signal: abortController.signal,
      })
        .then((response) => {
          if (!response.ok) {
            // Handle 404 gracefully - file might not exist
            if (response.status === 404) {
              // Clear timeout on 404
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              
              logWarn('File not found (404):', { fileUrl, fileName });
              // Only show error for non-completion-package files
              // Completion packages might not exist yet or may have been moved
              if (!fileName.toLowerCase().includes('completion-package') && 
                  !fileName.toLowerCase().includes('completion_package')) {
                setDocumentPreviewError(`File "${fileName}" not found on server. It may have been deleted or moved.`);
              } else {
                // For completion packages, just log and don't show error
                setDocumentPreviewError(null);
              }
              setDocumentPreviewLoading(false);
              return null; // Return null to skip blob processing
            }
            throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
          }
          return response.blob();
        })
        .then((blob) => {
          // Skip if blob is null (404 case)
          if (!blob) {
            return;
          }

          // Clear timeout on success
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          if (isPDF) {
            const url = URL.createObjectURL(blob);
            currentBlobUrl = url;
            setPdfBlobUrl(url);
            setWordHtml(null);
            // Clear loading state immediately - blob URL is ready, iframe will load in background
            setDocumentPreviewLoading(false);
          } else if (isWordDocx) {
            // Convert Word document to HTML using mammoth
            blob.arrayBuffer()
              .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
              .then((result) => {
                setWordHtml(result.value);
                setPdfBlobUrl(null);
                setDocumentPreviewLoading(false);
              })
              .catch((err) => {
                logError('Error converting Word document:', err);
                setDocumentPreviewError(`Failed to convert Word document: ${err.message}`);
                setWordHtml(null);
                setDocumentPreviewLoading(false);
              });
          }
        })
        .catch((err) => {
          // Clear timeout on error
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          // Don't show error if request was aborted (cleanup or timeout)
          if (err.name === 'AbortError') {
            logWarn('File load aborted:', { fileUrl, fileName });
            return;
          }
          
          logError('Error loading file', err);
          // Set error message (404 errors are already handled above)
          setDocumentPreviewError(`Failed to load ${isPDF ? 'PDF' : 'Word document'} preview. Please try downloading the file.`);
          setDocumentPreviewLoading(false);
        });
    } else {
      // Cleanup if not a previewable file type
      setPdfBlobUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setWordHtml(null);
      setDocumentPreviewLoading(false);
      setDocumentPreviewError(null);
    }

    // Cleanup on unmount or when attachment changes
    return () => {
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Abort fetch if in progress
      if (abortController) {
        abortController.abort();
      }
      // Cleanup blob URL
      setPdfBlobUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setWordHtml(null);
      // Ensure loading state is cleared
      setDocumentPreviewLoading(false);
    };
  }, [
    correspondence?.id, // Use ID instead of full object for stability
    correspondence?.attachments?.[0]?.fileUrl,
    correspondence?.attachments?.[0]?.fileType,
    correspondence?.attachments?.[0]?.fileName
  ]);

  // Fallback timeout for iframe loading - clear loading state if iframe onLoad doesn't fire
  useEffect(() => {
    if (pdfBlobUrl && documentPreviewLoading) {
      // Use a shorter timeout - blob URLs should load quickly
      const fallbackTimeout = setTimeout(() => {
        logWarn('PDF iframe load timeout - clearing loading state as fallback', { pdfBlobUrl });
        setDocumentPreviewLoading(false);
      }, 2000); // 2 second fallback after blob URL is set
      
      return () => clearTimeout(fallbackTimeout);
    }
  }, [pdfBlobUrl, documentPreviewLoading]);

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    const hydrateFromApi = async () => {
      setDetailLoading(true);
      try {
        const [corrResponse, minutesResponse, delegationResponse] = await Promise.all([
          apiFetch<any>(`/correspondence/items/${id}/`),
          apiFetch<any>(`/correspondence/minutes/?correspondence=${id}`),
          apiFetch<any>(`/correspondence/correspondence-delegations/?correspondence=${id}&status=active`).catch(() => [] as any[]),
        ]);
        if (!ignore) {
          setRemoteCorrespondence(mapApiCorrespondence(corrResponse));
          // Handle paginated response (DRF may return {count, next, previous, results: [...]})
          const minutesData = Array.isArray(minutesResponse) 
            ? minutesResponse 
            : (minutesResponse?.results || []);
          setMinutes(minutesData.map(mapApiMinute));
          
          // Set active delegation from backend
          const delegations: any[] = Array.isArray(delegationResponse) 
            ? delegationResponse 
            : (delegationResponse?.results || []);
          const activeDel = delegations.find((d: any) => d.status === 'active');
          if (activeDel) {
            setBackendDelegation({
              id: activeDel.id,
              assistantId: activeDel.assistant?.id || activeDel.assistant_id,
              principalId: activeDel.principal?.id || activeDel.principal_id,
              status: activeDel.status,
              delegatedAt: activeDel.delegated_at || activeDel.delegatedAt,
            });
          } else {
            setBackendDelegation(null);
          }
        }
      } catch (error) {
        logWarn('Failed to refresh correspondence detail', error);
        // Fallback to context minutes if API fetch fails
        if (!ignore && id) {
          const fallbackMinutes = getMinutesByCorrespondenceId(id);
          setMinutes(fallbackMinutes);
        }
      } finally {
        if (!ignore) {
          setDetailLoading(false);
        }
      }
    };
    void hydrateFromApi();
    return () => {
      ignore = true;
    };
  }, [id, getMinutesByCorrespondenceId]);

  useEffect(() => {
    if (!isCompleted) return;
    setShowMinuteModal(false);
    setShowTreatmentModal(false);
    setShowDelegateModal(false);
  }, [isCompleted]);

  // Mark minutes as opened when user views correspondence detail
  useEffect(() => {
    if (!correspondence || !activeUser?.id || detailLoading) return;

    // Find minutes directed to current user that haven't been opened
    const unopenedMinutes = minutes.filter(
      (m) => 
        !m.isOpened && 
        m.toOfficeId === correspondence.currentOfficeId &&
        correspondence.currentApproverId === activeUser.id
    );

    // Mark each unopened minute as opened
    unopenedMinutes.forEach(async (minute) => {
      try {
        await apiFetch(`/correspondence/minutes/${minute.id}/mark-opened/`, {
          method: 'POST',
        });
      } catch (error) {
        // Silently fail - opening tracking is not critical
        console.warn('Failed to mark minute as opened:', error);
      }
    });
  }, [correspondence?.id, activeUser?.id, minutes, detailLoading, correspondence?.currentOfficeId, correspondence?.currentApproverId]);

  // Fetch parallel routing groups
  useEffect(() => {
    if (!id || detailLoading) return;
    let ignore = false;
    const fetchParallelGroups = async () => {
      try {
        const response = await apiFetch(`/correspondence/parallel-routing-groups/?correspondence=${id}`);
        if (ignore) return;
        
        // Handle paginated response (DRF may return {count, next, previous, results: [...]})
        let groups: ParallelRoutingGroup[] = [];
        if (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) {
          groups = response.results as ParallelRoutingGroup[];
        } else if (Array.isArray(response)) {
          groups = response as ParallelRoutingGroup[];
        }
        
        // Log raw response for debugging
        console.log('[ParallelRouting] Raw API response:', response);
        console.log('[ParallelRouting] Extracted groups:', groups);
        console.log('[ParallelRouting] Group IDs:', groups.map(g => g.id));
        
        // Deduplicate by ID using a Set for more reliable deduplication
        const seenIds = new Set<string>();
        const uniqueGroups = groups.filter((group) => {
          const groupId = String(group.id);
          if (seenIds.has(groupId)) {
            console.warn('[ParallelRouting] Duplicate group ID detected:', groupId, group);
            logWarn('Duplicate parallel routing group detected:', groupId);
            return false;
          }
          seenIds.add(groupId);
          return true;
        });
        
        // Log for debugging
        console.log('[ParallelRouting] Unique groups after deduplication:', uniqueGroups.length, 'out of', groups.length);
        if (groups.length !== uniqueGroups.length) {
          console.warn('[ParallelRouting] Filtered', groups.length - uniqueGroups.length, 'duplicate groups');
          logWarn(`Filtered ${groups.length - uniqueGroups.length} duplicate parallel routing groups`);
        }
        
        if (!ignore) {
          console.log('[ParallelRouting] Setting parallel routing groups:', uniqueGroups);
          setParallelRoutingGroups(uniqueGroups);
        }
      } catch (error) {
        console.error('[ParallelRouting] Failed to fetch parallel routing groups:', error);
        logWarn('Failed to fetch parallel routing groups', error);
      }
    };
    void fetchParallelGroups();
    return () => {
      ignore = true;
    };
  }, [id, detailLoading]);

  // Function to refresh minutes from API
  const refreshMinutes = useCallback(async () => {
    if (!id) return;
    try {
      const minutesResponse = await apiFetch<any>(`/correspondence/minutes/?correspondence=${id}`);
      const minutesData = Array.isArray(minutesResponse) 
        ? minutesResponse 
        : (minutesResponse?.results || []);
      const mappedMinutes = minutesData.map(mapApiMinute);
      
      // Debug logging for seal data
      console.log('[CorrespondenceDetail] Refreshed minutes:', mappedMinutes.map(m => ({
        id: m.id,
        actionType: m.actionType,
        hasSealData: !!m.sealData,
        hasSignature: !!m.signature,
        sealData: m.sealData,
      })));
      
      setMinutes(mappedMinutes);
    } catch (error) {
      logWarn('Failed to refresh minutes', error);
      // Fallback to context minutes if API fetch fails
      const fallbackMinutes = getMinutesByCorrespondenceId(id);
      setMinutes(fallbackMinutes);
    }
  }, [id, getMinutesByCorrespondenceId]);

  const handleMinuteClose = () => {
    setShowMinuteModal(false);
    refreshData();
    void syncFromApi();
    void refreshMinutes();
  };

  const handleTreatmentClose = () => {
    setShowTreatmentModal(false);
    refreshData();
    void syncFromApi();
    void refreshMinutes();
  };

  const handleCompletionClose = () => {
    setShowCompletionModal(false);
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
    console.log('[page.tsx handleDelegate] Called with:', { assistantId, assistantType, notes, duration, expiresAt });
    
    if (!correspondence || !activeUser) {
      console.log('[page.tsx handleDelegate] Early return - no correspondence or activeUser');
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
    
    console.log('[page.tsx handleDelegate] Sending API request with payload:', payload);

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
      
      console.log('[page.tsx handleDelegate] API response:', response);

      // Also save to localStorage for UI state (backwards compatibility)
      const newDelegation: Delegation = {
        id: response.id,
        correspondenceId: correspondence.id,
        principalId: activeUser.id,
        executiveId: activeUser.id, // Legacy field
        assistantId,
        assistantType,
        delegationNotes: notes,
        delegatedAt: response.delegated_at || new Date().toISOString(),
        status: 'active',
        duration: duration || 'until_completed',
        expiresAt,
      };
      addDelegation(newDelegation);

      await refreshOrganizationData();
      await syncFromApi();
      
      const assistantName = organizationUsers.find(u => String(u.id) === String(assistantId))?.name || assistantType;
      toast.success(`Successfully delegated to ${assistantName}`, {
        description: notes 
          ? `Instructions sent: "${notes.substring(0, 50)}${notes.length > 50 ? '...' : ''}"` 
          : `${assistantName} will be notified and can now work on this correspondence.`,
      });
    } catch (error) {
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
    const unique = parallelRoutingGroups.filter((group) => {
      const groupId = String(group.id);
      if (seenIds.has(groupId)) {
        console.warn('[ParallelRouting] Duplicate in state:', groupId);
        return false;
      }
      seenIds.add(groupId);
      return true;
    });

    // Sort by createdAt / updatedAt to find the most recent group(s)
    const sorted = [...unique].sort((a, b) => {
      const aTime = new Date(a.createdAt ?? a.updatedAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? b.updatedAt ?? 0).getTime();
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
  // Use backend delegation if available, fallback to localStorage
  const localDelegation = getDelegationByCorrespondence(correspondence.id);
  const activeDelegation = backendDelegation || localDelegation;
  
  // User can act if they are the current approver OR if they are the active delegatee
  // For delegatees: they can only act if the correspondence is STILL with the principal
  // (Once routed to someone else, the delegatee can no longer act on it)
  const isDelegateeAndPrincipalTurn = 
    activeDelegation && 
    String(activeDelegation.assistantId) === String(activeUser.id) && 
    activeDelegation.status === 'active' &&
    String(correspondence.currentApproverId) === String(activeDelegation.principalId);
  
  const isCurrentUserTurn = 
    correspondence.currentApproverId === activeUser.id || isDelegateeAndPrincipalTurn;

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
  const completionPackageUrl = buildDownloadUrl(correspondence.completionPackage?.fileUrl ?? null);
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes || Number.isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file type icon based on MIME type or extension
  const getFileIcon = (fileType?: string, fileName?: string) => {
    if (!fileType && !fileName) return FileText;
    
    const type = fileType?.toLowerCase() || '';
    const ext = fileName?.toLowerCase().split('.').pop() || '';
    
    if (type.includes('pdf') || ext === 'pdf') return FileText;
    if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return FileImage;
    if (type.includes('spreadsheet') || type.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
    if (type.includes('word') || ['doc', 'docx'].includes(ext)) return FileText;
    if (type.includes('video') || ['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return FileVideo;
    if (type.includes('code') || ['js', 'ts', 'py', 'html', 'css', 'json', 'xml'].includes(ext)) return FileCode;
    return FileText;
  };

  // Get file type label
  const getFileTypeLabel = (fileType?: string, fileName?: string) => {
    if (!fileType && !fileName) return 'Document';
    
    const type = fileType?.toLowerCase() || '';
    const ext = fileName?.toLowerCase().split('.').pop() || '';
    
    if (type.includes('pdf') || ext === 'pdf') return 'PDF';
    if (type.includes('image')) return 'Image';
    if (type.includes('spreadsheet') || type.includes('excel') || ['xls', 'xlsx'].includes(ext)) return 'Spreadsheet';
    if (type.includes('word') || ['doc', 'docx'].includes(ext)) return 'Word Document';
    if (type.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'Presentation';
    if (type.includes('text') || ext === 'txt') return 'Text';
    return 'Document';
  };

  // Handle file upload
  const handleAttachmentUpload = async (files: File[]) => {
    if (!correspondence || files.length === 0) return;

    try {
      // Upload each file as a new attachment
      await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('correspondence', correspondence.id);
          
          // Use PATCH on correspondence to add attachments
          // Note: This may need backend support for adding attachments via PATCH
          await apiFetch(`/correspondence/items/${correspondence.id}/`, {
            method: 'PATCH',
            body: formData,
            headers: {}, // Let browser set Content-Type for FormData
          });
        })
      );

      toast.success(`${files.length} file(s) uploaded successfully`);
      await syncFromApi();
      setShowUploadDialog(false);
    } catch (error: any) {
      logError('Failed to upload attachments', error);
      toast.error('Unable to upload files', {
        description: error?.response?.data?.detail || error?.message || 'Please try again.',
      });
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      void handleAttachmentUpload(files);
    }
  };

  const resolveDistributionName = (recipient: DistributionRecipient) => {
    if (recipient.type === 'directorate') {
      if (recipient.directorateId) {
        const directorate = directorates.find((dir) => dir.id === recipient.directorateId);
        if (directorate) return directorate.name;
      }
      return recipient.name ?? 'Directorate';
    }

    if (recipient.type === 'department') {
      if (recipient.departmentId) {
        const departmentRecord = departments.find((dept) => dept.id === recipient.departmentId);
        if (departmentRecord) return departmentRecord.name;
      }
    }

    if (recipient.divisionId) {
      const divisionRecord = divisions.find((div) => div.id === recipient.divisionId);
      if (divisionRecord) return divisionRecord.name;
    }

    return recipient.name ?? 'Recipient';
  };

  const handleLinkDocumentsSave = async (documentIds: string[]) => {
    try {
      await updateCorrespondence(correspondence.id, { linkedDocumentIds: documentIds });
      toast.success('Linked documents updated');
      await syncFromApi();
    } catch (error) {
      logError('Failed to update linked documents', error);
      toast.error('Unable to update linked documents', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const handleRemoveLink = async (docId: string) => {
    try {
      const updatedIds = (correspondence.linkedDocumentIds ?? []).filter((idValue) => idValue !== docId);
      await updateCorrespondence(correspondence.id, { linkedDocumentIds: updatedIds });
      toast.success('Document unlinked');
      await syncFromApi();
    } catch (error) {
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
      <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
        <div className="border-b border-border bg-background px-3 md:px-6 py-2 md:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => router.push('/correspondence/inbox')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base md:text-xl font-bold text-foreground truncate">{correspondence.referenceNumber}</h1>
                  {/* Priority badge - always visible */}
                  <Badge
                    variant={
                      correspondence.priority === 'urgent'
                        ? 'destructive'
                        : correspondence.priority === 'high'
                        ? 'default'
                        : 'secondary'
                    }
                    className="flex-shrink-0"
                  >
                    {correspondence.priority.toUpperCase()}
                  </Badge>
                  {/* Direction badge - hidden on mobile */}
                  <Badge variant="outline" className="gap-1 hidden sm:flex flex-shrink-0">
                    {correspondence.direction === 'downward' ? (
                      <>
                        <ArrowDown className="h-3 w-3 text-info" />
                        <span className="hidden md:inline">Downward</span>
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-3 w-3 text-success" />
                        <span className="hidden md:inline">Upward</span>
                      </>
                    )}
                  </Badge>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{correspondence.subject}</p>
                {/* Office info - hidden on mobile */}
                <div className="mt-1 hidden md:flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Owning: {correspondence.owningOfficeName ?? 'Not set'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Current: {correspondence.currentOfficeName ?? correspondence.owningOfficeName ?? 'Not set'}
                  </span>
                </div>
              </div>
            </div>
            {/* Desktop action buttons */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowDocumentPreview(true)}
                title="Preview Document"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowPrintPreview(true)}
                title="Print Preview"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" title="Download Document">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (correspondence && minutes) {
                        // Get document content
                        const firstAttachment = correspondence.attachments && correspondence.attachments.length > 0 
                          ? correspondence.attachments[0] 
                          : null;
                        const latestVersion = linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1];
                        const documentContentHtml = latestVersion?.contentHtml;
                        
                        downloadAsPDF({ 
                          correspondence, 
                          minutes,
                          documentContentHtml,
                          attachmentUrl: firstAttachment?.fileUrl,
                          attachmentFileName: firstAttachment?.fileName
                        });
                        toast.success('Downloading as PDF...');
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (correspondence && minutes) {
                        // Get document content
                        const firstAttachment = correspondence.attachments && correspondence.attachments.length > 0 
                          ? correspondence.attachments[0] 
                          : null;
                        const latestVersion = linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1];
                        const documentContentHtml = latestVersion?.contentHtml;
                        
                        downloadAsWord({ 
                          correspondence, 
                          minutes,
                          documentContentHtml,
                          attachmentUrl: firstAttachment?.fileUrl,
                          attachmentFileName: firstAttachment?.fileName
                        });
                        toast.success('Downloading as Word document...');
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download as Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ContextualHelp
                title="Need help on this correspondence?"
                description="Print previews generate a clean memo view, downloads attach the latest minutes, and the action panel lets you minute, treat, delegate, or archive."
                steps={[
                  'Use Print Preview before hard copies or PDF export.',
                  'Download to share as PDF or Word outside the ECM.',
                  'Use the right-hand actions to minute, treat, delegate, or complete.',
                ]}
              />
            </div>
            {/* Mobile action menu */}
            <div className="md:hidden flex items-center gap-1 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowDocumentPreview(true)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowPrintPreview(true)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (correspondence && minutes) {
                        const firstAttachment = correspondence.attachments?.[0];
                        const documentContentHtml = linkedDocuments[0]?.versions?.[0]?.contentHtml;
                        downloadAsPDF({
                          correspondence,
                          minutes,
                          documentContentHtml,
                          attachmentUrl: firstAttachment?.fileUrl,
                          attachmentFileName: firstAttachment?.fileName,
                        });
                        toast.success('Downloading as PDF...');
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Help guide - hidden on mobile */}
        <div className="border-b border-border bg-background/70 px-6 py-2 hidden md:block">
          <HelpGuideCard
            title="Correspondence Workspace"
            description="Review the document and routing history. Use the Actions panel to route, respond, or complete this item."
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
              variant={mobileActiveTab === 'document' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setMobileActiveTab('document')}
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              Document
            </Button>
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

        {/* 3-Panel Layout */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 min-w-0 overflow-hidden">
          {/* Left Panel - Document Viewer (28%) */}
          <aside className="w-full md:w-[28%] min-w-0 max-w-full border-b md:border-b-0 md:border-r border-border bg-muted/30 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Original Document
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4 overflow-x-hidden min-w-0">
                <Card className="overflow-hidden min-w-0">
                  <CardContent className="p-3 md:p-4 space-y-2 overflow-hidden min-w-0">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-start gap-2 text-sm min-w-0">
                        <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0 overflow-hidden break-words">
                          <p className="font-medium break-words">{correspondence.senderName}</p>
                          {correspondence.senderOrganization && (
                            <p className="text-xs text-muted-foreground break-words mt-1">{correspondence.senderOrganization}</p>
                          )}
                        </div>
                      </div>
                      {correspondence.senderEmail && (
                        <div className="flex items-center gap-2 text-xs pl-6 min-w-0">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <a 
                            href={`mailto:${correspondence.senderEmail}`}
                            className="text-muted-foreground hover:text-primary hover:underline truncate min-w-0 flex-1"
                            title={correspondence.senderEmail}
                          >
                            {correspondence.senderEmail}
                          </a>
                        </div>
                      )}
                      {correspondence.senderPhone && (
                        <div className="flex items-center gap-2 text-xs pl-6 min-w-0">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <a 
                            href={`tel:${correspondence.senderPhone}`}
                            className="text-muted-foreground hover:text-primary hover:underline truncate min-w-0 flex-1"
                          >
                            {correspondence.senderPhone}
                          </a>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="flex items-start gap-2 text-sm min-w-0">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 overflow-hidden break-words">
                        <div className="text-muted-foreground break-words">
                          Received: {formatDateShort(correspondence.receivedDate)}
                        </div>
                        {correspondence.receivedDate && (
                          <div className="text-xs text-muted-foreground break-words mt-1">
                            ({formatDateTime(correspondence.receivedDate)})
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm min-w-0">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 overflow-hidden break-words">
                        <div className="text-muted-foreground break-words">{division?.name || 'N/A'}</div>
                        {department && (
                          <div className="text-xs text-muted-foreground break-words mt-1">• {department.name}</div>
                        )}
                      </div>
                    </div>
                    {correspondence.referenceNumber && (
                      <div className="flex items-start gap-2 text-xs pt-1 border-t border-border min-w-0">
                        <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="text-muted-foreground font-mono break-words min-w-0 flex-1 overflow-hidden">
                          Ref: {correspondence.referenceNumber}
                        </div>
                      </div>
                    )}
                    {correspondence.distribution && correspondence.distribution.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">Distribution (CC)</span>
                        </div>
                        <div className="space-y-1">
                          {correspondence.distribution.map((recipient, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs min-w-0">
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {recipient.type === 'directorate'
                                  ? 'Dir'
                                  : recipient.type === 'division'
                                  ? 'Div'
                                  : 'Dept'}
                              </Badge>
                              <span className="text-muted-foreground truncate min-w-0 flex-1">{resolveDistributionName(recipient)}</span>
                              {recipient.purpose && (
                                <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">
                                  {recipient.purpose === 'information'
                                    ? 'Info'
                                    : recipient.purpose === 'action'
                                    ? 'Action'
                                    : 'Comment'}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Document Preview Area - Simplified */}
                <div
                  className={`bg-white border border-border rounded-lg overflow-hidden shadow-sm flex flex-col min-w-0 ${
                    isPreviewFullscreen
                      ? 'fixed inset-4 z-50'
                      : 'h-[300px] sm:h-[400px] md:h-[calc(100vh-260px)] min-h-[250px]'
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  aria-label="Document preview area"
                  aria-live="polite"
                  aria-busy={documentPreviewLoading}
                >
                  {/* Header bar with file info and actions */}
                  {(() => {
                    const firstAttachment = correspondence.attachments?.[0];
                    const linkedDoc = linkedDocuments[0];
                    const selectedVersionIndex = linkedDoc ? (selectedLinkedDocVersion[linkedDoc.id] ?? linkedDoc.versions.length - 1) : -1;
                    const selectedVersion = linkedDoc && selectedVersionIndex >= 0 ? linkedDoc.versions[selectedVersionIndex] : null;
                    
                    if (firstAttachment || selectedVersion) {
                      const FileIcon = firstAttachment ? getFileIcon(firstAttachment.fileType, firstAttachment.fileName) : FileText;
                      const fileTypeLabel = firstAttachment ? getFileTypeLabel(firstAttachment.fileType, firstAttachment.fileName) : 'DMS Document';
                      
                      return (
                        <div className="border-b border-border bg-muted/30 px-3 md:px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0 min-w-0">
                          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                            <FileIcon className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0 overflow-hidden break-words">
                              <p className="text-sm font-medium break-words min-w-0" title={firstAttachment?.fileName || selectedVersion?.fileName || 'Document'}>
                                {firstAttachment?.fileName || selectedVersion?.fileName || 'Document'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-1">
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {fileTypeLabel}
                                </Badge>
                                {firstAttachment?.fileSize && (
                                  <span className="flex-shrink-0">{formatFileSize(firstAttachment.fileSize)}</span>
                                )}
                                {selectedVersion && (
                                  <span className="flex-shrink-0">• Version {selectedVersion.versionNumber}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {firstAttachment?.fileUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  if (firstAttachment.fileUrl) {
                                    const url = buildDownloadUrl(firstAttachment.fileUrl);
                                    if (url) {
                                      window.open(url, '_blank');
                                    }
                                  }
                                }}
                                aria-label="Download document"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {!isPreviewFullscreen && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsPreviewFullscreen(true)}
                                aria-label="Expand preview"
                                title="Fullscreen"
                              >
                                <Maximize2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isPreviewFullscreen && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsPreviewFullscreen(false)}
                                aria-label="Close fullscreen"
                                title="Exit fullscreen"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Preview Content */}
                  <div className="flex-1 overflow-hidden min-h-0 min-w-0">
                    {(() => {
                      // Check for uploaded attachments first
                      const firstAttachment = correspondence.attachments && correspondence.attachments.length > 0 
                        ? correspondence.attachments[0] 
                        : null;
                      
                      // Check for linked DMS document content
                      const linkedDoc = linkedDocuments.length > 0 ? linkedDocuments[0] : null;
                      const selectedVersionIndex = linkedDoc ? (selectedLinkedDocVersion[linkedDoc.id] ?? linkedDoc.versions.length - 1) : -1;
                      const selectedVersion = linkedDoc && selectedVersionIndex >= 0 && linkedDoc.versions[selectedVersionIndex] 
                        ? linkedDoc.versions[selectedVersionIndex]
                        : (linkedDoc?.versions && linkedDoc.versions.length > 0 ? linkedDoc.versions[linkedDoc.versions.length - 1] : null);
                      const documentContentHtml = selectedVersion?.contentHtml;

                      // Loading state
                      if (documentPreviewLoading) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-6 text-center" role="status" aria-live="polite">
                            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                            <p className="text-sm font-medium text-muted-foreground">
                              Loading document preview...
                            </p>
                          </div>
                        );
                      }

                      // Error state
                      if (documentPreviewError) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-6 text-center" role="alert">
                            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                            <p className="text-sm font-medium text-destructive mb-2">
                              {documentPreviewError}
                            </p>
                            {firstAttachment?.fileUrl && (
                              <div className="flex gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setDocumentPreviewError(null);
                                    setDocumentPreviewLoading(true);
                                    // Retry loading
                                    setTimeout(() => setDocumentPreviewLoading(false), 1000);
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Retry
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (firstAttachment.fileUrl) {
                                      window.open(firstAttachment.fileUrl, '_blank');
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // If we have an attachment, show it
                      if (firstAttachment?.fileUrl) {
                        if (firstAttachment.fileType === 'application/pdf') {
                          // Use blob URL to avoid CORS/sandbox issues and fit the page to the available space
                          if (pdfBlobUrl) {
                            const pdfSrc = `${pdfBlobUrl}#zoom=page-fit`;
                            return (
                              <iframe
                                src={pdfSrc}
                                className="w-full h-full border-0"
                                title={`PDF Preview: ${firstAttachment.fileName || 'Document'}`}
                                aria-label={`PDF document preview: ${firstAttachment.fileName || 'Document'}`}
                                onError={() => {
                                  setDocumentPreviewError('Unable to display PDF in browser. Please download to view.');
                                  setDocumentPreviewLoading(false);
                                }}
                              />
                            );
                          }
                          // Show error state if there's an error (including completion package message)
                          if (documentPreviewError) {
                            return (
                              <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-muted/30">
                                <p className="text-sm font-medium text-destructive mb-2">
                                  {documentPreviewError}
                                </p>
                                <a
                                  href={buildDownloadUrl(firstAttachment.fileUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                                >
                                  <Download className="h-4 w-4" />
                                  Download File
                                </a>
                              </div>
                            );
                          }
                          // Show loading state
                          if (documentPreviewLoading) {
                            return (
                              <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-muted/30">
                                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                                <p className="text-sm font-medium text-muted-foreground">
                                  Preparing PDF preview...
                                </p>
                              </div>
                            );
                          }
                          // Fallback if blob URL not ready (shouldn't normally reach here)
                          return (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-muted/30">
                              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                              <p className="text-sm font-medium text-muted-foreground">
                                Preparing PDF preview...
                              </p>
                            </div>
                          );
                        } else if (firstAttachment.fileType?.startsWith('image/')) {
                          const imageUrl = buildDownloadUrl(firstAttachment.fileUrl);
                          return (
                            <div className="h-full flex items-center justify-center p-4 bg-muted/30" aria-label={`Image preview: ${firstAttachment.fileName}`}>
                              <img
                                src={imageUrl || firstAttachment.fileUrl}
                                alt={firstAttachment.fileName || 'Document image'}
                                className="max-w-full max-h-full object-contain"
                                onLoad={() => setDocumentPreviewLoading(false)}
                                onError={() => {
                                  setDocumentPreviewError('Failed to load image');
                                  setDocumentPreviewLoading(false);
                                }}
                              />
                            </div>
                          );
                        } else if (firstAttachment.fileName?.toLowerCase().endsWith('.docx') && wordHtml) {
                          // Word document preview
                          return (
                            <div 
                              className="h-full overflow-auto p-6 prose prose-sm max-w-none"
                              aria-label={`Word document preview: ${firstAttachment.fileName}`}
                            >
                              <div dangerouslySetInnerHTML={{ __html: wordHtml }} />
                            </div>
                          );
                        } else if (firstAttachment.fileName?.toLowerCase().endsWith('.docx') && documentPreviewLoading) {
                          // Loading Word document
                          return (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-muted/30">
                              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                              <p className="text-sm font-medium text-muted-foreground">
                                Loading Word document...
                              </p>
                            </div>
                          );
                        } else if (firstAttachment.fileName?.toLowerCase().endsWith('.docx') && documentPreviewError) {
                          // Error loading Word document
                          return (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-muted/30">
                              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                              <p className="text-sm font-medium text-destructive mb-2">
                                {documentPreviewError}
                              </p>
                              <div className="flex gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (firstAttachment.fileUrl) {
                                      const url = buildDownloadUrl(firstAttachment.fileUrl);
                                      if (url) {
                                        window.open(url, '_blank');
                                      }
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          );
                        } else {
                          const FileIcon = getFileIcon(firstAttachment.fileType, firstAttachment.fileName);
                          const fileTypeLabel = getFileTypeLabel(firstAttachment.fileType, firstAttachment.fileName);
                          
                          return (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-muted/30" aria-label={`Document: ${firstAttachment.fileName}`}>
                              <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
                              <p className="text-sm font-medium mb-2">{firstAttachment.fileName || 'Document'}</p>
                              <Badge variant="outline" className="mb-2">
                                {fileTypeLabel}
                              </Badge>
                              <div className="flex gap-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const attachmentIndex = correspondence.attachments?.findIndex(a => a.id === firstAttachment.id) ?? 0;
                                    setSelectedAttachmentIndex(attachmentIndex);
                                    setShowDocumentPreview(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (firstAttachment.fileUrl) {
                                      const url = buildDownloadUrl(firstAttachment.fileUrl);
                                      if (url) {
                                        window.open(url, '_blank');
                                      }
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          );
                        }
                      }
                      
                      // If we have DMS document content (from editor), show it
                      if (documentContentHtml) {
                        return (
                          <div 
                            className="h-full overflow-auto p-6 text-xs leading-relaxed"
                            aria-label="Document content preview"
                          >
                            <div dangerouslySetInnerHTML={{ __html: documentContentHtml }} />
                          </div>
                        );
                      }
                      
                      // No document available - improved empty state
                      return (
                        <div 
                          className="h-full flex flex-col items-center justify-center p-8 text-center"
                          aria-label="No document available"
                        >
                          <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            No document available
                          </p>
                          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                            Upload an attachment or link a DMS document
                          </p>
                          {!isCompleted && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.multiple = true;
                                  input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif';
                                  input.onchange = (e) => {
                                    const files = Array.from((e.target as HTMLInputElement).files || []);
                                    if (files.length > 0) {
                                      void handleAttachmentUpload(files);
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                <Upload className="h-3.5 w-3.5 mr-2" />
                                Upload
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowLinkDocumentDialog(true)}
                              >
                                <LinkIcon className="h-3.5 w-3.5 mr-2" />
                                Link
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* All Documents - Consolidated View */}
                <div className="space-y-3">
                  {/* Attachments - Only show if multiple or for upload */}
                  {correspondence.attachments && correspondence.attachments.length > 1 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">
                          All Attachments ({correspondence.attachments.length})
                        </h4>
                        {!isCompleted && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.multiple = true;
                              input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif';
                              input.onchange = (e) => {
                                const files = Array.from((e.target as HTMLInputElement).files || []);
                                if (files.length > 0) {
                                  void handleAttachmentUpload(files);
                                }
                              };
                              input.click();
                            }}
                            aria-label="Upload additional document"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        )}
                      </div>
                      
                      {correspondence.attachments.length > 3 && (
                        <div className="mb-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Search attachments..."
                              value={attachmentSearchQuery}
                              onChange={(e) => setAttachmentSearchQuery(e.target.value)}
                              className="pl-8 h-8 text-xs"
                              aria-label="Search attachments"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-1.5">
                        {correspondence.attachments
                          .filter((attachment) => {
                            if (!attachmentSearchQuery) return true;
                            const query = attachmentSearchQuery.toLowerCase();
                            return (
                              attachment.fileName?.toLowerCase().includes(query) ||
                              attachment.fileType?.toLowerCase().includes(query)
                            );
                          })
                          .map((attachment, idx) => {
                            const isActive = idx === 0; // First attachment is shown in preview
                            const sizeLabel = formatFileSize(attachment.fileSize);
                            const FileIcon = getFileIcon(attachment.fileType, attachment.fileName);
                            
                            return (
                              <div
                                key={attachment.id}
                                className={`flex items-center gap-2 p-2 bg-background border rounded text-xs transition-colors ${
                                  isActive 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border hover:bg-muted/50'
                                } ${attachment.fileUrl ? 'cursor-pointer' : ''}`}
                                onClick={() => {
                                  if (attachment.fileUrl) {
                                    const attachmentIndex = correspondence.attachments?.findIndex(a => a.id === attachment.id) ?? 0;
                                    setSelectedAttachmentIndex(attachmentIndex);
                                    setShowDocumentPreview(true);
                                  }
                                }}
                                role={attachment.fileUrl ? 'button' : undefined}
                                tabIndex={attachment.fileUrl ? 0 : undefined}
                                onKeyDown={(e) => {
                                  if (attachment.fileUrl && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    const attachmentIndex = correspondence.attachments?.findIndex(a => a.id === attachment.id) ?? 0;
                                    setSelectedAttachmentIndex(attachmentIndex);
                                    setShowDocumentPreview(true);
                                  }
                                }}
                                aria-label={`Attachment: ${attachment.fileName}${isActive ? ' (currently viewing)' : ''}`}
                              >
                                <FileIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`} title={attachment.fileName}>
                                    {attachment.fileName}
                                  </p>
                                  {sizeLabel && (
                                    <p className="text-xs text-muted-foreground">{sizeLabel}</p>
                                  )}
                                </div>
                                {attachment.fileUrl && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (attachment.fileUrl) {
                                        const url = buildDownloadUrl(attachment.fileUrl);
                                        if (url) {
                                          window.open(url, '_blank');
                                        }
                                      }
                                    }}
                                    aria-label={`Download ${attachment.fileName}`}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Linked Documents - Collapsible/Compact */}
                  {linkedDocuments.length > 0 && (
                    <div className="space-y-2" id="linked-documents">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold">Linked References</h4>
                          <Badge variant="secondary" className="text-xs">
                            {linkedDocuments.length}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 gap-1" 
                          onClick={() => setShowLinkDocumentDialog(true)}
                          aria-label="Manage linked documents"
                        >
                          <LinkIcon className="h-3 w-3" />
                          Manage
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {linkedDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2 p-2 bg-background border border-border rounded text-xs hover:bg-muted/50">
                            <LinkIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate" title={doc.title}>
                                {doc.title}
                              </p>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {doc.documentType}
                                </Badge>
                                <span className="text-xs">{doc.status}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => router.push(`/dms/${doc.id}`)}
                                title="Open in DMS"
                                aria-label={`Open ${doc.title} in DMS`}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </aside>

          {/* Center Panel - Minute Thread (44%) */}
          <main className="w-full md:w-[44%] min-w-0 max-w-full flex flex-col overflow-hidden border-l md:border-x border-border">
            <div className="p-4 border-b border-border bg-background flex-shrink-0">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-secondary" />
                Minute Thread
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4 overflow-x-hidden min-w-0">
                {/* Parallel Routing Status - Hidden for cleaner UI
                    Individual minute cards show recipients; Workflow Progress shows current status */}

                {minutes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No minutes yet</p>
                    <p className="text-sm">Use the Actions panel to minute and route this correspondence</p>
                  </div>
                ) : (
                  minutes.map((minuteItem, idx) => {
                    const user = lookupUser(minuteItem.userId);
                    const ActionIcon = getActionIcon(minuteItem.actionType);
                    const isDownward = minuteItem.direction === 'downward';
                    const displayName = user?.name ?? minuteItem.userName ?? 'Unknown user';
                    // Ensure we never display UUIDs as role names
                    let systemRole = user?.systemRole ?? minuteItem.userSystemRole ?? 'Team Member';
                    // Filter out UUIDs (strings with dashes and length > 30)
                    if (systemRole && systemRole.includes('-') && systemRole.length > 30) {
                      systemRole = user?.systemRole ?? 'Team Member';
                    }

                    return (
                      <div key={minuteItem.id} className="relative">
                        {idx < minutes.length - 1 && (
                          <div
                            className={`absolute left-8 top-16 w-0.5 h-8 ${
                              minuteItem.isRecalled 
                                ? 'bg-destructive/30' 
                                : isDownward 
                                ? 'bg-info' 
                                : 'bg-success'
                            }`}
                          />
                        )}
                        <Card
                          className={`overflow-hidden ${minuteItem.userId === activeUser.id ? 'border-primary shadow-glow' : ''} ${minuteItem.isRecalled ? 'opacity-75 border-destructive/30' : ''} cursor-pointer hover:shadow-md transition-all`}
                          onClick={() => {
                            setSelectedMinute(minuteItem);
                            setShowMinuteDetail(true);
                          }}
                        >
                          <CardContent className="p-3 md:p-4 overflow-hidden min-w-0">
                            <div className="flex gap-2 min-w-0">
                              <Avatar className={`h-9 w-9 flex-shrink-0 ${minuteItem.isRecalled ? 'ring-2 ring-destructive/50' : isDownward ? 'ring-2 ring-info' : 'ring-2 ring-success'}`}>
                                <AvatarFallback className={`text-xs font-semibold ${minuteItem.isRecalled ? 'bg-destructive/10 text-destructive' : ''}`}>
                                  {minuteItem.isRecalled ? (
                                    <X className="h-5 w-5" />
                                  ) : (
                                    displayName
                                      .split(' ')
                                      .map((namePart) => namePart[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase()
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2 min-w-0">
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                      <p className={`font-semibold text-sm truncate min-w-0 ${minuteItem.isRecalled ? 'line-through text-muted-foreground' : ''}`}>
                                        {displayName}
                                      </p>
                                      {minuteItem.isRecalled && (
                                        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20 flex-shrink-0">
                                          Recalled
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground break-words min-w-0 mt-1">
                                      {systemRole}
                                      {minuteItem.toOfficeName && (
                                        <span className="break-words"> → {minuteItem.toOfficeName}</span>
                                      )}
                                      {/* Only show "via [assistant]" to the principal */}
                                      {minuteItem.actedByAssistant && minuteItem.performedByName && 
                                       String(minuteItem.userId) === String(activeUser.id) && (
                                        <span className="break-words text-primary/70">
                                          {' '}(via {minuteItem.performedByName})
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                                    {/* Action type badge */}
                                    <Badge variant="outline" className={`text-[10px] h-5 gap-0.5 ${minuteItem.isRecalled ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}`}>
                                      {ActionIcon && <ActionIcon className="h-3 w-3" />}
                                    </Badge>
                                    {/* Direction indicator */}
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] h-5 gap-0.5 ${
                                        minuteItem.isRecalled 
                                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                                          : isDownward 
                                          ? 'bg-info/10 text-info border-info/20' 
                                          : 'bg-success/10 text-success border-success/20'
                                      }`}
                                    >
                                      {isDownward ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                                    </Badge>
                                    {/* Parallel indicator (only if parallel) */}
                                    {minuteItem.isParallelBranch && (
                                      <Badge variant="outline" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20">
                                        <Users className="h-3 w-3" />
                                      </Badge>
                                    )}
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  </div>
                                </div>
                                <p className={`text-sm mb-2 line-clamp-3 break-words ${minuteItem.isRecalled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                  {minuteItem.minuteText}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                  <span className="truncate">{formatDateTime(minuteItem.timestamp)}</span>
                                  <span className="text-muted-foreground/50 flex-shrink-0">•</span>
                                  <span className="flex-shrink-0">Step {minuteItem.stepNumber}</span>
                                  {minuteItem.isRecalled && minuteItem.recalledAt && (
                                    <>
                                      <span className="text-muted-foreground/50">•</span>
                                      <span className="text-destructive">Recalled</span>
                                    </>
                                  )}
                                  {(minuteItem.actedBySecretary || minuteItem.actedByAssistant) && (
                                    <>
                                      <span className="text-muted-foreground/50">•</span>
                                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                                        {minuteItem.actedBySecretary ? 'Secretary' : minuteItem.assistantType}
                                      </Badge>
                                    </>
                                  )}
                                </div>
                                {minuteItem.signature && (
                                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <ImageIcon className="h-3 w-3 text-primary" />
                                    <span>Signed {formatDateTime(minuteItem.signature.appliedAt)}</span>
                                  </div>
                                )}
                                {minuteItem.sealData ? (
                                  <div className="mt-2 flex items-center gap-2">
                                    <SealBadge sealData={minuteItem.sealData} showDetails />
                                    <span className="text-xs text-muted-foreground">
                                      {minuteItem.sealData.serialNumber}
                                    </span>
                                  </div>
                                ) : minuteItem.sealApplied ? (
                                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <Shield className="h-3 w-3 text-emerald-600" />
                                    <span>Seal applied (loading details...)</span>
                                  </div>
                                ) : null}
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                  {minuteItem.canBeEdited && minuteItem.userId === activeUser?.id && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedMinute(minuteItem);
                                          setShowEditMinuteModal(true);
                                        }}
                                      >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Edit
                                      </Button>
                                      {minuteItem.editWindowExpiresAt && (
                                        <span className="text-xs text-muted-foreground">
                                          {(() => {
                                            const expiresAt = new Date(minuteItem.editWindowExpiresAt);
                                            const now = new Date();
                                            const diffMs = expiresAt.getTime() - now.getTime();
                                            if (diffMs <= 0) return 'Edit window expired';
                                            const diffMins = Math.floor(diffMs / 60000);
                                            return `${diffMins} min left`;
                                          })()}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {minuteItem.canBeRecalled && minuteItem.userId === activeUser?.id && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedMinute(minuteItem);
                                        setShowRecallMinuteModal(true);
                                      }}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Recall
                                    </Button>
                                  )}
                                  {minuteItem.isRecalled && (
                                    <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                                      Recalled
                                    </Badge>
                                  )}
                                  {/* Add Note: Only show to minute author or current approver */}
                                  {!minuteItem.isAdditional && !isCompleted && !minuteItem.isRecalled && 
                                   (String(minuteItem.userId) === String(activeUser?.id) || isCurrentUserTurn) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedMinute(minuteItem);
                                        setShowAdditionalMinuteModal(true);
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Note
                                    </Button>
                                  )}
                                </div>
                                {minuteItem.isAdditional && minuteItem.minuteType && (
                                  <div className="mt-2">
                                    <Badge variant="outline" className="text-xs bg-info/10 text-info border-info/20">
                                      {minuteItem.minuteType === 'instruction' ? 'Additional Instruction' :
                                       minuteItem.minuteType === 'clarification' ? 'Clarification' : 'Addendum'}
                                    </Badge>
                                    {minuteItem.relatesToMinuteId && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        Related to minute #{minutes.findIndex(m => m.id === minuteItem.relatesToMinuteId) + 1}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </main>

          {/* Right Panel - Actions (28%) */}
          <aside className="w-full md:w-[28%] min-w-0 max-w-full border-t md:border-t-0 bg-background flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Send className="h-4 w-4 text-accent" />
                Actions
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4 overflow-x-hidden min-w-0">
              {/* Current Status Card */}
              {(() => {
                const daysPending = correspondence.receivedDate 
                  ? Math.floor((Date.now() - new Date(correspondence.receivedDate).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                const lastMinute = minutes[minutes.length - 1];
                let currentApproverId = correspondence.currentApproverId;
                const routingActions = ['minute', 'forward', 'approve', 'treat'];
                
                if (lastMinute?.isRecalled && 
                    routingActions.includes(lastMinute.actionType) && 
                    lastMinute.userId) {
                  currentApproverId = lastMinute.userId;
                }
                
                const currentApprover = currentApproverId ? lookupUser(currentApproverId) : null;
                const slaWarning = daysPending >= 5;
                const slaBreach = daysPending >= 7;
                
                return (
                  <Card className={`overflow-hidden ${slaBreach ? 'border-destructive/50 bg-destructive/5' : slaWarning ? 'border-warning/50 bg-warning/5' : ''}`}>
                    <CardContent className="p-3 overflow-hidden min-w-0">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCompleted ? 'bg-success/20' : isCurrentUserTurn ? 'bg-primary animate-pulse' : 'bg-muted'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : isCurrentUserTurn ? (
                            <div className="h-3 w-3 rounded-full bg-primary-foreground" />
                          ) : (
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {isCompleted ? 'Completed' : currentApprover?.name ?? 'Pending Assignment'}
                            </p>
                            {isCurrentUserTurn && !isCompleted && (
                              <Badge variant="default" className="text-[10px] h-5">Your Turn</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isCompleted 
                              ? `Closed ${completionGeneratedAt ? formatDateShort(completionGeneratedAt) : ''}`
                              : currentApprover?.systemRole ?? 'Awaiting action'
                            }
                          </p>
                          {!isCompleted && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge 
                                variant={slaBreach ? 'destructive' : slaWarning ? 'outline' : 'secondary'} 
                                className={`text-[10px] h-5 ${slaWarning && !slaBreach ? 'border-warning text-warning' : ''}`}
                              >
                                {daysPending} {daysPending === 1 ? 'day' : 'days'} pending
                              </Badge>
                              {slaBreach && (
                                <Badge variant="destructive" className="text-[10px] h-5">
                                  SLA Breach
                                </Badge>
                              )}
                              {slaWarning && !slaBreach && (
                                <Badge variant="outline" className="text-[10px] h-5 border-warning text-warning">
                                  SLA Warning
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Workflow Progress Indicator */}
              {!isCompleted && minutes.length > 0 && (
                <WorkflowProgressIndicator
                  correspondence={correspondence}
                  minutes={minutes}
                  currentApprover={lookupUser(correspondence.currentApproverId)}
                  users={organizationUsers}
                  offices={offices}
                  officeMemberships={officeMemberships}
                />
              )}

              {isCompleted ? (
                <div className="space-y-3">
                  <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-sm font-medium text-success">
                      Correspondence Completed
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Closed{completionGeneratedAt ? ` on ${formatDateShort(completionGeneratedAt)}` : ''}. This item is now archived and read-only for audit purposes.
                    </p>
                  </div>
                  {completionPackageUrl && (
                    <Button 
                      variant="secondary" 
                      className="w-full"
                      onClick={() => {
                        const filename = `completion-package-${correspondence.referenceNumber || correspondence.id}.pdf`;
                        handleDownload(completionPackageUrl, filename);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download completion package
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {isCurrentUserTurn && (
                    <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                      <p className="text-sm font-medium text-accent flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Your Turn to Act
                      </p>
                    </div>
                  )}

                  {activeUser.gradeLevel === 'MDCS' ? (
                    <>
                      {isForInformationOnly ? (
                        <div className="w-full p-3 bg-muted/50 border border-border rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Info className="h-4 w-4" />
                            <span>For Information Only – No action required</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button
                            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                            onClick={() => setShowMinuteModal(true)}
                            disabled={turnRestrictedDisabled}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Minute & Approve
                          </Button>
                          <Button
                            className="w-full"
                            variant="secondary"
                            onClick={() => setShowTreatmentModal(true)}
                            disabled={turnRestrictedDisabled}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Treat & Respond
                          </Button>
                        </>
                      )}
                    </>
                  ) : correspondence.direction === 'downward' ? (
                    <>
                      {isForInformationOnly ? (
                        <div className="w-full p-3 bg-muted/50 border border-border rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Info className="h-4 w-4" />
                            <span>For Information Only – No action required</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button
                            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                            onClick={() => setShowMinuteModal(true)}
                            disabled={turnRestrictedDisabled}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Minute & Route
                          </Button>
                          <Button
                            className="w-full"
                            variant="secondary"
                            onClick={() => setShowTreatmentModal(true)}
                            disabled={turnRestrictedDisabled}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Treat & Respond
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {isForInformationOnly ? (
                        <div className="w-full p-3 bg-muted/50 border border-border rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Info className="h-4 w-4" />
                            <span>For Information Only – No action required</span>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full bg-gradient-success hover:opacity-90 transition-opacity"
                          onClick={() => setShowMinuteModal(true)}
                          disabled={turnRestrictedDisabled}
                        >
                          <ArrowUp className="h-4 w-4 mr-2" />
                          Endorse & Forward
                        </Button>
                      )}
                    </>
                  )}

                  {!isForInformationOnly && (
                    <Button
                      className="w-full mt-3"
                      variant="outline"
                      onClick={() => setShowCompletionModal(true)}
                      disabled={turnRestrictedDisabled}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Mark Complete & Archive
                    </Button>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    {isExecutive && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setShowParallelRouteModal(true)}
                        disabled={turnRestrictedDisabled}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Send to Multiple Recipients
                      </Button>
                    )}
                    {activeDelegation ? (
                      <div className="space-y-2">
                        {/* Active Delegation Info */}
                        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                            <UserIcon className="h-4 w-4" />
                            <span className="text-xs font-medium">
                              {String(activeUser.id) === String(activeDelegation.principalId) 
                                ? 'Active Delegation' 
                                : 'Acting on Behalf'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {String(activeUser.id) === String(activeDelegation.principalId) ? (
                              <>
                                Delegated to {organizationUsers.find(u => String(u.id) === String(activeDelegation.assistantId))?.name || 'Assistant'}
                                {activeDelegation.delegatedAt && (
                                  <> on {new Date(activeDelegation.delegatedAt).toLocaleDateString()}</>
                                )}
                              </>
                            ) : (
                              <>
                                Acting on behalf of {organizationUsers.find(u => String(u.id) === String(activeDelegation.principalId))?.name || 'Principal'}
                              </>
                            )}
                          </p>
                        </div>
                        {/* Recall Button - Only show to principal */}
                        {String(activeUser.id) === String(activeDelegation.principalId) && (
                          <Button
                            variant="outline"
                            className="w-full justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                            onClick={async () => {
                              if (activeDelegation.id) {
                                try {
                                  // Call backend API to revoke delegation
                                  await apiFetch(`/correspondence/correspondence-delegations/${activeDelegation.id}/revoke/`, {
                                    method: 'POST',
                                  });
                                  
                                  // Also update localStorage
                                  revokeDelegation(activeDelegation.id);
                                  
                                  toast.success('Delegation recalled', {
                                    description: 'The assistant has been notified. You can now take action on this correspondence directly.'
                                  });
                                  
                                  // Refresh data
                                  await syncFromApi();
                                } catch (error) {
                                  console.error('Failed to recall delegation:', error);
                                  // Still try to revoke locally
                                  revokeDelegation(activeDelegation.id);
                                  toast.success('Delegation recalled locally', {
                                    description: 'You can now take action on this correspondence directly.'
                                  });
                                  window.location.reload();
                                }
                              }
                            }}
                          >
                            <RotateCcwIcon className="h-4 w-4 mr-2" />
                            Recall Delegation
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setShowDelegateModal(true)}
                        disabled={turnRestrictedDisabled}
                      >
                        <UserIcon className="h-4 w-4 mr-2" />
                        Delegate to TA/PA
                      </Button>
                    )}
                  </div>

                  <Separator />
                </>
              )}

              </div>
            </ScrollArea>
          </aside>
        </div>
      </div>

      <MinuteModal
        correspondence={correspondence}
        isOpen={showMinuteModal}
        onClose={handleMinuteClose}
        direction={correspondence.direction}
      />

      <ParallelRouteModal
        correspondence={correspondence}
        isOpen={showParallelRouteModal}
        onClose={() => {
          setShowParallelRouteModal(false);
        }}
        onSuccess={() => {
          refreshData();
          void syncFromApi();
        }}
      />

      <TreatmentModal
        correspondence={correspondence}
        isOpen={showTreatmentModal}
        onClose={handleTreatmentClose}
      />

      {selectedMinute && (
        <>
          <MinuteDetailModal
            minute={selectedMinute}
            open={showMinuteDetail}
            onOpenChange={setShowMinuteDetail}
            authorName={lookupUser(selectedMinute.userId)?.name ?? selectedMinute.userName}
            showDelegationInfo={String(selectedMinute.userId) === String(activeUser.id)}
          />
          <EditMinuteModal
            minute={selectedMinute}
            isOpen={showEditMinuteModal}
            onClose={() => {
              setShowEditMinuteModal(false);
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
            isOpen={showRecallMinuteModal}
            onClose={() => {
              setShowRecallMinuteModal(false);
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
                  const updated = await apiFetch(`/correspondence/${correspondence.id}/`);
                  if (updated) {
                    setRemoteCorrespondence(mapApiCorrespondence(updated));
                  }
                } catch (error) {
                  console.warn('Failed to refresh correspondence after recall:', error);
                }
              }
            }}
          />
          <AdditionalMinuteModal
            correspondence={correspondence}
            isOpen={showAdditionalMinuteModal}
            onClose={() => {
              setShowAdditionalMinuteModal(false);
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
        open={showCompletionModal}
        onOpenChange={(open) => {
          setShowCompletionModal(open);
          if (!open) {
            handleCompletionClose();
          }
        }}
        correspondence={correspondence}
        minutes={minutes}
      />

      <DocumentPreviewModal
        correspondence={correspondence}
        minutes={minutes}
        isOpen={showDocumentPreview}
        onClose={() => {
          setShowDocumentPreview(false);
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
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        documentContentHtml={linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1]?.contentHtml}
        attachmentUrl={buildDownloadUrl(correspondence.attachments?.[0]?.fileUrl)}
        attachmentFileName={correspondence.attachments?.[0]?.fileName}
      />

      <DelegateModal
        open={showDelegateModal}
        onOpenChange={setShowDelegateModal}
        correspondenceId={correspondence.id}
        executiveId={activeUser.id}
        onDelegate={handleDelegate}
      />

      <LinkDocumentDialog
        open={showLinkDocumentDialog}
        onOpenChange={setShowLinkDocumentDialog}
        linkedDocumentIds={correspondence.linkedDocumentIds}
        onSave={handleLinkDocumentsSave}
        divisionId={correspondence.divisionId}
        departmentId={correspondence.departmentId}
        subject={correspondence.subject}
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
                    setShowMinuteModal(true);
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
                    setShowTreatmentModal(true);
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
                      setShowCompletionModal(true);
                    }}>
                      <Archive className="h-4 w-4 mr-2" />
                      Complete & Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setMobileActiveTab('actions');
                      setShowDelegateModal(true);
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

// Wrap in Suspense for useSearchParams
const CorrespondenceDetail = () => (
  <Suspense fallback={
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    </DashboardLayout>
  }>
    <CorrespondenceDetailContent />
  </Suspense>
);

export default CorrespondenceDetail;