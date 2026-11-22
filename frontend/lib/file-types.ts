/** Shared file type / MIME type constants. */

export const MIME_TYPE_PDF = "application/pdf";
export const MIME_TYPE_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const MIME_TYPE_DOC = "application/msword";
export const MIME_TYPE_PNG = "image/png";
export const MIME_TYPE_JPEG = "image/jpeg";
export const MIME_TYPE_WEBP = "image/webp";
export const MIME_TYPE_TIFF = "image/tiff";
export const MIME_TYPE_BMP = "image/bmp";

export const ACCEPT_IMAGE_SIGNATURE = "image/png,image/jpeg";
export const ALLOWED_IMAGE_MIME_TYPES = [MIME_TYPE_PNG, MIME_TYPE_JPEG, MIME_TYPE_WEBP];
export const ALLOWED_SIGNATURE_MIME_TYPES = [MIME_TYPE_PNG, MIME_TYPE_JPEG];
