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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { replaceDocumentVersion, type DocumentVersion } from '@/lib/api/dms';
import { validateFileType, validateFileSize, MAX_FILE_SIZE_MB } from '@/lib/file-utils';
import { toast } from "@/components/ui/sonner";
import { logError } from '@/lib/client-logger';
import { FileUploadZone } from './FileUploadZone';
import { RichTextEditor } from './RichTextEditor';
import { Loader2, AlertTriangle, PenTool, Upload as UploadIcon } from 'lucide-react';
import type { DocumentRecord } from '@/lib/api/dms';

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
  const [composeMode, setComposeMode] = useState(() => Boolean(version?.contentHtml));
  const [editorHtml, setEditorHtml] = useState(() => version?.contentHtml ?? '');

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);
    
    if (selectedFile) {
      const typeValidation = validateFileType(selectedFile);
      if (!typeValidation.valid) {
        setError(typeValidation.error || 'Invalid file type');
        setFile(null);
        return;
      }

      const sizeValidation = validateFileSize(selectedFile, MAX_FILE_SIZE_MB);
      if (!sizeValidation.valid) {
        setError(sizeValidation.error || 'File too large');
        setFile(null);
        return;
      }
    }
  }, []);

  const handleClose = useCallback(() => {
    setFile(null);
    setEditorHtml('');
    setNotes('');
    setError(null);
    setComposeMode(Boolean(version?.contentHtml));
    onOpenChange(false);
  }, [onOpenChange, version]);

  const handleSubmit = useCallback(async () => {
    if (!version || !document) {
      toast.error('No version selected');
      return;
    }

    if (!composeMode && !file) {
      toast.error('Please select a file to replace the version');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (composeMode) {
        const fileName = `${version.fileName?.replace(/\.[^/.]+$/, '') || 'document'}-edited-v${version.versionNumber}.html`;
        const fileType = 'text/html';
        const contentHtml = editorHtml;
        const htmlFile = new File([contentHtml], fileName, { type: fileType });

        const updated = await replaceDocumentVersion(version.id, {
          fileName,
          fileType,
          fileSize: htmlFile.size,
          fileUrl: await fileToDataUrl(htmlFile),
          contentHtml,
          notes: notes.trim() || 'Version edited',
        });

        onComplete(updated);
        toast.success('Version updated successfully');
      } else {
        const fileUrl = await fileToDataUrl(file!);
        
        const updated = await replaceDocumentVersion(version.id, {
          fileName: file!.name,
          fileType: file!.type || 'application/octet-stream',
          fileSize: file!.size,
          fileUrl,
          notes: notes.trim() || 'Version replaced',
        });

        onComplete(updated);
        toast.success('Version replaced successfully');
      }

      handleClose();
    } catch (error: unknown) {
      logError('Failed to replace version', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to replace version';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [file, version, document, notes, composeMode, editorHtml, onComplete, handleClose]);

  if (!version || !document) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="3xl" height="fill">
        <DialogHeader>
          <DialogTitle>Edit Version {version.versionNumber}</DialogTitle>
          <DialogDescription>
            Edit the content or upload a new file to replace this version. The version number and upload date will be preserved.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-200px)] sm:max-h-[60vh] pr-2 sm:pr-4">
          <div className="space-y-4">
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-sm font-medium mb-1">Current Version:</p>
              <p className="text-xs text-muted-foreground break-all">{version.fileName}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <PenTool className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Compose</span>
              </div>
              <Switch
                checked={composeMode}
                onCheckedChange={(checked) => {
                  setComposeMode(checked);
                  setError(null);
                }}
              />
              <div className="flex items-center gap-2 text-sm">
                <UploadIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Upload</span>
              </div>
            </div>

            {composeMode ? (
              <div className="min-h-[400px] border rounded-lg overflow-hidden">
                <RichTextEditor
                  value={editorHtml}
                  onChange={(html: string) => setEditorHtml(html)}
                  placeholder="Edit the document content..."
                  showCharacterCount
                />
              </div>
            ) : (
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
            )}

            <div className="space-y-2">
              <Label htmlFor="replace-notes">
                {composeMode ? 'Edit Notes (optional)' : 'Replacement Notes (optional)'}
              </Label>
              <Textarea
                id="replace-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={composeMode ? "Explain what was changed..." : "Explain why this version is being replaced..."}
                rows={2}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (!composeMode && !file)}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : composeMode ? (
              'Save Changes'
            ) : (
              'Replace Version'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

