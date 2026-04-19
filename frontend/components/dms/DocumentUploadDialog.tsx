"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  File
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { logError } from "@/lib/client-logger";
import type { DocumentRecord } from "@/lib/dms-storage";

interface DocumentUploadDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: "document" | "version" | "create";
  currentUser?: any;
  document?: DocumentRecord;
  onComplete?: (document: DocumentRecord) => void;
  onCancel?: () => void;
  asPage?: boolean;
  [key: string]: any;
}

const ALLOWED_FILE_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Presentations
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text files
  'text/plain',
  'text/csv',
  // Images (for attachments)
  'image/jpeg',
  'image/png',
  'image/gif',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentUploadDialog({
  open = false,
  onOpenChange,
  mode = "document",
  currentUser,
  document,
  onComplete,
  onCancel,
  asPage = false
}: DocumentUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVersionUpload = mode === "version";

  const handleFileSelect = (file: File) => {
    setError(null);

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("File type not supported. Please select a valid document file.");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("File size exceeds 50MB limit.");
      return;
    }

    setSelectedFile(file);

    // Auto-fill title if empty
    if (!title && file.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }

    // Auto-detect document type
    if (!documentType) {
      const type = detectDocumentType(file);
      setDocumentType(type);
    }
  };

  const detectDocumentType = (file: File): string => {
    const ext = file.name.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return 'policy';
      case 'doc':
      case 'docx': return 'letter';
      case 'xls':
      case 'xlsx': return 'spreadsheet';
      case 'ppt':
      case 'pptx': return 'presentation';
      case 'txt': return 'memo';
      case 'csv': return 'report';
      default: return 'other';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (isVersionUpload && !document) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      if (isVersionUpload) {
        // Upload new version
        formData.append('title', title || selectedFile.name);
        if (description) formData.append('description', description);

        const response = await apiFetch<DocumentRecord>(
          `/dms/documents/${document!.id}/versions/`,
          {
            method: 'POST',
            body: formData,
            // Note: Progress tracking would require XMLHttpRequest or similar
          }
        );

        toast.success("New version uploaded successfully");
        onComplete?.(response);
      } else {
        // Create new document
        formData.append('title', title || selectedFile.name);
        if (description) formData.append('description', description);
        if (documentType) formData.append('document_type', documentType);
        formData.append('created_by', currentUser?.id || '');

        const response = await apiFetch<DocumentRecord>('/dms/documents/', {
          method: 'POST',
          body: formData,
        });

        toast.success("Document uploaded successfully");
        onComplete?.(response);
      }

      // Reset form
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      setDocumentType("");
      setUploadProgress(0);
      onOpenChange?.(false);

    } catch (err) {
      logError('Document upload failed', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading) return; // Prevent closing during upload
    setSelectedFile(null);
    setTitle("");
    setDescription("");
    setDocumentType("");
    setError(null);
    setUploadProgress(0);
    onOpenChange?.(false);
    onCancel?.();
  };

  const dialogContent = (
    <div className="space-y-6">
      <div>
        <Label htmlFor="file-upload" className="text-base font-medium">
          {isVersionUpload ? "Upload New Version" : "Select Document File"}
        </Label>
        <Card className="mt-2">
          <CardContent className="p-6">
            <div className="text-center">
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <File className="h-4 w-4 mr-2" />
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Drop your file here or click to browse</p>
                    <p className="text-sm text-muted-foreground">
                      Supports PDF, Word, Excel, PowerPoint, and more (max 50MB)
                    </p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                className="hidden"
                accept={ALLOWED_FILE_TYPES.join(',')}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                disabled={uploading}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedFile && (
        <>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                disabled={uploading}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document"
                rows={3}
                disabled={uploading}
              />
            </div>

            {!isVersionUpload && (
              <div>
                <Label htmlFor="document-type">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType} disabled={uploading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="memo">Memo</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="circular">Circular</SelectItem>
                    <SelectItem value="form">Form</SelectItem>
                    <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </>
      )}

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !title.trim() || uploading}
        >
          {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {uploading ? "Uploading..." : isVersionUpload ? "Upload Version" : "Upload Document"}
        </Button>
      </div>
    </div>
  );

  if (asPage) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {isVersionUpload ? "Upload New Version" : "Upload Document"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isVersionUpload
              ? "Upload a new version of this document"
              : "Upload a new document to the system"
            }
          </p>
        </div>
        {dialogContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isVersionUpload ? "Upload New Version" : "Upload Document"}
          </DialogTitle>
          <DialogDescription>
            {isVersionUpload
              ? "Upload a new version of this document"
              : "Upload a new document to the system"
            }
          </DialogDescription>
        </DialogHeader>
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}