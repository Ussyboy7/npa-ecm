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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  createDocument,
  createDocumentVersion,
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
import { FileUploadZone } from './FileUploadZone';
import {
  getTemplatesForUser,
  getDefaultTemplateForUser,
  createTemplate as createTemplateRecord,
  type DocumentTemplate,
} from '@/lib/template-storage';
import { validateFileType, validateFileSize, MAX_FILE_SIZE_MB } from '@/lib/file-utils';
import { AlertTriangle, Loader2, Save, Upload as UploadIcon, FilePlus, FileText, Scan, CheckCircle2, HelpCircle } from 'lucide-react';
import { sanitizeRichText } from '@/lib/sanitize-html';
import { processOCR } from '@/lib/capture-storage';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'form', 'other'];
const SENSITIVITY_OPTIONS: DocumentSensitivity[] = ['public', 'internal', 'confidential', 'restricted'];
const DRAFT_STORAGE_KEY = 'dms_upload_draft';
const MAX_TITLE_LENGTH = 500;
const MAX_REFERENCE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;

const sensitivityLabel = (value: DocumentSensitivity) => {
  switch (value) {
    case 'public':
      return 'Public';
    case 'internal':
      return 'Internal';
    case 'confidential':
      return 'Confidential';
    case 'restricted':
      return 'Restricted';
    default:
      return value;
  }
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Unable to read file'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'version';
  currentUser: User;
  document?: DocumentRecord;
  onComplete: (document: DocumentRecord) => void;
  initialComposeMode?: boolean;
}

