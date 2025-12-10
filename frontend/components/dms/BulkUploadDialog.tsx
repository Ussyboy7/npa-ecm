"use client";

import { useState, useCallback, startTransition } from 'react';
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
import { createDocument, type DocumentRecord, type DocumentType, type DocumentStatus, type DocumentSensitivity } from '@/lib/dms-storage';
import { validateFileType, validateFileSize, MAX_FILE_SIZE_MB, formatFileSize, getFileTypeLabel } from '@/lib/file-utils';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { Upload, X, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import type { User } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';

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
        } catch (error) {
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
    } catch (error) {
      logError('Bulk upload error', error);
      toast.error('An error occurred during bulk upload');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setCurrentUploading(null);
    }
  }, [files, defaultTags, defaultStatus, defaultSensitivity, defaultDivisionId, defaultDepartmentId, selectedWorkspaceIds, currentUser, onComplete]);

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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
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
            {/* Default Metadata Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="text-sm font-semibold">Default Metadata (applied to all files)</h3>
              <div className="grid grid-cols-2 gap-4">
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
                      {SENSITIVITY_OPTIONS.map((sens) => (
                        <SelectItem key={sens} value={sens}>
                          {sens.charAt(0).toUpperCase() + sens.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={defaultStatus} onValueChange={(value) => setDefaultStatus(value as DocumentStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
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
            </div>

            {/* File Selection */}
            <div className="space-y-2">
              <Label>Select Files</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.html"
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
                    Maximum {MAX_FILE_SIZE_MB}MB per file. Supported: PDF, Word, Excel, PowerPoint, Text, HTML.
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
                        <div className="grid grid-cols-2 gap-2">
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

        <DialogFooter className="mt-4">
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full mb-2">
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || files.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {files.length} Document{files.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

