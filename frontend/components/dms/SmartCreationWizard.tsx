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
import { createDocument, createCollection as createCollectionAPI, type DocumentRecord, type DocumentType, type DocumentStatus, type DocumentSensitivity } from '@/lib/dms-storage';
import { validateFileType, validateFileSize, MAX_FILE_SIZE_MB, formatFileSize } from '@/lib/file-utils';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { Upload, X, FileText, Loader2, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { User } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'form', 'other'];
const SENSITIVITY_OPTIONS: DocumentSensitivity[] = ['public', 'internal', 'confidential', 'restricted'];

interface SmartCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
  onComplete: (documents: DocumentRecord[], collectionId?: string) => void;
}

interface ProjectFile {
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

export const SmartCreationWizard = ({
  open,
  onOpenChange,
  currentUser,
  onComplete,
}: SmartCreationWizardProps) => {
  const { divisions, departments } = useOrganization();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Project metadata
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [createCollection, setCreateCollection] = useState(true);
  
  // Default document metadata
  const [defaultDocumentType, setDefaultDocumentType] = useState<DocumentType>('memo');
  const [defaultSensitivity, setDefaultSensitivity] = useState<DocumentSensitivity>('internal');
  const [defaultStatus, setDefaultStatus] = useState<DocumentStatus>('draft');
  const [defaultDivisionId, setDefaultDivisionId] = useState<string | undefined>(currentUser.division);
  const [defaultDepartmentId, setDefaultDepartmentId] = useState<string | undefined>(currentUser.department);
  const [defaultTags, setDefaultTags] = useState('');

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newFiles: ProjectFile[] = [];
    const errors: string[] = [];

    selectedFiles.forEach((file) => {
      const typeValidation = validateFileType(file);
      if (!typeValidation.valid) {
        errors.push(`${file.name}: ${typeValidation.error || 'Invalid file type'}`);
        return;
      }

      const sizeValidation = validateFileSize(file, MAX_FILE_SIZE_MB);
      if (!sizeValidation.valid) {
        errors.push(`${file.name}: ${sizeValidation.error || 'File too large'}`);
        return;
      }

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

    e.target.value = '';
  }, [defaultDocumentType]);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateFileMetadata = useCallback((index: number, updates: Partial<ProjectFile>) => {
    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    const createdDocuments: DocumentRecord[] = [];
    const errors: string[] = [];

    try {
      const tags = defaultTags.split(',').map((tag) => tag.trim()).filter(Boolean);
      const uniqueTags = Array.from(new Set(tags));

      for (let i = 0; i < files.length; i++) {
        const fileMeta = files[i];
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

      let collectionId: string | undefined;
      if (createCollection && projectName.trim() && createdDocuments.length > 0) {
        try {
          const collection = await createCollectionAPI({
            name: projectName.trim(),
            description: projectDescription.trim() || undefined,
            documentIds: createdDocuments.map(d => d.id),
            isPublic: false,
          });
          collectionId = collection.id;
        } catch (error) {
          logError('Failed to create collection', error);
          toast.warning('Documents created but collection creation failed');
        }
      }

      if (errors.length > 0) {
        toast.error(`Failed to upload ${errors.length} file(s)`);
      }

      if (createdDocuments.length > 0) {
        toast.success(`Successfully created ${createdDocuments.length} document(s)`);
        if (collectionId) {
          toast.success('Collection created and documents added');
        }
        handleClose(false);
        // Use startTransition to batch the onComplete callback
        startTransition(() => {
          setTimeout(() => {
            onComplete(createdDocuments, collectionId);
          }, 100);
        });
      }
    } catch (error) {
      logError('Smart creation error', error);
      toast.error('An error occurred during creation');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }, [files, defaultTags, defaultStatus, defaultSensitivity, defaultDivisionId, defaultDepartmentId, currentUser, createCollection, projectName, projectDescription, onComplete]);

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
            setProjectName('');
            setProjectDescription('');
            setCreateCollection(true);
            setStep(1);
            setUploadProgress(0);
          }, { timeout: 1000 });
        } else {
          // Fallback: reset after a longer delay
          setTimeout(() => {
            setFiles([]);
            setProjectName('');
            setProjectDescription('');
            setCreateCollection(true);
            setStep(1);
            setUploadProgress(0);
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
            <Sparkles className="h-5 w-5" />
            Smart Creation Wizard
          </DialogTitle>
          <DialogDescription>
            Create multiple documents for a project with shared metadata and optional collection grouping.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
            </div>
            <span className="text-sm font-medium">Project Info</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {step > 2 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
            </div>
            <span className="text-sm font-medium">Files</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              3
            </div>
            <span className="text-sm font-medium">Metadata</span>
          </div>
        </div>

        <ScrollArea className="flex-1 pr-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., ECM Project 2024"
                />
              </div>
              <div className="space-y-2">
                <Label>Project Description (optional)</Label>
                <Textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe the project..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="create-collection"
                  checked={createCollection}
                  onChange={(e) => setCreateCollection(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="create-collection" className="cursor-pointer">
                  Create a collection to group these documents
                </Label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
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
                    id="wizard-upload-input"
                  />
                  <label htmlFor="wizard-upload-input">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Click to select files or drag and drop</p>
                    <p className="text-xs text-muted-foreground">Maximum {MAX_FILE_SIZE_MB}MB per file</p>
                  </label>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <Label>Files ({files.length})</Label>
                  <ScrollArea className="max-h-[300px] border rounded-lg p-2">
                    <div className="space-y-2">
                      {files.map((fileMeta, index) => (
                        <div key={index} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{fileMeta.file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(fileMeta.file.size)}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFile(index)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={fileMeta.title}
                              onChange={(e) => handleUpdateFileMetadata(index, { title: e.target.value })}
                              className="h-8 text-xs"
                              placeholder="Title"
                            />
                            <Select
                              value={fileMeta.documentType}
                              onValueChange={(value) => handleUpdateFileMetadata(index, { documentType: value as DocumentType })}
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
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/30">
                <h3 className="text-sm font-semibold mb-3">Default Metadata (applied to all files)</h3>
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
                      placeholder="Comma separated"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full mb-2">
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isSubmitting}>
                  Previous
                </Button>
              )}
              {step < 3 ? (
                <Button onClick={() => setStep(step + 1)} disabled={isSubmitting || (step === 2 && files.length === 0)}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting || files.length === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create {files.length} Document{files.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
