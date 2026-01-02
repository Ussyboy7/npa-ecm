/**
 * URL utilities for correspondence and media files
 * Uses getBaseUrl() consistently for API base URL resolution
 */

import { getBaseUrl } from './api-client';
import { MEDIA_PATH_PREFIX, API_MEDIA_PATH_PREFIX } from './correspondence-constants';

/**
 * Builds a download URL for media files, handling both relative and absolute paths
 * Fixes /api/media/ paths to /media/ and uses getBaseUrl() for base URL
 */
export const buildDownloadUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  
  if (path.startsWith('http')) {
    // If it's already a full URL, check if it has /api/media/ and fix it
    try {
      const url = new URL(path);
      // Fix /api/media/ to /media/
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
  // Remove /api/ prefix if present in the path
  const cleanedPath = normalized.replace(/^\/api\/media\//, MEDIA_PATH_PREFIX);
  
  // Get base URL and remove /api/v1 suffix if present to get the server root
  const baseUrl = getBaseUrl()
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '');
  
  return `${baseUrl}${cleanedPath}`;
};

/**
 * Fixes a media URL by removing /api/media/ prefix
 * Used in download handlers and other places where URLs need normalization
 */
export const fixMediaUrl = (url: string): string => {
  if (url.startsWith('http')) {
    try {
      const urlObj = new URL(url);
      if (urlObj.pathname.startsWith(API_MEDIA_PATH_PREFIX)) {
        urlObj.pathname = urlObj.pathname.replace(API_MEDIA_PATH_PREFIX, MEDIA_PATH_PREFIX);
        return urlObj.toString();
      }
    } catch {
      // If URL parsing fails, try string replacement
      return url.replace(/\/api\/media\//, MEDIA_PATH_PREFIX);
    }
    return url;
  }
  
  // Relative URL - remove /api/ prefix
  return url.replace(/\/api\/media\//, MEDIA_PATH_PREFIX).replace(/^\/api\/media\//, MEDIA_PATH_PREFIX);
};

/**
 * Ensures a URL is absolute by prepending the base URL if needed
 */
export const ensureAbsoluteUrl = (url: string): string => {
  if (url.startsWith('http')) {
    return url;
  }
  
  const baseUrl = getBaseUrl()
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '');
  
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};

