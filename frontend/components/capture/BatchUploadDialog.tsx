"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Upload, X, FileText, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { processBatch, getBatchUpload, type BatchUpload } from '@/lib/capture-storage';
import { createDocument } from '@/lib/dms-storage';
import { logError } from '@/lib/client-logger';
import {
  MIME_TYPE_PDF,
  MIME_TYPE_DOCX,
  MIME_TYPE_DOC,
  MIME_TYPE_PNG,
  MIME_TYPE_JPEG,
  MIME_TYPE_WEBP,
  MIME_TYPE_TIFF,
  MIME_TYPE_BMP,
} from '@/lib/file-types';

interface BatchUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (documents: Array<{ id: string; title: string }>) => void;
}

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  documentId?: string;
  error?: string;
  progress?: number;
}

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
const ALLOWED_TYPES = [
  MIME_TYPE_PDF,
  MIME_TYPE_DOC,
  MIME_TYPE_DOCX,
  MIME_TYPE_TIFF,
  MIME_TYPE_BMP,
  MIME_TYPE_PNG,
  MIME_TYPE_JPEG,
  MIME_TYPE_WEBP,
];

export const BatchUploadDialog = ({ open, onOpenChange, onComplete }: BatchUploadDialogProps) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processOCR, setProcessOCR] = useState(true);
  const [extractMetadata, setExtractMetadata] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [batchUpload, setBatchUpload] = useState<BatchUpload | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds maximum size of 30MB`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File "${file.name}" has unsupported type: ${file.type}`;
    }
    return null;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = [];
    const errors: string[] = [];

    Array.from(selectedFiles).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
        return;
      }

      // Check for duplicates
      if (files.some(f => f.file.name === file.name && f.file.size === file.size)) {
        errors.push(`File "${file.name}" is already in the list`);
        return;
      }

      newFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'pending',
      });
    });

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) added`);
    }
  }, [files]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Cleanup on unmount or dialog close
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    // Cancel previous upload if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsUploading(true);
    setUploadProgress(0);
    const documentIds: string[] = [];

    try {
      // Upload files and create documents
      for (let i = 0; i < files.length; i++) {
        const uploadFile = files[i];
        
        try {
          // Update file status
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'uploading', progress: 0 }
              : f
          ));

          // Read file as data URL
          const fileUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(uploadFile.file);
          });

          // Create document with version
          const document = await createDocument(
            {
              title: uploadFile.file.name.replace(/\.[^/.]+$/, ''), // Remove extension
              documentType: 'other',
              status: 'draft',
              sensitivity: 'internal',
            },
            {
              fileName: uploadFile.file.name,
              fileType: uploadFile.file.type || 'application/octet-stream',
              fileSize: uploadFile.file.size,
              fileUrl,
              notes: `Batch uploaded: ${uploadFile.file.name}`,
            }
          );

          documentIds.push(document.id);

          // Update file status
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'uploaded', documentId: document.id, progress: 100 }
              : f
          ));

          setUploadProgress(((i + 1) / files.length) * 50); // First 50% for upload
        } catch (error: unknown) {
          logError(`Failed to upload ${uploadFile.file.name}`, error);
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'failed', error: (error instanceof Error ? error.message : 'Upload failed') }
              : f
          ));
        }
      }

      // Process batch if OCR or metadata extraction is requested
      if (documentIds.length > 0 && (processOCR || extractMetadata)) {
        setUploadProgress(50);
        
        // Update all files to processing
        setFiles(prev => prev.map(f => 
          documentIds.includes(f.documentId || '')
            ? { ...f, status: 'processing' }
            : f
        ));

        const batch = await processBatch(documentIds, {
          process_ocr: processOCR,
          extract_metadata: extractMetadata,
          language: 'eng',
        });

        setBatchUpload(batch);

        // Poll for batch status
        pollIntervalRef.current = setInterval(async () => {
          if (controller.signal.aborted) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            return;
          }

          try {
            const updatedBatch = await getBatchUpload(batch.id);
            if (controller.signal.aborted) return;

            setBatchUpload(updatedBatch);

            const progress = 50 + (updatedBatch.processed_files / updatedBatch.total_files) * 50;
            setUploadProgress(progress);

            if (updatedBatch.status === 'completed' || updatedBatch.status === 'partial' || updatedBatch.status === 'failed') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
              }
              setIsUploading(false);

              // Update file statuses
              setFiles(prev => prev.map(f => {
                if (f.documentId && documentIds.includes(f.documentId)) {
                  const doc = updatedBatch.documents.find(d => d.id === f.documentId);
                  return {
                    ...f,
                    status: doc ? 'completed' : 'failed',
                    progress: 100,
                  };
                }
                return f;
              }));

              if (updatedBatch.status === 'completed') {
                toast.success(`Batch processing completed: ${updatedBatch.successful_files} files processed`);
                onComplete?.(updatedBatch.documents);
              } else if (updatedBatch.status === 'partial') {
                toast.warning(`Batch processing partially completed: ${updatedBatch.successful_files} successful, ${updatedBatch.failed_files} failed`);
                onComplete?.(updatedBatch.documents);
              } else {
                toast.error(`Batch processing failed: ${updatedBatch.errors.map(e => e.error).join(', ')}`);
              }
            }
          } catch (error: unknown) {
            logError('Failed to poll batch status', error);
          }
        }, 2000);

        // Timeout after 10 minutes
        setTimeout(() => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          if (isUploading && !controller.signal.aborted) {
            setIsUploading(false);
            toast.warning('Batch processing is taking longer than expected. Check status later.');
          }
        }, 600000);
      } else {
        // No processing needed, just upload
        setIsUploading(false);
        setUploadProgress(100);
        toast.success(`Successfully uploaded ${documentIds.length} file(s)`);
        onComplete?.(documentIds.map(id => ({ id, title: '' })));
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      logError('Batch upload failed', error);
      toast.error((error instanceof Error ? error.message : 'Batch upload failed'));
      setIsUploading(false);
    }
  }, [files, processOCR, extractMetadata, onComplete, isUploading]);

  const handleClose = useCallback(() => {
    if (isUploading) {
      // Cancel upload if in progress
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      setIsUploading(false);
    }
    setFiles([]);
    setBatchUpload(null);
    setUploadProgress(0);
    setIsDragging(false);
    onOpenChange(false);
  }, [isUploading, onOpenChange]);

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'uploaded':
        return <Badge variant="secondary">Uploaded</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Batch Document Upload</DialogTitle>
          <DialogDescription>
            Upload multiple documents and process them with OCR and metadata extraction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-2">
              Drag and drop files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, TIFF, BMP (max 30MB per file)
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Select files to upload"
            >
              Select Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.tiff,.bmp"
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={isUploading}
            />
          </div>

          {/* Processing Options */}
          <div className="space-y-3 p-4 border rounded-lg">
            <Label className="text-base font-semibold">Processing Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="process-ocr"
                  checked={processOCR}
                  onCheckedChange={(checked) => setProcessOCR(checked as boolean)}
                  disabled={isUploading}
                />
                <Label htmlFor="process-ocr" className="cursor-pointer">
                  Process OCR (Extract text from scanned documents)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="extract-metadata"
                  checked={extractMetadata}
                  onCheckedChange={(checked) => setExtractMetadata(checked as boolean)}
                  disabled={isUploading}
                />
                <Label htmlFor="extract-metadata" className="cursor-pointer">
                  Extract metadata (Dates, reference numbers, emails, phone numbers)
                </Label>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
              {batchUpload && (
                <p className="text-xs text-muted-foreground">
                  Processing: {batchUpload.processed_files} / {batchUpload.total_files} files
                  {batchUpload.successful_files > 0 && ` • ${batchUpload.successful_files} successful`}
                  {batchUpload.failed_files > 0 && ` • ${batchUpload.failed_files} failed`}
                </p>
              )}
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length})</Label>
              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getStatusIcon(file.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                            {file.progress !== undefined && file.progress < 100 && (
                              <span> • {file.progress}%</span>
                            )}
                          </p>
                          {file.error && (
                            <p className="text-xs text-destructive mt-1">{file.error}</p>
                          )}
                        </div>
                        {getStatusBadge(file.status)}
                      </div>
                      {file.status !== 'uploading' && file.status !== 'processing' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Batch Status */}
          {batchUpload && batchUpload.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Processing Errors:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {batchUpload.errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>{error.file}: {error.error}</li>
                  ))}
                  {batchUpload.errors.length > 5 && (
                    <li>... and {batchUpload.errors.length - 5} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isUploading}
            aria-label={isUploading ? 'Cancel upload' : 'Close dialog'}
          >
            {isUploading ? 'Cancel Upload' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleUpload} 
            aria-label="Upload and process files"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Process ({files.length} files)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