export const DocumentUploadDialog = ({
  open,
  onOpenChange,
  mode,
  currentUser,
  document,
  onComplete,
  initialComposeMode,
}: DocumentUploadDialogProps) => {
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
  const [notes, setNotes] = useState('');
  const [sensitivity, setSensitivity] = useState<DocumentSensitivity>('internal');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [composeMode, setComposeMode] = useState(initialComposeMode ?? (mode === 'create'));
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
  const [scanMode, setScanMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [checkingReferenceNumber, setCheckingReferenceNumber] = useState(false);
  const [referenceNumberExists, setReferenceNumberExists] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [editorCharacterCount, setEditorCharacterCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const scanFileInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (!open || !composeMode || !document) return;
    const latest = document.versions[0];
    if (!latest) return;
    if (latest.contentHtml && isMountedRef.current) {
      setEditorHtml(latest.contentHtml);
      // Ensure contentJson is either a valid Record or null
      const jsonValue = latest.contentJson;
      setEditorJson(
        jsonValue && typeof jsonValue === 'object' && !Array.isArray(jsonValue)
          ? (jsonValue as Record<string, unknown>)
          : null
      );
      setTemplateApplied(true);
    }
  }, [open, composeMode, document]);

  useEffect(() => {
    if (!open) return;
    if (document && isMountedRef.current) {
      setSensitivity(document.sensitivity ?? 'internal');
    } else if (isMountedRef.current) {
      setSensitivity('internal');
    }
  }, [document, open]);

  const filteredDepartments = useMemo(() => {
    if (!divisionId) return activeDepartments;
    return activeDepartments.filter((dept) => dept.divisionId === divisionId);
  }, [activeDepartments, divisionId]);

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
    if (mode === 'create' && open) {
      fetchWorkspaces().then(setWorkspaces).catch((err) => {
        logError('Failed to load workspaces', err);
      });
    }
  }, [mode, open]);

  // Auto-save draft to localStorage (debounced) - only when dialog is open
  const saveDraftRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any pending saves when dialog closes
    if (!open || mode !== 'create') {
      if (saveDraftRef.current) {
        clearTimeout(saveDraftRef.current);
        saveDraftRef.current = null;
      }
      return;
    }
    
    // Clear previous timeout
    if (saveDraftRef.current) {
      clearTimeout(saveDraftRef.current);
    }
    
    // Set new timeout to save
    saveDraftRef.current = setTimeout(() => {
      // Double-check dialog is still open and component is mounted before saving
      if (!open || mode !== 'create' || !isMountedRef.current) return;
      
      const draft = {
        title,
        description,
        documentType,
        status,
        divisionId,
        departmentId,
        referenceNumber,
        tagsInput,
        notes,
        sensitivity,
        selectedWorkspaceIds,
        composeMode,
        editorHtml,
        selectedTemplateId,
      };
      
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (err) {
        // Ignore localStorage errors
      }
      saveDraftRef.current = null;
    }, 1000);
    
    return () => {
      if (saveDraftRef.current) {
        clearTimeout(saveDraftRef.current);
        saveDraftRef.current = null;
      }
    };
  }, [open, mode, title, description, documentType, status, divisionId, departmentId, referenceNumber, tagsInput, notes, sensitivity, selectedWorkspaceIds, composeMode, editorHtml, selectedTemplateId]);

  // Load draft from localStorage when dialog opens (create mode only)
  useEffect(() => {
    if (!open || mode !== 'create' || !isMountedRef.current) return;
    
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
          setNotes(draft.notes || '');
          setSensitivity(draft.sensitivity || 'internal');
          setSelectedWorkspaceIds(draft.selectedWorkspaceIds || []);
          setComposeMode(draft.composeMode ?? true);
          setEditorHtml(draft.editorHtml || '');
          setSelectedTemplateId(draft.selectedTemplateId || null);
          setDraftRestored(true);
          toast.info('Draft restored from previous session', { duration: 3000 });
        }
      }
    } catch (err) {
      // Ignore parse errors
    }
  }, [open, mode]);

  // Check for duplicate reference numbers
  useEffect(() => {
    if (!referenceNumber.trim() || mode !== 'create') {
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
      } catch (error: unknown) {
        // Silently fail - duplicate check is optional
        logError('Failed to check reference number', error);
      } finally {
        setCheckingReferenceNumber(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [referenceNumber, mode]);

  // Templates are now loaded from backend - no initialization needed

  useEffect(() => {
    if (!currentUser) return;
    setIsLoadingTemplates(true);
    const loadTemplates = async () => {
      try {
        const available = await getTemplatesForUser(currentUser);
        setTemplates(available);
        if (!selectedTemplateId) {
          const defaultTemplate = await getDefaultTemplateForUser(currentUser);
          if (defaultTemplate) {
            setSelectedTemplateId(defaultTemplate.id);
          }
        }
      } catch (error: Record<string, unknown>) {
        // Handle 404 gracefully - endpoint may not be available yet
        if (error?.status === 404) {
          logWarn('Templates endpoint not available, continuing without templates');
          setTemplates([]);
        } else {
          logError('Failed to load templates:', error);
          setTemplates([]);
        }
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, [currentUser, selectedTemplateId]);

  useEffect(() => {
    if (!composeMode || templateApplied) return;
    if (mode === 'create' && selectedTemplateId && editorHtml.trim().length === 0) {
      const template = templates.find((item) => item.id as string === selectedTemplateId);
      if (template) {
        setEditorHtml(template.contentHtml);
        setEditorJson(null);
        setTemplateApplied(true);
      }
    }
  }, [composeMode, templateApplied, mode, selectedTemplateId, templates, editorHtml]);

  // Validation functions
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    if (mode === 'create') {
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
    }
    
    if (composeMode) {
      if (!editorHtml || editorHtml.trim().length === 0) {
        errors.content = 'Please enter document content';
      }
    } else if (!file) {
      errors.file = 'Please select a file to upload';
    } else {
      const typeValidation = validateFileType(file);
      if (!typeValidation.valid) {
        errors.file = typeValidation.error || 'Invalid file type';
      }
      const sizeValidation = validateFileSize(file, MAX_FILE_SIZE_MB);
      if (!sizeValidation.valid) {
        errors.file = sizeValidation.error || 'File too large';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [mode, title, referenceNumber, tagsInput, composeMode, editorHtml, file]);

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


  const handleClose = useCallback((nextOpen: boolean) => {
    // Simply close the dialog - no state reset needed
    // Component will unmount when closed, naturally resetting everything
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    setFile(selectedFile);
    setScanMode(false);
    if (selectedFile && validationErrors.file) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.file;
        return next;
      });
    }
  }, [validationErrors]);

  const handleScanFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const MAX_SCAN_SIZE = 30 * 1024 * 1024; // 30MB
    const SCAN_ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/tiff'];

    if (selectedFile.size > MAX_SCAN_SIZE) {
      toast.error(`File exceeds maximum size of 30MB`);
      return;
    }

    if (!SCAN_ALLOWED_TYPES.includes(selectedFile.type)) {
      toast.error(`Unsupported file type. Please use PDF or image files.`);
      return;
    }

    setFile(selectedFile);
    setScanMode(true);
    if (validationErrors.file) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.file;
        return next;
      });
    }
  }, [validationErrors]);

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
      
      // Remove duplicates
      const uniqueTags = Array.from(new Set(tags));

      if (mode === 'create') {
        let fileUrl: string | undefined;
        let fileType = '';
        let fileName = '';
        let fileSize = 0;
        let contentHtml: string | undefined;
        let contentJson: Record<string, unknown> | undefined;

        if (composeMode) {
          // Replace template tokens in content before creating document
          contentHtml = replaceTemplateTokens(editorHtml);
          contentJson = editorJson ?? undefined;
          fileType = 'text/html';
          fileName = `${title.trim().replace(/\s+/g, '-') || 'document'}.html`;
          const htmlFile = new File([contentHtml], fileName, { type: fileType });
          fileSize = htmlFile.size;
          fileUrl = await fileToDataUrl(htmlFile);
        } else if (file) {
          fileUrl = await fileToDataUrl(file);
          fileType = file.type || 'application/octet-stream';
          fileName = file.name;
          fileSize = file.size;
        }

        if (!fileUrl) {
          toast.error('Failed to prepare file content.');
          return;
        }

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
            notes: notes.trim() || undefined,
          },
        );
        
        setUploadProgress(100);

        // Process OCR if this was a scanned document
        if (scanMode) {
          try {
            await processOCR(created.id, {
              language: 'eng',
              extract_metadata: true,
            });
            toast.info('OCR processing started for scanned document');
          } catch (ocrError) {
            logError('Failed to start OCR processing', ocrError);
            // Don't fail the upload if OCR fails
          }
        }

        // Clear draft after successful creation
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
        return;
      }

      if (mode === 'version' && document) {
        let fileUrl: string | undefined;
        let fileType = '';
        let fileName = '';
        let fileSize = 0;
        let contentHtml: string | undefined;
        let contentJson: Record<string, unknown> | undefined;

        if (composeMode) {
          contentHtml = editorHtml;
          contentJson = editorJson ?? undefined;
          fileType = 'text/html';
          fileName = `${document.title.trim().replace(/\s+/g, '-') || 'document'}-v${document.versions.length + 1}.html`;
          const htmlFile = new File([contentHtml], fileName, { type: fileType });
          fileSize = htmlFile.size;
          fileUrl = await fileToDataUrl(htmlFile);
        } else if (file) {
          fileUrl = await fileToDataUrl(file);
          fileType = file.type || 'application/octet-stream';
          fileName = file.name;
          fileSize = file.size;
        }

        if (!fileUrl) {
          toast.error('Please select or compose a document to upload.');
          return;
        }

        const updated = await createDocumentVersion(document.id, {
          fileName,
          fileType,
          fileSize,
          fileUrl,
          contentHtml,
          contentJson,
          notes: notes.trim() || undefined,
        });

        handleClose(false);
        // Call onComplete after dialog closes
        setTimeout(() => {
          onComplete(updated);
          toast.success('New version added');
        }, 200);
      }
    } catch (error: unknown) {
      logError('Document upload error:', error);
      
      // Parse structured error response
      let errorMessage = 'Failed to process document. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: unknown } }).response;
        if (response?.data && typeof response.data === 'object') {
          const data = response.data as Record<string, unknown>;
          // Check for field-specific errors
          if (data.title && Array.isArray(data.title)) {
            errorMessage = `Title: ${(data.title as string[]).join(', ')}`;
          } else if (data.detail && typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
            errorMessage = (data.non_field_errors as string[]).join(', ');
          }
        }
      } else if (error instanceof Error) {
        errorMessage = (error instanceof Error ? error.message : "Unknown error");
      }
      
      toast.error('Failed to process document', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }, [mode, validateForm, tagsInput, composeMode, editorHtml, editorJson, file, title, description, documentType, status, sensitivity, divisionId, departmentId, referenceNumber, currentUser, selectedWorkspaceIds, document, scanMode, onComplete, replaceTemplateTokens]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isSubmitting) {
          void handleSubmit();
        }
      }
      // Esc to close
      if (e.key === 'Escape' && !showTemplateConfirm && !showSaveTemplateDialog) {
        handleClose(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isSubmitting, showTemplateConfirm, showSaveTemplateDialog, handleSubmit, handleClose]);

  const dialogTitle = mode === 'create' ? 'Upload New Document' : 'Add New Version';
  const dialogDescription =
    mode === 'create'
      ? 'Create a new document with metadata and content or upload a file.'
      : `Upload a new version for "${document?.title ?? 'Document'}".`;
  const DialogIcon = mode === 'create' ? FilePlus : UploadIcon;

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
  }, [currentUser, divisionId, departmentId, title, referenceNumber]);

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
            <DialogIcon className="h-5 w-5 text-primary" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-180px)] sm:max-h-[65vh] pr-2 sm:pr-4">
          <div className="space-y-4 sm:space-y-6 pb-2">
          {mode === 'create' && (
            <>
              {/* Draft Restored Notification */}
              {draftRestored && (
                <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    Your previous draft has been restored. You can continue editing or start fresh.
                  </AlertDescription>
                </Alert>
              )}

              {/* Basic Information */}
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
              <div className="space-y-2">
                <Label>Sensitivity</Label>
                <Select 
                  value={sensitivity} 
                  onValueChange={(value) => {
                    const newSensitivity = value as DocumentSensitivity;
                    setSensitivity(newSensitivity);
                    if (newSensitivity === 'restricted' || newSensitivity === 'confidential') {
                      toast.warning(
                        newSensitivity === 'restricted'
                          ? 'Restricted documents are only accessible to MDCS, EDCS, and MSS1 grade levels.'
                          : 'Confidential documents require MSS2 or higher grade level access.'
                      );
                    }
                  }}
                  aria-label="Document sensitivity"
                >
                  <SelectTrigger disabled={mode !== 'create'}>
                    <SelectValue placeholder="Select sensitivity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex flex-col">
                        <span>Public</span>
                        <span className="text-xs text-muted-foreground">All authenticated users • May be shareable externally</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="internal">
                      <div className="flex flex-col">
                        <span>Internal</span>
                        <span className="text-xs text-muted-foreground">All authenticated users • Internal use only</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="confidential">
                      <div className="flex flex-col">
                        <span>Confidential</span>
                        <span className="text-xs text-muted-foreground">MSS2+ (MSS2, MSS3, MSS4, MSS5, MSS1, EDCS, MDCS)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="restricted">
                      <div className="flex flex-col">
                        <span>Restricted</span>
                        <span className="text-xs text-muted-foreground">MSS1, EDCS, MDCS only</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {sensitivity === 'public' && (
                  <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Public Access</p>
                      <p className="text-blue-700 dark:text-blue-300 mb-2">
                        Accessible to all authenticated users. Suitable for documents that may be shared externally or published publicly.
                      </p>
                      <div className="mt-1.5 pt-1.5 border-t border-blue-200 dark:border-blue-800">
                        <p className="text-blue-700 dark:text-blue-300 text-[10px]">
                          <strong>Use for:</strong> Public announcements, published policies, external communications, shareable content
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {sensitivity === 'internal' && (
                  <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-xs">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900 dark:text-green-100 mb-1">Internal Access</p>
                      <p className="text-green-700 dark:text-green-300 mb-2">
                        Accessible to all authenticated users. For internal organizational use only, not intended for external sharing.
                      </p>
                      <div className="mt-1.5 pt-1.5 border-t border-green-200 dark:border-green-800">
                        <p className="text-green-700 dark:text-green-300 text-[10px]">
                          <strong>Use for:</strong> Internal memos, organizational procedures, staff communications, internal reports
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {sensitivity === 'confidential' && (
                  <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/20 rounded text-xs">
                    <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-warning mb-1">Confidential Access</p>
                      <p className="text-warning/90 mb-2">
                        Requires MSS2 or higher grade level access.
                      </p>
                      <div className="mt-1.5 pt-1.5 border-t border-warning/20">
                        <p className="text-warning/80 text-[10px] font-medium mb-1">Accessible to:</p>
                        <div className="flex flex-wrap gap-1">
                          {['MSS2', 'MSS3', 'MSS4', 'MSS5', 'MSS1', 'EDCS', 'MDCS'].map((grade) => (
                            <Badge key={grade} variant="outline" className="text-[10px] h-5 px-1.5 border-warning/30 text-warning">
                              {grade}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {sensitivity === 'restricted' && (
                  <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-destructive mb-1">Restricted Access</p>
                      <p className="text-destructive/90 mb-2">
                        Highest security level. Only accessible to top management.
                      </p>
                      <div className="mt-1.5 pt-1.5 border-t border-destructive/20">
                        <p className="text-destructive/80 text-[10px] font-medium mb-1">Accessible to:</p>
                        <div className="flex flex-wrap gap-1">
                          {['MSS1', 'EDCS', 'MDCS'].map((grade) => (
                            <Badge key={grade} variant="outline" className="text-[10px] h-5 px-1.5 border-destructive/30 text-destructive">
                              {grade}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
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
            </>
          )}

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content
              </Label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={composeMode}
                  onCheckedChange={(checked) => setComposeMode(checked)}
                  disabled={mode === 'version' && !document}
                />
                <span>{composeMode ? 'Compose with editor' : 'Upload file'}</span>
              </div>
            </div>

            {composeMode ? (
              <div className="space-y-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center w-full lg:w-auto">
                    <Label className="text-sm font-medium text-muted-foreground">Template</Label>
                    <Select value={selectedTemplateId ?? ''} onValueChange={(value) => setSelectedTemplateId(value || null)}>
                      <SelectTrigger className="w-full lg:w-[260px]">
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
                        const template = templates.find((item) => item.id as string === selectedTemplateId);
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
                {composeMode && (
                  <>
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
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="file">
                    Attach File <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => scanFileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    <Scan className="h-4 w-4" />
                    Scan Document
                  </Button>
                  <input
                    ref={scanFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.tiff"
                    onChange={handleScanFileSelect}
                    disabled={isSubmitting}
                  />
                </div>
                {scanMode && file && (
                  <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <Scan className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      Scanned document selected. OCR processing will start automatically after upload.
                    </AlertDescription>
                  </Alert>
                )}
                <FileUploadZone
                  file={file}
                  onFileSelect={handleFileSelect}
                  maxSizeMB={MAX_FILE_SIZE_MB}
                  disabled={isSubmitting}
                />
                {validationErrors.file && (
                  <p className="text-xs text-destructive" role="alert">
                    {validationErrors.file}
                  </p>
                )}
                {validationErrors.content && (
                  <p className="text-xs text-destructive" role="alert">
                    {validationErrors.content}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Version Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add context about this upload (changes made, approvals, etc.)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-6">
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full mb-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (!composeMode && !file)}
            aria-label={mode === 'create' ? 'Create document' : 'Upload version'}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              mode === 'create' ? 'Create Document' : 'Upload Version'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
              __html: sanitizeRichText((() => {
                const template = templates.find((t) => t.id === templatePreviewId);
                return template ? replaceTemplateTokens(template.contentHtml) : '';
              })()),
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
              const template = templates.find((item) => item.id as string === templatePreviewId);
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
          <AlertDialogCancel onClick={() => {
            setPendingTemplateAction(null);
            setShowTemplateConfirm(false);
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!selectedTemplateId || !pendingTemplateAction) return;
              const template = templates.find((item) => item.id as string === selectedTemplateId);
              if (!template) return;
              
              if (pendingTemplateAction === 'apply') {
                setEditorHtml(template.contentHtml);
                setEditorJson(null);
                setTemplateApplied(true);
                toast.success('Template applied to editor');
              } else if (pendingTemplateAction === 'preview') {
                setTemplatePreviewId(selectedTemplateId);
              }
              
              setPendingTemplateAction(null);
              setShowTemplateConfirm(false);
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
          <DialogTitle>Save as Personal Template</DialogTitle>
          <DialogDescription>
            Save your current content as a reusable template for future documents.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
              aria-label="Template name"
              aria-required="true"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setShowSaveTemplateDialog(false);
            setTemplateName('');
          }}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!templateName.trim()) {
                toast.error('Template name is required');
                return;
              }
              if (!currentUser) {
                toast.error('Unable to save template without user context');
                return;
              }
              if (!editorHtml || editorHtml.trim().length === 0) {
                toast.error('Compose content before saving as template');
                return;
              }
              try {
                const created = await createTemplateRecord({
                  scope: 'user',
                  scopeId: currentUser.id,
                  title: templateName.trim(),
                  description: `Saved by ${currentUser.name}`,
                  contentHtml: editorHtml,
                  templateType: 'document',
                  createdBy: currentUser.id,
                  updatedBy: currentUser.id,
                  isDefault: false,
                });
                const refreshed = await getTemplatesForUser(currentUser);
                setTemplates(refreshed);
                setSelectedTemplateId(created.id);
              } catch (error: unknown) {
                logError('Failed to save template:', error);
                toast.error('Failed to save template. Please try again.');
                return;
              }
              setShowSaveTemplateDialog(false);
              setTemplateName('');
              toast.success('Personal template saved');
            }}
            disabled={!templateName.trim()}
          >
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
};