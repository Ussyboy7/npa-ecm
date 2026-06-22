"use client";

import { logError, logInfo } from '@/lib/client-logger';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useMemo, useState, useReducer, useRef, startTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  fetchDocumentById,
  fetchWorkspaces,
  getDocumentComments,
  updateDocumentWorkspaces,
  getDocumentAccessLogs,
  logDocumentAccess,
  runOCROnVersion,
  type DocumentRecord,
  type DocumentVersion,
  type DocumentWorkspace,
  type DocumentComment,
  type DocumentAccessLog,
} from '@/lib/dms-storage';
import { CorrespondenceProvider } from '@/contexts/CorrespondenceContext';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { formatFileSize } from '@/lib/file-utils';
import { ArrowLeft, FileText, Download, Layers, User as UserIcon, Pencil, FilePlus, Clock, Eye, Activity, Shield, Loader2, AlertCircle, PenTool, Scan, Download as DownloadIcon, Link2, Info } from 'lucide-react';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ShareDocumentDialog } from '@/components/dms/ShareDocumentDialog';
import { DocumentVersionPreviewModal } from '@/components/dms/DocumentVersionPreviewModal';
import { ReplaceVersionDialog } from '@/components/dms/ReplaceVersionDialog';
import { DocumentCommentsDialog } from '@/components/dms/DocumentCommentsDialog';
import { FormDocumentEditor } from '@/components/dms/FormDocumentEditor';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiFetch } from '@/lib/api-client';
import { Correspondence, Minute } from '@/lib/npa-structure';
import { LinkCaseDialog } from '@/components/correspondence/LinkCaseDialog';
import { MinuteModal } from '@/components/correspondence/MinuteModal';
import { unlinkDocumentFromCase } from '@/lib/api/cases';
import { processOCR, getCaptureJob, cancelCaptureJob, type CaptureJob } from '@/lib/capture-storage';
import { DocumentHeader } from '@/components/dms/DocumentHeader';
import { CollaborationPanel } from '@/components/dms/CollaborationPanel';
import { AccessActivityCard } from '@/components/dms/AccessActivityCard';
import { RelatedCorrespondenceCard } from '@/components/dms/RelatedCorrespondenceCard';
import { DocumentCommentsCard } from '@/components/dms/DocumentCommentsCard';
import { DocumentThreadCard } from '@/components/dms/DocumentThreadCard';

const _statusLabel = (status: DocumentRecord['status']) => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'published':
      return 'Published';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
};

const _statusVariant = (status: DocumentRecord['status']): 'outline' | 'default' | 'secondary' => {
  switch (status) {
    case 'draft':
      return 'outline';
    case 'published':
      return 'default';
    case 'archived':
      return 'secondary';
    default:
      return 'outline';
  }
};

