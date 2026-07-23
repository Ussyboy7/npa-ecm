import { ERROR_AUTHENTICATION_REQUIRED, ERROR_UNKNOWN } from '@/lib/constants';
import { apiFetch, hasTokens } from './api-client';
import { logError, logInfo, logWarn } from '@/lib/client-logger';
import { unwrapResults } from '@/lib/type-utils';
import type { DocumentComment, CreateDocumentCommentPayload, DocumentDiscussion, CreateDiscussionPayload, EditorSession, DocumentEditorWebSocket } from './dms-types';

// ============ COMMENTS ============

export const getDocumentComments = async (documentId: string, versionId?: string | null): Promise<DocumentComment[]> => {
  if (!hasTokens()) return [];

  const params = new URLSearchParams({ document: documentId });
  if (versionId) params.append('version', versionId);

  const payload = await apiFetch<unknown>(`/dms/comments/?${params.toString()}`);
  const results = unwrapResults(payload) as Record<string, unknown>[];

  return results.map((item: Record<string, unknown>) => {
    const author = item.author as Record<string, unknown> | undefined;
    return {
      id: String(item.id as string),
      documentId: String(item.document ?? item.document_id ?? documentId),
      authorId: String((author && 'id' in author) ? author.id : item.author_id ?? item.author ?? ''),
      content: typeof item.content === 'string' ? item.content : '',
      createdAt: typeof item.created_at === 'string' ? item.created_at : new Date().toISOString(),
      resolved: typeof item.resolved === 'boolean' ? item.resolved : false,
      parentId: item.parent ? String(item.parent) : (item.parent_id ? String(item.parent_id) : null),
      versionId: item.version ? String(item.version) : (item.version_id ? String(item.version_id) : null),
    };
  });
};

export const addDocumentComment = async (payload: CreateDocumentCommentPayload): Promise<DocumentComment> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  const body: Record<string, unknown> = {
    document: payload.documentId,
    author_id: payload.authorId,
    content: payload.content,
  };

  if (payload.versionId) body.version = payload.versionId;
  if (payload.parentId) body.parent = payload.parentId;

  const response = await apiFetch<Record<string, unknown>>('/dms/comments/', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const author = response.author as Record<string, unknown> | undefined;
  return {
    id: String(response.id),
    documentId: String(response.document ?? payload.documentId),
    authorId: String((author && 'id' in author) ? author.id : response.author_id ?? payload.authorId),
    content: typeof response.content === 'string' ? response.content : payload.content,
    createdAt: typeof response.created_at === 'string' ? response.created_at : new Date().toISOString(),
    resolved: typeof response.resolved === 'boolean' ? response.resolved : false,
    parentId: response.parent ? String(response.parent) : (response.parent_id ? String(response.parent_id) : payload.parentId ?? null),
    versionId: response.version ? String(response.version) : (response.version_id ? String(response.version_id) : payload.versionId ?? null),
  };
};

