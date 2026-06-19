"use client";
import { ERROR_UNKNOWN, SENSITIVITY_OPTIONS } from '@/lib/constants';

import { logError, logWarn } from '@/lib/client-logger';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  createDocument,
  createDocumentVersion,
  fetchWorkspaces,
  type DocumentRecord,
  type DocumentType,
  type DocumentStatus,
  type DocumentSensitivity,
  type DocumentWorkspace,
} from '@/lib/dms-storage';
import type { User } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { QuillEditor } from './QuillEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUploadZone } from './FileUploadZone';
import {
  getTemplatesForUser,
  getDefaultTemplateForUser,
  createTemplate as createTemplateRecord,
  type DocumentTemplate,
} from '@/lib/template-storage';
import { validateFileType, validateFileSize, MAX_FILE_SIZE_MB } from '@/lib/file-utils';
import { Loader2, Save, Upload as UploadIcon, FilePlus, FileText, Scan } from 'lucide-react';
import { sanitizeRichText } from '@/lib/sanitize-html';
import { processOCR } from '@/lib/capture-storage';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'form', 'other'];
const _SENSITIVITY_OPTIONS: DocumentSensitivity[] = ['public', 'internal', 'confidential', 'restricted'];
const DRAFT_STORAGE_KEY = 'dms_upload_draft';
const MAX_TITLE_LENGTH = 500;
const MAX_REFERENCE_LENGTH = 100;
const _MAX_DESCRIPTION_LENGTH = 2000;

const _sensitivityLabel = (value: DocumentSensitivity) => {
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
  asPage?: boolean;
}

