"use client";

import { useState, useCallback, startTransition, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createDocument, createDocumentVersion, queryDocuments, fetchWorkspaces, type DocumentRecord, type DocumentType, type DocumentStatus, type DocumentSensitivity, type DocumentWorkspace } from '@/lib/dms-storage';
import { validateFileType, validateFileSize, MAX_FILE_SIZE_MB, formatFileSize, getFileTypeLabel } from '@/lib/file-utils';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { Upload, X, FileText, AlertTriangle, Loader2, Scan, CheckCircle2 } from 'lucide-react';
import type { User } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { processOCR } from '@/lib/capture-storage';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'form', 'other'];
const SENSITIVITY_OPTIONS: DocumentSensitivity[] = ['public', 'internal', 'confidential', 'restricted'];

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
  onComplete: (documents: DocumentRecord[]) => void;
  defaultWorkspaceIds?: string[];
}

interface FileWithMetadata {
  file: File;
  title: string;
  documentType: DocumentType;
  description?: string;
  referenceNumber?: string;
}

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

export const BulkUploadDialog = ({
  open,
  onOpenChange,
  currentUser,
  onComplete,
  defaultWorkspaceIds = [],
}: BulkUploadDialogProps) => {
  const { divisions, departments } = useOrganization();
  const activeDivisions = useMemo(() => divisions.filter((division) => division.isActive !== false), [divisions]);
  const activeDepartments = useMemo(() => departments.filter((department) => department.isActive !== false), [departments]);
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploading, setCurrentUploading] = useState<string | null>(null);
  
  // Default metadata (applied to all files)
  const [defaultDocumentType, setDefaultDocumentType] = useState<DocumentType>('memo');
  const [defaultSensitivity, setDefaultSensitivity] = useState<DocumentSensitivity>('internal');
  const [defaultStatus, setDefaultStatus] = useState<DocumentStatus>('draft');
  const [defaultDivisionId, setDefaultDivisionId] = useState<string | undefined>(currentUser.division);
  const [defaultDepartmentId, setDefaultDepartmentId] = useState<string | undefined>(currentUser.department);
  const [defaultTags, setDefaultTags] = useState('');
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(defaultWorkspaceIds);
  const [workspaces, setWorkspaces] = useState<DocumentWorkspace[]>([]);
  
  // Filter departments based on selected division
  const filteredDepartments = useMemo(() => {
    if (!defaultDivisionId) return activeDepartments;
    return activeDepartments.filter((dept) => dept.divisionId === defaultDivisionId);
  }, [defaultDivisionId, activeDepartments]);
  
  // Clear department when division changes
  useEffect(() => {
    if (defaultDivisionId && defaultDepartmentId) {
      const dept = activeDepartments.find((d) => d.id === defaultDepartmentId);
      if (dept && dept.divisionId !== defaultDivisionId) {
        setDefaultDepartmentId(undefined);
      }
    }
  }, [defaultDivisionId, defaultDepartmentId, activeDepartments]);
  
  // Load workspaces
  useEffect(() => {
    if (open) {
      fetchWorkspaces().then(setWorkspaces).catch(() => {
        // Silently fail
      });
    }
  }, [open]);
  
  // OCR processing options
  const [enableOCR, setEnableOCR] = useState(false);
  const [extractMetadata, setExtractMetadata] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newFiles: FileWithMetadata[] = [];
    const errors: string[] = [];

    selectedFiles.forEach((file) => {
      // Validate file type
      const typeValidation = validateFileType(file);
      if (!typeValidation.valid) {
        errors.push(`${file.name}: ${typeValidation.error || 'Invalid file type'}`);
        return;
      }

      // Validate file size
      const sizeValidation = validateFileSize(file, MAX_FILE_SIZE_MB);
      if (!sizeValidation.valid) {
        errors.push(`${file.name}: ${sizeValidation.error || 'File too large'}`);
        return;
      }

      // Generate title from filename (remove extension)
      const title = file.name.replace(/\.[^/.]+$/, '');

      newFiles.push({
        file,
        title,
        documentType: defaultDocumentType,
        description: '',
        referenceNumber: '',
      });
    });

    if (errors.length > 0) {
      toast.error(`Some files were rejected:\n${errors.join('\n')}`);
    }

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) added`);
    }

    // Reset input
    e.target.value = '';
  }, [defaultDocumentType]);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateFileMetadata = useCallback((index: number, updates: Partial<FileWithMetadata>) => {
    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    const createdDocuments: DocumentRecord[] = [];
    const errors: string[] = [];

    try {
      const tags = defaultTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      const uniqueTags = Array.from(new Set(tags));

      for (let i = 0; i < files.length; i++) {
        const fileMeta = files[i];
        setCurrentUploading(fileMeta.file.name);
        setUploadProgress((i / files.length) * 100);

        try {
          const fileUrl = await fileToDataUrl(fileMeta.file);
          
          const document = await createDocument(
            {
              title: fileMeta.title.trim(),
              description: fileMeta.description?.trim() || undefined,
              documentType: fileMeta.documentType,
              status: defaultStatus,
              sensitivity: defaultSensitivity,
              divisionId: defaultDivisionId,
              departmentId: defaultDepartmentId,
              referenceNumber: fileMeta.referenceNumber?.trim() || undefined,
              tags: uniqueTags,
              authorId: currentUser.id,
              workspaceIds: selectedWorkspaceIds.length > 0 ? selectedWorkspaceIds : undefined,
            },
            {
              fileName: fileMeta.file.name,
              fileType: fileMeta.file.type || 'application/octet-stream',
              fileSize: fileMeta.file.size,
              fileUrl,
            },
          );

          createdDocuments.push(document);
          
          // Process OCR if enabled
          if (enableOCR) {
            try {
              await processOCR(document.id, {
                language: 'eng',
                extract_metadata: extractMetadata,
              });
            } catch (ocrError) {
              logError('Failed to start OCR processing', ocrError);
              // Don't fail the upload if OCR fails
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${fileMeta.file.name}: ${errorMessage}`);
          logError('Failed to create document', error);
        }
      }

      setUploadProgress(100);
      setCurrentUploading(null);

      if (errors.length > 0) {
        toast.error(`Failed to upload ${errors.length} file(s):\n${errors.join('\n')}`);
      }

      if (createdDocuments.length > 0) {
        toast.success(`Successfully uploaded ${createdDocuments.length} document(s)`);
        handleClose(false);
        // Use startTransition to batch the onComplete callback
        startTransition(() => {
          setTimeout(() => {
            onComplete(createdDocuments);
          }, 100);
        });
      } else {
        toast.error('Failed to upload any documents');
      }
      
      if (enableOCR && createdDocuments.length > 0) {
        toast.info(`OCR processing started for ${createdDocuments.length} document(s)`);
      }
    } catch (error: unknown) {
      logError('Bulk upload error', error);
      toast.error('An error occurred during bulk upload');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setCurrentUploading(null);
    }
  }, [files, defaultTags, defaultStatus, defaultSensitivity, defaultDivisionId, defaultDepartmentId, selectedWorkspaceIds, currentUser, enableOCR, extractMetadata, onComplete]);

  const handleClose = useCallback((newOpen: boolean) => {
    // Just close the dialog - don't reset state here to avoid blocking
    onOpenChange(newOpen);
    // Reset state only when dialog is fully closed, using a longer delay
    if (!newOpen) {
      // Use a longer timeout to ensure dialog close animation completes
      setTimeout(() => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(() => {
            setFiles([]);
            setUploadProgress(0);
            setCurrentUploading(null);
          }, { timeout: 1000 });
        } else {
          // Fallback: reset after a longer delay
          setTimeout(() => {
            setFiles([]);
            setUploadProgress(0);
            setCurrentUploading(null);
          }, 500);
        }
      }, 200);
    }
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Upload Documents
          </DialogTitle>
          <DialogDescription>
            Upload multiple files at once. Each file will become a separate document with shared metadata.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Processing Options */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Processing Options
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="process-ocr"
                    checked={enableOCR}
                    onCheckedChange={(checked) => setEnableOCR(checked === true)}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="process-ocr" className="text-sm font-normal cursor-pointer">
                    Process OCR (Extract text from scanned documents and images)
                  </Label>
                </div>
                {enableOCR && (
                  <div className="flex items-center space-x-2 ml-6">
                    <Checkbox
                      id="extract-metadata"
                      checked={extractMetadata}
                      onCheckedChange={(checked) => setExtractMetadata(checked === true)}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="extract-metadata" className="text-sm font-normal cursor-pointer">
                      Extract metadata (dates, reference numbers, emails, phone numbers)
                    </Label>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  OCR processing runs in the background. You can check progress on individual document pages.
                </p>
              </div>
            </div>

            <Separator />

            {/* Default Metadata Section */}
            <div className="space-y-4 p-3 sm:p-4 border rounded-lg bg-muted/30">
              <h3 className="text-sm font-semibold">Default Metadata (applied to all files)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={defaultDocumentType} onValueChange={(value) => setDefaultDocumentType(value as DocumentType)}>
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label>Sensitivity</Label>
                  <Select value={defaultSensitivity} onValueChange={(value) => setDefaultSensitivity(value as DocumentSensitivity)}>
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
                  {defaultSensitivity === 'public' && (
                    <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-blue-700 dark:text-blue-300">Accessible to all authenticated users. Suitable for documents that may be shared externally.</p>
                    </div>
                  )}
                  {defaultSensitivity === 'internal' && (
                    <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-xs">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-green-700 dark:text-green-300">Accessible to all authenticated users. For internal organizational use only.</p>
                    </div>
                  )}
                  {defaultSensitivity === 'confidential' && (
                    <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/20 rounded text-xs">
                      <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                      <p className="text-warning/90">Requires MSS2 or higher grade level access.</p>
                    </div>
                  )}
                  {defaultSensitivity === 'restricted' && (
                    <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-destructive/90">Highest security level. Only accessible to top management (MSS1, EDCS, MDCS).</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={defaultStatus} onValueChange={(value) => setDefaultStatus(value as DocumentStatus)}>
                    <SelectTrigger>
                      <SelectValue />
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
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    value={defaultTags}
                    onChange={(e) => setDefaultTags(e.target.value)}
                    placeholder="Comma separated e.g. operations, project"
                  />
                </div>
              </div>
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
                          disabled={isSubmitting}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Division</Label>
                  <Select
                    value={defaultDivisionId ?? 'none'}
                    onValueChange={(value) => {
                      setDefaultDivisionId(value === 'none' ? undefined : value);
                      if (value === 'none') {
                        setDefaultDepartmentId(undefined);
                      } else {
                        if (defaultDepartmentId) {
                          const dept = activeDepartments.find((d) => d.id === defaultDepartmentId);
                          if (dept && dept.divisionId !== value) {
                            setDefaultDepartmentId(undefined);
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
                        <SelectItem key={division.id} value={division.id}>
                          {division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={defaultDepartmentId ?? 'none'}
                    onValueChange={(value) => setDefaultDepartmentId(value === 'none' ? undefined : value)}
                    disabled={!defaultDivisionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={defaultDivisionId ? "Select department" : "Select division first"} />
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
                  {!defaultDivisionId && (
                    <p className="text-xs text-muted-foreground">
                      Select a division first to choose a department
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* File Selection */}
            <div className="space-y-2">
              <Label>Select Files</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.html,.png,.jpg,.jpeg,.tiff,.bmp"
                  onChange={handleFileSelect}
                  disabled={isSubmitting}
                  className="hidden"
                  id="bulk-upload-input"
                />
                <label htmlFor="bulk-upload-input">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    Click to select files or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Maximum {MAX_FILE_SIZE_MB}MB per file. Supported: PDF, Word, Excel, PowerPoint, Text, HTML, Images (PNG, JPG, TIFF, BMP).
                  </p>
                </label>
              </div>
            </div>

            {/* Files List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Files to Upload ({files.length})</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiles([])}
                    disabled={isSubmitting}
                  >
                    Clear All
                  </Button>
                </div>
                <ScrollArea className="max-h-[300px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {files.map((fileMeta, index) => (
                      <div key={index} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" title={fileMeta.file.name}>
                                {fileMeta.file.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{getFileTypeLabel(fileMeta.file)}</span>
                                <span>•</span>
                                <span>{formatFileSize(fileMeta.file.size)}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveFile(index)}
                            disabled={isSubmitting}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Title</Label>
                            <Input
                              value={fileMeta.title}
                              onChange={(e) => handleUpdateFileMetadata(index, { title: e.target.value })}
                              className="h-8 text-xs"
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={fileMeta.documentType}
                              onValueChange={(value) => handleUpdateFileMetadata(index, { documentType: value as DocumentType })}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
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
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Reference Number (optional)</Label>
                            <Input
                              value={fileMeta.referenceNumber || ''}
                              onChange={(e) => handleUpdateFileMetadata(index, { referenceNumber: e.target.value })}
                              className="h-8 text-xs"
                              placeholder="Optional"
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Description (optional)</Label>
                            <Input
                              value={fileMeta.description || ''}
                              onChange={(e) => handleUpdateFileMetadata(index, { description: e.target.value })}
                              className="h-8 text-xs"
                              placeholder="Optional"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {currentUploading && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Uploading: {currentUploading}... ({Math.round(uploadProgress)}%)
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full mb-2">
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || files.length === 0} className="w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Uploading...</span>
                <span className="sm:hidden">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Upload {files.length} Document{files.length !== 1 ? 's' : ''}</span>
                <span className="sm:hidden">Upload {files.length}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

