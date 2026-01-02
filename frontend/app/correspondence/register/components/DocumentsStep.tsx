"use client";

import { memo, useRef } from 'react';
import { ArrowLeft, Upload, FileText, X, Tag, Send, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FormData } from '../register-utils';
import { validateFile } from '../register-utils';
import { toast } from 'sonner';

interface DocumentsStepProps {
  formData: FormData;
  documentFiles: File[];
  errors: Record<string, string>;
  submitting: boolean;
  onFormDataChange: (updates: Partial<FormData>) => void;
  onDocumentFilesAdd: (files: File[]) => void;
  onDocumentFileRemove: (index: number) => void;
  onErrorClear: (field: string) => void;
  onPrev: () => void;
  onSubmit: () => void;
}

export const DocumentsStep = memo(function DocumentsStep({
  formData,
  documentFiles,
  errors,
  submitting,
  onFormDataChange,
  onDocumentFilesAdd,
  onDocumentFileRemove,
  onErrorClear,
  onPrev,
  onSubmit,
}: DocumentsStepProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Upload Documents <span className="text-destructive">*</span>
        </Label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
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
            const fileList = Array.from(e.dataTransfer.files ?? []).filter(validateFile);
            if (fileList.length) {
              onDocumentFilesAdd(fileList);
              if (errors.documentFiles) onErrorClear('documentFiles');
              toast.success(`${fileList.length} file(s) added`);
            }
          }}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${
              errors.documentFiles
                ? 'border-destructive bg-destructive/5'
                : 'border-border hover:bg-muted/50 hover:border-primary/50'
            }`}
          aria-label="Upload documents"
          aria-describedby={errors.documentFiles ? 'documentFiles-error' : undefined}
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
          <p className="text-xs text-muted-foreground">PDF, DOC, DOCX up to 30MB</p>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            ref={fileInputRef}
            multiple
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

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" disabled={submitting} onClick={onSubmit}>
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
    </div>
  );
});

