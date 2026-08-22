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
import { generateId, generateReferenceNumber, getNextStepNumber, formatDateForAPI } from '@/lib/correspondence-helpers';
import { saveDraft, getDraftByCorrespondence, deleteDraft } from '@/lib/storage';
import type { Correspondence, User } from '@/lib/npa-structure';
import { GRADE_LEVELS } from '@/lib/npa-structure';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { useOrganization } from '@/contexts/OrganizationContext';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { ModalErrorHandler } from '@/lib/modal-errors';
import { getSuggestedApprovers } from '@/lib/routing-utils';
import { RoutingSection } from './RoutingSection';


import { useSignature } from '@/hooks/use-signature';
import { SignatureSection } from './SignatureSection';
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
  queryDocuments,
} from '@/lib/api/dms';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate } from '@/lib/correspondence-helpers';

interface TreatmentModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: (result?: { createdResponseId?: string }) => void;
}

// UploadedFile type is now imported from use-file-upload hook

const TreatmentModalComponent = ({ correspondence, isOpen, onClose }: TreatmentModalProps) => {
  const {addCorrespondence: _addCorrespondence, addMinute: _addMinute, updateCorrespondence: _updateCorrespondence, getMinutesByCorrespondenceId, syncFromApi } = useCorrespondence();
  const { currentUser: activeUser } = useCurrentUser();
  const { users, divisions, departments, offices, officeMemberships, directorates } = useOrganization();
  
  // Form state
  const [currentUser, setCurrentUser] = useState(activeUser ?? null);
  const [responseType, setResponseType] = useState<'memo' | 'existing-document' | 'new-document'>('memo');
  const [memoSubject, setMemoSubject] = useState(`Re: ${correspondence.subject}`);
  const [memoSubjectError, setMemoSubjectError] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [memoContentError, setMemoContentError] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [forwardToError, setForwardToError] = useState('');
  const [onBehalfOf, setOnBehalfOf] = useState('');
  const [purpose, setPurpose] = useState<'action' | 'information' | 'comment' | 'approval'>('action');
  
  // Routing state (like MinuteModal)
  const [routeType, setRouteType] = useState<'person' | 'office'>('person');
  const [targetOfficeId, setTargetOfficeId] = useState<string>('');
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [officeSearchQuery, setOfficeSearchQuery] = useState('');
  const [officeFilterDirectorate, setOfficeFilterDirectorate] = useState<string>('all');
  const [officeFilterDivision, setOfficeFilterDivision] = useState<string>('all');
  
  // Document selection state (for existing document response type)
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  
  // UI state
  const [characterCount, setCharacterCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [_searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentsSectionOpen, setAttachmentsSectionOpen] = useState(false);
  
  // Removed old filtering state - now using RoutingSection
  
  // Templates state
  const [memoTemplates, setMemoTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  // Signature state - using shared hook
  const [applySignature, setApplySignature] = useState(false);
  const [applySignatureManuallySet, setApplySignatureManuallySet] = useState(false);
  const [selectedSignatureTemplateId, setSelectedSignatureTemplateId] = useState<string | null>(null);
  const { signature: userSignature, templates: signatureTemplates, preferences: userSignaturePreferences } = useSignature({
    userId: activeUser?.id,
    autoLoad: isOpen,
  });
  
  // Check if user is executive
  const isExecutive = useMemo(() => {
    if (!activeUser?.gradeLevel) return false;
    const executiveGrades = ['MDCS', 'EDCS', 'MSS1', 'MSS2', 'MSS3'];
    return executiveGrades.includes(activeUser.gradeLevel);
  }, [activeUser?.gradeLevel]);
  
  // File upload state - managed locally, FileUploadArea handles UI
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [_isDragActive, _setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Request cancellation
  const { getSignal, reset } = useAbortController();

  const activeUsers = useMemo(() => users.filter((user) => user.active), [users]);

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

  const findUserById = useCallback(
    (id?: string | null) => (id ? users.find((user) => user.id === id) : undefined),
    [users],
  );

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
        if (draft.forwardTo) setForwardTo(draft.forwardTo);
        if (draft.onBehalfOf) setOnBehalfOf(draft.onBehalfOf);
        setHasDraft(true);
        setDraftId(draft.id);
        
        // Show warning if draft had files (we can't restore File objects from localStorage)
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
        setDocuments(response.results);
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

  // Auto-apply signature for approvals (like MinuteModal)
  useEffect(() => {
    if (purpose === 'approval') {
      setApplySignature(true);
      setApplySignatureManuallySet(false);
      return;
    }

    if (!userSignature) {
      setApplySignature(false);
      setApplySignatureManuallySet(false);
      return;
    }

    if (!applySignatureManuallySet) {
      setApplySignature(userSignaturePreferences.autoApplyForMinutes ?? false);
    }
  }, [purpose, userSignature, userSignaturePreferences.autoApplyForMinutes, applySignatureManuallySet]);

  useEffect(() => {
    setApplySignatureManuallySet(false);
  }, [purpose]);

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
    setOnBehalfOf('');
    setSearchQuery('');
    setMemoSubjectError('');
    setMemoContentError('');
    setForwardToError('');
    setUploadedFiles([]);
    setApplySignature(false);
    setApplySignatureManuallySet(false);
    setSelectedTemplateId(null);
    setSelectedSignatureTemplateId(null);
  };

  const getRelationshipLabel = (current: typeof currentUser, superior: typeof currentUser) => {
    if (!current || !superior) return '';
    const currentLevel = GRADE_LEVELS.find(g => g.code === current.gradeLevel)?.level || 0;
    const superiorLevel = GRADE_LEVELS.find(g => g.code === superior.gradeLevel)?.level || 0;
    const gradeDiff = superiorLevel - currentLevel;
    if (gradeDiff === 1) return 'Your Direct Supervisor';
    if (gradeDiff === 2) return 'Your Director';
    if (gradeDiff >= 3) return 'Executive Level';
    return 'Supervisor';
  };

  const getBehalfOfOptions = () => {
    if (!currentUser) return [];
    const gradeOrder = [...GRADE_LEVELS].sort((a, b) => b.level - a.level).map((g) => g.code);
    const currentGradeIndex = gradeOrder.indexOf(currentUser.gradeLevel);
    if (currentGradeIndex === 0) return [];
    const superiorGrade = gradeOrder[currentGradeIndex - 1];
    return activeUsers
      .filter(
        (user) => user.gradeLevel === superiorGrade && user.division === currentUser.division,
      )
      .map(user => ({
        ...user,
        relationship: getRelationshipLabel(currentUser, user),
      }));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const behalfOfOptions = useMemo(() => getBehalfOfOptions(), [activeUsers, currentUser?.id, divisions]);

  // Get suggested approvers for routing (like MinuteModal)
  const existingMinutes = useMemo(() => getMinutesByCorrespondenceId(correspondence.id), [correspondence.id, getMinutesByCorrespondenceId]);
  
  const approverList = useMemo(() => {
    if (!currentUser) return [];
    return getSuggestedApprovers({
      currentUser,
      direction: correspondence.direction,
      correspondence,
      existingMinutes,
      offices,
      officeMemberships,
      activeUsers,
    });
  }, [currentUser, correspondence, existingMinutes, offices, officeMemberships, activeUsers]);

  const assistantList: User[] = []; // Not used for treatment responses
  
  const suggestedNext = approverList[0]; // First suggested approver
  
  // Helper functions for RoutingSection
  const getUserOfficeInfo = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
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
  }, [users, officeMemberships, offices, divisions]);
  
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

  // Get relevant signature templates for treatment
  const relevantSignatureTemplates = useMemo(() => {
    return signatureTemplates.filter(t => 
      t.templateType === 'treatment' || t.templateType === 'minute'
    );
  }, [signatureTemplates]);

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
  const getTemplatePlainText = (template: DocumentTemplate): string => {
    if (template.contentText && template.contentText.trim().length > 0) {
      return template.contentText.trim();
    }
    if (!template.contentHtml) return '';
    return template.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const handleApplyTemplate = (template: DocumentTemplate) => {
      let content = template.contentHtml || template.contentText || '';

      const senderDivision = currentUser?.division ? divisions.find(d => d.id === currentUser.division) : undefined;
      const senderDepartment = currentUser?.department ? departments.find(d => d.id === currentUser.department) : undefined;
      const senderDirectorate = currentUser?.directorate ? directorates.find(d => d.id === currentUser.directorate) : undefined;
      const recipientUser = forwardTo ? users.find(u => u.id === forwardTo) : undefined;

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

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'Escape',
      action: () => {
        if (isOpen && !showConfirmation) {
          onClose();
        }
      },
      description: 'Close modal',
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

    // Validate recipient - either person or office must be selected
    if (!forwardTo && !targetOfficeId) {
      setForwardToError('Please select a recipient (person or office)');
      return false;
    }

    // Signature validation - only for approvals
    if (purpose === 'approval') {
      if (!userSignature) {
        toast.error('A digital signature is required to approve. Upload your signature in Settings → Signature.');
        return false;
      }
      if (applySignature && relevantSignatureTemplates.length > 0 && !selectedSignatureTemplateId) {
        toast.error('Please select a signature template');
        return false;
      }
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
    
    // Determine recipient - use person if selected, otherwise use office primary member
    let recipient = forwardTo ? findUserById(forwardTo) : null;
    let recipientOfficeId = targetOfficeId || undefined;
    
    // If routing to office, try to get primary member
    if (!recipient && targetOfficeId) {
      const primaryMember = officeMemberships.find(
        (m) => m.officeId === targetOfficeId && m.isPrimary && m.isActive,
      );
      if (primaryMember) {
        recipient = findUserById(primaryMember.userId);
      }
    }
    
    // Fallback: use forwardTo if available
    if (!recipient && forwardTo) {
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
      
      if (purpose === 'approval' && applySignature && selectedSignatureTemplateId) {
        const signatureTemplate = relevantSignatureTemplates.find(t => t.id === selectedSignatureTemplateId);
        if (signatureTemplate) {
          minuteText += `\n\n---\n${signatureTemplate.name}`;
        }
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
          direction: correspondence.direction,
          step_number: nextStep,
          from_office_id: currentUserOfficeId || undefined,
          to_office_id: recipientOfficeId || targetOfficeId || undefined,
          to_user_id: forwardTo || undefined,
          signature: applySignature && userSignature ? userSignature.imageData : null,
        }),
      });
      createdMinuteId = minuteResponse?.id ?? null;

      // Update original correspondence - auto-complete when treating and responding
      // This marks the original as completed since a response has been created
      const correspondenceUpdate: Record<string, unknown> = {
        direction: correspondence.direction,
        status: 'completed',
      };
      
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
      
      await apiFetch(`/correspondence/items/${correspondence.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(correspondenceUpdate),
        signal,
      });
      originalCorrespondenceUpdated = true;

      // Create new response correspondence with body_html and attachments
      const responseFormData = new FormData();
      responseFormData.append('reference_number', generateReferenceNumber(division?.code || 'NPA'));
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
      // Set recipient - prefer person, fallback to office primary member
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
        description: actingFor
          ? `Sent to ${recipient?.name ?? 'selected user'} on behalf of ${actingFor.name}`
          : `Sent to ${recipient?.name ?? 'selected user'}`,
      });

      // Also notify that original correspondence was completed
      toast.success('Original correspondence marked as completed', {
        description: 'A completion package will be generated automatically.',
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
        forwardTo,
        onBehalfOf: onBehalfOf !== 'none' ? onBehalfOf : undefined,
        applySignature: purpose === 'approval' ? applySignature : undefined,
        selectedSignatureTemplateId: purpose === 'approval' ? (selectedSignatureTemplateId ?? undefined) : undefined,
        files: fileMetadata.length > 0 ? fileMetadata : undefined,
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

  const divisionEntity = currentUser.division
    ? divisions.find((division) => division.id === currentUser.division) ?? null
    : null;
  const selectedRecipient = forwardTo ? findUserById(forwardTo) ?? null : null;
  const actingFor = onBehalfOf && onBehalfOf !== 'none' ? findUserById(onBehalfOf) ?? null : null;

  return (
    <>
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="full" height="fill">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            Treat & Respond
            {hasDraft && (
              <Badge variant="secondary" className="ml-2 text-xs">Draft</Badge>
            )}
            {uploadedFiles.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Compose a response memo or attach an existing document to respond to this correspondence
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 pr-4">
          <div className="space-y-6 py-2">
            {/* Original Correspondence Card */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="font-semibold text-sm mb-1 break-words">
                      Original: {correspondence.subject}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span className="truncate">Ref: {correspondence.referenceNumber}</span>
                      <span className="flex-shrink-0">•</span>
                      <span className="truncate">From: {correspondence.senderName}</span>
                      {divisionEntity && (
                        <>
                          <span className="flex-shrink-0">•</span>
                          <span className="truncate">{divisionEntity.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      correspondence.priority === 'urgent' ? 'destructive' :
                      correspondence.priority === 'high' ? 'default' : 'secondary'
                    }
                    className="flex-shrink-0"
                  >
                    {correspondence.priority}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Acting on Behalf Of */}
            {behalfOfOptions.length > 0 && (
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
                  <Card className="bg-info/5 border-info/20">
                    <CardContent className="p-3">
                      <div className="space-y-1">
                        <p className="text-xs flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-info" />
                          <strong>Acting on behalf of:</strong> {actingFor.name}
                        </p>
                        <p className="text-xs text-muted-foreground pl-6">
                          {actingFor.systemRole} • {behalfOfOptions.find(o => o.id === actingFor.id)?.relationship || 'Supervisor'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Separator />

            {/* Response Type Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Response Type *
              </Label>
              <RadioGroup value={responseType} onValueChange={(v: string) => {
                setResponseType(v as typeof responseType);
                // Reset document selection when switching away from existing-document
                if (v !== 'existing-document') {
                  setSelectedDocumentId(null);
                  setDocumentSearchQuery('');
                }
                // Reset memo content and errors when switching to document
                if (v === 'existing-document') {
                  setMemoContent('');
                  setCharacterCount(0);
                  setMemoContentError('');
                } else if (v === 'memo') {
                  // Clear document-related errors when switching to memo
                  // Keep memo content if user was typing
                }
              }}>
                <div className="space-y-3">
                  {/* Memo Option */}
                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="memo" id="response-memo" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="response-memo" className="font-medium cursor-pointer flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        Memo Response
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Compose a formal response memo with text content.
                      </p>
                    </div>
                  </div>

                  {/* Existing Document Option */}
                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="existing-document" id="response-document" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="response-document" className="font-medium cursor-pointer flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-purple-500" />
                        Attach Existing Document
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Attach an existing DMS document to your response.
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Document Selection Section - Only for existing document */}
            {responseType === 'existing-document' && (
              <div className="space-y-2">
                <Label htmlFor="document-search">Select Document <span className="text-destructive">*</span></Label>
                
                {/* Selected Document Preview */}
                {selectedDocumentId && (() => {
                  const selectedDoc = documents.find(d => d.id === selectedDocumentId);
                  if (!selectedDoc) return null;
                  return (
                    <Card className="border-primary/30 bg-primary/5 overflow-hidden mb-2">
                      <CardContent className="p-3">
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
                      </CardContent>
                    </Card>
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
            {responseType === 'existing-document' && (
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
              getTemplatePlainText={getTemplatePlainText}
              signatureImageUrl={userSignature?.imageData}
              showSuggestedNote={showSuggestedNote}
              suggestedCoveringNote={suggestedCoveringNote}
              onUseSuggestedNote={handleUseSuggestedNote}
              onDismissSuggestedNote={handleDismissSuggestedNote}
              hasFiles={uploadedFiles.length > 0}
            />
              </>
            )}

            <Separator />

            {/* Attachments Section - Only for Memo Response */}
            {responseType === 'memo' && (
              <Collapsible open={attachmentsSectionOpen} onOpenChange={setAttachmentsSectionOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attachments
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

            <Separator />

            {/* Route To - Using RoutingSection component (like MinuteModal) */}
            <RoutingSection
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
              onPurposeChange={setPurpose}
              offices={officeOptions}
              directorates={directorates}
              divisions={divisions}
              users={activeUsers}
              assistantList={assistantList}
              approverList={approverList}
              suggestedNext={suggestedNext}
              findUserById={findUserById}
              getUserOfficeInfo={getUserOfficeInfo}
            />

            <Separator />

            {/* Signature Section - Only for Approvals (like MinuteModal) */}
            {purpose === 'approval' && (
              <SignatureSection
                signature={userSignature}
                currentUser={currentUser}
                actionType="minute"
                isExecutive={isExecutive}
                applySignature={applySignature}
                onApplySignatureChange={(checked) => {
                  setApplySignatureManuallySet(true);
                  setApplySignature(checked);
                }}
                signatureTemplates={relevantSignatureTemplates}
                selectedTemplateId={selectedSignatureTemplateId}
                onTemplateChange={setSelectedSignatureTemplateId}
                showTemplateSelector={true}
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-primary">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Response
              </>
            )}
          </Button>
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
          direction: correspondence.direction,
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
