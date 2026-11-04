/**
 * File utility functions for validation, type detection, and formatting
 */

export const MAX_FILE_SIZE_MB = 30;

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

/** Map extension → expected MIME when the browser leaves `file.type` empty (common on macOS for Office). */
const EXTENSION_MIME: Record<AllowedExtension, AllowedMimeType> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  html: 'text/html',
};

/**
 * Validates file type by extension, then MIME when the browser reports one.
 * macOS/Chrome often give `file.type === ""` for .docx/.xlsx — extension must still pass.
 */
export const validateFileType = (file: File): FileValidationResult => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return {
      valid: false,
      error: `File extension ".${extension ?? ''}" is not allowed. Supported: ${ALLOWED_EXTENSIONS.join(', ')}.`,
    };
  }

  const mime = (file.type || '').trim().toLowerCase();
  // Empty or generic binary MIME: trust the extension (browser quirk).
  if (!mime || mime === 'application/octet-stream') {
    return { valid: true };
  }

  if (!ALLOWED_MIME_TYPES.includes(mime as AllowedMimeType)) {
    // Some browsers report legacy/odd Office MIME; still accept if extension is allowed.
    const expected = EXTENSION_MIME[extension as AllowedExtension];
    if (expected && mime.includes('officedocument')) {
      return { valid: true };
    }
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Please upload PDF, Word, Excel, PowerPoint, or Text files.`,
    };
  }

  return { valid: true };
};

/** Best-effort MIME for uploads when the File API leaves type blank. */
export const resolveUploadMimeType = (file: File): string => {
  const mime = (file.type || '').trim();
  if (mime && mime !== 'application/octet-stream') return mime;
  const extension = file.name.split('.').pop()?.toLowerCase() as AllowedExtension | undefined;
  if (extension && EXTENSION_MIME[extension]) return EXTENSION_MIME[extension];
  return mime || 'application/octet-stream';
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

/**
 * Converts a File to a data URL (base64 encoded)
 */
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to read file as data URL'));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

