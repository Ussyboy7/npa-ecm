'use client';

import { useCallback, useEffect, useState } from 'react';
import { logError, logInfo, logWarn } from '@/lib/client-logger';
import { apiFetch, hasTokens } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  fetchDocumentById,
  fetchWorkspaces,
  fetchDocumentRelatedCorrespondence,
  getDocumentComments,
  getDocumentAccessLogs,
  logDocumentAccess,
  type DocumentRecord,
  type DocumentComment,
  type DocumentAccessLog,
  type DocumentWorkspace,
  type DocumentRelatedCorrespondenceItem,
} from '@/lib/dms-storage';

function documentNotFoundMessage(error: unknown): string | null {
  const errorObj = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const isNotFound =
    errorObj?.status === 404 ||
    errorObj?.isNotFound === true ||
    (typeof errorObj?.message === 'string' &&
      (errorObj.message.includes('No Document matches') || errorObj.message.includes('not found')));

  if (!isNotFound) return null;

  let message =
    'The document you are looking for does not exist, has been deleted, or you do not have permission to view it.';
  if (errorObj?.response && typeof errorObj.response === 'object') {
    const response = errorObj.response as Record<string, unknown>;
    if (response.data && typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>;
      message = (data.detail as string) || message;
    }
  } else if (typeof errorObj?.message === 'string') {
    message = errorObj.message;
  }
  return message;
}

export function useDocumentDetail(documentId: string | undefined) {
  const { currentUser } = useCurrentUser();
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formDocumentId, setFormDocumentId] = useState<string | null>(null);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [accessLogs, setAccessLogs] = useState<DocumentAccessLog[]>([]);
  const [relatedCorrespondence, setRelatedCorrespondence] = useState<DocumentRelatedCorrespondenceItem[]>([]);
  const [workspaces, setWorkspaces] = useState<DocumentWorkspace[]>([]);

  const refreshDocument = useCallback(async () => {
    if (!documentId) return null;
    try {
      const doc = await fetchDocumentById(documentId);
      setDocument(doc);
      return doc;
    } catch (err) {
      logError('Failed to refresh document', err);
      return null;
    }
  }, [documentId]);

  useEffect(() => {
    if (!documentId || !hasTokens() || !currentUser?.id) {
      if (!documentId) setLoading(false);
      return;
    }

    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setFormDocumentId(null);

      try {
        const doc = await fetchDocumentById(documentId);
        if (ignore) return;
        setDocument(doc);

        if (doc.documentType === 'form') {
          if (doc.form_document?.id) {
            setFormDocumentId(doc.form_document.id);
          } else {
            try {
              const formDocs = await apiFetch<Array<{ id: string }>>(
                `/dms/form-documents/?document=${documentId}`,
              );
              if (!ignore && formDocs.length > 0) {
                setFormDocumentId(formDocs[0].id);
              }
            } catch (formError: unknown) {
              logError('Failed to load form document', formError);
            }
          }
        }

        const [cmts, logs, related, ws] = await Promise.all([
          getDocumentComments(documentId).catch((err: unknown) => {
            logWarn('Failed to load document comments', err);
            return [] as DocumentComment[];
          }),
          getDocumentAccessLogs(documentId).catch((err: unknown) => {
            logWarn('Failed to load document access logs', err);
            return [] as DocumentAccessLog[];
          }),
          fetchDocumentRelatedCorrespondence(documentId).catch((err: unknown) => {
            logWarn('Failed to load related correspondence', err);
            return [] as DocumentRelatedCorrespondenceItem[];
          }),
          fetchWorkspaces().catch((err: unknown) => {
            logWarn('Failed to load workspaces', err);
            return [] as DocumentWorkspace[];
          }),
        ]);
        if (ignore) return;

        setComments(cmts);
        setAccessLogs(logs);
        setRelatedCorrespondence(related);
        setWorkspaces(ws);

        void logDocumentAccess({
          documentId,
          userId: currentUser.id,
          action: 'view',
          sensitivity: doc.sensitivity,
        }).catch((accessError: unknown) => {
          logError('Failed to log document access', accessError);
        });
      } catch (loadError: unknown) {
        if (ignore) return;
        const notFound = documentNotFoundMessage(loadError);
        if (notFound) {
          logInfo('Document not found:', documentId);
          setError(notFound);
        } else {
          logError('Failed to load document', loadError);
          setError('Failed to load document');
        }
        setDocument(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [documentId, currentUser?.id]);

  return {
    document,
    setDocument,
    loading,
    error,
    formDocumentId,
    comments,
    setComments,
    accessLogs,
    setAccessLogs,
    relatedCorrespondence,
    workspaces,
    setWorkspaces,
    refreshDocument,
  };
}