export const DocumentUploadDialog = ({
  open,
  onOpenChange,
  mode,
  currentUser,
  document,
  onComplete,
  initialComposeMode,
  asPage = false,
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
  const [metadataOpen, setMetadataOpen] = useState(false);
  const _formRef = useRef<HTMLFormElement>(null);
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
      } catch (_err) {
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
          toast.info('Draft restored from previous session', { duration: 3000 });
        }
      }
    } catch (_err) {
      // Ignore parse errors
    }
  }, [open, mode]);

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
      } catch (error: unknown) {
        // Handle 404 gracefully - endpoint may not be available yet
        const err = error as Record<string, unknown>;
        if (err?.status === 404) {
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

  const _handleFileSelect = useCallback((selectedFile: File | null) => {
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
          contentJson = undefined;
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
        } catch (_err) {
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
          contentJson = undefined;
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
        errorMessage = (error instanceof Error ? error.message : ERROR_UNKNOWN);
      }
      
      toast.error('Failed to process document', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }, [mode, validateForm, tagsInput, composeMode, editorHtml, file, title, description, documentType, status, sensitivity, divisionId, departmentId, referenceNumber, currentUser, selectedWorkspaceIds, document, scanMode, onComplete, replaceTemplateTokens, handleClose, notes]);

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

  const _dialogTitle = mode === 'create' ? 'Upload New Document' : 'Add New Version';
  const _dialogDescription =
    mode === 'create'
      ? 'Create a new document with metadata and content or upload a file.'
      : `Upload a new version for "${document?.title ?? 'Document'}".`;
  const _DialogIcon = mode === 'create' ? FilePlus : UploadIcon;

  const formContent = (
    <div className="space-y-6">
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
        placeholder="Document title"
        className="text-lg h-12"
        maxLength={MAX_TITLE_LENGTH}
      />
      {validationErrors.title && (
        <p className="text-xs text-destructive -mt-4" role="alert">
          {validationErrors.title}
        </p>
      )}

      {mode === 'create' && (
        <Button variant="outline" size="sm" onClick={() => setMetadataOpen(true)} className="w-fit gap-2">
          <FileText className="h-4 w-4" />
          Metadata &amp; Classification
        </Button>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Switch checked={composeMode} onCheckedChange={setComposeMode} disabled={mode === 'version' && !document} />
          <span className="text-muted-foreground">{composeMode ? 'Compose' : 'Upload'}</span>
        </div>
        {composeMode && (
          <>
            <div className="h-4 w-px bg-border" />
            <Select value={selectedTemplateId ?? ''} onValueChange={(v) => setSelectedTemplateId(v || null)}>
              <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8" onClick={() => {
              if (!selectedTemplateId) { toast.error('Select a template'); return; }
              const t = templates.find((x) => x.id === selectedTemplateId);
              if (!t) return;
              if (editorHtml.trim() && !templateApplied) { setPendingTemplateAction('apply'); setShowTemplateConfirm(true); return; }
              setEditorHtml(t.contentHtml); setTemplateApplied(true);
            }} disabled={isLoadingTemplates}>
              {isLoadingTemplates ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply'}
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => {
              if (!currentUser || !editorHtml?.trim()) { toast.error(!currentUser ? 'No user context' : 'Add content first'); return; }
              setTemplateName(`${currentUser.name.split(' ')[0]}'s Template`); setShowSaveTemplateDialog(true);
            }}>
              <Save className="h-3 w-3 mr-1" /> Save Template
            </Button>
          </>
        )}
      </div>

      {composeMode ? (
        <div className="min-h-[400px] border rounded-lg overflow-hidden">
          <QuillEditor value={editorHtml} onChange={setEditorHtml} placeholder="Start writing..." showCharacterCount />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => scanFileInputRef.current?.click()} disabled={isSubmitting}>
              <Scan className="h-4 w-4 mr-1" /> Scan Document
            </Button>
            <input ref={scanFileInputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.tiff" onChange={handleScanFileSelect} disabled={isSubmitting} />
          </div>
          {scanMode && file && (
            <Alert className="py-2"><Scan className="h-4 w-4" /><AlertDescription>OCR will start after upload.</AlertDescription></Alert>
          )}
          <FileUploadZone file={file} onFileSelect={(f) => { setFile(f); setScanMode(false); }} maxSizeMB={MAX_FILE_SIZE_MB} disabled={isSubmitting} />
          {validationErrors.file && <p className="text-xs text-destructive">{validationErrors.file}</p>}
        </div>
      )}

      <Textarea id="notes" placeholder="Version notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

      {uploadProgress > 0 && uploadProgress < 100 && (
        <Progress value={uploadProgress} className="h-1.5" />
      )}

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || (!composeMode && !file)}>
          {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Create Document'}
        </Button>
      </div>
    </div>
  );

  const mainDialog = (
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
        <ScrollArea className="max-h-[calc(95vh-180px)] sm:max-h-[65vh] pr-2 sm:pr-4">
          {formContent}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  return (
    <>{asPage ? formContent : mainDialog}

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

    <Dialog open={metadataOpen} onOpenChange={setMetadataOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Metadata & Classification</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as DocumentStatus)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Sensitivity</Label>
            <Select value={sensitivity} onValueChange={(value) => setSensitivity(value as DocumentSensitivity)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SENSITIVITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Division</Label>
            <Select value={divisionId ?? 'none'} onValueChange={(v) => setDivisionId(v === 'none' ? undefined : v)}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {activeDivisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Department</Label>
            <Select value={departmentId ?? 'none'} onValueChange={(v) => setDepartmentId(v === 'none' ? undefined : v)} disabled={!divisionId}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {filteredDepartments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Reference</Label>
            <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="NPA/MOPS/2024/045" className="h-8" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief description" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Tags</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="operations, berth-allocation" className="h-8" />
          </div>
          {workspaces.length > 0 && (
            <div className="sm:col-span-2">
              <Label className="text-xs">Workspaces</Label>
              <div className="space-y-1 mt-1">
                {workspaces.map((w) => (
                  <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={selectedWorkspaceIds.includes(w.id)}
                      onCheckedChange={(c) => setSelectedWorkspaceIds((prev) => c ? [...prev, w.id] : prev.filter((id) => id !== w.id))} />
                    <span className="w-2 h-2 rounded-full" style={{backgroundColor: w.color}} />
                    {w.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={() => setMetadataOpen(false)}>Done</Button>
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