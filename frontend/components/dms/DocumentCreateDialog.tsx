"use client";

import { logError } from '@/lib/client-logger';
import { useEffect, useMemo, useState, useCallback, useRef, startTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  createDocument,
  fetchWorkspaces,
  queryDocuments,
  type DocumentRecord,
  type DocumentType,
  type DocumentStatus,
  type DocumentSensitivity,
  type DocumentWorkspace,
} from '@/lib/dms-storage';
import type { User } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { RichTextEditor } from './RichTextEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getTemplatesForUser,
  getDefaultTemplateForUser,
  createTemplate as createTemplateRecord,
  type DocumentTemplate,
} from '@/lib/template-storage';
import { AlertTriangle, Loader2, Save, FilePlus, FileText, CheckCircle2, HelpCircle } from 'lucide-react';
import { fileToDataUrl } from '@/lib/file-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'form', 'other'];
const SENSITIVITY_OPTIONS: DocumentSensitivity[] = ['public', 'internal', 'confidential', 'restricted'];

const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_REFERENCE_LENGTH = 100;

const DRAFT_STORAGE_KEY = 'dms_document_create_draft';

const sensitivityLabel = (sensitivity: DocumentSensitivity): string => {
  switch (sensitivity) {
    case 'public':
      return 'Public';
    case 'internal':
      return 'Internal';
    case 'confidential':
      return 'Confidential';
    case 'restricted':
      return 'Restricted';
    default:
      return sensitivity;
  }
};

interface DocumentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
  onComplete: (document: DocumentRecord) => void;
}

