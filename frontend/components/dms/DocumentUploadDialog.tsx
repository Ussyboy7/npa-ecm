"use client";

import { logError } from '@/lib/client-logger';
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
  initializeTemplates,
  getTemplatesForUser,
  getDefaultTemplateForUser,
  createTemplate as createTemplateRecord,
  type DocumentTemplate,
} from '@/lib/template-storage';
import { validateFileType, validateFileSize, MAX_FILE_SIZE_MB } from '@/lib/file-utils';
import { AlertTriangle, Loader2, Save } from 'lucide-react';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'other'];
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
}

export const DocumentUploadDialog = ({
  open,
  onOpenChange,
  mode,
  currentUser,
  document,
  onComplete,
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
  const [composeMode, setComposeMode] = useState(mode === 'create');
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
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!composeMode || !document) return;
    const latest = document.versions[0];
    if (!latest) return;
    if (latest.contentHtml) {
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
  }, [composeMode, document]);

  useEffect(() => {
    if (document) {
      setSensitivity(document.sensitivity ?? 'internal');
    } else {
      setSensitivity('internal');
    }
  }, [document, open]);

  const filteredDepartments = useMemo(() => {
    if (!divisionId) return activeDepartments;
    return activeDepartments.filter((dept) => dept.divisionId === divisionId);
  }, [activeDepartments, divisionId]);

  // Load workspaces
  useEffect(() => {
    if (mode === 'create' && open) {
      fetchWorkspaces().then(setWorkspaces).catch((err) => {
        logError('Failed to load workspaces', err);
      });
    }
  }, [mode, open]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!open || mode !== 'create') return;
    
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
    
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (err) {
        // Ignore localStorage errors
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [open, mode, title, description, documentType, status, divisionId, departmentId, referenceNumber, tagsInput, notes, sensitivity, selectedWorkspaceIds, composeMode, editorHtml, selectedTemplateId]);

  // Load draft from localStorage on open
  useEffect(() => {
    if (!open || mode !== 'create') return;
    
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
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
      }
    } catch (err) {
      // Ignore parse errors
    }
  }, [open, mode]);

  useEffect(() => {
    initializeTemplates();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setIsLoadingTemplates(true);
    try {
      const available = getTemplatesForUser(currentUser);
      setTemplates(available);
      if (!selectedTemplateId) {
        const defaultTemplate = getDefaultTemplateForUser(currentUser);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        }
      }
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [currentUser, selectedTemplateId]);

  useEffect(() => {
    if (!composeMode || templateApplied) return;
    if (mode === 'create' && selectedTemplateId && editorHtml.trim().length === 0) {
      const template = templates.find((item) => item.id === selectedTemplateId);
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

  const resetState = () => {
    setTitle('');
    setDescription('');
    setDocumentType('memo');
    setStatus(mode === 'create' ? 'draft' : document?.status ?? 'draft');
    setDivisionId(currentUser.division);
    setDepartmentId(currentUser.department);
    setReferenceNumber('');
    setTagsInput('');
    setNotes('');
    setFile(null);
    setComposeMode(mode === 'create');
    setEditorHtml('');
    setEditorJson(null);
    setTemplateApplied(false);
    setTemplatePreviewId(null);
    setSensitivity(document?.sensitivity ?? 'internal');
    setSelectedWorkspaceIds([]);
    setValidationErrors({});
    setUploadProgress(0);
    if (currentUser) {
      const defaultTemplate = getDefaultTemplateForUser(currentUser);
      setSelectedTemplateId(defaultTemplate ? defaultTemplate.id : null);
    } else {
      setSelectedTemplateId(null);
    }
    // Clear draft from localStorage
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (err) {
      // Ignore
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    setFile(selectedFile);
    if (selectedFile && validationErrors.file) {
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
          contentHtml = editorHtml;
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

        onComplete(created);
        toast.success('Document created successfully');
        // Clear draft after successful creation
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (err) {
          // Ignore
        }
        handleClose(false);
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

        onComplete(updated);
        toast.success('New version added');
        handleClose(false);
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
        errorMessage = error.message;
      }
      
      toast.error('Failed to process document', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }, [mode, validateForm, tagsInput, composeMode, editorHtml, editorJson, file, title, description, documentType, status, sensitivity, divisionId, departmentId, referenceNumber, currentUser, selectedWorkspaceIds, document, onComplete, handleClose]);

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
      : `Upload a new version for “${document?.title ?? 'Document'}”.`;

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
      <DialogContent className="max-w-5xl w-full max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6 pb-2">
          {mode === 'create' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="doc-title">
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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
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
                >
                  <SelectTrigger disabled={mode !== 'create'} aria-label="Document sensitivity">
                    <SelectValue placeholder="Select sensitivity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SENSITIVITY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {sensitivityLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sensitivity === 'restricted' && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Restricted documents are only accessible to MDCS, EDCS, and MSS1 grade levels.
                    </AlertDescription>
                  </Alert>
                )}
                {sensitivity === 'confidential' && (
                  <Alert className="mt-2 border-warning/50 bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning">
                      Confidential documents require MSS2 or higher grade level access.
                    </AlertDescription>
                  </Alert>
                )}
                {sensitivity !== 'restricted' && sensitivity !== 'confidential' && (
                  <p className="text-xs text-muted-foreground">
                    {sensitivity === 'public' 
                      ? 'Public documents are accessible to all users.'
                      : 'Internal documents are accessible to all authenticated users.'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Division</Label>
                <Select
                  value={divisionId ?? 'none'}
                  onValueChange={(value) => setDivisionId(value === 'none' ? undefined : value)}
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
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference-number">Reference Number</Label>
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
                  aria-invalid={!!validationErrors.referenceNumber}
                  aria-describedby={validationErrors.referenceNumber ? "reference-error" : undefined}
                  maxLength={MAX_REFERENCE_LENGTH}
                />
                {validationErrors.referenceNumber && (
                  <p id="reference-error" className="text-xs text-destructive" role="alert">
                    {validationErrors.referenceNumber}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2 space-y-2">
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
              <div className="sm:col-span-2 space-y-2">
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
                <div className="sm:col-span-2 space-y-2">
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
                    Assign this document to one or more workspaces for better organization.
                  </p>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Content</Label>
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
                  }}
                  placeholder="Compose your document content..."
                  tokens={templateTokens}
                  maxCharacters={20000}
                />
                <p className="text-xs text-muted-foreground">
                  Compose directly in the system. Use tokens to insert placeholders that can be customised later.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="file">
                  Attach File <span className="text-destructive">*</span>
                </Label>
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
      <DialogContent className="max-w-3xl">
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
          <AlertDialogCancel onClick={() => {
            setPendingTemplateAction(null);
            setShowTemplateConfirm(false);
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!selectedTemplateId || !pendingTemplateAction) return;
              const template = templates.find((item) => item.id === selectedTemplateId);
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
            onClick={() => {
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
              const created = createTemplateRecord({
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
              const refreshed = getTemplatesForUser(currentUser);
              setTemplates(refreshed);
              setSelectedTemplateId(created.id);
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