/**
 * Reusable File Upload Area Component
 * Handles drag & drop, file selection, preview, and removal
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, File, X, Eye, FileText, Image as ImageIcon, FileType } from 'lucide-react';
import { useFileUpload, type UploadedFile } from '@/hooks/use-file-upload';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';

interface FileUploadAreaProps {
  files: UploadedFile[];
  onFilesChange?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  files: externalFiles,
  onFilesChange,
  maxFiles,
  disabled = false,
  className = '',
}) => {
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const {
    files: internalFiles,
    isDragActive,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    formatFileSize,
  } = useFileUpload({
    maxFiles,
    onFilesChange,
  });

  // Use external files if provided, otherwise use internal state
  const displayFiles = externalFiles.length > 0 ? externalFiles : internalFiles;

  // Generate blob URL for PDF preview
  useEffect(() => {
    if (previewFile && previewFile.type === 'application/pdf') {
      setPreviewLoading(true);
      const blob = new Blob([previewFile.file], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setPreviewLoading(false);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfBlobUrl(null);
    }
  }, [previewFile]);

  const getFileIcon = (file: UploadedFile) => {
    if (file.type.startsWith('image/')) {
      return ImageIcon;
    } else if (file.type === 'application/pdf') {
      return FileText;
    } else if (file.type.includes('word') || file.type.includes('document')) {
      return FileType;
    }
    return File;
  };

  const getFileTypeColor = (file: UploadedFile) => {
    if (file.type.startsWith('image/')) {
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    } else if (file.type === 'application/pdf') {
      return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    } else if (file.type.includes('word') || file.type.includes('document')) {
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    }
    return 'bg-muted text-muted-foreground';
  };

  const handlePreview = (file: UploadedFile) => {
    setPreviewFile(file);
  };

  const closePreview = () => {
    setPreviewFile(null);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  };

  const isImage = (file: UploadedFile) => file.type.startsWith('image/');
  const isPDF = (file: UploadedFile) => file.type === 'application/pdf';

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDrop={disabled ? undefined : handleDrop}
        onClick={disabled ? undefined : () => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={MODAL_CONSTANTS.FILE_UPLOAD.ALLOWED_TYPES.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag & drop files here, or{' '}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="text-primary hover:underline"
            disabled={disabled}
          >
            browse
          </button>
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, Word, Images • Max {formatFileSize(MODAL_CONSTANTS.FILE_UPLOAD.MAX_SIZE)} each
        </p>
      </div>

      {/* Uploaded Files List */}
      {displayFiles.length > 0 && (
        <div className="space-y-2">
          {displayFiles.map((file) => {
            const FileIcon = getFileIcon(file);
            const canPreview = isImage(file) || isPDF(file);
            
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors"
              >
                {/* File Preview/Icon */}
                {file.preview && isImage(file) ? (
                  <button
                    type="button"
                    onClick={() => canPreview && handlePreview(file)}
                    className="relative h-16 w-16 rounded border border-border overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity group"
                    disabled={disabled || !canPreview}
                  >
                    <img 
                      src={file.preview} 
                      alt={file.name} 
                      className="h-full w-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ) : (
                  <div 
                    className={`h-16 w-16 rounded border border-border flex items-center justify-center flex-shrink-0 ${getFileTypeColor(file)} cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={() => canPreview && handlePreview(file)}
                    role={canPreview ? "button" : undefined}
                    tabIndex={canPreview ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (canPreview && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handlePreview(file);
                      }
                    }}
                  >
                    <FileIcon className="h-6 w-6" />
                  </div>
                )}
                
                {/* File Info */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    {canPreview && (
                      <button
                        type="button"
                        onClick={() => handlePreview(file)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        disabled={disabled}
                      >
                        <Eye className="h-3 w-3" />
                        Preview
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1">
                  {canPreview && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handlePreview(file)}
                      disabled={disabled}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (onFilesChange) {
                          onFilesChange(displayFiles.filter((f) => f.id !== file.id));
                        } else {
                          handleRemoveFile(file.id);
                        }
                      }}
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewFile && (() => {
                const Icon = getFileIcon(previewFile);
                return <Icon className="h-5 w-5" />;
              })()}
              {previewFile?.name}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 mt-4">
            <div className="min-h-[400px]">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading preview...</p>
                  </div>
                </div>
              ) : previewFile && isImage(previewFile) && previewFile.preview ? (
                <div className="flex items-center justify-center p-4">
                  <img 
                    src={previewFile.preview} 
                    alt={previewFile.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                </div>
              ) : previewFile && isPDF(previewFile) && pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-[70vh] border-0 rounded-lg"
                  title={`PDF Preview: ${previewFile.name}`}
                  aria-label={`PDF document preview: ${previewFile.name}`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  {previewFile && (() => {
                    const Icon = getFileIcon(previewFile);
                    return <Icon className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />;
                  })()}
                  <p className="text-sm text-muted-foreground">
                    Preview not available for this file type
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatFileSize(previewFile?.size || 0)}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

