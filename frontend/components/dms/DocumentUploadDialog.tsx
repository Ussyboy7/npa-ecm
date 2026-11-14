"use client";
import { SENSITIVITY_DETAILS, SENSITIVITY_OPTIONS } from '@/lib/constants';

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
import { toast } from "@/components/ui/sonner";
import {
  createDocument,
  createDocumentVersion,
  type DocumentRecord,
  type DocumentType,
  type DocumentSensitivity,
} from '@/lib/api/dms';
import { fetchDrmPolicies, type DocumentRightsPolicy } from '@/lib/drm-api';
import type { User } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSignature } from '@/hooks/use-signature';
import { RichTextEditor } from './RichTextEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUploadZone } from './FileUploadZone';
import {
  getTemplatesForUser,
  getDefaultTemplateForUser,
  createTemplate as createTemplateRecord,
  type DocumentTemplate,
} from '@/lib/api/document-templates';
import {
  validateFileType,
  validateFileSize,
  resolveUploadMimeType,
  MAX_FILE_SIZE_MB,
} from '@/lib/file-utils';
import { Loader2, Save, Upload as UploadIcon, FilePlus, Scan, PenTool, Settings2, FileText } from 'lucide-react';
import { sanitizeRichText } from '@/lib/sanitize-html';
import {
  MAX_TITLE_LENGTH,
  clearDraft,
  firstInvalidField,
  hasUnsavedWork,
  nextTitleForFile,
  readDraft,
  validateComposeFields,
  writeDraft,
  type ComposeField,
} from '@/lib/compose-draft';
import { importDocxFileToHtml } from '@/lib/import-docx';
import { processOCR } from '@/lib/api/capture';
import { uploadUserSignature } from '@/lib/api/signatures';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'form', 'other'];

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
  const { divisions, departments, directorates } = useOrganization();
  const activeDivisions = useMemo(() => divisions.filter((division) => division.isActive !== false), [divisions]);
  const activeDepartments = useMemo(() => departments.filter((department) => department.isActive !== false), [departments]);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('memo');
  const [divisionId, setDivisionId] = useState<string | undefined>(undefined);
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [sensitivity, setSensitivity] = useState<DocumentSensitivity>('internal');
  const [drmPolicyId, setDrmPolicyId] = useState<string | null>(null);
  const [drmPolicies, setDrmPolicies] = useState<DocumentRightsPolicy[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [composeMode, setComposeMode] = useState(initialComposeMode ?? (mode === 'create'));
  const [editorHtml, setEditorHtml] = useState('');
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateApplied, setTemplateApplied] = useState(false);
  const [templatePreviewId, setTemplatePreviewId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(false);
  const [pendingTemplateAction, setPendingTemplateAction] = useState<'apply' | 'preview' | null>(null);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const templateHtmlRef = useRef<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  /** When the autosaved draft was last written; shown in the page action bar. */
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  /** Leaving with work in progress asks first (page mode). */
  const [confirmLeave, setConfirmLeave] = useState(false);
  /** Word file waiting on the replace-content confirmation. */
  const [pendingWordFile, setPendingWordFile] = useState<File | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentErrorRef = useRef<HTMLParagraphElement>(null);
  const fileErrorRef = useRef<HTMLParagraphElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const { signature: userSignature, refreshSignature } = useSignature({
    userId: currentUser?.id,
    autoLoad: open && composeMode,
  });
  const scanFileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const wordImportInputRef = useRef<HTMLInputElement>(null);
  const [isImportingWord, setIsImportingWord] = useState(false);
  const isMountedRef = useRef(true);
  const lastResolvedTokensRef = useRef<Record<string, string>>({});

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
      setDrmPolicyId(document.drmRights?.policy_id ?? null);
    } else if (isMountedRef.current) {
      setSensitivity('internal');
      setDrmPolicyId(null);
    }
  }, [document, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchDrmPolicies()
      .then((policies) => {
        if (!cancelled && isMountedRef.current) setDrmPolicies(policies);
      })
      .catch((err) => {
        logWarn('Failed to load DRM policies', err);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

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

  // Resolve org units for tokens (prefer form selection, fall back to user profile).
  // Only use form selections, don't fall back to user profile
  const resolvedDivision = useMemo(() => {
    return divisionId ? activeDivisions.find((div) => div.id === divisionId) : undefined;
  }, [divisionId, activeDivisions]);

  const resolvedDepartment = useMemo(() => {
    return departmentId ? activeDepartments.find((dept) => dept.id === departmentId) : undefined;
  }, [departmentId, activeDepartments]);

  const resolvedDirectorate = useMemo(() => {
    return currentUser.directorate ? directorates.find((d) => d.id === currentUser.directorate) : undefined;
  }, [currentUser.directorate, directorates]);

  const buildTokenValues = useCallback((): Record<string, string> => {
    const today = new Date();
    const formattedDate = formatDate(today, 'en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return {
      'document.title': title.trim() || 'Document Title',
      'document.reference': referenceNumber.trim() || 'N/A',
      'preparedBy.name': currentUser.name || 'Unknown',
      'preparedBy.role': currentUser.systemRole || 'User',
      'sender.name': currentUser.systemRole || currentUser.name || 'Unknown',
      'sender.title': currentUser.systemRole || 'User',
      'recipient.name': recipientName.trim() || '',
      'recipient.department': resolvedDepartment?.name || '',
      'division.name': resolvedDivision?.name || resolvedDirectorate?.name || '',
      'department.name': resolvedDepartment?.name || '',
      'date.today': formattedDate,
    };
  }, [
    title,
    referenceNumber,
    currentUser.name,
    currentUser.systemRole,
    recipientName,
    resolvedDivision?.name,
    resolvedDepartment?.name,
    resolvedDirectorate?.name,
  ]);

  const replaceTemplateTokens = useCallback(
    (html: string): string => {
      const values = buildTokenValues();
      let next = html;
      for (const [key, value] of Object.entries(values)) {
        next = next.replaceAll(`{{${key}}}`, value);
      }
      lastResolvedTokensRef.current = values;
      return next;
    },
    [buildTokenValues],
  );

  /** Update previously resolved token text in the live editor without wiping user edits. */
  const refreshResolvedTokensInHtml = useCallback(
    (html: string): string => {
      const nextValues = buildTokenValues();
      const prevValues = lastResolvedTokensRef.current;
      let result = html;
      const replacements = Object.keys(nextValues)
        .map((key) => ({
          from: prevValues[key],
          to: nextValues[key],
        }))
        .filter((item) => item.from && item.from !== item.to)
        .sort((a, b) => (b.from?.length ?? 0) - (a.from?.length ?? 0));

      for (const { from, to } of replacements) {
        if (!from) continue;
        result = result.split(from).join(to);
      }
      lastResolvedTokensRef.current = nextValues;
      return result;
    },
    [buildTokenValues],
  );

  const applyTemplateContent = useCallback(
    (template: DocumentTemplate) => {
      templateHtmlRef.current = template.contentHtml;
      setEditorHtml(replaceTemplateTokens(template.contentHtml));
      setTemplateApplied(true);
    },
    [replaceTemplateTokens],
  );

  /** Write the draft immediately; used by the debounce, leaving, and page hide. */
  const flushDraft = useCallback(() => {
    if (mode !== 'create') return;
    // Nothing typed yet (or after Discard): don't leave an empty draft behind.
    if (!title.trim() && !editorHtml.trim() && !referenceNumber.trim() && !recipientName.trim()) {
      clearDraft();
      return;
    }
    const saved = writeDraft({
      title,
      documentType,
      divisionId,
      departmentId,
      referenceNumber,
      recipientName,
      sensitivity,
      composeMode,
      editorHtml,
      selectedTemplateId,
    });
    if (saved) setDraftSavedAt(Date.now());
  }, [
    mode,
    title,
    documentType,
    divisionId,
    departmentId,
    referenceNumber,
    recipientName,
    sensitivity,
    composeMode,
    editorHtml,
    selectedTemplateId,
  ]);

  // Auto-save draft (debounced) - only when dialog is open
  const saveDraftRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open || mode !== 'create') {
      if (saveDraftRef.current) {
        clearTimeout(saveDraftRef.current);
        saveDraftRef.current = null;
      }
      return;
    }

    if (saveDraftRef.current) clearTimeout(saveDraftRef.current);
    saveDraftRef.current = setTimeout(() => {
      if (!open || mode !== 'create' || !isMountedRef.current) return;
      flushDraft();
      saveDraftRef.current = null;
    }, 1000);

    return () => {
      if (saveDraftRef.current) {
        clearTimeout(saveDraftRef.current);
        saveDraftRef.current = null;
      }
    };
  }, [open, mode, flushDraft]);

  // A refresh, tab close or SPA route change must not lose the last edit.
  useEffect(() => {
    if (!open) return;
    const flush = () => flushDraft();
    const onHidden = () => {
      if (window.document.visibilityState === 'hidden') flushDraft();
    };
    window.addEventListener('pagehide', flush);
    window.document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.document.removeEventListener('visibilitychange', onHidden);
    };
  }, [open, flushDraft]);

  // Browser-level guard for refresh/close while composing on the page.
  useEffect(() => {
    if (!open || !asPage) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedWork({ title, editorHtml, hasFile: Boolean(file), referenceNumber, recipientName })) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [open, asPage, title, editorHtml, file, referenceNumber, recipientName]);

  // Load draft from localStorage when dialog opens (create mode only)
  useEffect(() => {
    if (!open || mode !== 'create' || !isMountedRef.current) return;

    const draft = readDraft();
    if (draft) {
      setTitle(draft.title);
      setDocumentType((draft.documentType as DocumentType) || 'memo');
      setDivisionId(draft.divisionId);
      setDepartmentId(draft.departmentId);
      setReferenceNumber(draft.referenceNumber);
      setRecipientName(draft.recipientName);
      setSensitivity((draft.sensitivity as DocumentSensitivity) || 'internal');
      setComposeMode(draft.composeMode);
      setEditorHtml(draft.editorHtml);
      setSelectedTemplateId(draft.selectedTemplateId);
      if (draft.editorHtml) {
        setTemplateApplied(true);
        lastResolvedTokensRef.current = buildTokenValues();
      }
      // The inline notice below the title replaces an auto-dismissing toast: it
      // stays put and carries the Discard affordance.
      setDraftRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once when dialog opens
  }, [open, mode]);

  // Templates are now loaded from backend - no initialization needed

  useEffect(() => {
    if (!open || !composeMode || !currentUser) return;
    setIsLoadingTemplates(true);
    const loadTemplateOptions = async () => {
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
    void loadTemplateOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per open/compose session
  }, [open, composeMode, currentUser?.id]);

  // Auto-apply selected template when the editor is still empty.
  useEffect(() => {
    if (!composeMode || templateApplied) return;
    if (mode === 'create' && selectedTemplateId && editorHtml.trim().length === 0) {
      const template = templates.find((item) => item.id === selectedTemplateId);
      if (template) {
        applyTemplateContent(template);
      }
    }
  }, [composeMode, templateApplied, mode, selectedTemplateId, templates, editorHtml, applyTemplateContent]);

  // Refresh previously resolved token text when metadata changes — do not re-apply pristine template.
  useEffect(() => {
    if (!templateApplied) return;
    setEditorHtml((prev) => {
      if (!prev.trim()) return prev;
      const next = refreshResolvedTokensInHtml(prev);
      return next === prev ? prev : next;
    });
  }, [
    title,
    referenceNumber,
    recipientName,
    divisionId,
    departmentId,
    templateApplied,
    refreshResolvedTokensInHtml,
  ]);

  // Validation functions
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = validateComposeFields({
      title,
      referenceNumber,
      composeMode,
      hasContent: editorHtml.trim().length > 0,
      hasFile: Boolean(file),
      requireTitle: mode === 'create',
    });

    // File type/size need the File object, so they stay here.
    if (!composeMode && file) {
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
  }, [mode, title, referenceNumber, composeMode, editorHtml, file]);

  const unsavedWork = hasUnsavedWork({
    title,
    editorHtml,
    hasFile: Boolean(file),
    referenceNumber,
    recipientName,
  });

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        // Flush first: leaving must never cost the last second of typing.
        flushDraft();
        if (asPage && !isSubmitting && unsavedWork) {
          setConfirmLeave(true);
          return;
        }
      }
      onOpenChange(nextOpen);
    },
    [flushDraft, asPage, isSubmitting, unsavedWork, onOpenChange],
  );

  const leaveWithoutCreating = useCallback(() => {
    setConfirmLeave(false);
    flushDraft();
    onOpenChange(false);
  }, [flushDraft, onOpenChange]);

  /** Throw away the autosaved draft and start from a blank document. */
  const discardDraft = useCallback(() => {
    clearDraft();
    setTitle('');
    setDocumentType('memo');
    setDivisionId(undefined);
    setDepartmentId(undefined);
    setReferenceNumber('');
    setRecipientName('');
    setSensitivity('internal');
    setComposeMode(initialComposeMode ?? mode === 'create');
    setEditorHtml('');
    setSelectedTemplateId(null);
    setTemplateApplied(false);
    setValidationErrors({});
    setDraftRestored(false);
    setDraftSavedAt(null);
  }, [initialComposeMode, mode]);

  const clearFieldError = useCallback((field: string) => {
    setValidationErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleEditorChange = useCallback(
    (html: string) => {
      setEditorHtml(html);
      clearFieldError('content');
    },
    [clearFieldError],
  );

  /** Name the document after the chosen file, so upload mode never asks twice. */
  const handleFileSelected = useCallback(
    (picked: File | null) => {
      setFile(picked);
      setScanMode(false);
      clearFieldError('file');
      if (!picked) return;
      setTitle((current) => nextTitleForFile(current, picked.name));
    },
    [clearFieldError],
  );

  /** Scroll to the first field the user has to fix; errors sit far apart on a page. */
  const focusFirstError = useCallback(() => {
    const field: ComposeField | null = firstInvalidField({
      title,
      referenceNumber,
      composeMode,
      hasContent: editorHtml.trim().length > 0,
      hasFile: Boolean(file),
      requireTitle: mode === 'create',
    });

    const scrollTo = (element: HTMLElement | null, focus = false) => {
      if (!element) return;
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (focus) element.focus({ preventScroll: true });
    };

    if (field === 'title') scrollTo(titleInputRef.current, true);
    else if (field === 'content') scrollTo(contentErrorRef.current);
    else if (field === 'file') scrollTo(fileErrorRef.current);
    else if (field === 'referenceNumber') scrollTo(referenceInputRef.current, true);
  }, [title, referenceNumber, composeMode, editorHtml, file, mode]);

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

  const handleSignatureUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Signature image must be under 5MB');
      return;
    }

    try {
      const result = await uploadUserSignature(file);
      if (result) {
        await refreshSignature();
        toast.success('Signature uploaded');
      }
    } catch (error: unknown) {
      logError('Failed to upload signature', error);
      toast.error('Failed to upload signature');
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, [refreshSignature]);

  const importWordFile = useCallback(async (picked: File) => {
    setIsImportingWord(true);
    try {
      const html = await importDocxFileToHtml(picked);
      if (!isMountedRef.current) return;
      setEditorHtml(html);
      setTemplateApplied(true);
      toast.success('Word document imported — layout may differ from Word');
    } catch (error: unknown) {
      logError('Failed to import Word document', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import Word document');
    } finally {
      if (isMountedRef.current) setIsImportingWord(false);
    }
  }, []);

  const handleWordImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.files?.[0];
      e.target.value = '';
      if (!picked) return;
      // Replacing existing content asks in-app rather than via window.confirm.
      if (editorHtml.trim()) {
        setPendingWordFile(picked);
        return;
      }
      void importWordFile(picked);
    },
    [editorHtml, importWordFile],
  );

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      // The error text mounts on the next render, so scroll after it exists.
      requestAnimationFrame(focusFirstError);
      toast.error('Please fix the highlighted fields before submitting');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
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
          fileType = resolveUploadMimeType(file);
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
            documentType,
            sensitivity,
            divisionId,
            departmentId,
            referenceNumber: referenceNumber.trim() || undefined,
            authorId: currentUser.id,
            drmPolicyId,
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
          clearDraft();
        } catch (_err) {
          // Ignore
        }
        toast.success('Document created successfully');
        handleClose(false);
        onComplete(created);
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
          fileType = resolveUploadMimeType(file);
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
        onComplete(updated);
        toast.success('New version added');
      }
    } catch (error: unknown) {
      logError('Document upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process document. Please try again.';
      
      toast.error('Failed to process document', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }, [mode, validateForm, focusFirstError, composeMode, editorHtml, file, title, documentType, sensitivity, drmPolicyId, divisionId, departmentId, referenceNumber, currentUser, document, scanMode, onComplete, replaceTemplateTokens, handleClose, notes]);

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
      // Esc to close — but not while another dialog (metadata, template) or an
      // open toolbar popover owns it.
      if (
        e.key === 'Escape' &&
        !showTemplateConfirm &&
        !showSaveTemplateDialog &&
        !metadataOpen &&
        !pendingWordFile &&
        !window.document.querySelector('[data-radix-popper-content-wrapper]') &&
        // Page Setup and Find & Replace own Escape while they are open. On the
        // compose page this form is inline, so any open dialog is theirs; the
        // dialog-hosted form is closed by its own Radix layer instead.
        window.document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length === 0
      ) {
        handleClose(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    open,
    isSubmitting,
    showTemplateConfirm,
    showSaveTemplateDialog,
    metadataOpen,
    pendingWordFile,
    handleSubmit,
    handleClose,
  ]);

  const dialogTitle = mode === 'create' ? 'Create Document' : 'Add New Version';
  const dialogDescription =
    mode === 'create'
      ? 'Compose or upload a document with metadata, templates, and content.'
      : `Upload a new version for "${document?.title ?? 'Document'}".`;
  const DialogIcon = mode === 'create' ? FilePlus : UploadIcon;

  const metadataSummary = useMemo(() => {
    const parts: string[] = [];
    const typeLabel = documentType.charAt(0).toUpperCase() + documentType.slice(1);
    parts.push(typeLabel);
    const sensLabel = SENSITIVITY_OPTIONS.find((o) => o.value === sensitivity)?.label ?? sensitivity;
    parts.push(sensLabel);
    if (resolvedDivision) parts.push(resolvedDivision.name);
    if (resolvedDepartment) parts.push(resolvedDepartment.name);
    if (recipientName.trim()) parts.push(`To: ${recipientName.trim()}`);
    if (referenceNumber) parts.push(referenceNumber);
    return parts.join(' · ');
  }, [documentType, sensitivity, resolvedDivision, resolvedDepartment, recipientName, referenceNumber]);

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId || null);
      if (!templateId) return;
      const template = templates.find((item) => item.id === templateId);
      if (!template) return;
      if (!editorHtml.trim() || !templateApplied) {
        applyTemplateContent(template);
        return;
      }
      setPendingTemplateAction('apply');
      setShowTemplateConfirm(true);
    },
    [templates, editorHtml, templateApplied, applyTemplateContent],
  );

  const metadataNeedsOrg = mode === 'create' && (!resolvedDivision || !resolvedDepartment);

  const formContent = (
    <div className={cn('space-y-5', asPage && 'pb-4')}>
      {draftRestored ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>Restored your unsaved draft.</span>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={discardDraft}>
            Discard draft
          </Button>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="doc-title" className="text-xs font-medium text-muted-foreground">
          Document title
        </Label>
        <Input
          id="doc-title"
          ref={titleInputRef}
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
          placeholder="Untitled document"
          className="h-12 rounded-xl border-border/70 bg-background px-4 text-lg shadow-sm placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring/25"
          maxLength={MAX_TITLE_LENGTH}
        />
      </div>
      {validationErrors.title && (
        <p className="text-xs text-destructive -mt-4" role="alert">
          {validationErrors.title}
        </p>
      )}

      <Dialog open={metadataOpen} onOpenChange={setMetadataOpen}>
        <DialogContent size="lg" height="scroll">
          <DialogHeader>
            <DialogTitle>Metadata &amp; Classification</DialogTitle>
            <DialogDescription>
              These details classify the document and fill memo header fields while you compose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="doc-type" className="text-xs">Type</Label>
                <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
                  <SelectTrigger id="doc-type" className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="doc-classification" className="text-xs">Document Classification</Label>
                <Select value={sensitivity} onValueChange={(value) => setSensitivity(value as DocumentSensitivity)}>
                  <SelectTrigger id="doc-classification" className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SENSITIVITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="doc-drm-policy" className="text-xs">Document Protection (DRM)</Label>
                <Select
                  value={drmPolicyId ?? 'inherit'}
                  onValueChange={(v) => setDrmPolicyId(v === 'inherit' ? null : v)}
                >
                  <SelectTrigger id="doc-drm-policy" className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Inherit from {SENSITIVITY_DETAILS[sensitivity as keyof typeof SENSITIVITY_DETAILS]?.label ?? sensitivity} (Default)</SelectItem>
                    {drmPolicies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>{policy.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 border-t pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Memo header</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="doc-division" className="text-xs">Division</Label>
                  <Select value={divisionId ?? 'none'} onValueChange={(v) => setDivisionId(v === 'none' ? undefined : v)}>
                    <SelectTrigger id="doc-division" className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {activeDivisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="doc-department" className="text-xs">Department</Label>
                  <Select value={departmentId ?? 'none'} onValueChange={(v) => setDepartmentId(v === 'none' ? undefined : v)} disabled={!divisionId}>
                    <SelectTrigger id="doc-department" className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {filteredDepartments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="doc-recipient" className="text-xs">Recipient</Label>
                  <Input
                    id="doc-recipient"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Recipient name"
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="doc-reference" className="text-xs">Reference</Label>
                  <Input
                    id="doc-reference"
                    ref={referenceInputRef}
                    value={referenceNumber}
                    onChange={(e) => {
                      setReferenceNumber(e.target.value);
                      clearFieldError('referenceNumber');
                    }}
                    placeholder="NPA/MOPS/2024/045"
                    className="h-8"
                    aria-invalid={Boolean(validationErrors.referenceNumber)}
                  />
                  {validationErrors.referenceNumber ? (
                    <p className="mt-1 text-xs text-destructive" role="alert">
                      {validationErrors.referenceNumber}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button type="button" size="sm" onClick={() => setMetadataOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Start with</p>
              <div className="mt-0.5 flex items-center gap-2">
                <Switch
                id="compose-mode"
                checked={composeMode}
                onCheckedChange={setComposeMode}
                disabled={mode === 'version' && !document}
                aria-label="Compose a document instead of uploading a file"
              />
                <span className="text-sm font-semibold">{composeMode ? 'Compose a document' : 'Upload a file'}</span>
              </div>
            </div>
          </div>
          {composeMode && (
            <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border/60 pt-3 sm:w-auto sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
                <Select value={selectedTemplateId ?? ''} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="h-9 min-w-0 flex-1 sm:w-52 sm:flex-none" aria-label="Choose a template">
                    <SelectValue placeholder="Choose template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 shrink-0 px-3"
                  onClick={() => {
                    if (!selectedTemplateId) { toast.error('Select a template'); return; }
                    const t = templates.find((x) => x.id === selectedTemplateId);
                    if (!t) return;
                    if (editorHtml.trim() && templateApplied) {
                      setPendingTemplateAction('apply');
                      setShowTemplateConfirm(true);
                      return;
                    }
                    applyTemplateContent(t);
                  }}
                  disabled={isLoadingTemplates}
                >
                  {isLoadingTemplates ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-muted-foreground hover:text-foreground"
                  disabled={!editorHtml?.trim()}
                  title={editorHtml?.trim() ? 'Save the current content as a template' : 'Add content first'}
                  onClick={() => {
                    if (!currentUser || !editorHtml?.trim()) {
                      toast.error(!currentUser ? 'No user context' : 'Add content first');
                      return;
                    }
                    setTemplateName(`${currentUser.name.split(' ')[0]}'s Template`);
                    setShowSaveTemplateDialog(true);
                  }}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-border/70 bg-background px-3"
                  disabled={isSubmitting || isImportingWord}
                  title="Import a .docx into the editor (not identical to Word)"
                  onClick={() => wordImportInputRef.current?.click()}
                >
                  {isImportingWord ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Import Word
                </Button>
                <input
                  ref={wordImportInputRef}
                  type="file"
                  className="hidden"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleWordImport}
                  disabled={isSubmitting || isImportingWord}
                />
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMetadataOpen(true)}
          aria-label="Edit metadata and classification"
          className="flex w-full items-center gap-3 border-t border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
        >
          <Settings2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Metadata &amp; Classification</span>
              <span className="text-xs font-medium text-primary">Edit</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {metadataSummary || 'Set type, sensitivity, organisation, and recipient'}
            </p>
            {metadataNeedsOrg ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Set division and department to complete the memo header.
              </p>
            ) : null}
          </div>
        </button>
      </div>
      {composeMode ? (
        <>
          <div className="min-h-[400px] rounded-xl border border-border/70 bg-background shadow-sm">
            <RichTextEditor
              value={editorHtml}
              onChange={handleEditorChange}
              placeholder="Start writing..."
              showCharacterCount
              showHeader={false}
              // The page is the scroller here; a fixed-height box would nest one.
              autoGrow={asPage}
              signatureImageUrl={userSignature?.imageData}
              tokens={[
                { label: "Title", value: "{{document.title}}" },
                { label: "Reference", value: "{{document.reference}}" },
                { label: "Prepared by", value: "{{preparedBy.name}}" },
                { label: "Sender", value: "{{sender.name}}" },
                { label: "Recipient", value: "{{recipient.name}}" },
                { label: "Division", value: "{{division.name}}" },
                { label: "Department", value: "{{department.name}}" },
                { label: "Today", value: "{{date.today}}" },
              ]}
            />
          </div>
          {validationErrors.content ? (
            <p ref={contentErrorRef} className="text-xs text-destructive" role="alert">
              {validationErrors.content}
            </p>
          ) : null}
        </>
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
          <FileUploadZone file={file} onFileSelect={handleFileSelected} maxSizeMB={MAX_FILE_SIZE_MB} disabled={isSubmitting} />
          {validationErrors.file ? (
            <p ref={fileErrorRef} className="text-xs text-destructive" role="alert">
              {validationErrors.file}
            </p>
          ) : null}
        </div>
      )}

      {composeMode && !userSignature?.imageData ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/15 px-3 py-2 text-sm text-muted-foreground">
          <span>Add your signature to the document</span>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => signatureInputRef.current?.click()} disabled={isSubmitting}>
            <PenTool className="h-3 w-3" />
            Upload Signature
          </Button>
          <input ref={signatureInputRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.gif" onChange={handleSignatureUpload} disabled={isSubmitting} />
        </div>
      ) : null}

      {mode === 'version' ? (
        <Textarea id="notes" placeholder="Version notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      ) : null}

      {uploadProgress > 0 && uploadProgress < 100 && (
        <Progress value={uploadProgress} className="h-1.5" />
      )}

      <div
        className={cn(
          'flex items-center gap-2',
          asPage
            ? 'sticky bottom-0 z-20 -mx-4 justify-between border-t border-border/70 bg-background px-4 py-3 md:-mx-6 md:px-6'
            : 'justify-end border-t bg-background pt-3',
        )}
      >
        {asPage ? (
          <p className="min-w-0 truncate text-xs text-muted-foreground" aria-live="polite">
            {draftSavedAt
              ? `Draft saved at ${new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Drafts save automatically as you write.'}
          </p>
        ) : null}
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="compact"
            onClick={handleSubmit}
            disabled={isSubmitting || (!composeMode && !file)}
            title={asPage ? 'Save document (Ctrl/Cmd+S)' : undefined}
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : mode === 'create' ? (
              'Create Document'
            ) : (
              'Add Version'
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const mainDialog = (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        size="3xl"
        height="fill"
        onPointerDownOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // A nested dialog (page setup, find & replace) or an open toolbar
          // popover owns this Escape; closing the whole compose here would
          // also throw the draft into the leave prompt.
          if (
            isSubmitting ||
            window.document.querySelectorAll('[role="dialog"]').length > 1 ||
            window.document.querySelector('[data-radix-popper-content-wrapper]')
          ) {
            e.preventDefault();
          }
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
          {formContent}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  return (
    <>{asPage ? formContent : mainDialog}

    <Dialog open={!!templatePreviewId} onOpenChange={(open) => !open && setTemplatePreviewId(null)}>
      <DialogContent size="xl" height="fill">
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
              const template = templates.find((item) => item.id === templatePreviewId);
              if (!template) return;
              if (editorHtml.trim().length > 0 && templateApplied) {
                setPendingTemplateAction('apply');
                setSelectedTemplateId(templatePreviewId);
                setShowTemplateConfirm(true);
                setTemplatePreviewId(null);
                return;
              }
              applyTemplateContent(template);
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
                applyTemplateContent(template);
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

    {/* Leaving the compose page with work in progress */}
    <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave without creating this document?</AlertDialogTitle>
          <AlertDialogDescription>
            Your title and content are kept as a draft on this device, and will be restored the
            next time you start a document here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={leaveWithoutCreating}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Import Word over existing content */}
    <AlertDialog
      open={Boolean(pendingWordFile)}
      onOpenChange={(isOpen) => !isOpen && setPendingWordFile(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace the current content?</AlertDialogTitle>
          <AlertDialogDescription>
            Importing this Word document replaces everything currently in the editor.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep current content</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const picked = pendingWordFile;
              setPendingWordFile(null);
              if (picked) void importWordFile(picked);
            }}
          >
            Import and replace
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
            Save as template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};