export const resolveDocumentComment = async (commentId: string, resolved: boolean): Promise<DocumentComment | null> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  const response = await apiFetch<Record<string, unknown>>(`/dms/comments/${commentId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ resolved }),
  });

  const author = response.author as Record<string, unknown> | undefined;
  return {
    id: String(response.id),
    documentId: String(response.document ?? response.document_id ?? ''),
    authorId: String((author && 'id' in author) ? author.id : response.author_id ?? response.author ?? ''),
    content: typeof response.content === 'string' ? response.content : '',
    createdAt: typeof response.created_at === 'string' ? response.created_at : new Date().toISOString(),
    resolved: typeof response.resolved === 'boolean' ? response.resolved : resolved,
    parentId: response.parent ? String(response.parent) : (response.parent_id ? String(response.parent_id) : null),
    versionId: response.version ? String(response.version) : (response.version_id ? String(response.version_id) : null),
  };
};

export const deleteDocumentComment = async (commentId: string): Promise<void> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  await apiFetch(`/dms/comments/${commentId}/`, {
    method: 'DELETE',
  });
};

// ============ DISCUSSIONS ============

export const getDocumentDiscussions = async (documentId: string): Promise<DocumentDiscussion[]> => {
  if (!hasTokens()) return [];

  const payload = await apiFetch<unknown>(`/dms/discussions/?document=${documentId}`);
  const results = unwrapResults(payload) as Record<string, unknown>[];

  return results.map((item: Record<string, unknown>) => {
    const author = item.author as Record<string, unknown> | undefined;
    return {
      id: String(item.id as string),
      documentId: String(item.document ?? item.document_id ?? documentId),
      authorId: String((author && 'id' in author) ? author.id : item.author_id ?? item.author ?? ''),
      message: typeof item.message === 'string' ? item.message : '',
      createdAt: typeof item.created_at === 'string' ? item.created_at : new Date().toISOString(),
    };
  });
};

export const addDocumentDiscussion = async (payload: CreateDiscussionPayload): Promise<DocumentDiscussion> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  const body = {
    document: payload.documentId,
    author_id: payload.authorId,
    message: payload.message,
  };

  const response = await apiFetch<Record<string, unknown>>('/dms/discussions/', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const author = response.author as Record<string, unknown> | undefined;
  return {
    id: String(response.id),
    documentId: String(response.document ?? payload.documentId),
    authorId: String((author && 'id' in author) ? author.id : response.author_id ?? payload.authorId),
    message: typeof response.message === 'string' ? response.message : payload.message,
    createdAt: typeof response.created_at === 'string' ? response.created_at : new Date().toISOString(),
  };
};

// ============ EDITOR SESSIONS ============

export const getActiveEditorSessions = async (documentId: string): Promise<EditorSession[]> => {
  if (!hasTokens()) return [];

  if (!documentId || documentId === 'undefined' || documentId.trim() === '') {
    logWarn('getActiveEditorSessions called with invalid documentId:', documentId);
    return [];
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(documentId)) {
    logWarn('getActiveEditorSessions called with non-UUID documentId:', documentId);
    return [];
  }

  const payload = await apiFetch<unknown>(`/dms/editor-sessions/?document=${documentId}&is_active=true`);
  const results = unwrapResults(payload) as Record<string, unknown>[];

  logInfo('getActiveEditorSessions API response:', { payload, results, documentId });

  const sessions = results.map((item: Record<string, unknown>) => {
    const user = item.user as Record<string, unknown> | undefined;
    const session = {
      id: String(item.id as string),
      documentId: String(item.document ?? item.document_id ?? documentId),
      userId: String((user && 'id' in user) ? user.id : item.user_id ?? item.user ?? ''),
      since: typeof item.since === 'string' ? item.since : (typeof item.created_at === 'string' ? item.created_at : new Date().toISOString()),
      note: typeof item.note === 'string' ? item.note : undefined,
      isActive: typeof item.is_active === 'boolean' ? item.is_active : true,
    };
    logInfo('Mapped editor session:', session, 'from item:', item);
    return session;
  });

  logInfo('Returning active editor sessions:', sessions);
  return sessions;
};

export const getEditorSessionForUser = async (documentId: string, userId: string): Promise<EditorSession | null> => {
  if (!hasTokens()) return null;

  const payload = await apiFetch<unknown>(`/dms/editor-sessions/?document=${documentId}&user=${userId}`);
  const results = unwrapResults(payload) as Record<string, unknown>[];

  if (results.length > 0) {
    const item = results[0] as Record<string, unknown>;
    const user = item.user as Record<string, unknown> | undefined;
    return {
      id: String(item.id as string),
      documentId: String(item.document ?? item.document_id ?? documentId),
      userId: String((user && 'id' in user) ? user.id : item.user_id ?? item.user ?? userId),
      since: typeof item.since === 'string' ? item.since : (typeof item.created_at === 'string' ? item.created_at : new Date().toISOString()),
      note: typeof item.note === 'string' ? item.note : undefined,
      isActive: typeof item.is_active === 'boolean' ? item.is_active : true,
    };
  }
  return null;
};

export const createEditorSession = async (documentId: string, userId: string, note?: string): Promise<EditorSession> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  const body: Record<string, unknown> = {
    document: documentId,
    user_id: userId,
  };
  if (note) {
    body.note = note;
  }

  const response = await apiFetch<Record<string, unknown>>('/dms/editor-sessions/', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const user = response.user as Record<string, unknown> | undefined;
  return {
    id: String(response.id),
    documentId: String(response.document ?? response.document_id ?? documentId),
    userId: String((user && 'id' in user) ? user.id : response.user_id ?? response.user ?? userId),
    since: typeof response.since === 'string' ? response.since : (typeof response.created_at === 'string' ? response.created_at : new Date().toISOString()),
    note: typeof response.note === 'string' ? response.note : (note ?? undefined),
    isActive: typeof response.is_active === 'boolean' ? response.is_active : true,
  };
};

export const endEditorSession = async (sessionId: string): Promise<void> => {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);

  try {
    await apiFetch(`/dms/editor-sessions/${sessionId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      (('status' in error && error.status === 403) ||
        ('message' in error &&
          typeof (error instanceof Error ? error.message : ERROR_UNKNOWN) === 'string' &&
          (error instanceof Error ? error.message : ERROR_UNKNOWN).includes('only modify your own')))
    ) {
      logWarn('Cannot end editor session - does not belong to current user', { sessionId, error });
      return;
    }
    throw error;
  }
};

