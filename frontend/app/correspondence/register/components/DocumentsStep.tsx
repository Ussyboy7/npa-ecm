"use client";

import { memo, useRef, useState, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, X, Tag, Send, Loader2, FolderSearch } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormData } from '../register-utils';
import { validateFile } from '../register-utils';
import { toast } from "@/components/ui/sonner";
import { apiFetch } from '@/lib/api-client';

interface DocumentsStepProps {
  formData: FormData;
  documentFiles: File[];
  linkedDocumentIds: string[];
  errors: Record<string, string>;
  submitting: boolean;
  onFormDataChange: (updates: Partial<FormData>) => void;
  onDocumentFilesAdd: (files: File[]) => void;
  onDocumentFileRemove: (index: number) => void;
  onLinkedDocsChange: (ids: string[]) => void;
  onErrorClear: (field: string) => void;
  onPrev: () => void;
  onSubmit: () => void;
}

interface LinkedDoc {
  id: string;
  title: string;
  reference_number?: string;
}

export const DocumentsStep = memo(function DocumentsStep({
  formData,
  documentFiles,
  linkedDocumentIds,
  errors,
  submitting,
  onFormDataChange,
  onDocumentFilesAdd,
  onDocumentFileRemove,
  onLinkedDocsChange,
  onErrorClear,
  onPrev,
  onSubmit,
}: DocumentsStepProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showMyDocs, setShowMyDocs] = useState(false);
  const [myDocs, setMyDocs] = useState<LinkedDoc[]>([]);
  const [myDocsLoading, setMyDocsLoading] = useState(false);
  const [myDocsSearch, setMyDocsSearch] = useState('');
  const selectedIds = new Set(linkedDocumentIds);
  const hasUploads = documentFiles.length > 0;
  const hasLinkedDocs = linkedDocumentIds.length > 0;

  const handleFileSelect = (files: FileList | null) => {
    if (!files || hasLinkedDocs) return;
    const validFiles = Array.from(files).filter(validateFile);
    if (validFiles.length) {
      onDocumentFilesAdd(validFiles);
      if (errors.documentFiles) onErrorClear('documentFiles');
      toast.success(`${validFiles.length} file(s) added`);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!showMyDocs) return;
    setMyDocsLoading(true);
    const params = new URLSearchParams({ page: '1', page_size: '20' });
    if (myDocsSearch.trim()) params.set('search', myDocsSearch.trim());
    apiFetch<{ results: LinkedDoc[] }>(`/dms/documents/?${params.toString()}`)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as { results: LinkedDoc[] }).results || [];
        setMyDocs(list as LinkedDoc[]);
      })
      .catch(() => setMyDocs([]))
      .finally(() => setMyDocsLoading(false));
  }, [showMyDocs, myDocsSearch]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label>
            Source document <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            title={hasUploads ? 'Selecting a document clears uploaded files' : undefined}
            onClick={() => setShowMyDocs(true)}
          >
            <FolderSearch className="h-4 w-4 mr-2" />
            Select from My Documents
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload a new file or select an existing document — not both for the same registration.
        </p>
        <div
          role="button"
          tabIndex={hasLinkedDocs ? -1 : 0}
          onClick={() => {
            if (hasLinkedDocs) return;
            fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (hasLinkedDocs) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (hasLinkedDocs) return;
            const fileList = Array.from(e.dataTransfer.files ?? []).filter(validateFile);
            if (fileList.length) {
              onDocumentFilesAdd(fileList);
              if (errors.documentFiles) onErrorClear('documentFiles');
              toast.success(`${fileList.length} file(s) added`);
            }
          }}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${
              hasLinkedDocs
                ? 'border-border bg-muted/30 cursor-not-allowed opacity-60'
                : errors.documentFiles
                  ? 'border-destructive bg-destructive/5 cursor-pointer'
                  : 'border-border hover:bg-muted/50 hover:border-primary/50 cursor-pointer'
            }`}
          aria-label="Upload documents"
          aria-disabled={hasLinkedDocs}
          aria-describedby={errors.documentFiles ? 'documentFiles-error' : undefined}
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium mb-1">
            {hasLinkedDocs ? 'Using document(s) from My Documents' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-muted-foreground">PDF, DOC, DOCX up to 30MB</p>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            ref={fileInputRef}
            multiple
            disabled={hasLinkedDocs}
            onChange={(e) => handleFileSelect(e.target.files)}
            aria-label="File input"
          />
        </div>
        {errors.documentFiles && (
          <p id="documentFiles-error" className="text-xs text-destructive" role="alert">
            {errors.documentFiles}
          </p>
        )}
      </div>

      {documentFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Attached Files ({documentFiles.length})</Label>
          <div className="space-y-2">
            {documentFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onDocumentFileRemove(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            placeholder="e.g. infrastructure, urgent, budget (comma-separated)"
            value={formData.tags}
            onChange={(e) => onFormDataChange({ tags: e.target.value })}
          />
          {formData.tags && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.tags
                .split(',')
                .map((tag, i) => tag.trim() && (
                  <Badge key={i} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" aria-hidden="true" />
                    {tag.trim()}
                  </Badge>
                ))}
            </div>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea
            id="remarks"
            placeholder="Add registry notes or routing instructions"
            value={formData.remarks}
            onChange={(e) => onFormDataChange({ remarks: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <p className="text-xs font-medium">Selected from My Documents ({selectedIds.size})</p>
          <div className="flex flex-wrap gap-1">
            {Array.from(selectedIds).map((id) => {
              const doc = myDocs.find((d) => d.id === id);
              return (
                <Badge key={id} variant="secondary" className="text-xs gap-1">
                  <FileText className="h-3 w-3" />
                  {doc?.title || id.slice(0, 8)}
                  <button type="button" onClick={() => onLinkedDocsChange(linkedDocumentIds.filter((x) => x !== id))} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">Will be linked to this correspondence after registration.</p>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="ghost" size="sm" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="button" size="compact" disabled={submitting} onClick={onSubmit}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Registering...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Register & Send
            </>
          )}
        </Button>
      </div>

      <Dialog open={showMyDocs} onOpenChange={setShowMyDocs}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select from My Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {hasUploads && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Selecting a document clears uploaded files for this registration.
              </p>
            )}
            <Input placeholder="Search my documents…" value={myDocsSearch} onChange={(e) => setMyDocsSearch(e.target.value)} />
            <div className="max-h-[320px] overflow-auto rounded-lg border divide-y">
              {myDocsLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : myDocs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No documents found. Upload one in Documents first.</div>
              ) : (
                myDocs.map((doc) => {
                  const selected = selectedIds.has(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => onLinkedDocsChange(selected ? linkedDocumentIds.filter((x) => x !== doc.id) : [...linkedDocumentIds, doc.id])}
                      className={`w-full text-left p-3 flex items-center gap-3 hover:bg-muted/50 ${selected ? 'bg-primary/5' : ''}`}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        {doc.reference_number && <p className="text-xs text-muted-foreground truncate">{doc.reference_number}</p>}
                      </div>
                      {selected && <Badge variant="default" className="text-xs">Selected</Badge>}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowMyDocs(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

