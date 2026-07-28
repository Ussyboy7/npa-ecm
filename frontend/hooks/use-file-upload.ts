/**
 * Custom hook for managing file uploads with drag & drop support
 * Handles file validation, preview generation, and state management
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from "@/components/ui/sonner";
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { generateId } from '@/lib/correspondence-helpers';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  uploadProgress?: number; // 0-100 for upload progress
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'error';
  uploadError?: string;
}

interface UseFileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  onFilesChange?: (files: UploadedFile[]) => void;
}

interface UseFileUploadReturn {
  files: UploadedFile[];
  isDragActive: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (fileList: FileList | null) => void;
  handleRemoveFile: (fileId: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  clearFiles: () => void;
  formatFileSize: (bytes: number) => string;
}

export const useFileUpload = (options: UseFileUploadOptions = {}): UseFileUploadReturn => {
  const {
    maxSize = MODAL_CONSTANTS.FILE_UPLOAD.MAX_SIZE,
    allowedTypes = MODAL_CONSTANTS.FILE_UPLOAD.ALLOWED_TYPES as unknown as string[],
    maxFiles,
    onFilesChange,
  } = options;

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const validateFile = useCallback(
    (file: File): boolean => {
      // Check file size
      if (file.size > maxSize) {
        toast.error(`File "${file.name}" exceeds ${formatFileSize(maxSize)} limit`);
        return false;
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        return false;
      }

      return true;
    },
    [maxSize, allowedTypes, formatFileSize]
  );

  const generatePreview = useCallback((file: File, _fileId: string): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  }, []);

  const handleFileSelect = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;

      // Check max files limit
      if (maxFiles && files.length + fileList.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} file(s) allowed`);
        return;
      }

      const newFiles: UploadedFile[] = [];
      const previewPromises: Promise<void>[] = [];

      Array.from(fileList).forEach((file) => {
        if (!validateFile(file)) return;

        const uploadedFile: UploadedFile = {
          id: generateId('file'),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
        };

        newFiles.push(uploadedFile);

        // Generate preview for images
        if (file.type.startsWith('image/')) {
          const previewPromise = generatePreview(file, uploadedFile.id).then((preview) => {
            if (preview) {
              setFiles((prev) =>
                prev.map((f) => (f.id === uploadedFile.id ? { ...f, preview } : f))
              );
            }
          });
          previewPromises.push(previewPromise);
        }
      });

      if (newFiles.length > 0) {
        let updatedFiles: UploadedFile[] = [];
        setFiles((prev) => {
          updatedFiles = [...prev, ...newFiles];
          return updatedFiles;
        });

        // Wait for previews to generate
        await Promise.all(previewPromises);

        // Call onFilesChange after state update completes
        if (onFilesChange) {
          // Use setTimeout to defer callback until after render cycle
          setTimeout(() => {
            onFilesChange(updatedFiles);
          }, 0);
        }
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [files.length, maxFiles, validateFile, generatePreview, onFilesChange]
  );

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      let updatedFiles: UploadedFile[] = [];
      setFiles((prev) => {
        updatedFiles = prev.filter((f) => f.id !== fileId);
        return updatedFiles;
      });
      
      // Call onFilesChange after state update completes
      if (onFilesChange) {
        setTimeout(() => {
          onFilesChange(updatedFiles);
        }, 0);
      }
    },
    [onFilesChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragActive(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const clearFiles = useCallback(() => {
    setFiles([]);
    if (onFilesChange) {
      setTimeout(() => {
        onFilesChange([]);
      }, 0);
    }
  }, [onFilesChange]);

  return {
    files,
    isDragActive,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearFiles,
    formatFileSize,
  };
};