// ============ REAL-TIME COLLABORATION (WebSocket) ============

export const createDocumentEditorWebSocket = (documentId: string, token: string): DocumentEditorWebSocket => {
  let ws: WebSocket | null = null;
  const callbacks: Record<string, ((data: Record<string, unknown>) => void)[]> = {};

  const emit = (event: string, data: Record<string, unknown>) => {
    const handlers = callbacks[event] || [];
    handlers.forEach((handler) => handler(data));
  };

  const on = (event: string, callback: (data: Record<string, unknown>) => void) => {
    if (!callbacks[event]) callbacks[event] = [];
    callbacks[event].push(callback);
  };

  const send = (data: Record<string, unknown>) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };

  return {
    connect: () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host.replace(':3002', ':8002');
      const url = `${protocol}//${host}/ws/documents/${documentId}/edit/?token=${token}`;

      ws = new WebSocket(url);

      ws.onopen = () => {
        logInfo('[DMS WebSocket] Connected to document', documentId);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          emit(data.type, data);
        } catch (e) {
          logError('[DMS WebSocket] Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        logInfo('[DMS WebSocket] Disconnected');
      };

      ws.onerror = (error) => {
        logError('[DMS WebSocket] Error:', error);
      };
    },

    disconnect: () => {
      if (ws) {
        ws.close();
        ws = null;
      }
    },

    sendCursorPosition: (position, selection) => {
      send({ type: 'cursor_move', position, selection });
    },

    sendContentChange: (changes, version) => {
      send({ type: 'content_change', changes, version });
    },

    sendTypingStart: () => {
      send({ type: 'typing_start' });
    },

    sendTypingStop: () => {
      send({ type: 'typing_stop' });
    },

    requestSync: () => {
      send({ type: 'request_sync' });
    },

    onUserJoined: (callback) => on('user_joined', callback as (data: Record<string, unknown>) => void),
    onUserLeft: (callback) => on('user_left', callback as (data: Record<string, unknown>) => void),
    onCursorUpdate: (callback) => on('cursor_update', callback as (data: Record<string, unknown>) => void),
    onContentUpdate: (callback) => on('content_update', callback as (data: Record<string, unknown>) => void),
    onTypingIndicator: (callback) => on('typing_indicator', callback as (data: Record<string, unknown>) => void),
    onActiveEditors: (callback) =>
      on('active_editors', (data: Record<string, unknown>) => {
        if (Array.isArray(data)) {
          callback(data as { user_id: string; username: string; since?: string }[]);
        }
      }),
    onSyncResponse: (callback) => on('sync_response', callback),
  };
};
