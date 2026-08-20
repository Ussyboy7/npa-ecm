/**
 * URL utilities for correspondence and media files
 * Uses getBaseUrl() consistently for API base URL resolution
 */

import { apiFetch, getBaseUrl, hasTokens } from './api-client';
import { MEDIA_PATH_PREFIX, API_MEDIA_PATH_PREFIX } from './correspondence-constants';
import { ERROR_AUTHENTICATION_REQUIRED } from './constants';

const ALLOWED_PUBLICISH_MEDIA_PREFIXES = [
  '/media/signatures/',
  '/media/seals/',
  '/media/signature_templates/',
  '/media/user_signatures/',
  '/media/accounts/',
];

function mediaPathToProtectedApi(pathOrUrl: string): string | null {
  try {
    const raw = pathOrUrl.startsWith('http')
      ? new URL(pathOrUrl).pathname
      : pathOrUrl.startsWith('/')
        ? pathOrUrl
        : `/${pathOrUrl}`;
    const cleaned = raw.replace(/^\/api\/media\//, MEDIA_PATH_PREFIX);
    if (!cleaned.startsWith(MEDIA_PATH_PREFIX)) return null;
    if (!ALLOWED_PUBLICISH_MEDIA_PREFIXES.some((p) => cleaned.startsWith(p))) {
      return null;
    }
    const relative = cleaned.slice(MEDIA_PATH_PREFIX.length);
    return `/platform/protected-media/${relative}`;
  } catch {
    return null;
  }
}

/**
 * Builds a download URL for allowlisted media (signatures/seals) and other
 * absolute/relative paths used by signature UI. Document binaries use
 * canonical download APIs instead.
 */
export const buildDownloadUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;

  const protectedApi = mediaPathToProtectedApi(path);
  if (protectedApi) {
    const baseUrl = getBaseUrl().replace(/\/$/, '');
    return `${baseUrl}${protectedApi.startsWith('/') ? protectedApi : `/${protectedApi}`}`;
  }

  if (path.startsWith('http')) {
    try {
      const url = new URL(path);
      if (url.pathname.startsWith(API_MEDIA_PATH_PREFIX)) {
        url.pathname = url.pathname.replace(API_MEDIA_PATH_PREFIX, MEDIA_PATH_PREFIX);
        return url.toString();
      }
    } catch {
      // Invalid URL, return as-is
    }
    return path;
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  const cleanedPath = normalized.replace(/^\/api\/media\//, MEDIA_PATH_PREFIX);

  const baseUrl = getBaseUrl()
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '');

  return `${baseUrl}${cleanedPath}`;
};

/** Authenticated download for a correspondence attachment (canonical path). */
export const downloadCorrespondenceAttachment = async (
  attachmentId: string,
  fileName = 'attachment',
): Promise<void> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  const blob = await apiFetch<Blob>(`/correspondence/attachments/${attachmentId}/download/`, {
    responseType: 'blob',
  });
  const saveBlob = new Blob([blob], { type: 'application/octet-stream' });
  const blobUrl = URL.createObjectURL(saveBlob);
  const link = window.document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.rel = 'noopener';
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2_000);
};

/** Authenticated inline/preview stream for a correspondence attachment. */
export const fetchCorrespondenceAttachmentContent = async (attachmentId: string): Promise<Blob> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<Blob>(`/correspondence/attachments/${attachmentId}/content/`, {
    responseType: 'blob',
  });
};