const DocumentDetailContent = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  // Dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogInitialView, setShareDialogInitialView] = useState<'share' | 'permissions'>('share');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createVersionDialogOpen, setCreateVersionDialogOpen] = useState(false);
  const [linkCaseDialogOpen, setLinkCaseDialogOpen] = useState(false);
  const [minuteDocumentModalOpen, setMinuteDocumentModalOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [workspaceManageOpen, setWorkspaceManageOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [replaceVersionId, setReplaceVersionId] = useState<string | null>(null);
  const [minuteDocumentCorrespondence, setMinuteDocumentCorrespondence] = useState<Correspondence | null>(null);
  const [selectedAccessLog, setSelectedAccessLog] = useState<DocumentAccessLog | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'related'>('overview');

  // Helper function to normalize IDs
  const normalizeId = (value: unknown): string | undefined => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
      return normalizeId((value as Record<string, unknown>).id);
    }
    return String(value);
  };

  // Document state
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [formDocumentId, setFormDocumentId] = useState<string | null>(null);
  
  // Collaboration state - using useReducer
  type CollaborationState = {
    workspaces: DocumentWorkspace[];
    comments: DocumentComment[];
    accessLogs: DocumentAccessLog[];
    relatedCorrespondence: Array<{ correspondence: Correspondence; minutes: Minute[]; linkNotes?: string }>;
  };
  
  type CollaborationAction =
    | { type: 'SET_WORKSPACES'; payload: DocumentWorkspace[] }
    | { type: 'SET_COMMENTS'; payload: DocumentComment[] }
    | { type: 'SET_ACCESS_LOGS'; payload: DocumentAccessLog[] }
    | { type: 'SET_RELATED_CORRESPONDENCE'; payload: Array<{ correspondence: Correspondence; minutes: Minute[]; linkNotes?: string }> };
  
  const collaborationReducer = (state: CollaborationState, action: CollaborationAction): CollaborationState => {
    switch (action.type) {
      case 'SET_WORKSPACES':
        // Only update if payload reference changed (shallow comparison)
        if (state.workspaces === action.payload) {
          return state;
        }
        return { ...state, workspaces: action.payload };
      case 'SET_COMMENTS':
        // Only update if payload reference changed (shallow comparison)
        if (state.comments === action.payload) {
          return state;
        }
        return { ...state, comments: action.payload };
      case 'SET_ACCESS_LOGS':
        // Only update if payload reference changed (shallow comparison)
        if (state.accessLogs === action.payload) {
          return state;
        }
        return { ...state, accessLogs: action.payload };
      case 'SET_RELATED_CORRESPONDENCE':
        // Only update if payload reference changed (shallow comparison)
        if (state.relatedCorrespondence === action.payload) {
          return state;
        }
        return { ...state, relatedCorrespondence: action.payload };
      default:
        return state;
    }
  };
  
  const [collaborationState, dispatchCollaboration] = useReducer(collaborationReducer, {
    workspaces: [],
    comments: [],
    accessLogs: [],
    relatedCorrespondence: [],
  });
  
  // OCR state - using useReducer
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
            ...state[action.versionId] || { isProcessing: false, currentJob: null, error: null },
            currentJob: action.job,
          },
        };
      case 'SET_ERROR':
        return {
          ...state,
          [action.versionId]: {
            ...state[action.versionId] || { isProcessing: false, currentJob: null, error: null },
            error: action.error,
            isProcessing: false,
          },
        };
      case 'RESET':
        const { [action.versionId]: _, ...rest } = state;
        return rest;
      case 'RESET_ALL':
        return {};
      default:
        return state;
    }
  };
  
  const [ocrState, dispatchOCR] = useReducer(ocrReducer, {});

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
    [currentUser, organizationUsers],
  );

  // Load workspaces lookup
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const ws = await fetchWorkspaces();
        dispatchCollaboration({ type: 'SET_WORKSPACES', payload: ws });
      } catch (error: unknown) {
        logError('Failed to load workspaces', error);
      }
    };
    void loadWorkspaces();
  }, []);


  // Ref to track if we're currently loading to prevent infinite loops
  const isLoadingRef = useRef(false);

  // Load document function - extracted for reuse
  const loadDocument = useCallback(async (): Promise<DocumentRecord | null> => {
    if (!params?.id || params.id === 'undefined' || params.id === 'null' || params.id.trim() === '') {
      setDocumentError('Invalid document ID');
      setLoading(false);
      return null;
    }
    
    setLoading(true);
    setDocumentError(null);
    
    try {
      const doc = await fetchDocumentById(params.id);
      // Log versions with OCR text for debugging
      if (doc.versions && doc.versions.length > 0) {
        doc.versions.forEach((v, i) => {
          if (v.ocrText) {
            logInfo(`Version ${i + 1} (${v.fileName}) has OCR text: ${v.ocrText.length} characters`);
          }
        });
      }
      setDocument(doc);
      setDocumentError(null);
      
      // If this is a form document, fetch the form document ID
      if (doc.documentType === 'form') {
        try {
          logInfo('[DocumentDetail] Fetching form document for document', { documentId: params.id });
          // Check if form_document is already in the document data
          if (doc.form_document?.id) {
            logInfo('[DocumentDetail] Form document ID from document data', { formDocumentId: doc.form_document.id });
            setFormDocumentId(doc.form_document.id);
          } else {
            // Fallback: query form documents
            const formDocs = await Promise.race([
              apiFetch<Array<{ id: string; document: { id: string } }>>(
                `/dms/form-documents/?document=${params.id}`
              ),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Form document query timeout')), 10000)
              )
            ]) as Array<{ id: string; document: { id: string } }>;
            
            logInfo('[DocumentDetail] Form documents query result', formDocs);
            if (formDocs && formDocs.length > 0) {
              setFormDocumentId(formDocs[0].id);
            }
          }
        } catch (error: unknown) {
          logError('Failed to load form document', error);
        }
      }
      return doc;
    } catch (error: unknown) {
      // Check if it's a 404 (expected for missing documents) - don't log as error
      const errorObj = error && typeof error === 'object' ? error as Record<string, unknown> : null;
      const isNotFound = (errorObj && errorObj.status === 404) || (errorObj && errorObj.isNotFound === true) || (errorObj && typeof errorObj.message === 'string' && (errorObj.message.includes('No Document matches') || errorObj.message.includes('not found')));
      
      if (!isNotFound) {
        // Only log unexpected errors
        logError('Failed to load document', error);
        let errorMessage = 'Failed to load document';
        if (errorObj) {
          if (errorObj.response && typeof errorObj.response === 'object') {
            const response = errorObj.response as Record<string, unknown>;
            if (response.data && typeof response.data === 'object') {
              const data = response.data as Record<string, unknown>;
              errorMessage = (data.detail as string) || errorMessage;
            }
          }
          if (errorMessage === 'Failed to load document') {
            errorMessage = (errorObj.message as string) || errorMessage;
          }
        }
        setDocumentError(errorMessage);
        setDocument(null);
        return null;
      }
      
      // For expected 404s, provide a helpful error message
      // The document might be: deleted, permission-restricted, or truly doesn't exist
      let errorMessage = 'The document you are looking for does not exist, has been deleted, or you do not have permission to view it.';
      if (errorObj) {
        if (errorObj.response && typeof errorObj.response === 'object') {
          const response = errorObj.response as Record<string, unknown>;
          if (response.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;
            errorMessage = (data.detail as string) || errorMessage;
          }
        }
        if (errorMessage === 'The document you are looking for does not exist, has been deleted, or you do not have permission to view it.') {
          errorMessage = (errorObj.message as string) || errorMessage;
        }
      }
      
        // For expected 404s, just log as info (suppressed in production)
        logInfo('Document not found:', params.id);
      
      setDocumentError(errorMessage);
      setDocument(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  // Load document and collaboration data
  useEffect(() => {
    if (!params?.id) return;
    if (!hydrated || !currentUser?.id) return; // Wait for user to be fully hydrated

    // Prevent multiple concurrent loads
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    let ignore = false;

    const load = async () => {
      try {
        // Load document first
        const doc = await loadDocument();
        if (ignore) return;
        
        if (!doc) {
          // Document not found or failed to load - skip loading related data
          return;
        }

        // Load collaboration data
          // Load comments
          const cmts = await getDocumentComments(params.id);
          if (!ignore) dispatchCollaboration({ type: 'SET_COMMENTS', payload: cmts });

          // Log document view
          if (doc) {
            try {
              await logDocumentAccess({
                documentId: params.id,
                userId: currentUser.id,
                action: 'view',
                sensitivity: doc.sensitivity,
              });
            } catch (error: unknown) {
              logError('Failed to log document access', error);
            }
          }

          // Load access logs
          const logs = await getDocumentAccessLogs(params.id);
          if (!ignore) dispatchCollaboration({ type: 'SET_ACCESS_LOGS', payload: logs });

          // Load related correspondence
          try {
            const linksResponse = await apiFetch<Record<string, unknown>>(
              `/correspondence/document-links/?document=${params.id}`
            );
            // Handle both array and paginated response
            const links = Array.isArray(linksResponse)
              ? linksResponse
              : ((linksResponse && typeof linksResponse === 'object' && 'results' in linksResponse && Array.isArray(linksResponse.results)) ? linksResponse.results : ((linksResponse && typeof linksResponse === 'object' && 'data' in linksResponse && Array.isArray(linksResponse.data)) ? linksResponse.data : []));
            
            logInfo(`[DMS Detail] Loaded ${links.length} document link(s) for document ${params.id}`);
            
            if (links.length > 0) {
              // Limit concurrent API calls to prevent overwhelming the backend
              // Process in batches of 5 to balance performance and server load
              const BATCH_SIZE = 5;
              const correspondenceData: Array<{ correspondence: Correspondence; minutes: Minute[]; linkNotes?: string } | null> = [];
              
              for (let i = 0; i < links.length; i += BATCH_SIZE) {
                const batch = links.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(
                  batch.map(async (link) => {
                    try {
                      const corrId = typeof link.correspondence === 'string' ? link.correspondence : link.correspondence?.id;
                      if (!corrId) return null;

                      const [corrResponse, minutesResponse] = await Promise.all([
                        apiFetch<Record<string, unknown>>(`/correspondence/items/${corrId}/`),
                        apiFetch<unknown[]>(`/correspondence/minutes/?correspondence=${corrId}`),
                      ]);

                    logInfo(`[DMS Detail] Minutes API response for correspondence ${corrId}:`, minutesResponse);
                    logInfo(`[DMS Detail] Correspondence API response for ${corrId}:`, {
                      distribution: corrResponse.distribution,
                      distributionCount: Array.isArray(corrResponse.distribution) ? corrResponse.distribution.length : 0
                    });

                    // Handle paginated response
                    type MinutesResponse = Array<Record<string, unknown>> | { results?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> };
                    const minutesResponseTyped = minutesResponse as MinutesResponse;
                    const minutesArray = Array.isArray(minutesResponseTyped) 
                      ? minutesResponseTyped 
                      : (minutesResponseTyped?.results || minutesResponseTyped?.data || []);

                    // Map minutes to extract user info
                    const minutes: Minute[] = minutesArray.map((item: Record<string, unknown>) => {

                      return {
                        id: String(item.id as string),
                        correspondenceId: String(corrId),
                        userId: normalizeId(item.user ?? item.user_id) ?? '',
                        userName:
                          typeof item.user === 'object' && item.user
                            ? (() => {
                                const userObj = item.user as Record<string, unknown>;
                                const firstName = userObj.first_name ? String(userObj.first_name) : '';
                                const lastName = userObj.last_name ? String(userObj.last_name) : '';
                                const fullName = `${firstName} ${lastName}`.trim();
                                if (fullName.length > 0) return fullName;
                                return userObj.username ? String(userObj.username) : undefined;
                              })()
                            : undefined,
                        userEmail: (typeof item.user === 'object' && item.user) ? ((item.user as Record<string, unknown>).email ? String((item.user as Record<string, unknown>).email) : undefined) : undefined,
                        userSystemRole: undefined, // Can be extracted if needed
                        gradeLevel: String(item.grade_level ?? ''),
                        actionType: (item.action_type ?? 'minute') as 'minute' | 'forward' | 'approve' | 'reject' | 'treat',
                        minuteText: String(item.minute_text ?? ''),
                        direction: (item.direction ?? 'downward') as 'upward' | 'downward',
                        stepNumber: typeof item.step_number === 'number' ? item.step_number : 1,
                        timestamp: (typeof item.timestamp === 'string' ? item.timestamp : new Date().toISOString()),
                        actedBySecretary: Boolean(item.acted_by_secretary ?? false),
                        actedByAssistant: Boolean(item.acted_by_assistant ?? false),
                        assistantType: (item.assistant_type && typeof item.assistant_type === 'string' && (item.assistant_type === 'TA' || item.assistant_type === 'PA')) ? item.assistant_type as 'TA' | 'PA' : undefined,
                        readAt: (item.read_at && typeof item.read_at === 'string') ? item.read_at : undefined,
                        mentions: Array.isArray(item.mentions) ? item.mentions.map(m => String(m)) : [],
                        signature: (item.signature_payload && typeof item.signature_payload === 'object' && 'imageData' in item.signature_payload && 'appliedAt' in item.signature_payload) ? {
                          imageData: String((item.signature_payload as Record<string, unknown>).imageData || ''),
                          appliedAt: String((item.signature_payload as Record<string, unknown>).appliedAt || ''),
                          fileName: (item.signature_payload as Record<string, unknown>).fileName ? String((item.signature_payload as Record<string, unknown>).fileName) : undefined,
                          templateId: (item.signature_payload as Record<string, unknown>).templateId ? String((item.signature_payload as Record<string, unknown>).templateId) : undefined,
                          templateType: ((item.signature_payload as Record<string, unknown>).templateType && ['approval', 'minute', 'forward', 'treatment'].includes(String((item.signature_payload as Record<string, unknown>).templateType))) ? (item.signature_payload as Record<string, unknown>).templateType as 'approval' | 'minute' | 'forward' | 'treatment' : undefined,
                        } : undefined,
                        toOfficeId: item.to_office ? (typeof item.to_office === 'string' ? item.to_office : (typeof item.to_office === 'object' && item.to_office && 'id' in item.to_office ? String(item.to_office.id) : undefined)) : undefined,
                        toOfficeName: (item.to_office_name && typeof item.to_office_name === 'string') ? item.to_office_name : (typeof item.to_office === 'object' && item.to_office && 'name' in item.to_office && typeof item.to_office.name === 'string' ? item.to_office.name : undefined),
                        toUserId: item.to_user ? (typeof item.to_user === 'string' ? item.to_user : (typeof item.to_user === 'object' && item.to_user && 'id' in item.to_user ? String(item.to_user.id) : undefined)) : undefined,
                        toUserName: (item.to_user_name && typeof item.to_user_name === 'string') ? item.to_user_name : (typeof item.to_user === 'object' && item.to_user ? (() => {
                          const firstName = (item.to_user as Record<string, unknown>).first_name ? String((item.to_user as Record<string, unknown>).first_name) : '';
                          const lastName = (item.to_user as Record<string, unknown>).last_name ? String((item.to_user as Record<string, unknown>).last_name) : '';
                          const fullName = `${firstName} ${lastName}`.trim();
                          return fullName.length > 0 ? fullName : undefined;
                        })() : undefined),
                        isRecalled: Boolean(item.is_recalled ?? false),
                        recalledAt: (item.recalled_at && typeof item.recalled_at === 'string') ? item.recalled_at : undefined,
                        recallReason: (item.recall_reason && typeof item.recall_reason === 'string') ? item.recall_reason : undefined,
                      };
                    });
                    // Map distribution (reuse normalizeId function defined above)
                    const distribution = Array.isArray(corrResponse.distribution)
                      ? corrResponse.distribution.map((recipient: Record<string, unknown>) => {
                          const recipientType = (recipient.recipient_type && typeof recipient.recipient_type === 'string' && ['office', 'division', 'department', 'directorate', 'user'].includes(recipient.recipient_type)) ? recipient.recipient_type as 'office' | 'division' | 'department' | 'directorate' | 'user' : 'division';
                          return {
                            id: normalizeId(recipient.id) ?? `${corrResponse.id}-dist-${Math.random().toString(36).slice(2)}`,
                            type: recipientType as 'division' | 'department' | 'directorate' | 'user',
                            directorateId: normalizeId(recipient.directorate),
                            divisionId: normalizeId(recipient.division),
                            departmentId: normalizeId(recipient.department),
                            name: (recipient.directorate_name && typeof recipient.directorate_name === 'string') ? recipient.directorate_name : ((recipient.division_name && typeof recipient.division_name === 'string') ? recipient.division_name : ((recipient.department_name && typeof recipient.department_name === 'string') ? recipient.department_name : undefined)),
                            addedById: normalizeId(recipient.added_by ?? recipient.added_by_id),
                            addedByName:
                              typeof recipient.added_by === 'object' && recipient.added_by
                                ? (() => {
                                    const addedByObj = recipient.added_by as Record<string, unknown>;
                                    const firstName = addedByObj.first_name ? String(addedByObj.first_name) : '';
                                    const lastName = addedByObj.last_name ? String(addedByObj.last_name) : '';
                                    const fullName = `${firstName} ${lastName}`.trim();
                                    if (fullName.length > 0) return fullName;
                                    return addedByObj.username ? String(addedByObj.username) : undefined;
                                  })()
                                : undefined,
                            addedAt: (recipient.created_at && typeof recipient.created_at === 'string') ? recipient.created_at : undefined,
                            purpose: (recipient.purpose && typeof recipient.purpose === 'string' && (recipient.purpose === 'information' || recipient.purpose === 'action')) ? recipient.purpose as 'information' | 'action' : undefined,
                          };
                        })
                      : [];
                    
                    const correspondence: Correspondence = {
                      id: String(corrResponse.id),
                      referenceNumber: String(corrResponse.reference_number ?? ''),
                      subject: String(corrResponse.subject ?? ''),
                      source: (corrResponse.source ?? 'internal') as 'internal' | 'external',
                      receivedDate: String(corrResponse.received_date ?? ''),
                      senderName: String(corrResponse.sender_name ?? ''),
                      senderOrganization: String(corrResponse.sender_organization ?? ''),
                      status: (corrResponse.status ?? 'pending') as 'pending' | 'in-progress' | 'completed' | 'archived',
                      priority: (corrResponse.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'urgent',
                      divisionId: corrResponse.division ? (typeof corrResponse.division === 'string' ? corrResponse.division : (typeof corrResponse.division === 'object' && corrResponse.division && 'id' in corrResponse.division ? String(corrResponse.division.id) : undefined)) : undefined,
                      departmentId: corrResponse.department ? (typeof corrResponse.department === 'string' ? corrResponse.department : (typeof corrResponse.department === 'object' && corrResponse.department && 'id' in corrResponse.department ? String(corrResponse.department.id) : undefined)) : undefined,
                      currentApproverId: corrResponse.current_approver ? (typeof corrResponse.current_approver === 'string' ? corrResponse.current_approver : (typeof corrResponse.current_approver === 'object' && corrResponse.current_approver && 'id' in corrResponse.current_approver ? String(corrResponse.current_approver.id) : undefined)) : undefined,
                      createdById: corrResponse.created_by ? (typeof corrResponse.created_by === 'string' ? corrResponse.created_by : (typeof corrResponse.created_by === 'object' && corrResponse.created_by && 'id' in corrResponse.created_by ? String(corrResponse.created_by.id) : undefined)) : undefined,
                      direction: (corrResponse.direction ?? 'upward') as 'upward' | 'downward',
                      distribution,
                      createdAt: (corrResponse.created_at && typeof corrResponse.created_at === 'string') ? corrResponse.created_at : undefined,
                      updatedAt: (corrResponse.updated_at && typeof corrResponse.updated_at === 'string') ? corrResponse.updated_at : undefined,
                    };

                      return {
                        correspondence,
                        minutes,
                        linkNotes: link.notes,
                      };
                    } catch (error: unknown) {
                      logError('Failed to load related correspondence', error);
                      return null;
                    }
                  })
                );
                correspondenceData.push(...batchResults);
              }

              const validData = correspondenceData.filter((item) => item !== null) as Array<{ correspondence: Correspondence; minutes: Minute[]; linkNotes?: string }>;
              logInfo('[DMS Detail] Processed correspondence data', { 
                validDataCount: validData.length, 
                totalMinutes: validData.reduce((sum, item) => sum + item.minutes.length, 0),
                data: validData 
              });
              if (!ignore) dispatchCollaboration({ type: 'SET_RELATED_CORRESPONDENCE', payload: validData });
            } else {
              logInfo('[DMS Detail] No document links found for document', { documentId: params.id });
              if (!ignore) dispatchCollaboration({ type: 'SET_RELATED_CORRESPONDENCE', payload: [] });
            }
          } catch (error: unknown) {
            logError('[DMS Detail] Error loading related correspondence', error);
            logError('Failed to load related correspondence', error);
            if (!ignore) dispatchCollaboration({ type: 'SET_RELATED_CORRESPONDENCE', payload: [] });
        }
      } catch (error: unknown) {
        logError('Failed to load document', error);
        toast.error('Unable to load document');
        router.push('/documents');
      }
    };

    void load().finally(() => {
      isLoadingRef.current = false;
    });

    return () => {
      ignore = true;
      isLoadingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadDocument stable (memoized with params?.id), normalizeId and router are stable
  }, [params?.id, hydrated, currentUser?.id]);



  const handleVersionUploadComplete = useCallback((updated: DocumentRecord) => {
    // 1. Close dialogs immediately to trigger the closing animation
    setUploadDialogOpen(false);
    setCreateVersionDialogOpen(false);
    
    // 2. Defer the heavy document state update until the dialog is fully closed
    // This prevents the page from re-rendering heavily while the dialog is still unmounting
    setTimeout(() => {
      startTransition(() => {
        setDocument(updated);
        toast.success('Document updated successfully');
      });
    }, 300);
  }, []);

  const handleQuickVersionUpload = () => {
    if (!document || !uploadUser) return;
    setUploadDialogOpen(true);
  };

  const handleCreateVersion = () => {
    if (!document || !uploadUser) return;
    setCreateVersionDialogOpen(true);
  };

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
        await loadDocument();
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
        await loadDocument();
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
    let pollCount = 0;
    const maxPolls = 150; // 5 minutes max (150 * 2 seconds)
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      try {
        const updatedJob = await getCaptureJob(jobId);
        
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
          toast.success('OCR processing completed');
          await loadDocument();
        } else if (updatedJob.status === 'failed' || updatedJob.status === 'cancelled') {
          clearInterval(pollInterval);
          if (updatedJob.status === 'failed') {
            toast.error(updatedJob.error_message || 'OCR processing failed');
          }
        } else if (pollCount >= maxPolls) {
          // Timeout after max polls
          clearInterval(pollInterval);
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
          dispatchOCR({ type: 'SET_PROCESSING', versionId, isProcessing: false });
          dispatchOCR({ type: 'SET_JOB', versionId, job: null });
          const errorMsg = (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') ? err.message : 'Failed to check OCR status. The Celery worker may not be running.';
          dispatchOCR({ type: 'SET_ERROR', versionId, error: errorMsg });
          toast.error('Failed to check OCR status. Please ensure the backend worker is running.');
        }
      }
    }, 2000);

    // Cleanup after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
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
  const workspaceLookup = useMemo(() => new Map(collaborationState.workspaces.map((ws) => [ws.id, ws])), [collaborationState.workspaces]);
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
    dispatchCollaboration({ type: 'SET_ACCESS_LOGS', payload: logs });
  }, [document?.id]);

  // Memoize workspaces refresh handler
  const handleWorkspacesRefreshed = useCallback(async () => {
    const ws = await fetchWorkspaces();
    dispatchCollaboration({ type: 'SET_WORKSPACES', payload: ws });
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
  const versions = Array.isArray(document?.versions) ? document?.versions : [];
  const primaryVersion = versions?.[0];

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
          <div className="flex flex-col min-h-screen">
          {/* Header */}
          <DocumentHeader
            document={document}
            author={author}
            currentUser={currentUser}
            divisionLookup={divisionLookup}
            departmentLookup={departmentLookup}
            divisions={divisions}
            departments={departments}
            hasLinkedCorrespondence={collaborationState.relatedCorrespondence.length > 0}
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
                // Reload document
                if (params?.id) {
                  const updated = await fetchDocumentById(params.id);
                  setDocument(updated);
                }
              } catch (err) {
                logError("Failed to unlink document from case", err);
                toast.error("Failed to unlink from case");
              }
            }}
            onMinuteDocument={async () => {
              if (!document || !currentUser) return;
              
              // Check if document is linked to correspondence
              // Minutes are a correspondence workflow feature - only available for correspondence documents
              const relatedCorrespondence = collaborationState.relatedCorrespondence;
              if (!relatedCorrespondence || relatedCorrespondence.length === 0) {
                toast.error(
                  'This document is not linked to any correspondence. ' +
                  'Minutes are only available for correspondence documents. ' +
                  'To minute this document, first link it to a correspondence item.'
                );
                return;
              }

              // Use the first linked correspondence
              const existingCorr = relatedCorrespondence[0].correspondence;
              setMinuteDocumentCorrespondence(existingCorr);
              setMinuteDocumentModalOpen(true);
            }}
          />

          <div className="container mx-auto px-6 py-6">
            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
              {/* Left Column - Tabbed Content */}
              <div className="lg:col-span-2 flex flex-col">
                {/* Tab Navigation */}
                <div className="flex items-center border-b mb-6 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Info className="h-4 w-4" />
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('versions')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'versions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    Versions
                    {versions.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">({versions.length})</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('related')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'related' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Link2 className="h-4 w-4" />
                    Related
                    {collaborationState.relatedCorrespondence.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">({collaborationState.relatedCorrespondence.length})</span>
                    )}
                  </button>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <Card className="border-border/50">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Document Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          <div>
                            <dt className="text-xs text-muted-foreground">Title</dt>
                            <dd className="font-medium">{document.title}</dd>
                          </div>
                          {document.referenceNumber && (
                            <div>
                              <dt className="text-xs text-muted-foreground">Reference Number</dt>
                              <dd className="font-medium">{document.referenceNumber}</dd>
                            </div>
                          )}
                          {document.description && (
                            <div className="sm:col-span-2">
                              <dt className="text-xs text-muted-foreground">Description</dt>
                              <dd className="text-muted-foreground">{document.description}</dd>
                            </div>
                          )}
                          <div>
                            <dt className="text-xs text-muted-foreground">Status</dt>
                            <dd><Badge variant="outline" className="text-xs capitalize">{document.status}</Badge></dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Sensitivity</dt>
                            <dd><Badge variant="outline" className="text-xs capitalize">{document.sensitivity}</Badge></dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Author</dt>
                            <dd className="font-medium">{author?.name || document.authorId || 'Unknown'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Division</dt>
                            <dd className="font-medium">{divisionLookup.get(document.divisionId ?? '') || document.divisionId || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Department</dt>
                            <dd className="font-medium">{departmentLookup.get(document.departmentId ?? '') || document.departmentId || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Document Type</dt>
                            <dd className="font-medium capitalize">{document.documentType || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Created</dt>
                            <dd className="font-medium">{document.createdAt ? formatDateTime(document.createdAt) : '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Last Updated</dt>
                            <dd className="font-medium">{document.updatedAt ? formatDateTime(document.updatedAt) : '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Versions</dt>
                            <dd className="font-medium">{versions.length}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Workspaces</dt>
                            <dd className="font-medium">{document.workspaceIds.length}</dd>
                          </div>
                          {document.tags && document.tags.length > 0 && (
                            <div className="sm:col-span-2">
                              <dt className="text-xs text-muted-foreground mb-1">Tags</dt>
                              <dd className="flex flex-wrap gap-1">
                                {document.tags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                                ))}
                              </dd>
                            </div>
                          )}
                          {document.documentType === 'form' && formDocumentId && (
                            <div className="sm:col-span-2">
                              <dt className="text-xs text-muted-foreground">Form</dt>
                              <dd className="font-medium">{formDocumentId}</dd>
                            </div>
                          )}
                        </dl>
                      </CardContent>
                    </Card>

                    {document.workspaceIds.length > 0 && (
                      <Card className="border-border/50">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            Assigned Workspaces
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-1.5">
                            {documentWorkspaces.map((ws) => (
                              <Badge
                                key={ws.id}
                                variant="outline"
                                className="gap-1.5 text-xs py-1 px-2"
                                style={{ borderColor: ws.color }}
                              >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ws.color }} />
                                {ws.name}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Form Document Editor - Show for form documents */}
                    {document.documentType === 'form' && formDocumentId ? (
                      <FormDocumentEditor documentId={params.id} formDocumentId={formDocumentId} />
                    ) : document.documentType === 'form' ? (
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Loading form document...</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                )}

                {/* Versions Tab */}
                {activeTab === 'versions' && (
                  <Card className="border-border/50 flex flex-col flex-1 min-h-0">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            Versions
                          </CardTitle>
                          <CardDescription className="mt-1">
                            All uploaded versions of this document
                          </CardDescription>
                        </div>
                        {handleCreateVersion ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!uploadUser}
                                aria-label="Add new version"
                              >
                                <FilePlus className="h-4 w-4 mr-2" />
                                Add Version
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={handleCreateVersion} disabled={!uploadUser}>
                                <PenTool className="h-4 w-4 mr-2" />
                                Create Version
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleQuickVersionUpload} disabled={!uploadUser}>
                                <FilePlus className="h-4 w-4 mr-2" />
                                Upload Version
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleQuickVersionUpload}
                            disabled={!uploadUser}
                            aria-label="Upload new version"
                          >
                          <FilePlus className="h-4 w-4 mr-2" />
                          Upload Version
                        </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 flex flex-col">
                      <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                        {versions.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                            <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium mb-1">No versions uploaded</p>
                            <p className="text-xs">Upload the first version to get started.</p>
                          </div>
                        ) : (
                          versions.map((version, index) => {
                            const uploader = userLookup.get(version.uploadedBy);
                            const isLatest = index === 0;
                            const fileSize = version.fileSize ? formatFileSize(version.fileSize) : null;
                            const versionOCR = ocrState?.[version.id];
                            const isProcessing = versionOCR?.isProcessing || false;
                            const hasOCRText = version.ocrText && version.ocrText.trim() !== '';
                            const canShowOCR = (version.fileUrl && version.fileUrl.trim() !== '' &&
                              (version.fileType?.startsWith('image/') ||
                                version.fileType === 'application/pdf' ||
                                version.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                                version.fileType === 'application/msword' ||
                                version.fileName?.toLowerCase().endsWith('.docx') ||
                                version.fileName?.toLowerCase().endsWith('.doc')) ||
                              (version.contentHtml && version.contentHtml.trim() !== ''));
                            
                            return (
                              <div
                                key={version.id}
                                className={`p-3 border rounded-lg transition-colors hover:bg-muted/50 ${
                                  isLatest ? 'border-primary/40 bg-primary/5' : 'border-border'
                                }`}
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <Badge variant={isLatest ? 'default' : 'outline'} className="flex-shrink-0 text-xs">
                                        v{version.versionNumber}
                                      </Badge>
                                      {isLatest && (
                                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                                          Latest
                                        </Badge>
                                      )}
                                      <span className="text-sm font-medium text-foreground truncate min-w-0" title={version.fileName}>
                                        {version.fileName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {(version.fileName || (version.contentHtml && version.contentHtml.trim() !== '')) && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => setPreviewVersion(version)}
                                          title="Preview version"
                                          aria-label="Preview version"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      {version.fileUrl && version.fileUrl.trim() !== '' && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => {
                                            const link = window.document.createElement('a');
                                            link.href = version.fileUrl as string;
                                            link.download = version.fileName;
                                            window.document.body.appendChild(link);
                                            link.click();
                                            window.document.body.removeChild(link);
                                          }}
                                          title="Download version"
                                          aria-label="Download version"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      {canShowOCR && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => {
                                            if (isProcessing) {
                                              handleCancelOCR(version.id);
                                            } else {
                                              handleVersionOCR(version.id);
                                            }
                                          }}
                                          title={isProcessing ? 'Cancel OCR processing' : hasOCRText ? 'Re-process OCR' : 'Process OCR'}
                                          disabled={isProcessing && versionOCR?.currentJob?.status === 'processing'}
                                          aria-label={isProcessing ? 'Cancel OCR' : 'Process OCR'}
                                        >
                                          {isProcessing ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <Scan className="h-3.5 w-3.5" />
                                          )}
                                        </Button>
                                      )}
                                      {uploadUser &&
                                        (uploadUser.id === version.uploadedBy || uploadUser.id === document.authorId) && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => setReplaceVersionId(version.id)}
                                          title="Replace this version"
                                          aria-label="Replace version"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="capitalize">
                                      {version.fileType?.split('/').pop() || version.fileType || 'Unknown'}
                                    </span>
                                    {fileSize && (
                                      <>
                                        <span>•</span>
                                        <span>{fileSize}</span>
                                      </>
                                    )}
                                    <span>•</span>
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDateTime(version.uploadedAt)}</span>
                                    {uploader && (
                                      <>
                                        <span>•</span>
                                        <UserIcon className="h-3 w-3" />
                                        <span>{uploader.name}</span>
                                      </>
                                    )}
                                  </div>
                                  {version.notes && (
                                    <p className="text-xs text-muted-foreground">{version.notes}</p>
                                  )}
                                  {hasOCRText && (
                                    <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded border border-primary/20">
                                      <FileText className="h-3.5 w-3.5 text-primary" />
                                      <span className="text-xs text-muted-foreground">
                                        OCR text available ({version.ocrText?.length || 0} characters)
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs ml-auto"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setPreviewVersion(version);
                                        }}
                                      >
                                        View Text
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Related Tab */}
                {activeTab === 'related' && (
                  <div className="space-y-6">
                    <RelatedCorrespondenceCard
                      relatedCorrespondence={collaborationState.relatedCorrespondence}
                      userLookup={userLookup}
                      divisionLookup={divisionLookup}
                      departmentLookup={departmentLookup}
                    />
                    
                    {document && (
                      <DocumentThreadCard
                        documentId={document.id}
                        parentDocumentId={(document as DocumentRecord & { parent_document?: { id: string }; parent_document_id?: string }).parent_document?.id || (document as DocumentRecord & { parent_document_id?: string }).parent_document_id}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Collaboration & Activity */}
              <div className="space-y-6">
                {/* Collaboration Section */}
                <CollaborationPanel
                  document={document}
                  documentWorkspaces={documentWorkspaces}
                  workspaces={collaborationState.workspaces}
                  onAddWorkspace={handleAddWorkspace}
                  onRemoveWorkspace={handleRemoveWorkspace}
                  workspaceManageOpen={workspaceManageOpen}
                  onWorkspaceManageOpenChange={setWorkspaceManageOpen}
                  onWorkspacesRefreshed={handleWorkspacesRefreshed}
                />

              {/* Comments Section */}
                <DocumentCommentsCard
                  comments={collaborationState.comments}
                  userLookup={userLookup}
                  getUserInitials={getUserInitials}
                  onOpenCommentsDialog={handleOpenCommentsDialog}
                />

              {/* Access Activity Section */}
                <AccessActivityCard
                  documentId={document.id}
                  accessLogs={collaborationState.accessLogs}
                  userLookup={userLookup}
                  getUserInitials={getUserInitials}
                  onViewActivityDetails={(log) => setSelectedAccessLog(log)}
                  onRefresh={handleRefreshAccessLogs}
                />
                    </div>
            </div>
          </div>

          {/* Comments Dialog */}
          <DocumentCommentsDialog
            open={commentsDialogOpen}
            onOpenChange={setCommentsDialogOpen}
            documentId={document.id}
            version={primaryVersion}
            currentUser={uploadUser}
            onCommentsUpdated={(updatedComments) => {
              dispatchCollaboration({ type: 'SET_COMMENTS', payload: updatedComments });
            }}
          />

                </div>

      {hydrated && uploadUser && document && (
        <>
          {uploadDialogOpen && (
        <DocumentUploadDialog
              key={`upload-version-${document.id}`}
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          mode="version"
          currentUser={uploadUser}
          document={document}
          onComplete={handleVersionUploadComplete}
        />
          )}
          {createVersionDialogOpen && (
            <DocumentUploadDialog
              key={`create-version-${document.id}`}
              open={createVersionDialogOpen}
              onOpenChange={setCreateVersionDialogOpen}
              mode="version"
              currentUser={uploadUser}
              document={document}
              onComplete={handleVersionUploadComplete}
            />
          )}
        </>
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
              const userLogs = collaborationState.accessLogs.filter((log) => log.userId === selectedAccessLog.userId);
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
