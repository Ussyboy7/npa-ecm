"use client";

import { useCallback, useState } from "react";
import { FileText, Upload, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize, getFileTypeIcon, getFileTypeLabel, validateFileSize, validateFileType } from "@/lib/file-utils";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileUploadZoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  maxSizeMB: number;
  disabled?: boolean;
  className?: string;
}

export const FileUploadZone = ({
  file,
  onFileSelect,
  maxSizeMB,
  disabled = false,
  className,
}: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragError(null);

    if (disabled) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) {
      setDragError("No file was dropped");
      return;
    }

    // Validate file type
    const typeValidation = validateFileType(droppedFile);
    if (!typeValidation.valid) {
      setDragError(typeValidation.error || "Invalid file type");
      return;
    }

    // Validate file size
    const sizeValidation = validateFileSize(droppedFile, maxSizeMB);
    if (!sizeValidation.valid) {
      setDragError(sizeValidation.error || "File too large");
      return;
    }

    onFileSelect(droppedFile);
  }, [disabled, maxSizeMB, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      onFileSelect(null);
      return;
    }

    // Validate file type
    const typeValidation = validateFileType(selected);
    if (!typeValidation.valid) {
      setDragError(typeValidation.error || "Invalid file type");
      return;
    }

    // Validate file size
    const sizeValidation = validateFileSize(selected, maxSizeMB);
    if (!sizeValidation.valid) {
      setDragError(sizeValidation.error || "File too large");
      return;
    }

    setDragError(null);
    onFileSelect(selected);
  }, [maxSizeMB, onFileSelect]);

  const FileIcon = file ? (() => {
    const iconName = getFileTypeIcon(file);
    // Return a simple FileText for now - can be enhanced with dynamic icon loading
    return FileText;
  })() : Upload;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          isDragging && "border-primary bg-primary/5",
          !isDragging && !file && "border-muted-foreground/25 hover:border-muted-foreground/50",
          file && "border-primary/50 bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="File upload zone"
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            document.getElementById("file-upload-input")?.click();
          }
        }}
      >
        <input
          id="file-upload-input"
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.html"
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
          aria-label="Select file to upload"
        />

        {file ? (
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <FileIcon className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" title={file.name}>
                {file.name}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{getFileTypeLabel(file)}</span>
                <span>•</span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setDragError(null);
                onFileSelect(null);
                // Reset file input
                const input = document.getElementById("file-upload-input") as HTMLInputElement;
                if (input) input.value = "";
              }}
              disabled={disabled}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">
                Drag and drop a file here, or{" "}
                <button
                  type="button"
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                  className="text-primary hover:underline"
                  disabled={disabled}
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum file size {maxSizeMB}MB. Supported: PDF, Word, Excel, PowerPoint, Text, HTML.
              </p>
            </div>
          </div>
        )}
      </div>

      {dragError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{dragError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

