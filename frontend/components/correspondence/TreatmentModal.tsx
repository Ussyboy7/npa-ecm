"use client";

import { logError } from '@/lib/client-logger';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAbortController } from '@/hooks/use-abort-controller';
import { startTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { ConfirmationDialog } from './ConfirmationDialog';
import { generateId, getNextStepNumber } from '@/lib/correspondence-helpers';
import { formatDateForAPI } from '@/lib/datetime';
import { saveDraft, getDraftByCorrespondence, deleteDraft } from '@/lib/storage';
import { isDraftRoutingData } from '@/lib/api/drafts';
import type { Correspondence, User } from '@/lib/npa-structure';
import {
  getGradeRelationshipLabel,
  getSuperiorGrade,
} from '@/lib/grade-catalog';
import { useGradeCatalog } from '@/hooks/use-grade-catalog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from "@/components/ui/sonner";
import { formatDateShort } from "@/lib/datetime";
import {
  FileText,
  Send,
  Save,
  User as UserIcon,
  AlertCircle,
  Search,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Hash,
  Link as LinkIcon,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { bumpSidebarCounts } from '@/hooks/use-sidebar-counts';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganizationCatalogs } from '@/hooks/use-organization-catalogs';
import { useScopedOfficeMemberships } from '@/hooks/use-scoped-office-memberships';
import { useUserLookup } from '@/hooks/use-user-lookup';
import { useRoutingSuggestions } from '@/hooks/use-routing-suggestions';
import { fetchActiveUsersForGradeAndDivision } from '@/lib/users-api';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { ModalErrorHandler } from '@/lib/modal-errors';
import { PrimaryRoutePanel, type RoutePurpose } from './PrimaryRoutePanel';
import { CorrespondenceContextCard, PreviousMinuteLine } from './CorrespondenceContextCard';
import { submitParallelRoute } from '@/lib/parallel-routing';
import type { AssignmentMergeStrategy, BranchConfig } from '@/lib/parallel-routing';


import { useSignature } from '@/hooks/use-signature';
import { FileUploadArea } from './FileUploadArea';
import { MemoCompositionSection } from './MemoCompositionSection';
import { type UploadedFile } from '@/hooks/use-file-upload';
import { ModalErrorBoundary } from '@/components/shared/ModalErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import React from 'react';
import {
  getTemplatesForUser,
  saveTemplate,
  type DocumentTemplate,
} from '@/lib/api/document-templates';
import {
  DocumentRecord,
  fetchDocumentById,
  queryDocuments,
} from '@/lib/api/dms';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate } from '@/lib/correspondence-helpers';

interface TreatmentModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: (result?: { createdResponseId?: string }) => void;
}

/** Treat & Respond has no approval action; legacy drafts fall back to action. */
const normalizePurpose = (purpose: RoutePurpose): 'action' | 'information' =>
  purpose === 'information' ? 'information' : 'action';

// UploadedFile type is now imported from use-file-upload hook

