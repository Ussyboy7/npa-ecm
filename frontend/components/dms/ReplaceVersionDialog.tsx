"use client";

import { useState, useCallback, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { replaceDocumentVersion, type DocumentVersion } from '@/lib/api/dms';
import {
  validateFileType,
  validateFileSize,
  resolveUploadMimeType,
  MAX_FILE_SIZE_MB,
} from '@/lib/file-utils';
import { toast } from "@/components/ui/sonner";
import { logError } from '@/lib/client-logger';
import { useSignature } from '@/hooks/use-signature';
import { useCurrentUser } from '@/hooks/use-current-user';
import { FileUploadZone } from './FileUploadZone';
import { RichTextEditor } from './RichTextEditor';
import { Loader2, AlertTriangle, PenTool, Upload as UploadIcon, FileText } from 'lucide-react';
import type { DocumentRecord } from '@/lib/api/dms';
import { fetchCanonicalContent } from '@/lib/canonical-document';
import { convertDocxArrayBufferToHtml } from '@/lib/docx-to-html';
import { sanitizePastedRichText } from '@/lib/sanitize-html';

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

function isDocxVersion(version: DocumentVersion | null): boolean {
  const name = version?.fileName?.toLowerCase() || '';
  const type = version?.fileType?.toLowerCase() || '';
  return name.endsWith('.docx') || type.includes('wordprocessingml');
}

function isOfficeBinaryVersion(version: DocumentVersion | null): boolean {
  if (!version || version.contentHtml?.trim()) return false;
  const name = version.fileName?.toLowerCase() || '';
  return /\.(docx|doc|xlsx|xls|pptx|ppt)$/i.test(name);
}

export const ReplaceVersionDialog = ({
  open,
  onOpenChange,
  version,
  document,
  onComplete,
}: ReplaceVersionDialogProps) => {
  const { currentUser } = useCurrentUser();
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composeMode, setComposeMode] = useState(false);
  const [editorHtml, setEditorHtml] = useState('');
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [wordLoaded, setWordLoaded] = useState(false);
  const { signature: userSignature } = useSignature({
    userId: currentUser?.id,
    autoLoad: open && composeMode,
  });

  const officeBinary = isOfficeBinaryVersion(version);
  const canLoadDocx = isDocxVersion(version);

  useEffect(() => {
    if (!open || !version) return;
    const hasHtml = Boolean(version.contentHtml?.trim());
    setComposeMode(hasHtml);
    setEditorHtml(version.contentHtml ?? '');
    setFile(null);
    setNotes('');
    setError(null);
    setWordLoaded(hasHtml);
    setIsLoadingWord(false);
  }, [open, version]);

  const loadDocxIntoEditor = useCallback(async () => {
    if (!version?.id || !canLoadDocx) return;
    setIsLoadingWord(true);
    setError(null);
    try {
      const blob = await fetchCanonicalContent({
        kind: 'dms-version',
        versionId: version.id,
        fileName: version.fileName,
      });
      const html = sanitizePastedRichText(
        await convertDocxArrayBufferToHtml(await blob.arrayBuffer()),
      );
      setEditorHtml(html);
      setWordLoaded(true);
      setComposeMode(true);
      toast.success('Word content loaded for editing');
    } catch (err: unknown) {
      logError('Failed to load Word into editor', err);
      const message = err instanceof Error ? err.message : 'Failed to load Word document';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoadingWord(false);
    }
  }, [version, canLoadDocx]);

  const handleComposeToggle = useCallback(
    (checked: boolean) => {
      setComposeMode(checked);
      setError(null);
      if (checked && officeBinary && canLoadDocx && !wordLoaded && !editorHtml.trim()) {
        void loadDocxIntoEditor();
      }
    },
    [officeBinary, canLoadDocx, wordLoaded, editorHtml, loadDocxIntoEditor],
  );

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
    setComposeMode(false);
    setWordLoaded(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(async () => {
    if (!version || !document) {
      toast.error('No version selected');
      return;
    }

    if (!composeMode && !file) {
      toast.error('Please select a file to replace the version');
      return;
    }

    if (composeMode && !editorHtml.trim()) {
      toast.error('Add content before saving');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (composeMode) {
        const baseName =
          version.fileName?.replace(/\.[^/.]+$/, '') || document.title || 'document';
        const fileName = `${baseName}-edited.html`;
        const fileType = 'text/html';
        const contentHtml = editorHtml;
        const htmlFile = new File([contentHtml], fileName, { type: fileType });

        const updated = await replaceDocumentVersion(version.id, {
          fileName,
          fileType,
          fileSize: htmlFile.size,
          fileUrl: await fileToDataUrl(htmlFile),
          contentHtml,
          notes: notes.trim() || 'Edited in browser',
        });

        onComplete(updated);
        toast.success('Version updated successfully');
      } else {
        const updated = await replaceDocumentVersion(version.id, {
          fileName: file!.name,
          fileType: resolveUploadMimeType(file!),
          fileSize: file!.size,
          fileUrl: await fileToDataUrl(file!),
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
      <DialogContent size="full" height="screen">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Version {version.versionNumber}</DialogTitle>
          <DialogDescription>
            {officeBinary
              ? 'Edit in the browser (Convert → Compose), or upload a new Word/Excel file to replace this version.'
              : 'Edit the content or upload a new file to replace this version. The version number and upload date will be preserved.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2 sm:pr-4">
          <div className="space-y-4">
            <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Current Version:</p>
              <p className="text-xs text-muted-foreground break-all">{version.fileName}</p>
              {officeBinary && canLoadDocx && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="h-8"
                    disabled={isLoadingWord || isSubmitting}
                    onClick={() => void loadDocxIntoEditor()}
                  >
                    {isLoadingWord ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Edit in browser
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Opens this Word file in the editor. Layout may differ from Word; saving stores HTML.
                  </p>
                </div>
              )}
              {officeBinary && !canLoadDocx && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This Office file can&apos;t be edited in the browser yet. Edit it in Word/Excel, then
                    use Upload to replace this version.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <PenTool className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Compose</span>
              </div>
              <Switch
                checked={composeMode}
                onCheckedChange={handleComposeToggle}
                disabled={isLoadingWord}
              />
              <div className="flex items-center gap-2 text-sm">
                <UploadIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Upload</span>
              </div>
            </div>

            {composeMode ? (
              <div className="min-h-[400px] relative">
                {isLoadingWord && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                <RichTextEditor
                  value={editorHtml}
                  onChange={(html: string) => setEditorHtml(html)}
                  placeholder="Edit the document content..."
                  showCharacterCount
                  showHeader={false}
                  signatureImageUrl={userSignature?.imageData}
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
                placeholder={
                  composeMode ? 'Explain what was changed...' : 'Explain why this version is being replaced...'
                }
                rows={2}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 pt-4 mt-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting || isLoadingWord}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingWord || (!composeMode && !file)}
          >
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
