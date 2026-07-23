import { ERROR_AUTHENTICATION_REQUIRED } from '@/lib/constants';
import { apiFetch, hasTokens } from './api-client';
import { unwrapResults } from '@/lib/type-utils';
import type { DocumentAccessLog, CreateAccessLogPayload, DocumentRecord, DocumentQueryParams, PaginatedDocuments } from './dms-types';
import { fetchDocumentById, userHasPermission } from './dms-documents';
import { queryDocumentsExtended } from './dms-operations';
import type { User } from './npa-structure';

export const getDocumentAccessLogs = async (documentId: string): Promise<DocumentAccessLog[]> => {
  if (!hasTokens()) return [];

  const payload = await apiFetch<unknown>(`/dms/access-logs/?document=${documentId}`);
  const results = unwrapResults(payload) as Record<string, unknown>[];

  return results.map((item: Record<string, unknown>) => {
    const user = item.user as Record<string, unknown> | undefined;
    const userName = typeof item.user_name === 'string'
      ? item.user_name
      : user
        ? (() => {
            const firstName = typeof user.first_name === 'string' ? user.first_name : '';
            const lastName = typeof user.last_name === 'string' ? user.last_name : '';
            const fullName = `${firstName} ${lastName}`.trim();
            if (fullName.length > 0) return fullName;
            return typeof user.username === 'string' ? user.username : undefined;
          })()
        : undefined;
    const userEmail = typeof item.user_email === 'string'
      ? item.user_email
      : (user && typeof user.email === 'string' ? user.email : undefined);
    return {
      id: String(item.id as string),
      documentId: String(item.document ?? item.document_id ?? documentId),
      userId: String((user && 'id' in user) ? user.id : item.user_id ?? item.user ?? ''),
      userName,
      userEmail,
      action: (item.action as 'view' | 'download' | 'attempted-download') ?? 'view',
      sensitivity: typeof item.sensitivity === 'string' ? item.sensitivity : 'internal',
      timestamp: typeof item.timestamp === 'string' ? item.timestamp : new Date().toISOString(),
    };
  });
};

export const logDocumentAccess = async (payload: CreateAccessLogPayload): Promise<DocumentAccessLog> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  const body = {
    document: payload.documentId,
    user_id: payload.userId,
    action: payload.action,
    sensitivity: payload.sensitivity,
  };

  const response = await apiFetch<Record<string, unknown>>('/dms/access-logs/', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const user = response.user as Record<string, unknown> | undefined;
  const userName = typeof response.user_name === 'string'
    ? response.user_name
    : user
      ? (() => {
          const firstName = typeof user.first_name === 'string' ? user.first_name : '';
          const lastName = typeof user.last_name === 'string' ? user.last_name : '';
          const fullName = `${firstName} ${lastName}`.trim();
          if (fullName.length > 0) return fullName;
          return typeof user.username === 'string' ? user.username : undefined;
        })()
      : undefined;
  const userEmail = typeof response.user_email === 'string'
    ? response.user_email
    : (user && typeof user.email === 'string' ? user.email : undefined);
  return {
    id: String(response.id),
    documentId: String(response.document ?? response.document_id ?? payload.documentId),
    userId: String((user && 'id' in user) ? user.id : response.user_id ?? payload.userId),
    userName,
    userEmail,
    action: (response.action as 'view' | 'download' | 'attempted-download') ?? payload.action,
    sensitivity: typeof response.sensitivity === 'string' ? response.sensitivity : payload.sensitivity,
    timestamp: typeof response.timestamp === 'string' ? response.timestamp : new Date().toISOString(),
  };
};

/**
 * Get recent documents accessed by the current user (last 30 days)
 */
export const getRecentDocuments = async (userId: string, limit: number = 50): Promise<DocumentRecord[]> => {
  if (!hasTokens()) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const payload = await apiFetch<unknown>(`/dms/access-logs/?user=${userId}&action=view&ordering=-timestamp`);
  const logs = unwrapResults(payload) as Record<string, unknown>[];

  const documentIds = Array.from(
    new Set(
      logs
        .filter((log: Record<string, unknown>) => {
          const timestamp = typeof log.timestamp === 'string' ? log.timestamp : (typeof log.created_at === 'string' ? log.created_at : '');
          const logDate = new Date(timestamp);
          return !isNaN(logDate.getTime()) && logDate >= thirtyDaysAgo;
        })
        .map((log: Record<string, unknown>) => String(log.document ?? log.document_id ?? ''))
        .filter(Boolean),
    ),
  ).slice(0, limit);

  if (documentIds.length === 0) return [];

  const documents = await Promise.all(
    documentIds.map(async (docId) => {
      try {
        return await fetchDocumentById(docId);
      } catch {
        return null;
      }
    }),
  );

  return documents.filter((doc): doc is DocumentRecord => doc !== null);
};

/**
 * Get documents shared with the current user (explicit permissions)
 */
export const getSharedDocuments = async (
  userId: string,
  params: Omit<DocumentQueryParams, 'authorId'> = {},
): Promise<PaginatedDocuments> => {
  if (!hasTokens()) {
    return { results: [], count: 0, next: null, previous: null };
  }

  return await queryDocumentsExtended({
    ...params,
    sharedWithMe: true,
  });
};

/**
 * Get documents shared by the current user (documents with permissions created by user)
 */
export const getDocumentsSharedByUser = (
  userId: string,
  params: Omit<DocumentQueryParams, 'authorId'> & { signal?: AbortSignal } = {},
) =>
  queryDocumentsExtended({
    ...params,
    authorId: userId,
    sharedByMe: true,
  });

export const isSensitiveAccessAllowed = (document: DocumentRecord, user: User | null) => {
  if (!user) return document.sensitivity === 'public';
  return userHasPermission(user, document);
};