const TreatmentModalComponent = ({ correspondence, isOpen, onClose }: TreatmentModalProps) => {
  const {addCorrespondence: _addCorrespondence, addMinute: _addMinute, updateCorrespondence: _updateCorrespondence, getMinutesByCorrespondenceId, syncFromApi } = useCorrespondence();
  const { currentUser: activeUser } = useCurrentUser();
  const {
    divisions,
    departments,
    offices,
    officeMemberships: signedInOfficeMemberships,
    directorates,
  } = useOrganizationCatalogs('offices', 'directorates', 'divisions', 'departments');
  // Form state
  const [currentUser, setCurrentUser] = useState(activeUser ?? null);
  const [responseType, setResponseType] = useState<'memo' | 'existing-document'>('memo');
  const [memoSubject, setMemoSubject] = useState(`Re: ${correspondence.subject}`);
  const [memoSubjectError, setMemoSubjectError] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [memoContentError, setMemoContentError] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [forwardToError, setForwardToError] = useState('');
  const [onBehalfOf, setOnBehalfOf] = useState('');
  const [purpose, setPurpose] = useState<'action' | 'information'>('action');
  
  // Routing state (like MinuteModal)
  const [routeType, setRouteType] = useState<'person' | 'office'>('person');
  const [targetOfficeId, setTargetOfficeId] = useState<string>('');
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [officeSearchQuery, setOfficeSearchQuery] = useState('');
  const [officeFilterDirectorate, setOfficeFilterDirectorate] = useState<string>('all');
  const [officeFilterDivision, setOfficeFilterDivision] = useState<string>('all');
  const [routeMode, setRouteMode] = useState<'single' | 'parallel'>('single');
  const [parallelUserIds, setParallelUserIds] = useState<string[]>([]);
  const [parallelOfficeIds, setParallelOfficeIds] = useState<string[]>([]);
  const [branchConfigs, setBranchConfigs] = useState<Record<string, BranchConfig>>({});
  const [mergeStrategy, setMergeStrategy] = useState<AssignmentMergeStrategy>('independent');
  const officeMemberships = useScopedOfficeMemberships({
    enabled: isOpen,
    baseMemberships: signedInOfficeMemberships,
    userId: forwardTo || undefined,
    officeId: targetOfficeId || undefined,
  });
  
  // Document selection state (for existing document response type)
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const selectedDocumentIdRef = useRef<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  
  // UI state
  const [characterCount, setCharacterCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [_searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentsSectionOpen, setAttachmentsSectionOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  
  // Removed old filtering state - now using RoutingSection
  
  // Templates state
  const [memoTemplates, setMemoTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  // Signature preview in the memo composer. Formal approvals use their own flow.
  const { signature: userSignature } = useSignature({
    userId: activeUser?.id,
    autoLoad: isOpen,
  });
  const gradeCatalog = useGradeCatalog();
  
  // File upload state - managed locally, FileUploadArea handles UI
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [_isDragActive, _setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Request cancellation
  const { getSignal, reset } = useAbortController();

  const restoreBodyInteractivity = useCallback(() => {
    if (typeof document === 'undefined') return;

    try {
      document.body.style.removeProperty('pointer-events');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
      document.documentElement.style.removeProperty('overflow');
      document.body.removeAttribute('data-scroll-locked');
      document.body.removeAttribute('data-radix-scroll-lock');
    } catch {
      // ignore
    }
  }, []);

  // Load memo templates when the modal opens
  useEffect(() => {
    if (!isOpen || !activeUser) return;

    setCurrentUser(activeUser);

    const loadMemoTemplates = async () => {
      try {
        const templates = await getTemplatesForUser(activeUser, 'document');
        setMemoTemplates(templates);
      } catch (error: unknown) {
        logError('Failed to load memo templates:', error);
        setMemoTemplates([]);
      }
    };
    void loadMemoTemplates();
  }, [isOpen, activeUser]);

  // Cleanup: Cancel ongoing requests when modal closes
  useEffect(() => {
    if (!isOpen) {
      restoreBodyInteractivity();
      // Cancel any ongoing requests
      reset()
    }
    return () => {
      // Cleanup on unmount
      restoreBodyInteractivity();
    };
  }, [isOpen, restoreBodyInteractivity]);

  // Load draft when modal opens
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    getDraftByCorrespondence(correspondence.id, 'treatment').then((draft) => {
      if (draft) {
        setMemoContent(draft.content);
        setCharacterCount(draft.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length);
        if (draft.subject) setMemoSubject(draft.subject);
        if (draft.onBehalfOf) setOnBehalfOf(draft.onBehalfOf);

        // Restore the response and routing exactly as saved. Drafts written
        // before these fields existed keep the composer defaults.
        if (draft.responseType) {
          setResponseType(draft.responseType);
          if (draft.responseType === 'existing-document' && draft.selectedDocumentId) {
            setSelectedDocumentId(draft.selectedDocumentId);
            void fetchDocumentById(draft.selectedDocumentId)
              .then((document) => {
                setDocuments((previous) =>
                  previous.some((item) => item.id === document.id)
                    ? previous
                    : [document, ...previous],
                );
              })
              .catch((error: unknown) => {
                logError('Failed to restore draft document', error);
              });
          } else {
            setSelectedDocumentId(null);
          }
        }

        const routing = isDraftRoutingData(draft.routingData) ? draft.routingData : null;
        if (routing) {
          setRouteType(routing.routeType);
          setRouteMode(routing.routeMode);
          setPurpose(normalizePurpose(routing.purpose));
          setTargetOfficeId(routing.targetOfficeId);
          setForwardTo(routing.routeType === 'person' ? draft.forwardTo : '');
          setParallelUserIds(routing.parallelUserIds);
          setParallelOfficeIds(routing.parallelOfficeIds);
          setBranchConfigs(routing.branchConfigs);
          setMergeStrategy(routing.mergeStrategy);
        }
        setHasDraft(true);
        setDraftId(draft.id);
        
        // Show warning if draft had files (File objects cannot be restored from a draft)
        if (draft.files && draft.files.length > 0) {
          toast.warning(
            `Draft had ${draft.files.length} file(s) attached. Please re-upload them.`,
            {
              description: `Files: ${draft.files.map(f => f.name).join(', ')}`,
              duration: 5000,
            }
          );
        }
      } else {
        resetForm();
      }
    }).catch((error) => {
      logError('Failed to load draft', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, correspondence.id, currentUser?.id]);

  useEffect(() => {
    selectedDocumentIdRef.current = selectedDocumentId;
  }, [selectedDocumentId]);

  // Load documents - simple callback like LinkDocumentDialog
  const loadDocuments = useCallback(
    async (queryValue: string) => {
      setDocumentLoading(true);
      try {
        const response = await queryDocuments({
          page: 1,
          pageSize: 50,
          search: queryValue.trim() || undefined,
          ordering: '-updated_at',
        });
        setDocuments((previous) => {
          const selectedId = selectedDocumentIdRef.current;
          const selected = selectedId
            ? previous.find((document) => document.id === selectedId)
            : undefined;
          return selected && !response.results.some((document) => document.id === selected.id)
            ? [selected, ...response.results]
            : response.results;
        });
      } catch (error: unknown) {
        logError('Failed to load documents', error);
        setDocuments([]);
      } finally {
        setDocumentLoading(false);
      }
    },
    [],
  );

  // Load documents with debounce - exactly like LinkDocumentDialog
  useEffect(() => {
    if (!isOpen || responseType !== 'existing-document') {
      if (!isOpen) {
        setDocuments([]);
        setSelectedDocumentId(null);
        setDocumentSearchQuery('');
      }
      return;
    }
    const handle = setTimeout(() => {
      void loadDocuments(documentSearchQuery);
    }, 300);
    return () => clearTimeout(handle);
  }, [isOpen, responseType, documentSearchQuery, loadDocuments]);

  const resetForm = () => {
    setHasDraft(false);
    setDraftId(null);
    setResponseType('memo');
    setSelectedDocumentId(null);
    setDocumentSearchQuery('');
    setMemoSubject(`Re: ${correspondence.subject}`);
    setMemoContent('');
    setCharacterCount(0);
    setForwardTo('');
    setRouteMode('single');
    setParallelUserIds([]);
    setParallelOfficeIds([]);
    setBranchConfigs({});
    setMergeStrategy('independent');
    setRouteType('person');
    setTargetOfficeId('');
    setPurpose('action');
    setOnBehalfOf('');
    setSearchQuery('');
    setMemoSubjectError('');
    setMemoContentError('');
    setForwardToError('');
    setUploadedFiles([]);
    setFocusMode(false);
    setSelectedTemplateId(null);
  };

  const getRelationshipLabel = useCallback(
    (current: typeof currentUser, superior: typeof currentUser) => {
      if (!current || !superior) return '';
      return getGradeRelationshipLabel(
        gradeCatalog,
        current.gradeLevel,
        superior.gradeLevel,
      );
    },
    [gradeCatalog],
  );

  // The proposal for whom this user may act for comes from the served order,
  // so a grade inserted between two known ones is picked up automatically.
  const superiorGrade = useMemo(
    () => getSuperiorGrade(gradeCatalog, currentUser?.gradeLevel)?.code ?? null,
    [gradeCatalog, currentUser?.gradeLevel],
  );

  const [behalfCandidates, setBehalfCandidates] = useState<User[]>([]);
  useEffect(() => {
    if (!isOpen || !currentUser?.division || !superiorGrade) {
      setBehalfCandidates([]);
      return;
    }
    let cancelled = false;
    fetchActiveUsersForGradeAndDivision(superiorGrade, currentUser.division)
      .then((users) => {
        if (!cancelled) setBehalfCandidates(users);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          logError('Failed to load on-behalf-of choices', error);
          setBehalfCandidates([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, superiorGrade, currentUser?.division]);

  const behalfOfOptions = useMemo(
    () =>
      behalfCandidates.map((user) => ({
        ...user,
        relationship: getRelationshipLabel(currentUser, user),
      })),
    [behalfCandidates, currentUser, getRelationshipLabel],
  );

  const approverList = useRoutingSuggestions({
    enabled: isOpen && Boolean(currentUser),
    correspondenceId: correspondence.id,
    direction: correspondence.direction,
  });

  const latestMinute = useMemo(() => {
    const active = getMinutesByCorrespondenceId(correspondence.id).filter(
      (minute) => !minute.isRecalled && !minute.recalledAt,
    );
    return active.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0];
  }, [correspondence.id, getMinutesByCorrespondenceId]);

  const selectedUserIds = useMemo(
    () =>
      [
        forwardTo,
        onBehalfOf,
        latestMinute?.userId,
        ...parallelUserIds,
        ...officeMemberships.map((membership) => membership.userId),
      ].filter((id): id is string => Boolean(id)),
    [forwardTo, onBehalfOf, latestMinute?.userId, parallelUserIds, officeMemberships],
  );
  const selectedUsersById = useUserLookup(selectedUserIds);

  const knownUserById = useMemo(() => {
    const byId = new Map<string, User>();
    for (const user of approverList) byId.set(user.id, user);
    for (const user of behalfCandidates) byId.set(user.id, user);
    selectedUsersById.forEach((user, id) => byId.set(id, user));
    return byId;
  }, [approverList, behalfCandidates, selectedUsersById]);

  const knownUsers = useMemo(() => [...knownUserById.values()], [knownUserById]);

  const findUserById = useCallback(
    (id?: string | null) => (id ? knownUserById.get(id) : undefined),
    [knownUserById],
  );

  const latestMinuteAuthor = latestMinute ? findUserById(latestMinute.userId) : undefined;

  const assistantList: User[] = []; // Not used for treatment responses
  
  const suggestedNext = approverList[0]; // First suggested approver
  
  // Helper functions for RoutingSection
  const getUserOfficeInfo = useCallback((userId: string) => {
    const user = knownUserById.get(userId);
    if (!user) return null;
    
    const membership = officeMemberships.find(
      m => m.userId === userId && m.isPrimary && m.isActive
    );
    const office = membership ? offices.find(o => o.id === membership.officeId) : undefined;
    const division = user.division ? divisions.find(d => d.id === user.division) : undefined;
    
    return {
      office: office ? { name: office.name } : undefined,
      division: division ? { name: division.name } : undefined,
    };
  }, [knownUserById, officeMemberships, offices, divisions]);
  
  // Office options for RoutingSection
  const officeOptions = useMemo(() => {
    return offices.filter(o => o.isActive).map(o => ({
      id: o.id,
      name: o.name,
      officeType: o.officeType,
      directorateId: o.directorateId ?? undefined,
      divisionId: o.divisionId ?? undefined,
    }));
  }, [offices]);

  // Character count helpers
  const getCharacterCountColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return 'text-destructive';
    if (percentage >= 90) return 'text-warning';
    return 'text-muted-foreground';
  };

  const handleContentChange = (html: string) => {
    setMemoContent(html);
    const div = document.createElement('div');
    div.innerHTML = html;
    setCharacterCount((div.textContent || '').trim().length);
    if (memoContentError) setMemoContentError('');
  };

  // File upload handlers
  // Suggested covering note when files are uploaded without content
  const [showSuggestedNote, setShowSuggestedNote] = useState(false);
  const suggestedCoveringNote = `Please find attached our response to the above correspondence regarding "${correspondence.subject}".`;

  const _handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles: UploadedFile[] = [];
    
    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > MODAL_CONSTANTS.FILE_UPLOAD.MAX_SIZE) {
        toast.error(`File "${file.name}" is too large. Maximum size is 30MB.`);
        return;
      }
      
      // Check file type
      if (!MODAL_CONSTANTS.FILE_UPLOAD.ALLOWED_TYPES.includes(file.type as typeof MODAL_CONSTANTS.FILE_UPLOAD.ALLOWED_TYPES[number])) {
        toast.error(`File type "${file.type}" is not allowed.`);
        return;
      }
      
      const uploadedFile: UploadedFile = {
        id: generateId('file'),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      };
      
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === uploadedFile.id 
              ? { ...f, preview: e.target?.result as string }
              : f
          ));
        };
        reader.readAsDataURL(file);
      }
      
      newFiles.push(uploadedFile);
    });
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Show suggested covering note if no content yet
    if (!memoContent.trim() && newFiles.length > 0) {
      setShowSuggestedNote(true);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUseSuggestedNote = () => {
    const html = `<p>${suggestedCoveringNote}</p>`;
    setMemoContent(html);
    setCharacterCount(suggestedCoveringNote.length);
    setShowSuggestedNote(false);
    toast.success('Covering note added');
  };

  const handleDismissSuggestedNote = () => {
    setShowSuggestedNote(false);
  };

  // Template handlers
  const handleApplyTemplate = (template: DocumentTemplate) => {
      let content = template.contentHtml || template.contentText || '';

      const senderDivision = currentUser?.division ? divisions.find(d => d.id === currentUser.division) : undefined;
      const senderDepartment = currentUser?.department ? departments.find(d => d.id === currentUser.department) : undefined;
      const senderDirectorate = currentUser?.directorate ? directorates.find(d => d.id === currentUser.directorate) : undefined;
      const recipientUser = forwardTo ? findUserById(forwardTo) : undefined;

      const tokenValues: Record<string, string> = {
        'division.name': senderDivision?.name || senderDirectorate?.name || '',
        'department.name': senderDepartment?.name || '',
        'recipient.name': recipientUser?.systemRole || correspondence.senderName || '',
        'sender.name': currentUser?.systemRole || currentUser?.name || '',
        'date.today': formatDateShort(new Date().toISOString()),
        'document.reference': correspondence.referenceNumber || '',
        'document.title': correspondence.subject || '',
      };

      for (const [key, value] of Object.entries(tokenValues)) {
        content = content.replaceAll(`{{${key}}}`, value);
      }

      // Also replace legacy single-brace tokens
      content = content.replace(/\{correspondent\}/g, currentUser?.systemRole || correspondence.senderName || '');
      content = content.replace(/\{subject\}/g, correspondence.subject || '');
      content = content.replace(/\{reference\}/g, correspondence.referenceNumber || '');
      content = content.replace(/\{date\}/g, formatDateShort(new Date().toISOString()));

      setMemoContent(content);
      const div = document.createElement('div');
      div.innerHTML = content;
      setCharacterCount((div.textContent || '').trim().length);
      toast.success('Template applied');
  };

  const handleSaveAsTemplate = async (name: string, content: string) => {
    if (!currentUser || !name.trim() || !content.trim()) {
      toast.error('Please enter a template name and content');
      return;
    }
    
    const div = document.createElement('div');
    div.innerHTML = content;
    const plainText = (div.textContent || '').trim();
    
    const template = await saveTemplate({
      id: generateId('template'),
      scope: 'user',
      scopeId: currentUser.id,
      title: name.trim(),
      contentHtml: content,
      contentText: plainText,
      createdBy: currentUser.id,
      updatedBy: currentUser.id,
      templateType: 'document',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    setMemoTemplates(prev => [...prev, template]);
    setNewTemplateName('');
    toast.success('Template saved');
  };

  useEffect(() => {
    if (!isOpen || responseType !== 'memo') setFocusMode(false);
  }, [isOpen, responseType]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'Escape',
      action: () => {
        if (isOpen && !showConfirmation) {
          if (focusMode) {
            setFocusMode(false);
            return;
          }
          onClose();
        }
      },
      description: 'Exit focus mode or close modal',
    },
    {
      key: 's',
      ctrl: true,
      action: () => {
        if (isOpen && !showConfirmation) {
          handleSaveDraft();
        }
      },
      description: 'Save draft (Ctrl+S)',
      preventDefault: true,
    },
    {
      key: 'Enter',
      ctrl: true,
      action: () => {
        if (isOpen && !showConfirmation && validateForm()) {
          handleSubmit();
        }
      },
      description: 'Submit (Ctrl+Enter)',
      preventDefault: true,
    },
  ]);

  const validateForm = (): boolean => {
    setMemoSubjectError('');
    setMemoContentError('');
    setForwardToError('');

    const trimmedSubject = memoSubject.trim();
    if (!trimmedSubject) {
      setMemoSubjectError('Response subject is required');
      return false;
    }
    if (trimmedSubject.length < MODAL_CONSTANTS.MEMO_SUBJECT.MIN) {
      setMemoSubjectError(`Subject must be at least ${MODAL_CONSTANTS.MEMO_SUBJECT.MIN} characters`);
      return false;
    }
    if (trimmedSubject.length > MODAL_CONSTANTS.MEMO_SUBJECT.MAX) {
      setMemoSubjectError(`Subject must not exceed ${MODAL_CONSTANTS.MEMO_SUBJECT.MAX} characters`);
      return false;
    }

    // Validate based on response type
    if (responseType === 'memo') {
      const div = document.createElement('div');
      div.innerHTML = memoContent;
      const trimmedContent = (div.textContent || '').trim();
      if (!trimmedContent) {
        setMemoContentError('Memo content is required');
        return false;
      }
      if (trimmedContent.length < MODAL_CONSTANTS.MEMO_CONTENT.MIN) {
        setMemoContentError(`Content must be at least ${MODAL_CONSTANTS.MEMO_CONTENT.MIN} characters`);
        return false;
      }
      if (trimmedContent.length > MODAL_CONSTANTS.MEMO_CONTENT.MAX) {
        setMemoContentError(`Content must not exceed ${MODAL_CONSTANTS.MEMO_CONTENT.MAX} characters`);
        return false;
      }
    } else if (responseType === 'existing-document') {
      if (!selectedDocumentId) {
        toast.error('Please select a document to attach');
        return false;
      }
    }

    // Validate recipient — single or separate assignments
    if (routeMode === 'parallel') {
      if (parallelUserIds.length + parallelOfficeIds.length < 2) {
        setForwardToError('Assign separately requires at least two people or offices');
        return false;
      }
    } else if (!forwardTo && !targetOfficeId) {
      setForwardToError('Please select a recipient (person or office)');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!currentUser) {
      toast.error('Current user not found.');
      return;
    }
    if (!validateForm()) return;
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!currentUser) {
      toast.error('Current user not found.');
      setShowConfirmation(false);
      return;
    }

    setShowConfirmation(false);
    setIsSubmitting(true);
    // Create AbortController for request cancellation
    const signal = getSignal();
    const isParallelRoute = routeMode === 'parallel';
    
    // Determine recipient - use person if selected, otherwise use office primary member
    let recipient = !isParallelRoute && forwardTo ? findUserById(forwardTo) : null;
    let recipientOfficeId = !isParallelRoute ? (targetOfficeId || undefined) : undefined;
    
    // If routing to office, try to get primary member
    if (!isParallelRoute && !recipient && targetOfficeId) {
      const primaryMember = officeMemberships.find(
        (m) => m.officeId === targetOfficeId && m.isPrimary && m.isActive,
      );
      if (primaryMember) {
        recipient = findUserById(primaryMember.userId);
      }
    }
    
    // Fallback: use forwardTo if available
    if (!recipient && forwardTo && !isParallelRoute) {
      recipient = findUserById(forwardTo);
    }
    
    // Get recipient's office ID if routing to a person
    if (recipient && !recipientOfficeId) {
      const recipientMembership = officeMemberships.find(
        (m) => m.userId === recipient.id && m.isPrimary && m.isActive,
      );
      if (recipientMembership) {
        recipientOfficeId = recipientMembership.officeId;
      }
    }
    
    // Get current user's office ID
    const currentUserMembership = officeMemberships.find(
      (m) => m.userId === currentUser.id && m.isPrimary && m.isActive,
    );
    const currentUserOfficeId = currentUserMembership?.officeId;
    
    const actingFor = onBehalfOf && onBehalfOf !== 'none' ? findUserById(onBehalfOf) : null;
    const division = currentUser.division ? divisions.find((div) => div.id === currentUser.division) : undefined;
    let createdMinuteId: string | null = null;
    let originalCorrespondenceUpdated = false;
    let createdResponseCorrespondenceId: string | null = null;

    try {
      // Create treatment minute
      const existingMinutes = getMinutesByCorrespondenceId(correspondence.id);
      const nextStep = getNextStepNumber(existingMinutes);

      // Build minute text based on response type
      const stripHtml = (html: string) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        return (div.textContent || '').trim();
      };
      let minuteText = '';
      if (responseType === 'memo') {
        // Include memo subject in minute text
        minuteText = `[TREATMENT & RESPONSE]\n\nSubject: ${correspondence.subject}\nSubject: ${memoSubject.trim()}\n\n${stripHtml(memoContent)}`;
      } else if (responseType === 'existing-document') {
        const selectedDoc = documents.find(d => d.id === selectedDocumentId);
        minuteText = `[RESPONSE WITH DOCUMENT]\n\nResponse sent with document: ${selectedDoc?.title || 'Document'}\n\n${stripHtml(memoContent) || 'See attached document for details.'}`;
      }
      
      const minuteResponse = await apiFetch<{ id?: string }>('/correspondence/minutes/', {
        signal,
        method: 'POST',
        body: JSON.stringify({
          correspondence: correspondence.id,
          user_id: currentUser.id,
          grade_level: currentUser.gradeLevel,
          action_type: 'treat',
          minute_text: minuteText,
          // The parent minute of a separate assignment is only the routing
          // record; each branch carries its own purpose and expected outcome.
          purpose: isParallelRoute ? 'action' : purpose,
          requires_response: !isParallelRoute && purpose !== 'information',
          direction: correspondence.direction,
          step_number: nextStep,
          from_office_id: currentUserOfficeId || undefined,
          to_office_id: isParallelRoute ? undefined : (recipientOfficeId || targetOfficeId || undefined),
          to_user_id: isParallelRoute ? undefined : forwardTo || undefined,
        }),
      });
      createdMinuteId = minuteResponse?.id ?? null;

      // Keep the original active until its minutes are acknowledged and it is
      // completed through the dedicated completion action.
      const correspondenceUpdate: Record<string, unknown> = {
        direction: correspondence.direction,
      };
      
      if (!isParallelRoute) {
        if (forwardTo) {
          correspondenceUpdate.current_approver_id = forwardTo;
        } else if (targetOfficeId) {
          correspondenceUpdate.current_office = targetOfficeId;
          const primaryMember = officeMemberships.find(
            (m) => m.officeId === targetOfficeId && m.isPrimary && m.isActive,
          );
          if (primaryMember) {
            correspondenceUpdate.current_approver_id = primaryMember.userId;
          }
        }
      }
      
      await apiFetch(`/correspondence/items/${correspondence.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(correspondenceUpdate),
        signal,
      });
      originalCorrespondenceUpdated = true;

      // Create new response correspondence with body_html and attachments
      const responseFormData = new FormData();
      // Let the backend generate the canonical office-based reference.
      responseFormData.append('subject', memoSubject.trim());
      responseFormData.append('document_title', memoSubject.trim());

      // Include content based on response type
      if (responseType === 'memo') {
        responseFormData.append('body_html', memoContent.trim());
        responseFormData.append('treatment_response', memoContent.trim());
      } else {
        // For document responses, use memo content as notes or default message
        const notes = memoContent.trim() || `Response to ${correspondence.referenceNumber}`;
        responseFormData.append('treatment_response', notes);
      }
      responseFormData.append('source', 'internal');
      responseFormData.append('received_date', formatDateForAPI(new Date()));
      responseFormData.append('sender_name', actingFor ? `${currentUser.name} (on behalf of ${actingFor.name})` : currentUser.name);
      responseFormData.append('sender_organization', division?.name ?? '');
      if (currentUserOfficeId) {
        responseFormData.append('owning_office', currentUserOfficeId);
      }
      responseFormData.append('status', 'pending');
      responseFormData.append('priority', correspondence.priority);

      const selectedOffice = targetOfficeId ? offices.find((office) => office.id === targetOfficeId) : undefined;
      const divisionIdToSend = recipient?.division ?? selectedOffice?.divisionId ?? correspondence.divisionId;
      if (divisionIdToSend) responseFormData.append('division', divisionIdToSend);

      const departmentIdToSend = recipient?.department ?? selectedOffice?.departmentId ?? correspondence.departmentId;
      if (departmentIdToSend) responseFormData.append('department', departmentIdToSend);
      // Set recipient on formal response — single route only; parallel uses submitParallelRoute below
      if (!isParallelRoute) {
        if (forwardTo) {
          responseFormData.append('current_approver_id', forwardTo);
        } else if (targetOfficeId) {
          const primaryMember = officeMemberships.find(
            (m) => m.officeId === targetOfficeId && m.isPrimary && m.isActive,
          );
          if (primaryMember) {
            responseFormData.append('current_approver_id', primaryMember.userId);
          }
          responseFormData.append('current_office', targetOfficeId);
        }
      } else if (currentUserOfficeId) {
        responseFormData.append('current_office', currentUserOfficeId);
      }
      responseFormData.append('direction', correspondence.direction);
      responseFormData.append('parent_correspondence_id', correspondence.id);
      
      // Add attachments to response correspondence
      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach((uploadedFile) => {
          responseFormData.append('attachments', uploadedFile.file);
        });
      }

      const responseCorrespondence = await apiFetch<{ id: string }>('/correspondence/items/', {
        signal,
        method: 'POST',
        body: responseFormData,
        headers: {}, // Let browser set Content-Type for FormData
      });
      createdResponseCorrespondenceId = responseCorrespondence.id;

      if (isParallelRoute) {
        const branchText = minuteText.trim() || `Response to ${correspondence.referenceNumber}`;
        await submitParallelRoute(apiFetch, {
          correspondenceId: responseCorrespondence.id,
          parallelUserIds,
          parallelOfficeIds,
          branchConfigs,
          defaultPurpose: purpose,
          defaultMinuteText: branchText,
          mergeStrategy,
          signal,
        });
      }

      // Link document if existing document response type
      if (responseType === 'existing-document' && selectedDocumentId) {
        await apiFetch('/correspondence/document-links/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            correspondence: responseCorrespondence.id,
            document: selectedDocumentId,
            notes: memoContent.trim() || `Response to ${correspondence.referenceNumber}`,
          }),
        });
      }

      // Close modal and show success immediately
      if (draftId) {
        try {
          await deleteDraft(draftId);
        } catch (error: unknown) {
          logError('Failed to delete draft', error);
        }
      }

      setIsSubmitting(false);
      
      toast.success('Response sent successfully', {
        description: isParallelRoute
          ? `Formal response created and assigned separately to ${parallelUserIds.length + parallelOfficeIds.length} recipients`
          : actingFor
            ? `Sent to ${recipient?.name ?? 'selected user'} on behalf of ${actingFor.name}`
            : `Sent to ${recipient?.name ?? 'selected user'}`,
      });

      toast.success('Original correspondence remains active', {
        description: 'Complete it separately after all active minutes are acknowledged.',
      });

      // Close modal
      bumpSidebarCounts();
      setTimeout(() => {
        onClose({ createdResponseId: createdResponseCorrespondenceId ?? undefined });
        setTimeout(() => resetForm(), 100);
      }, 200);

      // Sync in background (non-blocking)
      syncFromApi().catch((error) => {
        logError('Background sync failed after treatment', error);
        // Don't show error to user - sync will happen on next page load
      });
    } catch (error: unknown) {
      // Don't show error if request was cancelled
      if ((error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted')))) {
        setIsSubmitting(false);
        setShowConfirmation(false);
        return;
      }

      // Best-effort rollback to prevent orphan "treat" minute without response correspondence.
      if (!createdResponseCorrespondenceId) {
        if (createdMinuteId) {
          try {
            await apiFetch(`/correspondence/minutes/${createdMinuteId}/`, {
              method: 'DELETE',
            });
          } catch (rollbackMinuteError: unknown) {
            logError('Failed to rollback orphan treatment minute', rollbackMinuteError);
          }
        }

        if (originalCorrespondenceUpdated) {
          try {
            await apiFetch(`/correspondence/items/${correspondence.id}/`, {
              method: 'PATCH',
              body: JSON.stringify({ status: correspondence.status }),
            });
          } catch (rollbackStatusError: unknown) {
            logError('Failed to rollback correspondence status after treatment failure', rollbackStatusError);
          }
        }
      }

      logError('Failed to process treatment', error);
      const modalError = ModalErrorHandler.createErrorFromApi(error);
      toast.error(ModalErrorHandler.getUserFriendlyMessage(modalError));
    } finally {
      setIsSubmitting(false);
      // Clear AbortController after request completes
      reset()
    }
  };

  const handleSaveDraft = async () => {
    if (!currentUser) {
      toast.error('Current user not found.');
      return;
    }
    
    // Save file metadata (we can't save File objects to localStorage)
    const fileMetadata = uploadedFiles.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    
    try {
      const draft = await saveDraft({
        correspondenceId: correspondence.id,
        type: 'treatment',
        content: memoContent,
        subject: memoSubject,
        forwardTo: routeType === 'person' ? forwardTo : '',
        responseType,
        selectedDocumentId: responseType === 'existing-document' ? selectedDocumentId ?? '' : '',
        onBehalfOf: onBehalfOf !== 'none' ? onBehalfOf : undefined,
        files: fileMetadata.length > 0 ? fileMetadata : undefined,
        routingData: {
          routeType,
          targetOfficeId,
          routeMode,
          parallelUserIds,
          parallelOfficeIds,
          purpose,
          branchConfigs,
          mergeStrategy,
        },
      });

      setHasDraft(true);
      setDraftId(draft.id);
      toast.info(`Draft saved${fileMetadata.length > 0 ? ` with ${fileMetadata.length} file(s)` : ''}`);
    } catch (error: unknown) {
      logError('Failed to save draft', error);
      toast.error('Failed to save draft. Please try again.');
    }
  };

  if (!currentUser) return null;

  const selectedRecipient = forwardTo ? findUserById(forwardTo) ?? null : null;
  const actingFor = onBehalfOf && onBehalfOf !== 'none' ? findUserById(onBehalfOf) ?? null : null;

  // A response cannot be sent without somewhere to send it. Mirror the
  // minute composer's footer gate so nothing fails only on submit.
  const activeDestination = routeType === 'office' ? targetOfficeId : forwardTo;
  const hasRouteDestination =
    routeMode === 'parallel'
      ? parallelUserIds.length + parallelOfficeIds.length >= 2
      : Boolean(activeDestination);
  const handlePurposeChange = (next: RoutePurpose) => {
    setPurpose(normalizePurpose(next));
  };

  const handleResponseTypeChange = (value: string) => {
    setResponseType(value as typeof responseType);
    if (value !== 'existing-document') {
      setSelectedDocumentId(null);
      setDocumentSearchQuery('');
    }
    if (value === 'existing-document') {
      setMemoContent('');
      setCharacterCount(0);
      setMemoContentError('');
      // Supporting files belong to a memo response, not a DMS document link.
      setUploadedFiles([]);
      setAttachmentsSectionOpen(false);
      setShowSuggestedNote(false);
    }
  };

  return (
    <>
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // Escape and outside clicks leave focus mode first; the X and Done
          // controls are explicit ways in and out.
          if (focusMode) {
            setFocusMode(false);
            return;
          }
          onClose();
        }
      }}
    >
      <DialogContent
        size="full"
        height={focusMode ? 'screen' : 'fill'}
        showCloseButton={!focusMode}
      >
        {focusMode && (
          <button
            type="button"
            onClick={() => onClose()}
            aria-label="Close composer"
            className="absolute right-3 top-3 rounded-full p-1.5 opacity-70 ring-offset-background transition-opacity hover:bg-accent hover:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            Treat & Respond
            {hasDraft && (
              <Badge variant="secondary" className="ml-2 text-xs">Draft</Badge>
            )}
            {focusMode && (
              <Badge variant="outline" className="ml-1 text-xs">Focus</Badge>
            )}
            {uploadedFiles.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {focusMode
              ? 'Writing focus — Done returns to the full composer, where you can send.'
              : 'Compose a response memo or attach an existing document to respond to this correspondence'}
          </DialogDescription>
        </DialogHeader>

        <div
          className={
            focusMode
              ? 'min-h-0 flex-1 overflow-y-auto px-1 sm:px-4'
              : 'overflow-y-auto flex-1 min-h-0 pr-4'
          }
        >
          <div className={focusMode ? 'mx-auto max-w-4xl space-y-6 py-2' : 'space-y-6 py-2'}>
            {/* Focus mode hides each surrounding section in place rather than
                wrapping the page, so the memo editor keeps its position and
                never remounts (which would reset undo history). */}
            {!focusMode && (
              <>
                <CorrespondenceContextCard
                  correspondence={correspondence}
                  divisionName={
                    correspondence.divisionName ??
                    (correspondence.divisionId
                      ? divisions.find((division) => division.id === correspondence.divisionId)?.name
                      : undefined)
                  }
                />
                {latestMinute && (
                  <PreviousMinuteLine
                    minute={latestMinute}
                    authorName={
                      latestMinuteAuthor?.name ?? latestMinute.userName ?? 'Unknown'
                    }
                    authorRole={
                      latestMinuteAuthor?.systemRole ?? latestMinute.userSystemRole
                    }
                  />
                )}
              </>
            )}

            {/* Acting on Behalf Of */}
            {!focusMode && behalfOfOptions.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Acting on behalf of (optional)
                </Label>
                <Select value={onBehalfOf} onValueChange={setOnBehalfOf}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select if acting for someone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Acting for myself</SelectItem>
                    <Separator className="my-1" />
                    {behalfOfOptions.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{user.name}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {user.systemRole} • {(user as User & { relationship?: string }).relationship || 'Supervisor'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {actingFor && (
                  <div className="rounded-xl border border-border/60 bg-info/5 border-info/20 p-3">
<div className="space-y-1">
                        <p className="text-xs flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-info" />
                          <strong>Acting on behalf of:</strong> {actingFor.name}
                        </p>
                        <p className="text-xs text-muted-foreground pl-6">
                          {actingFor.systemRole} • {behalfOfOptions.find(o => o.id === actingFor.id)?.relationship || 'Supervisor'}
                        </p>
                      </div>
</div>
                )}
              </div>
            )}

            {!focusMode && <Separator />}

            {/* Response Type Selection */}
            {!focusMode && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[13px] font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Response type
              </Label>
              <SegmentedControl
                ariaLabel="Response type"
                value={responseType}
                onValueChange={handleResponseTypeChange}
                tone="quiet"
                className="w-full sm:max-w-sm"
                options={[
                  { value: 'memo', label: 'Memo', icon: FileText },
                  { value: 'existing-document', label: 'Attach document', icon: LinkIcon },
                ]}
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {responseType === 'memo'
                  ? 'Write the response in the editor below.'
                  : 'Attach a document already stored in the DMS.'}
              </p>
            </div>
            )}

            {!focusMode && <Separator />}

            {/* Document Selection Section - Only for existing document */}
            {!focusMode && responseType === 'existing-document' && (
              <div className="space-y-2">
                <Label htmlFor="document-search">Select Document <span className="text-destructive">*</span></Label>
                
                {/* Selected Document Preview */}
                {selectedDocumentId && (() => {
                  const selectedDoc = documents.find(d => d.id === selectedDocumentId);
                  if (!selectedDoc) return null;
                  return (
                    <div className="rounded-xl border border-border/60 border-primary/30 bg-primary/5 overflow-hidden mb-2 p-3">
<div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm font-medium truncate">{selectedDoc.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {selectedDoc.referenceNumber && (
                                  <>
                                    <Hash className="h-3 w-3 inline mr-1" />
                                    {selectedDoc.referenceNumber} •{' '}
                                  </>
                                )}
                                {formatDate(selectedDoc.updatedAt)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={() => setSelectedDocumentId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
</div>
                  );
                })()}
                
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="document-search"
                    value={documentSearchQuery}
                    onChange={(e) => setDocumentSearchQuery(e.target.value)}
                    placeholder="Search documents by title, reference number, or status..."
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-48 border rounded-md p-2">
                  {documentLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Searching documents...</p>
                    </div>
                  ) : documents.length > 0 ? (
                    <div className="space-y-1">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className={`flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer transition-all ${
                            selectedDocumentId === doc.id 
                              ? 'bg-primary/5 border-2 border-primary shadow-sm' 
                              : 'border border-transparent hover:border-border'
                          }`}
                          onClick={() => setSelectedDocumentId(doc.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedDocumentId(doc.id);
                            }
                          }}
                        >
                          <Checkbox
                            checked={selectedDocumentId === doc.id}
                            onCheckedChange={(checked) => {
                              setSelectedDocumentId(checked ? doc.id : null);
                            }}
                            className="flex-shrink-0"
                          />
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {doc.referenceNumber && (
                                <>
                                  <Hash className="h-3 w-3 inline mr-1" />
                                  {doc.referenceNumber} •{' '}
                                </>
                              )}
                              {formatDate(doc.updatedAt)}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {doc.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground font-medium mb-1">
                        {documentSearchQuery.trim() ? 'No documents found' : 'No documents available'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {documentSearchQuery.trim() 
                          ? `No documents match "${documentSearchQuery}". Try different search terms.`
                          : 'No documents found. Create a document in DMS to attach it to your response.'}
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* Optional Notes for Document Response */}
            {!focusMode && responseType === 'existing-document' && (
              <div className="space-y-2">
                <Label htmlFor="response-notes">Notes (Optional)</Label>
                <Textarea
                  id="response-notes"
                  value={memoContent}
                  onChange={(e) => {
                    setMemoContent(e.target.value);
                    setCharacterCount(e.target.value.length);
                  }}
                  placeholder="Add any additional notes or instructions..."
                  rows={3}
                  maxLength={1000}
                />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Optional notes to accompany the document</span>
                  <span className={getCharacterCountColor(characterCount, 1000)}>
                    {characterCount} / 1000
                  </span>
                </div>
              </div>
            )}

            {/* Memo Composition Section - Only for memo response type */}
            {responseType === 'memo' && (
              <>
                <MemoCompositionSection
              memoSubject={memoSubject}
              onMemoSubjectChange={(subject) => {
                setMemoSubject(subject);
                if (memoSubjectError) setMemoSubjectError('');
              }}
              memoSubjectError={memoSubjectError}
              memoContent={memoContent}
              onMemoContentChange={handleContentChange}
              memoContentError={memoContentError}
              characterCount={characterCount}
              templates={memoTemplates}
              selectedTemplateId={selectedTemplateId}
              onTemplateSelect={(templateId) => setSelectedTemplateId(templateId)}
              onTemplateApply={handleApplyTemplate}
              onTemplateSave={handleSaveAsTemplate}
              newTemplateName={newTemplateName}
              onNewTemplateNameChange={setNewTemplateName}
              signatureImageUrl={userSignature?.imageData}
              showSuggestedNote={showSuggestedNote}
              suggestedCoveringNote={suggestedCoveringNote}
              onUseSuggestedNote={handleUseSuggestedNote}
              onDismissSuggestedNote={handleDismissSuggestedNote}
              hasFiles={uploadedFiles.length > 0}
              expanded={focusMode}
              onExpand={() => setFocusMode(true)}
            />
              </>
            )}

            {!focusMode && <Separator />}

            {/* Supporting files belong to the memo response */}
            {!focusMode && responseType === 'memo' && (
              <Collapsible open={attachmentsSectionOpen} onOpenChange={setAttachmentsSectionOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Supporting files
                      {uploadedFiles.length > 0 && (
                        <Badge variant="secondary" className="text-xs">{uploadedFiles.length}</Badge>
                      )}
                    </span>
                    {attachmentsSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  {/* File Upload Area - Using shared component */}
                  <FileUploadArea
                    files={uploadedFiles}
                    onFilesChange={(files) => {
                      // Use startTransition to defer state update until after render
                      startTransition(() => {
                        // Update local state
                        setUploadedFiles(files);
                        // Show suggested note if no content
                        if (files.length > 0 && !memoContent.trim()) {
                          setShowSuggestedNote(true);
                        }
                      });
                    }}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}

            {!focusMode && <Separator />}

            {/* Route formal response — shared Single / Parallel panel */}
            {!focusMode && (
            <PrimaryRoutePanel
              routeMode={routeMode}
              onRouteModeChange={setRouteMode}
              routeType={routeType}
              onRouteTypeChange={(v) => {
                setRouteType(v);
                if (v === 'office') {
                  setForwardTo('');
                  setForwardToError('');
                  setPersonSearchQuery('');
                } else {
                  setTargetOfficeId('');
                  setOfficeSearchQuery('');
                  setOfficeFilterDirectorate('all');
                  setOfficeFilterDivision('all');
                }
              }}
              forwardTo={forwardTo}
              onForwardToChange={setForwardTo}
              forwardToError={forwardToError}
              personSearchQuery={personSearchQuery}
              onPersonSearchQueryChange={setPersonSearchQuery}
              targetOfficeId={targetOfficeId}
              onTargetOfficeIdChange={(v) => {
                setTargetOfficeId(v);
                setForwardTo('');
              }}
              officeSearchQuery={officeSearchQuery}
              onOfficeSearchQueryChange={setOfficeSearchQuery}
              officeFilterDirectorate={officeFilterDirectorate}
              onOfficeFilterDirectorateChange={(v) => {
                setOfficeFilterDirectorate(v);
                setOfficeFilterDivision('all');
              }}
              officeFilterDivision={officeFilterDivision}
              onOfficeFilterDivisionChange={setOfficeFilterDivision}
              purpose={purpose}
              onPurposeChange={handlePurposeChange}
              allowApproval={false}
              itemLabel="response"
              parallelUserIds={parallelUserIds}
              onParallelUserIdsChange={setParallelUserIds}
              parallelOfficeIds={parallelOfficeIds}
              onParallelOfficeIdsChange={setParallelOfficeIds}
              branchConfigs={branchConfigs}
              onBranchConfigsChange={setBranchConfigs}
              defaultBranchText={memoContent.replace(/<[^>]+>/g, ' ').trim() || `Response to ${correspondence.referenceNumber}`}
              mergeStrategy={mergeStrategy}
              onMergeStrategyChange={setMergeStrategy}
              showDistribution={false}
              offices={officeOptions}
              directorates={directorates}
              divisions={divisions}
              users={knownUsers.filter((u) => u.id !== currentUser?.id)}
              assistantList={assistantList}
              approverList={approverList}
              suggestedNext={suggestedNext}
              findUserById={findUserById}
              getUserOfficeInfo={getUserOfficeInfo}
            />
            )}

          </div>
        </div>

        <DialogFooter className="-mx-4 flex-col gap-3 border-t border-border/60 bg-background/70 px-4 pt-4 backdrop-blur-xl sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button
            variant="ghost"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="gap-2 self-start rounded-full px-4 text-muted-foreground"
            aria-label="Save draft"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Draft
          </Button>
          <div className="flex items-center gap-3 sm:justify-end">
            {focusMode ? (
              <>
                <span className="hidden text-[11px] leading-snug text-muted-foreground sm:inline">
                  Sending is available in the full composer.
                </span>
                <Button
                  onClick={() => setFocusMode(false)}
                  className="shrink-0 gap-2 rounded-full px-5"
                >
                  Done
                </Button>
              </>
            ) : (
              <>
                {!hasRouteDestination && (
                  <span
                    id="treatment-route-hint"
                    className="min-w-0 text-xs leading-snug text-muted-foreground sm:max-w-[200px] sm:text-right"
                  >
                    {routeMode === 'parallel'
                      ? 'Add at least two people or offices to send separately.'
                      : 'Select a destination to send.'}
                  </span>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !hasRouteDestination}
                  className="shrink-0 gap-2 rounded-full bg-gradient-primary px-5"
                  aria-label="Send response"
                  aria-describedby={!hasRouteDestination ? 'treatment-route-hint' : undefined}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Send Response
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirm}
        type="treatment"
        data={{
          currentUserName: currentUser?.name || '',
          recipientName: selectedRecipient?.name || (targetOfficeId ? offices.find(o => o.id === targetOfficeId)?.name || 'Office' : ''),
          subject: memoSubject,
          content: memoContent.replace(/\s*(?:color|background|background-color)\s*:\s*[^;"']+;?\s*/gi, ''),
          fileAttachments: uploadedFiles.map(f => ({ name: f.name, size: f.size, url: f.preview || URL.createObjectURL(f.file) })),
          onBehalfOf: actingFor?.name,
          direction: correspondence.direction as any,
        }}
        disabled={isSubmitting}
      />
    </>
  );
};

// Wrap with error boundary and memo
const TreatmentModalWithErrorBoundary = React.memo((props: TreatmentModalProps) => (
  <ModalErrorBoundary onClose={props.onClose}>
    <TreatmentModalComponent {...props} />
  </ModalErrorBoundary>
));

TreatmentModalWithErrorBoundary.displayName = 'TreatmentModal';

export { TreatmentModalWithErrorBoundary as TreatmentModal };
