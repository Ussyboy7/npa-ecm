/**
 * File utility functions for validation, type detection, and formatting
 */

export const MAX_FILE_SIZE_MB = 10;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/html',
] as const;

export const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'html'] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];
export type AllowedExtension = typeof ALLOWED_EXTENSIONS[number];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file type by MIME type and extension
 */
export const validateFileType = (file: File): FileValidationResult => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Please upload PDF, Word, Excel, PowerPoint, or Text files.`,
    };
  }

  // Check file extension as backup
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return {
      valid: false,
      error: `File extension ".${extension}" is not allowed. Supported: ${ALLOWED_EXTENSIONS.join(', ')}.`,
    };
  }

  return { valid: true };
};

/**
 * Validates file size
 */
export const validateFileSize = (file: File, maxSizeMB: number): FileValidationResult => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum of ${maxSizeMB}MB.`,
    };
  }
  return { valid: true };
};

/**
 * Formats file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Gets file type icon name based on MIME type or extension
 */
export const getFileTypeIcon = (file: File | { name: string; type?: string }): string => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = 'type' in file ? file.type : undefined;

  if (mimeType?.includes('pdf') || extension === 'pdf') return 'FileText';
  if (mimeType?.includes('word') || extension === 'doc' || extension === 'docx') return 'FileText';
  if (mimeType?.includes('excel') || extension === 'xls' || extension === 'xlsx') return 'FileSpreadsheet';
  if (mimeType?.includes('powerpoint') || extension === 'ppt' || extension === 'pptx') return 'FileText';
  if (mimeType?.includes('text') || extension === 'txt' || extension === 'html') return 'FileText';
  return 'FileQuestion';
};

/**
 * Gets human-readable file type label
 */
export const getFileTypeLabel = (file: File | { name: string; type?: string }): string => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = 'type' in file ? file.type : undefined;

  if (mimeType?.includes('pdf') || extension === 'pdf') return 'PDF Document';
  if (mimeType?.includes('word') || extension === 'doc' || extension === 'docx') return 'Word Document';
  if (mimeType?.includes('excel') || extension === 'xls' || extension === 'xlsx') return 'Excel Spreadsheet';
  if (mimeType?.includes('powerpoint') || extension === 'ppt' || extension === 'pptx') return 'PowerPoint Presentation';
  if (mimeType?.includes('text') || extension === 'txt') return 'Text File';
  if (extension === 'html') return 'HTML Document';
  return 'Unknown File Type';
};

