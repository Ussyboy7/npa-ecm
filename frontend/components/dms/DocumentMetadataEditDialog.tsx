"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { updateDocumentMetadata, queryDocuments, type DocumentRecord, type DocumentType } from '@/lib/dms-storage';
import type { Division, Department } from '@/lib/npa-structure';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentMetadataEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentRecord | null;
  onDocumentUpdate: (updated: DocumentRecord) => void;
  divisions?: Division[];
  departments?: Department[];
}

interface MetadataDraft {
  title: string;
  description: string;
  referenceNumber: string;
  documentType: DocumentType;
  divisionId: string | undefined;
  departmentId: string | undefined;
  tags: string;
  sensitivity: DocumentRecord['sensitivity'];
  status: DocumentRecord['status'];
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'letter', label: 'Letter' },
  { value: 'memo', label: 'Memo' },
  { value: 'circular', label: 'Circular' },
  { value: 'policy', label: 'Policy' },
  { value: 'report', label: 'Report' },
  { value: 'form', label: 'Form' },
  { value: 'other', label: 'Other' },
];

export const DocumentMetadataEditDialog = ({
  open,
  onOpenChange,
  document,
  onDocumentUpdate,
  divisions = [],
  departments = [],
}: DocumentMetadataEditDialogProps) => {
  const [metadataDraft, setMetadataDraft] = useState<MetadataDraft>({
    title: '',
    description: '',
    referenceNumber: '',
    documentType: 'other',
    divisionId: undefined,
    departmentId: undefined,
    tags: '',
    sensitivity: 'internal',
    status: 'draft',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [metadataErrors, setMetadataErrors] = useState<Record<string, string>>({});
  const [pendingStatusChange, setPendingStatusChange] = useState<DocumentRecord['status'] | null>(null);
  const [showStatusChangeConfirmation, setShowStatusChangeConfirmation] = useState(false);
  const [checkingReferenceNumber, setCheckingReferenceNumber] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  // Filter departments by selected division
  const filteredDepartments = useMemo(() => {
    if (!metadataDraft.divisionId) return departments;
    return departments.filter((dept) => dept.divisionId === metadataDraft.divisionId);
  }, [departments, metadataDraft.divisionId]);

  // Load tag suggestions from existing documents
  useEffect(() => {
    if (!open) return;
    const loadTagSuggestions = async () => {
      try {
        const result = await queryDocuments({ page: 1, pageSize: 100 });
        const allTags = new Set<string>();
        result.results.forEach((doc) => {
          doc.tags.forEach((tag) => allTags.add(tag.toLowerCase()));
        });
        setTagSuggestions(Array.from(allTags).slice(0, 20).sort());
      } catch (error: unknown) {
        // Silently fail - tag suggestions are optional
      }
    };
    void loadTagSuggestions();
  }, [open]);

  // Initialize draft when dialog opens or document changes
  useEffect(() => {
    if (open && document) {
      setMetadataDraft({
        title: document.title,
        description: document.description ?? '',
        referenceNumber: document.referenceNumber ?? '',
        documentType: document.documentType ?? 'other',
        divisionId: document.divisionId,
        departmentId: document.departmentId,
        tags: document.tags.join(', '),
        sensitivity: document.sensitivity,
        status: document.status,
      });
      setHasUnsavedChanges(false);
      setMetadataErrors({});
    }
  }, [open, document]);

  // Reset department when division changes
  useEffect(() => {
    if (metadataDraft.divisionId && document?.divisionId !== metadataDraft.divisionId) {
      const currentDept = departments.find((d) => d.id === metadataDraft.departmentId);
      if (currentDept && currentDept.divisionId !== metadataDraft.divisionId) {
        setMetadataDraft((prev) => ({ ...prev, departmentId: undefined }));
      }
    }
  }, [metadataDraft.divisionId, metadataDraft.departmentId, departments, document?.divisionId]);

  // Check for duplicate reference numbers
  useEffect(() => {
    if (!metadataDraft.referenceNumber.trim() || !document) {
      setCheckingReferenceNumber(false);
      return;
    }
    if (metadataDraft.referenceNumber === document.referenceNumber) {
      setCheckingReferenceNumber(false);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setCheckingReferenceNumber(true);
      try {
        const result = await queryDocuments({ 
          referenceNumber: metadataDraft.referenceNumber.trim(),
          page: 1,
          pageSize: 1,
        });
        if (result.results.length > 0 && result.results[0].id !== document.id) {
          setMetadataErrors((prev) => ({ ...prev, referenceNumber: 'This reference number is already in use' }));
        } else {
          setMetadataErrors((prev) => {
            const next = { ...prev };
            delete next.referenceNumber;
            return next;
          });
        }
      } catch (error: unknown) {
        // Silently fail - duplicate check is optional
      } finally {
        setCheckingReferenceNumber(false);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [metadataDraft.referenceNumber, document]);

  // Track unsaved changes
  useEffect(() => {
    if (!document || !open) return;

    const hasChanges =
      metadataDraft.title !== document.title ||
      metadataDraft.description !== (document.description ?? '') ||
      metadataDraft.referenceNumber !== (document.referenceNumber ?? '') ||
      metadataDraft.documentType !== (document.documentType ?? 'other') ||
      metadataDraft.divisionId !== document.divisionId ||
      metadataDraft.departmentId !== document.departmentId ||
      metadataDraft.tags !== document.tags.join(', ') ||
      metadataDraft.sensitivity !== document.sensitivity ||
      metadataDraft.status !== document.status;

    setHasUnsavedChanges(hasChanges);
  }, [metadataDraft, document, open]);

  const validateMetadata = (): boolean => {
    const errors: Record<string, string> = {};

    if (!metadataDraft.title.trim()) {
      errors.title = 'Title is required';
    }
    if (metadataDraft.title.length > 500) {
      errors.title = 'Title must be less than 500 characters';
    }
    if (metadataDraft.referenceNumber && metadataDraft.referenceNumber.length > 100) {
      errors.referenceNumber = 'Reference number must be less than 100 characters';
    }

    setMetadataErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkStatusChange = (newStatus: DocumentRecord['status']): boolean => {
    if (!document) return false;
    const oldStatus = document.status;

    if (oldStatus === 'draft' && newStatus === 'published') {
      return true;
    }
    if (oldStatus === 'published' && newStatus === 'archived') {
      return true;
    }
    return false;
  };

  const handleStatusChange = (newStatus: DocumentRecord['status']) => {
    if (checkStatusChange(newStatus)) {
      setPendingStatusChange(newStatus);
      setShowStatusChangeConfirmation(true);
    } else {
      setMetadataDraft({ ...metadataDraft, status: newStatus });
      setHasUnsavedChanges(true);
    }
  };

  const confirmStatusChange = () => {
    if (pendingStatusChange) {
      setMetadataDraft({ ...metadataDraft, status: pendingStatusChange });
      setHasUnsavedChanges(true);
      setPendingStatusChange(null);
      setShowStatusChangeConfirmation(false);
      toast.info('Status change will be saved when you click "Save Changes"');
    }
  };

  const handleSave = async () => {
    if (!document) return;

    if (!validateMetadata()) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    const hasChanges =
      metadataDraft.title !== document.title ||
      metadataDraft.description !== (document.description ?? '') ||
      metadataDraft.referenceNumber !== (document.referenceNumber ?? '') ||
      metadataDraft.divisionId !== document.divisionId ||
      metadataDraft.departmentId !== document.departmentId ||
      metadataDraft.tags !== document.tags.join(', ') ||
      metadataDraft.sensitivity !== document.sensitivity ||
      metadataDraft.status !== document.status;

    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }

    setSavingMetadata(true);
    try {
      const tags = metadataDraft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const oldStatus = document.status;
      const updated = await updateDocumentMetadata(document.id, {
        title: metadataDraft.title,
        description: metadataDraft.description,
        referenceNumber: metadataDraft.referenceNumber,
        documentType: metadataDraft.documentType,
        divisionId: metadataDraft.divisionId,
        departmentId: metadataDraft.departmentId,
        tags,
        sensitivity: metadataDraft.sensitivity,
        status: metadataDraft.status,
      });

      onDocumentUpdate(updated);
      setHasUnsavedChanges(false);
      setMetadataErrors({});
      onOpenChange(false);

      if (oldStatus !== updated.status) {
        toast.success(`Document ${oldStatus} → ${updated.status}`);
      } else {
        toast.success('Document details updated');
      }
    } catch (error: unknown) {
      logError('Failed to update metadata', error);
      const errorMessage =
        (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data && typeof error.response.data.detail === 'string') ? error.response.data.detail :
        (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'title' in error.response.data && Array.isArray(error.response.data.title) && error.response.data.title.length > 0 && typeof error.response.data.title[0] === 'string') ? error.response.data.title[0] :
        'Unable to update document';
      toast.error(errorMessage);
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleDiscard = () => {
    if (document) {
      setMetadataDraft({
        title: document.title,
        description: document.description ?? '',
        referenceNumber: document.referenceNumber ?? '',
        documentType: document.documentType ?? 'other',
        divisionId: document.divisionId,
        departmentId: document.departmentId,
        tags: document.tags.join(', '),
        sensitivity: document.sensitivity,
        status: document.status,
      });
      setHasUnsavedChanges(false);
      setMetadataErrors({});
      toast.info('Changes discarded');
    }
  };

  if (!document) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Edit Document Metadata
            </DialogTitle>
            <DialogDescription>
              Update document details, classification, and metadata
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Basic Information</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="doc-title"
                    value={metadataDraft.title}
                    onChange={(e) => {
                      setMetadataDraft((prev) => ({ ...prev, title: e.target.value }));
                      setHasUnsavedChanges(true);
                      if (metadataErrors.title) setMetadataErrors({ ...metadataErrors, title: '' });
                    }}
                    placeholder="Enter document title..."
                    aria-label="Document title"
                    aria-required="true"
                    aria-invalid={!!metadataErrors.title}
                    aria-describedby={metadataErrors.title ? 'title-error' : undefined}
                  />
                  {metadataErrors.title && (
                    <p id="title-error" className="text-xs text-destructive" role="alert">
                      {metadataErrors.title}
                    </p>
                  )}
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select
                      value={metadataDraft.documentType}
                      onValueChange={(value) => {
                        setMetadataDraft((prev) => ({ ...prev, documentType: value as DocumentType }));
                        setHasUnsavedChanges(true);
                      }}
                      aria-label="Document type"
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={metadataDraft.status}
                      onValueChange={(value) => {
                        const newStatus = value as DocumentRecord['status'];
                        handleStatusChange(newStatus);
                      }}
                      aria-label="Document status"
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    {document && metadataDraft.status !== document.status && (
                      <p className="text-xs text-muted-foreground">
                        Status will change from <span className="font-medium">{document.status}</span> to{' '}
                        <span className="font-medium">{metadataDraft.status}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-description">Description</Label>
                  <Textarea
                    id="doc-description"
                    rows={3}
                    value={metadataDraft.description}
                    onChange={(e) => {
                      setMetadataDraft((prev) => ({ ...prev, description: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter document description..."
                  />
                </div>
              </div>
            </div>

            {/* Classification & Organization Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Classification & Organization</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sensitivity</Label>
                  <Select
                    value={metadataDraft.sensitivity}
                    onValueChange={(value) => {
                      const newSensitivity = value as DocumentRecord['sensitivity'];
                      setMetadataDraft((prev) => ({ ...prev, sensitivity: newSensitivity }));
                      setHasUnsavedChanges(true);
                      if (newSensitivity === 'restricted' && document && document.sensitivity !== 'restricted') {
                        toast.warning('Restricted sensitivity requires high-level access permissions');
                      }
                    }}
                    aria-label="Document sensitivity"
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  {metadataDraft.sensitivity === 'public' && (
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
                  {metadataDraft.sensitivity === 'internal' && (
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
                  {metadataDraft.sensitivity === 'confidential' && (
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
                  {metadataDraft.sensitivity === 'restricted' && (
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
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="doc-division">Division</Label>
                    <Select
                      value={metadataDraft.divisionId && metadataDraft.divisionId.trim() !== '' ? metadataDraft.divisionId : 'none'}
                      onValueChange={(value) => {
                        setMetadataDraft((prev) => ({
                          ...prev,
                          divisionId: value === 'none' ? undefined : value,
                          departmentId: value === 'none' ? prev.departmentId : undefined,
                        }));
                        setHasUnsavedChanges(true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {divisions
                          .filter((division) => division.id && division.id.trim() !== '')
                          .map((division) => (
                            <SelectItem key={division.id} value={division.id}>
                              {division.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-department">Department</Label>
                    <Select
                      value={metadataDraft.departmentId && metadataDraft.departmentId.trim() !== '' ? metadataDraft.departmentId : 'none'}
                      onValueChange={(value) => {
                        setMetadataDraft((prev) => ({
                          ...prev,
                          departmentId: value === 'none' ? undefined : value,
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      disabled={!metadataDraft.divisionId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={metadataDraft.divisionId ? "Select department" : "Select division first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {filteredDepartments
                          .filter((department) => department.id && department.id.trim() !== '')
                          .map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {!metadataDraft.divisionId && (
                      <p className="text-xs text-muted-foreground">Select a division first to choose a department</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Metadata Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Additional Metadata</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-reference">Reference Number</Label>
                  <div className="relative">
                    <Input
                      id="doc-reference"
                      value={metadataDraft.referenceNumber}
                      onChange={(e) => {
                        setMetadataDraft((prev) => ({ ...prev, referenceNumber: e.target.value }));
                        setHasUnsavedChanges(true);
                        if (metadataErrors.referenceNumber)
                          setMetadataErrors({ ...metadataErrors, referenceNumber: '' });
                      }}
                      placeholder="Enter reference number..."
                      aria-label="Reference number"
                      aria-invalid={!!metadataErrors.referenceNumber}
                      aria-describedby={metadataErrors.referenceNumber ? 'reference-error' : undefined}
                    />
                    {checkingReferenceNumber && (
                      <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {metadataErrors.referenceNumber && (
                    <p id="reference-error" className="text-xs text-destructive" role="alert">
                      {metadataErrors.referenceNumber}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-tags">Tags</Label>
                  <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={tagsOpen}
                        className="w-full justify-between"
                      >
                        <span className="truncate">
                          {metadataDraft.tags || 'Add tags (comma separated)'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search or type tags..."
                          value={metadataDraft.tags}
                          onValueChange={(value) => {
                            setMetadataDraft((prev) => ({ ...prev, tags: value }));
                            setHasUnsavedChanges(true);
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>No suggestions. Type to add new tags.</CommandEmpty>
                          <CommandGroup>
                            {tagSuggestions
                              .filter((tag) => 
                                !metadataDraft.tags.split(',').map(t => t.trim().toLowerCase()).includes(tag) &&
                                tag.includes(metadataDraft.tags.split(',').pop()?.trim().toLowerCase() || '')
                              )
                              .slice(0, 10)
                              .map((tag) => (
                                <CommandItem
                                  key={tag}
                                  onSelect={() => {
                                    const currentTags = metadataDraft.tags.split(',').map(t => t.trim()).filter(Boolean);
                                    const lastTag = currentTags.pop() || '';
                                    const newTags = [...currentTags, tag].join(', ');
                                    setMetadataDraft((prev) => ({ ...prev, tags: newTags }));
                                    setHasUnsavedChanges(true);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      metadataDraft.tags.toLowerCase().includes(tag) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {tag}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <div className="flex flex-wrap gap-1.5">
                    {metadataDraft.tags
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                      .map((tag, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const tags = metadataDraft.tags
                                .split(',')
                                .map((t) => t.trim())
                                .filter((t) => t !== tag);
                              setMetadataDraft((prev) => ({ ...prev, tags: tags.join(', ') }));
                              setHasUnsavedChanges(true);
                            }}
                            className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Separate multiple tags with commas. Click suggestions to add, or type to create new tags.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 border-t gap-2 sm:gap-0">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span>You have unsaved changes</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
                {hasUnsavedChanges && (
                  <Button variant="outline" onClick={handleDiscard} aria-label="Discard changes" className="w-full sm:w-auto">
                    Discard
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || savingMetadata}
                  aria-label="Save document changes"
                  className="w-full sm:w-auto"
                >
                  {savingMetadata ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span className="hidden sm:inline">Saving...</span>
                      <span className="sm:hidden">Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Save Changes</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation */}
      {showStatusChangeConfirmation && pendingStatusChange && (
        <Dialog open={showStatusChangeConfirmation} onOpenChange={setShowStatusChangeConfirmation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Status Change</DialogTitle>
              <DialogDescription>
                You are about to change the document status from{' '}
                <strong>{document.status}</strong> to <strong>{pendingStatusChange}</strong>.
                {pendingStatusChange === 'published' && (
                  <div className="mt-2 p-2 bg-primary/10 border border-primary/20 rounded text-sm">
                    Publishing this document will make it visible to users with appropriate permissions.
                  </div>
                )}
                {pendingStatusChange === 'archived' && (
                  <div className="mt-2 p-2 bg-secondary/10 border border-secondary/20 rounded text-sm">
                    Archiving this document will move it to archived status. It can still be accessed but
                    won't appear in active document lists.
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPendingStatusChange(null);
                  setShowStatusChangeConfirmation(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={confirmStatusChange}>Confirm Change</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};