export const DocumentCreateDialog = ({
  open,
  onOpenChange,
  currentUser,
  onComplete,
}: DocumentCreateDialogProps) => {
  const { divisions, departments } = useOrganization();
  const activeDivisions = useMemo(() => divisions.filter((division) => division.isActive !== false), [divisions]);
  const activeDepartments = useMemo(() => departments.filter((department) => department.isActive !== false), [departments]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('memo');
  const [status, setStatus] = useState<DocumentStatus>('draft');
  const [divisionId, setDivisionId] = useState<string | undefined>(currentUser.division);
  const [departmentId, setDepartmentId] = useState<string | undefined>(currentUser.department);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [sensitivity, setSensitivity] = useState<DocumentSensitivity>('internal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editorHtml, setEditorHtml] = useState('');
  const [editorJson, setEditorJson] = useState<Record<string, unknown> | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateApplied, setTemplateApplied] = useState(false);
  const [templatePreviewId, setTemplatePreviewId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<DocumentWorkspace[]>([]);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(false);
  const [pendingTemplateAction, setPendingTemplateAction] = useState<'apply' | 'preview' | null>(null);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [checkingReferenceNumber, setCheckingReferenceNumber] = useState(false);
  const [referenceNumberExists, setReferenceNumberExists] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [editorCharacterCount, setEditorCharacterCount] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Force release any potential scroll locks on unmount using the global window object
      if (typeof window !== 'undefined') {
        window.document.body.style.pointerEvents = 'auto';
        window.document.body.style.overflow = 'auto';
      }
    };
  }, []);

  // Filter departments based on selected division
  const filteredDepartments = useMemo(() => {
    if (!divisionId) return activeDepartments;
    return activeDepartments.filter((dept) => dept.divisionId === divisionId);
  }, [divisionId, activeDepartments]);

  // Clear department when division changes
  useEffect(() => {
    if (divisionId && departmentId) {
      const dept = activeDepartments.find((d) => d.id === departmentId);
      if (dept && dept.divisionId !== divisionId) {
        setDepartmentId(undefined);
      }
    }
  }, [divisionId, departmentId, activeDepartments]);

  // Load workspaces
  useEffect(() => {
    if (!open) return;
    const loadWorkspaces = async () => {
      try {
        const ws = await fetchWorkspaces();
        setWorkspaces(ws);
      } catch (error) {
        logError('Failed to load workspaces', error);
      }
    };
    void loadWorkspaces();
  }, [open]);

  // Save draft to localStorage
  useEffect(() => {
    if (!open || !isMountedRef.current) return;
    
    const draft = {
      title,
      description,
      documentType,
      status,
      divisionId,
      departmentId,
      referenceNumber,
      tagsInput,
      sensitivity,
      selectedWorkspaceIds,
      editorHtml,
      selectedTemplateId,
    };
    
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && open) {
        try {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch (err) {
          // Ignore localStorage errors
        }
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [open, title, description, documentType, status, divisionId, departmentId, referenceNumber, tagsInput, sensitivity, selectedWorkspaceIds, editorHtml, selectedTemplateId]);

  // Load draft from localStorage on open
  useEffect(() => {
    if (!open || !isMountedRef.current) return;
    
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved && isMountedRef.current) {
        const draft = JSON.parse(saved);
        if (isMountedRef.current && (draft.title || draft.editorHtml)) {
          setTitle(draft.title || '');
          setDescription(draft.description || '');
          setDocumentType(draft.documentType || 'memo');
          setStatus(draft.status || 'draft');
          setDivisionId(draft.divisionId);
          setDepartmentId(draft.departmentId);
          setReferenceNumber(draft.referenceNumber || '');
          setTagsInput(draft.tagsInput || '');
          setSensitivity(draft.sensitivity || 'internal');
          setSelectedWorkspaceIds(draft.selectedWorkspaceIds || []);
          setEditorHtml(draft.editorHtml || '');
          setSelectedTemplateId(draft.selectedTemplateId || null);
          setDraftRestored(true);
          toast.info('Draft restored from previous session', { duration: 3000 });
        }
      }
    } catch (err) {
      // Ignore parse errors
    }
  }, [open]);

  // Check for duplicate reference numbers
  useEffect(() => {
    if (!referenceNumber.trim()) {
      setReferenceNumberExists(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingReferenceNumber(true);
      try {
        const result = await queryDocuments({ 
          page: 1, 
          pageSize: 100,
          referenceNumber: referenceNumber.trim(),
        });
        const exists = result.documents.some((doc) => 
          doc.referenceNumber?.toLowerCase() === referenceNumber.trim().toLowerCase()
        );
        setReferenceNumberExists(exists);
        if (exists) {
          setValidationErrors((prev) => ({
            ...prev,
            referenceNumber: 'This reference number already exists',
          }));
        } else {
          setValidationErrors((prev) => {
            const next = { ...prev };
            delete next.referenceNumber;
            return next;
          });
        }
      } catch (error) {
        // Silently fail - duplicate check is optional
        logError('Failed to check reference number', error);
      } finally {
        setCheckingReferenceNumber(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [referenceNumber]);

  // Templates are now loaded from backend - no initialization needed

  useEffect(() => {
    if (!currentUser) return;
    setIsLoadingTemplates(true);
    try {
      const available = await getTemplatesForUser(currentUser);
      setTemplates(available);
      if (!selectedTemplateId) {
        const defaultTemplate = await getDefaultTemplateForUser(currentUser);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        }
      }
    } catch (error) {
      logError('Failed to load templates:', error);
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [currentUser, selectedTemplateId]);

  useEffect(() => {
    if (templateApplied) return;
    if (selectedTemplateId && editorHtml.trim().length === 0) {
      const template = templates.find((item) => item.id === selectedTemplateId);
      if (template) {
        setEditorHtml(template.contentHtml);
        setEditorJson(null);
        setTemplateApplied(true);
      }
    }
  }, [templateApplied, selectedTemplateId, templates, editorHtml]);

  // Validation functions
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length > MAX_TITLE_LENGTH) {
      errors.title = `Title must be less than ${MAX_TITLE_LENGTH} characters`;
    }
    
    if (referenceNumber && referenceNumber.length > MAX_REFERENCE_LENGTH) {
      errors.referenceNumber = `Reference number must be less than ${MAX_REFERENCE_LENGTH} characters`;
    }
    
    // Validate tags for duplicates
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const uniqueTags = new Set(tags);
    if (tags.length !== uniqueTags.size) {
      errors.tags = 'Duplicate tags are not allowed';
    }

    if (!editorHtml || editorHtml.trim().length === 0) {
      errors.content = 'Please enter document content';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [title, referenceNumber, tagsInput, editorHtml]);

  // Replace tokens in template HTML
  const replaceTemplateTokens = useCallback((html: string): string => {
    const division = divisionId
      ? activeDivisions.find((div) => div.id === divisionId)
      : currentUser.division
      ? activeDivisions.find((div) => div.id === currentUser.division)
      : undefined;
    const department = departmentId
      ? activeDepartments.find((dept) => dept.id === departmentId)
      : currentUser.department
      ? activeDepartments.find((dept) => dept.id === currentUser.department)
      : undefined;
    
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    return html
      .replace(/\{\{document\.title\}\}/g, title || 'Document Title')
      .replace(/\{\{document\.reference\}\}/g, referenceNumber || 'N/A')
      .replace(/\{\{preparedBy\.name\}\}/g, currentUser.name || 'Unknown')
      .replace(/\{\{preparedBy\.role\}\}/g, currentUser.systemRole || 'User')
      .replace(/\{\{division\.name\}\}/g, division?.name || 'Division')
      .replace(/\{\{department\.name\}\}/g, department?.name || 'Department')
      .replace(/\{\{date\.today\}\}/g, formattedDate);
  }, [currentUser, divisionId, departmentId, title, referenceNumber, activeDivisions, activeDepartments]);

  const resetState = useCallback(() => {
    setTitle('');
    setDescription('');
    setDocumentType('memo');
    setStatus('draft');
    setDivisionId(currentUser.division);
    setDepartmentId(currentUser.department);
    setReferenceNumber('');
    setTagsInput('');
    setEditorHtml('');
    setEditorJson(null);
    setTemplateApplied(false);
    setTemplatePreviewId(null);
    setSensitivity('internal');
    setSelectedWorkspaceIds([]);
    setValidationErrors({});
    setUploadProgress(0);
    setDraftRestored(false);
    setReferenceNumberExists(false);
    setEditorCharacterCount(0);
    if (currentUser) {
      getDefaultTemplateForUser(currentUser).then((defaultTemplate) => {
        setSelectedTemplateId(defaultTemplate ? defaultTemplate.id : null);
      }).catch((error) => {
        logError('Failed to load default template:', error);
        setSelectedTemplateId(null);
      });
    } else {
      setSelectedTemplateId(null);
    }
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (err) {
      // Ignore
    }
  }, [currentUser]);

  const handleClose = useCallback((nextOpen: boolean) => {
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open && isMountedRef.current) {
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          resetState();
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [open, resetState]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      
      const uniqueTags = Array.from(new Set(tags));

      // Replace template tokens in content before creating document
      const contentHtml = replaceTemplateTokens(editorHtml);
      const contentJson = editorJson ?? undefined;
      const fileType = 'text/html';
      const fileName = `${title.trim().replace(/\s+/g, '-') || 'document'}.html`;
      const htmlFile = new File([contentHtml], fileName, { type: fileType });
      const fileSize = htmlFile.size;
      const fileUrl = await fileToDataUrl(htmlFile);

      setUploadProgress(50);
      
      const created = await createDocument(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          documentType,
          status,
          sensitivity,
          divisionId,
          departmentId,
          referenceNumber: referenceNumber.trim() || undefined,
          tags: uniqueTags,
          authorId: currentUser.id,
          workspaceIds: selectedWorkspaceIds.length > 0 ? selectedWorkspaceIds : undefined,
        },
        {
          fileName,
          fileType,
          fileSize,
          fileUrl,
          contentHtml,
          contentJson,
        },
      );
      
      setUploadProgress(100);

      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (err) {
        // Ignore
      }
      toast.success('Document created successfully');
      handleClose(false);
      // Call onComplete after dialog closes
      setTimeout(() => {
        onComplete(created);
      }, 200);
    } catch (error: unknown) {
      logError('Document creation error:', error);
      
      let errorMessage = 'Failed to create document. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: unknown } }).response;
        if (response?.data && typeof response.data === 'object') {
          const data = response.data as Record<string, unknown>;
          if (data.title && Array.isArray(data.title)) {
            errorMessage = `Title: ${(data.title as string[]).join(', ')}`;
          } else if (data.detail && typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
            errorMessage = (data.non_field_errors as string[]).join(', ');
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error('Failed to create document', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }, [validateForm, tagsInput, editorHtml, editorJson, title, description, documentType, status, sensitivity, divisionId, departmentId, referenceNumber, currentUser, selectedWorkspaceIds, onComplete, handleClose, replaceTemplateTokens]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isSubmitting) {
          void handleSubmit();
        }
      }
      if (e.key === 'Escape' && !showTemplateConfirm && !showSaveTemplateDialog) {
        handleClose(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isSubmitting, showTemplateConfirm, showSaveTemplateDialog, handleSubmit, handleClose]);

  const templateTokens = useMemo(() => {
    if (!currentUser) return [];
    const division = divisionId
      ? activeDivisions.find((div) => div.id === divisionId)
      : currentUser.division
      ? activeDivisions.find((div) => div.id === currentUser.division)
      : undefined;
    const department = departmentId
      ? activeDepartments.find((dept) => dept.id === departmentId)
      : currentUser.department
      ? activeDepartments.find((dept) => dept.id === currentUser.department)
      : undefined;

    const today = new Date();
    const sampleDate = today.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return [
      {
        label: 'Document Title',
        value: '{{document.title}}',
        description: title ? `Sample: ${title}` : 'Replaced with the document title',
      },
      {
        label: 'Document Reference',
        value: '{{document.reference}}',
        description: referenceNumber ? `Sample: ${referenceNumber}` : 'Replaced with the reference number',
      },
      {
        label: 'Prepared By (Name)',
        value: '{{preparedBy.name}}',
        description: currentUser.name,
      },
      {
        label: 'Prepared By (Role)',
        value: '{{preparedBy.role}}',
        description: currentUser.systemRole,
      },
      {
        label: 'Division Name',
        value: '{{division.name}}',
        description: division?.name ?? 'Division linked to this document',
      },
      {
        label: 'Department Name',
        value: '{{department.name}}',
        description: department?.name ?? 'Department linked to this document',
      },
      {
        label: 'Current Date',
        value: '{{date.today}}',
        description: `Sample: ${sampleDate}`,
      },
    ];
  }, [currentUser, divisionId, departmentId, title, referenceNumber, activeDivisions, activeDepartments]);

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-5xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[85vh] overflow-hidden p-4 sm:p-6"
        onPointerDownOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="h-5 w-5 text-primary" />
            Create New Document
          </DialogTitle>
          <DialogDescription>Create a new document using the rich text editor</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* Draft Restored Notification */}
            {draftRestored && (
              <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  Your previous draft has been restored. You can continue editing or start fresh.
                </AlertDescription>
              </Alert>
            )}

            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Basic Information</h3>
              </div>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label htmlFor="doc-title" className="text-sm font-medium">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="doc-title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (validationErrors.title) {
                        setValidationErrors((prev) => {
                          const next = { ...prev };
                          delete next.title;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. Port Operations Circular"
                    aria-label="Document title"
                    aria-required="true"
                    aria-invalid={!!validationErrors.title}
                    aria-describedby={validationErrors.title ? "title-error" : "title-help"}
                    maxLength={MAX_TITLE_LENGTH}
                  />
                  {validationErrors.title && (
                    <p id="title-error" className="text-xs text-destructive" role="alert">
                      {validationErrors.title}
                    </p>
                  )}
                  <p id="title-help" className="text-xs text-muted-foreground">
                    {title.length}/{MAX_TITLE_LENGTH} characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as DocumentStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        <div className="flex flex-col">
                          <span>Draft</span>
                          <span className="text-xs text-muted-foreground">Work in progress • Not published</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="published">
                        <div className="flex flex-col">
                          <span>Published</span>
                          <span className="text-xs text-muted-foreground">Finalized and available</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="archived">
                        <div className="flex flex-col">
                          <span>Archived</span>
                          <span className="text-xs text-muted-foreground">No longer active</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {status === 'draft' && (
                    <div className="flex items-start gap-2 p-2 bg-muted/50 border border-border rounded text-xs">
                      <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">
                        Draft documents are work in progress and not yet published. You can edit and finalize later.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Classification & Organization Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Classification & Organization</h3>
              </div>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Division</Label>
                  <Select
                    value={divisionId ?? 'none'}
                    onValueChange={(value) => {
                      setDivisionId(value === 'none' ? undefined : value);
                      // Clear department when division changes
                      if (value === 'none') {
                        setDepartmentId(undefined);
                      } else {
                        // Validate department belongs to new division
                        if (departmentId) {
                          const dept = activeDepartments.find((d) => d.id === departmentId);
                          if (dept && dept.divisionId !== value) {
                            setDepartmentId(undefined);
                          }
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {activeDivisions.map((division) => (
                        <SelectItem key={division.id} value={division.id}
                          className="flex flex-col items-start gap-1"
                        >
                          <span className="text-sm font-medium">{division.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {division.code ?? division.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={departmentId ?? 'none'}
                    onValueChange={(value) => setDepartmentId(value === 'none' ? undefined : value)}
                    disabled={!divisionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={divisionId ? "Select department" : "Select division first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {filteredDepartments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!divisionId && (
                    <p className="text-xs text-muted-foreground">
                      Select a division first to choose a department
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference-number">Reference Number</Label>
                  <div className="relative">
                    <Input
                      id="reference-number"
                      value={referenceNumber}
                      onChange={(e) => {
                        setReferenceNumber(e.target.value);
                        if (validationErrors.referenceNumber) {
                          setValidationErrors((prev) => {
                            const next = { ...prev };
                            delete next.referenceNumber;
                            return next;
                          });
                        }
                      }}
                      placeholder="e.g. NPA/MOPS/2024/045"
                      aria-label="Reference number"
                      aria-invalid={!!validationErrors.referenceNumber || referenceNumberExists}
                      aria-describedby={validationErrors.referenceNumber || referenceNumberExists ? "reference-error" : undefined}
                      maxLength={MAX_REFERENCE_LENGTH}
                      className={referenceNumberExists ? "border-destructive" : ""}
                    />
                    {checkingReferenceNumber && (
                      <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {validationErrors.referenceNumber && (
                    <p id="reference-error" className="text-xs text-destructive" role="alert">
                      {validationErrors.referenceNumber}
                    </p>
                  )}
                  {referenceNumberExists && !validationErrors.referenceNumber && (
                    <p id="reference-error" className="text-xs text-destructive" role="alert">
                      This reference number already exists. Please use a unique reference number.
                    </p>
                  )}
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description of the document"
                    aria-label="Document description"
                    maxLength={MAX_DESCRIPTION_LENGTH}
                  />
                  <p className="text-xs text-muted-foreground">
                    {description.length}/{MAX_DESCRIPTION_LENGTH} characters
                  </p>
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={tagsInput}
                    onChange={(e) => {
                      setTagsInput(e.target.value);
                      if (validationErrors.tags) {
                        setValidationErrors((prev) => {
                          const next = { ...prev };
                          delete next.tags;
                          return next;
                        });
                      }
                    }}
                    placeholder="Comma separated e.g. operations, berth-allocation"
                    aria-label="Document tags"
                    aria-invalid={!!validationErrors.tags}
                    aria-describedby={validationErrors.tags ? "tags-error" : "tags-help"}
                  />
                  {validationErrors.tags && (
                    <p id="tags-error" className="text-xs text-destructive" role="alert">
                      {validationErrors.tags}
                    </p>
                  )}
                  <p id="tags-help" className="text-xs text-muted-foreground">
                    Separate multiple tags with commas. Duplicate tags will be removed.
                  </p>
                </div>
                
                {/* Workspace Assignment */}
                {workspaces.length > 0 && (
                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <Label>Workspaces</Label>
                    <div className="space-y-2 border rounded-lg p-3 max-h-32 overflow-y-auto">
                      {workspaces.map((workspace) => (
                        <div key={workspace.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`workspace-${workspace.id}`}
                            checked={selectedWorkspaceIds.includes(workspace.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedWorkspaceIds((prev) => [...prev, workspace.id]);
                              } else {
                                setSelectedWorkspaceIds((prev) => prev.filter((id) => id !== workspace.id));
                              }
                            }}
                            aria-label={`Assign to ${workspace.name} workspace`}
                          />
                          <label
                            htmlFor={`workspace-${workspace.id}`}
                            className="flex items-center gap-2 flex-1 cursor-pointer"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: workspace.color }}
                              aria-hidden="true"
                            />
                            <span className="text-sm">{workspace.name}</span>
                            {workspace.description && (
                              <span className="text-xs text-muted-foreground">- {workspace.description}</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Workspaces group documents by project or theme. For workflow-based grouping (cases, complaints, requests), link documents to Cases instead.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Rich Text Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Document Content <span className="text-destructive">*</span>
                </Label>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <Label className="text-sm font-medium text-muted-foreground">Template</Label>
                    <Select value={selectedTemplateId ?? ''} onValueChange={(value) => setSelectedTemplateId(value || null)}>
                      <SelectTrigger className="w-[260px]">
                        <SelectValue placeholder="Choose template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!selectedTemplateId) {
                          toast.error('Select a template to apply');
                          return;
                        }
                        const template = templates.find((item) => item.id === selectedTemplateId);
                        if (!template) return;
                        if (editorHtml.trim().length > 0 && !templateApplied) {
                          setPendingTemplateAction('apply');
                          setShowTemplateConfirm(true);
                          return;
                        }
                        setEditorHtml(template.contentHtml);
                        setEditorJson(null);
                        setTemplateApplied(true);
                      }}
                      disabled={isLoadingTemplates}
                      aria-label="Apply selected template"
                    >
                      {isLoadingTemplates ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Apply'
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        if (!selectedTemplateId) {
                          toast.error('Select a template to preview');
                          return;
                        }
                        setPendingTemplateAction('preview');
                        if (editorHtml.trim().length > 0 && !templateApplied) {
                          setShowTemplateConfirm(true);
                        } else {
                          setTemplatePreviewId(selectedTemplateId);
                        }
                      }}
                      disabled={isLoadingTemplates}
                      aria-label="Preview selected template"
                    >
                      Preview
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!currentUser) {
                        toast.error('Unable to save template without user context');
                        return;
                      }
                      if (!editorHtml || editorHtml.trim().length === 0) {
                        toast.error('Compose content before saving as template');
                        return;
                      }
                      setTemplateName(`${currentUser.name.split(' ')[0]} Personal Template`);
                      setShowSaveTemplateDialog(true);
                    }}
                    aria-label="Save current content as personal template"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save as Template
                  </Button>
                </div>
                <RichTextEditor
                  value={editorHtml}
                  onChange={(html, json) => {
                    setEditorHtml(html);
                    setEditorJson(json);
                    setTemplateApplied(true);
                    // Calculate character count (strip HTML tags for accurate count)
                    const textContent = html.replace(/<[^>]*>/g, '');
                    setEditorCharacterCount(textContent.length);
                  }}
                  placeholder="Compose your document content..."
                  tokens={templateTokens}
                  maxCharacters={20000}
                />
                <div className="flex items-center justify-between">
                  {validationErrors.content && (
                    <p className="text-xs text-destructive" role="alert">
                      {validationErrors.content}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">
                    {editorCharacterCount.toLocaleString()} / 20,000 characters
                  </p>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs">
                  <HelpCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground mb-1">Using Template Tokens</p>
                    <p className="text-muted-foreground mb-2">
                      Insert tokens like <code className="px-1 py-0.5 bg-background rounded text-[10px]">{'{{document.title}}'}</code> or <code className="px-1 py-0.5 bg-background rounded text-[10px]">{'{{preparedBy.name}}'}</code> in your content. These will be automatically replaced with actual values when the document is created.
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                          View all available tokens →
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-2">
                          <p className="font-medium text-sm mb-2">Available Template Tokens</p>
                          {templateTokens.map((token) => (
                            <div key={token.value} className="space-y-1 pb-2 border-b last:border-0">
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{token.value}</code>
                              </div>
                              <p className="text-xs text-muted-foreground">{token.description}</p>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-6">
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full mb-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Creating... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !editorHtml.trim()}
            aria-label="Create document"
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Creating...</span>
                <span className="sm:hidden">Creating...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Create Document</span>
                <span className="sm:hidden">Create</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Template Preview Dialog */}
    <Dialog open={!!templatePreviewId} onOpenChange={(open) => !open && setTemplatePreviewId(null)}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Template Preview</DialogTitle>
          <DialogDescription>
            Review the template before applying it to your document. Tokens have been replaced with sample data.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] border border-border rounded-md p-4 bg-muted/30">
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: (() => {
                const template = templates.find((t) => t.id === templatePreviewId);
                return template ? replaceTemplateTokens(template.contentHtml) : '';
              })(),
            }}
          />
        </ScrollArea>
        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setTemplatePreviewId(null)} aria-label="Close preview">
            Close
          </Button>
          <Button
            onClick={() => {
              if (!templatePreviewId) return;
              const template = templates.find((item) => item.id === templatePreviewId);
              if (!template) return;
              if (editorHtml.trim().length > 0) {
                setPendingTemplateAction('apply');
                setShowTemplateConfirm(true);
                setTemplatePreviewId(null);
                return;
              }
              setEditorHtml(template.contentHtml);
              setEditorJson(null);
              setTemplateApplied(true);
              setTemplatePreviewId(null);
              toast.success('Template applied to editor');
            }}
            aria-label="Apply template to editor"
          >
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Template Application Confirmation Dialog */}
    <AlertDialog open={showTemplateConfirm} onOpenChange={setShowTemplateConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace Existing Content?</AlertDialogTitle>
          <AlertDialogDescription>
            Applying the template will replace your current content. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pendingTemplateAction === 'apply' && selectedTemplateId) {
                const template = templates.find((item) => item.id === selectedTemplateId);
                if (template) {
                  setEditorHtml(template.contentHtml);
                  setEditorJson(null);
                  setTemplateApplied(true);
                  toast.success('Template applied');
                }
              } else if (pendingTemplateAction === 'preview' && selectedTemplateId) {
                setTemplatePreviewId(selectedTemplateId);
              }
              setShowTemplateConfirm(false);
              setPendingTemplateAction(null);
            }}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Save Template Dialog */}
    <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save your current content as a reusable template for future documents.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
              maxLength={255}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!templateName.trim()) {
                toast.error('Please enter a template name');
                return;
              }
              if (!currentUser) {
                toast.error('Unable to save template without user context');
                return;
              }
              try {
                await createTemplateRecord({
                  scope: 'user',
                  scopeId: currentUser.id,
                  title: templateName.trim(),
                  contentHtml: editorHtml,
                  createdBy: currentUser.id,
                  updatedBy: currentUser.id,
                  isDefault: false,
                  templateType: 'document',
                });
                toast.success('Template saved successfully');
                setShowSaveTemplateDialog(false);
                setTemplateName('');
                // Refresh templates list
                const available = await getTemplatesForUser(currentUser);
                setTemplates(available);
              } catch (error) {
                logError('Failed to save template', error);
                toast.error('Failed to save template');
              }
            }}
          >
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

