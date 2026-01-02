/**
 * Constants for correspondence-related functionality
 */

// Timeout values (in milliseconds)
export const FILE_LOAD_TIMEOUT = 60000; // 60 seconds for large files
export const PDF_IFRAME_FALLBACK_TIMEOUT = 2000; // 2 seconds fallback for iframe loading

// File type constants
export const FILE_TYPE_PDF = 'application/pdf';
export const FILE_EXTENSION_DOCX = '.docx';

// Media path patterns
export const MEDIA_PATH_PREFIX = '/media/';
export const API_MEDIA_PATH_PREFIX = '/api/media/';

// Completion package file name patterns (case-insensitive)
export const COMPLETION_PACKAGE_PATTERNS = [
  'completion-package',
  'completion_package',
];

