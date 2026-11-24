'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logError, logWarn } from '@/lib/client-logger';
import { apiFetch, hasTokens } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  fetchDocumentById,
  fetchDocumentRelatedCorrespondence,
  getDocumentComments,
  getDocumentAccessLogs,
  logDocumentAccess,
  type DocumentRecord,
  type DocumentComment,
  type DocumentAccessLog,
  type DocumentRelatedCorrespondenceItem,
} from '@/lib/api/dms';

import { isAccessDeniedError } from '@/lib/api-error';

export function useDocumentDetail(documentId: string | undefined) {
  const { currentUser } = useCurrentUser();
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [formDocumentId, setFormDocumentId] = useState<string | null>(null);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [accessLogs, setAccessLogs] = useState<DocumentAccessLog[]>([]);
  const [relatedCorrespondence, setRelatedCorrespondence] = useState<DocumentRelatedCorrespondenceItem[]>([]);
  const loadKeyRef = useRef<string | null>(null);

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

    // Load once per document+user. StrictMode's double effect run and the
    // currentUser hydration re-render must not re-fetch the detail bundle.
    const loadKey = `${documentId}:${currentUser.id}`;
    if (loadKeyRef.current === loadKey) return;
    loadKeyRef.current = loadKey;
    const isCurrent = () => loadKeyRef.current === loadKey;

    const load = async () => {
      setLoading(true);
      setError(null);
      setAccessDenied(false);
      setFormDocumentId(null);

      try {
        const doc = await fetchDocumentById(documentId);
        if (!isCurrent()) return;
        setDocument(doc);

        if (doc.documentType === 'form') {
          if (doc.form_document?.id) {
            setFormDocumentId(doc.form_document.id);
          } else {
            try {
              const formDocs = await apiFetch<Array<{ id: string }>>(
                `/dms/form-documents/?document=${documentId}`,
              );
              if (isCurrent() && formDocs.length > 0) {
                setFormDocumentId(formDocs[0].id);
              }
            } catch (formError: unknown) {
              logError('Failed to load form document', formError);
            }
          }
        }

        const [cmts, logs, related] = await Promise.all([
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
        ]);
        if (!isCurrent()) return;

        setComments(cmts);
        setAccessLogs(logs);
        setRelatedCorrespondence(related);

        void logDocumentAccess({
          documentId,
          userId: currentUser.id,
          action: 'view',
          sensitivity: doc.sensitivity,
        }).catch((accessError: unknown) => {
          logError('Failed to log document access', accessError);
        });
      } catch (loadError: unknown) {
        if (!isCurrent()) return;
        if (isAccessDeniedError(loadError)) {
          setAccessDenied(true);
          setError(null);
        } else {
          logError('Failed to load document', loadError);
          setError('Failed to load document');
          setAccessDenied(false);
        }
        setDocument(null);
      } finally {
        if (isCurrent()) setLoading(false);
      }
    };

    void load();
  }, [documentId, currentUser?.id]);

  return {
    document,
    setDocument,
    loading,
    error,
    accessDenied,
    formDocumentId,
    comments,
    setComments,
    accessLogs,
    setAccessLogs,
    relatedCorrespondence,
    refreshDocument,
  };
}
