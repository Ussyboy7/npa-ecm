"use client";

import { useState, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { replaceDocumentVersion, type DocumentVersion } from '@/lib/dms-storage';
import { validateFileType, validateFileSize, MAX_FILE_SIZE_MB } from '@/lib/file-utils';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { FileUploadZone } from './FileUploadZone';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { DocumentRecord } from '@/lib/dms-storage';

interface ReplaceVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: DocumentVersion | null;
  document: DocumentRecord | null;
  onComplete: (document: DocumentRecord) => void;
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

export const ReplaceVersionDialog = ({
  open,
  onOpenChange,
  version,
  document,
  onComplete,
}: ReplaceVersionDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);
    
    if (selectedFile) {
      // Validate file type
      const typeValidation = validateFileType(selectedFile);
      if (!typeValidation.valid) {
        setError(typeValidation.error || 'Invalid file type');
        setFile(null);
        return;
      }

      // Validate file size
      const sizeValidation = validateFileSize(selectedFile, MAX_FILE_SIZE_MB);
      if (!sizeValidation.valid) {
        setError(sizeValidation.error || 'File too large');
        setFile(null);
        return;
      }
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!file || !version || !document) {
      toast.error('Please select a file to replace the version');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const fileUrl = await fileToDataUrl(file);
      
      const updated = await replaceDocumentVersion(version.id, {
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileUrl,
        notes: notes.trim() || 'Version replaced',
      });

      onComplete(updated);
      toast.success('Version replaced successfully');
      handleClose();
    } catch (error) {
      logError('Failed to replace version', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to replace version';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [file, version, document, notes, onComplete]);

  const handleClose = useCallback(() => {
    setFile(null);
    setNotes('');
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  if (!version || !document) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Replace Version {version.versionNumber}</DialogTitle>
          <DialogDescription>
            Upload a new file to replace this version. The version number and upload date will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-sm font-medium mb-1">Current Version:</p>
            <p className="text-xs text-muted-foreground">{version.fileName}</p>
          </div>

          <div className="space-y-2">
            <Label>
              New File <span className="text-destructive">*</span>
            </Label>
            <FileUploadZone
              file={file}
              onFileSelect={handleFileSelect}
              maxSizeMB={MAX_FILE_SIZE_MB}
              disabled={isSubmitting}
            />
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="replace-notes">Replacement Notes (optional)</Label>
            <Textarea
              id="replace-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain why this version is being replaced..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !file}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Replacing...
              </>
            ) : (
              'Replace Version'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

