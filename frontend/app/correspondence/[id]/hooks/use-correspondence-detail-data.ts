import { useEffect, useCallback, useRef } from 'react';
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { handleAuthenticationError } from '@/lib/auth-errors';
import { isAccessDeniedError } from '@/lib/api-errors';
import { apiFetch, isAbortError } from '@/lib/api-client';
import { fetchDocumentById, type DocumentRecord } from '@/lib/dms-storage';
import { mapApiCorrespondence, mapApiMinute } from '@/contexts/CorrespondenceContext';
import type { ApiCorrespondence, ApiMinute } from '@/lib/api/correspondence';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import type { CorrespondenceDetailState } from '../correspondence-state-reducer';
import type { useApiRetry } from '@/hooks/use-api-retry';

type FetchWithRetry = ReturnType<typeof useApiRetry>['fetchWithRetry'];
type BackendDelegation = CorrespondenceDetailState['backendDelegation'];

interface UseCorrespondenceDetailDataOptions {
  id: string;
  correspondence: Correspondence | null | undefined;
  minutes: Minute[];
  activeUserId: string | undefined;
  isCompleted: boolean;
  detailLoading: boolean;
  fetchWithRetry: FetchWithRetry;
  mergeMinutes: (minutes: Minute[]) => void;
  closeModal: () => void;
  setMinutes: (minutes: Minute[]) => void;
  setRemoteCorrespondence: (corr: Correspondence | null) => void;
  setDetailLoading: (loading: boolean) => void;
  setBackendDelegation: (del: BackendDelegation) => void;
  setLinkedDocuments: (docs: DocumentRecord[]) => void;
  setAccessDenied: (denied: boolean) => void;
}

export function useCorrespondenceDetailData({
  id,
  correspondence,
  minutes,
  activeUserId,
  isCompleted,
  detailLoading,
  fetchWithRetry,
  mergeMinutes,
  closeModal,
  setMinutes,
  setRemoteCorrespondence,
  setDetailLoading,
  setBackendDelegation,
  setLinkedDocuments,
  setAccessDenied,
}: UseCorrespondenceDetailDataOptions) {
  const markedAsOpenedRef = useRef<Set<string>>(new Set());

  const linkedDocIdsKey = (correspondence?.linkedDocumentIds ?? []).join(',');

  useEffect(() => {
    const linkedIds = linkedDocIdsKey ? linkedDocIdsKey.split(',') : [];
    if (linkedIds.length === 0) {
      setLinkedDocuments([]);
      return;
    }

    let ignore = false;

    const loadLinkedDocs = async () => {
      try {
        const results = await Promise.all(
          linkedIds.map(async (docId) => {
            try {
              return await fetchDocumentById(docId);
            } catch (error: unknown) {
              logWarn(`Failed to load linked document ${docId}`, error);
              return null;
            }
          }),
        );

        if (!ignore) {
          setLinkedDocuments(results.filter((doc): doc is DocumentRecord => Boolean(doc)));
        }
      } catch (error: unknown) {
        logError('Failed to load linked documents', error);
      }
    };

    void loadLinkedDocs();

    return () => {
      ignore = true;
    };
  }, [linkedDocIdsKey, setLinkedDocuments]);

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    const abortController = new AbortController();

    const hydrateFromApi = async () => {
      setDetailLoading(true);
      setAccessDenied(false);
      try {
        type MinutesResponse = Array<ApiMinute> | { results: Array<ApiMinute> };
        const signal = abortController.signal;
        const [corrResponse, minutesResponse, delegationResponse] = await Promise.all([
          fetchWithRetry(() => apiFetch<ApiCorrespondence>(`/correspondence/items/${id}/`, { signal })),
          fetchWithRetry(() => apiFetch<MinutesResponse>(`/correspondence/minutes/?correspondence=${id}`, { signal })),
          fetchWithRetry(() => {
            type DelegationItem = {
              id: string;
              status: string;
              assistant?: { id: string };
              assistant_id?: string;
              principal?: { id: string };
              principal_id?: string;
              delegated_at?: string;
              delegatedAt?: string;
            };
            type DelegationResponse = Array<DelegationItem> | { results: Array<DelegationItem> };
            return apiFetch<DelegationResponse>(
              `/correspondence/correspondence-delegations/?correspondence=${id}&status=active`,
              { signal },
            );
          }).catch(() => []),
        ]);
        if (!ignore && !abortController.signal.aborted) {
          setRemoteCorrespondence(mapApiCorrespondence(corrResponse));
          const minutesData = Array.isArray(minutesResponse)
            ? minutesResponse
            : minutesResponse?.results || [];
          const mappedMinutes = minutesData.map(mapApiMinute);
          logInfo('[CorrespondenceDetail] Fetched minutes:', {
            rawCount: minutesData.length,
            mappedCount: mappedMinutes.length,
            correspondenceId: id,
          });
          setMinutes(mappedMinutes);
          mergeMinutes(mappedMinutes);

          const delegations: Array<{
            id: string;
            status: string;
            assistant?: { id: string };
            assistant_id?: string;
            principal?: { id: string };
            principal_id?: string;
            delegated_at?: string;
            delegatedAt?: string;
          }> = Array.isArray(delegationResponse)
            ? delegationResponse
            : delegationResponse?.results || [];
          const activeDel = delegations.find((d) => d.status === 'active');
          if (activeDel) {
            setBackendDelegation({
              id: activeDel.id,
              assistantId: activeDel.assistant?.id || activeDel.assistant_id || '',
              principalId: activeDel.principal?.id || activeDel.principal_id || '',
              status: activeDel.status,
              delegatedAt: activeDel.delegated_at || activeDel.delegatedAt || '',
            });
          } else {
            setBackendDelegation(null);
          }
        }
      } catch (error: unknown) {
        if (isAbortError(error)) return;
        if (handleAuthenticationError(error)) return;
        if (!ignore && !abortController.signal.aborted) {
          if (isAccessDeniedError(error)) {
            setAccessDenied(true);
            setRemoteCorrespondence(null);
          } else {
            logWarn('Failed to refresh correspondence detail', error);
          }
        }
      } finally {
        if (!ignore && !abortController.signal.aborted) {
          setDetailLoading(false);
        }
      }
    };
    void hydrateFromApi();
    return () => {
      ignore = true;
      abortController.abort();
    };
    // Intentionally id-only: fetchWithRetry/mergeMinutes/setters must not retrigger hydrate
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable dispatch setters; fetchWithRetry varies per render if options object is inline
  }, [id]);

  useEffect(() => {
    if (!isCompleted) return;
    closeModal();
  }, [isCompleted, closeModal]);

  const currentOfficeId = correspondence?.currentOfficeId;
  const currentApproverId = correspondence?.currentApproverId;

  useEffect(() => {
    if (!correspondence?.id || !activeUserId || detailLoading) return;

    const unopenedMinutes = minutes.filter(
      (m) =>
        !m.isOpened &&
        !markedAsOpenedRef.current.has(m.id) &&
        m.toOfficeId === currentOfficeId &&
        currentApproverId === activeUserId,
    );

    if (unopenedMinutes.length === 0) return;

    unopenedMinutes.forEach((m) => markedAsOpenedRef.current.add(m.id));

    Promise.allSettled(
      unopenedMinutes.map((minute) =>
        apiFetch(`/correspondence/minutes/${minute.id}/mark-opened/`, { method: 'POST' }).catch(
          (error) => {
            logWarn('Failed to mark minute as opened', error);
            markedAsOpenedRef.current.delete(minute.id);
          },
        ),
      ),
    );
  }, [correspondence?.id, currentOfficeId, currentApproverId, activeUserId, detailLoading, minutes]);

  const refreshMinutes = useCallback(async () => {
    if (!id) return;
    try {
      type MinutesResponseType = Array<ApiMinute> | { results: Array<ApiMinute> };
      const minutesResponse = await fetchWithRetry(() =>
        apiFetch<MinutesResponseType>(`/correspondence/minutes/?correspondence=${id}`),
      );
      const minutesData = Array.isArray(minutesResponse)
        ? minutesResponse
        : minutesResponse?.results || [];
      const mappedMinutes = minutesData.map(mapApiMinute);
      setMinutes(mappedMinutes);
      mergeMinutes(mappedMinutes);
    } catch (error: unknown) {
      if (handleAuthenticationError(error)) return;
      logWarn('Failed to refresh minutes', error);
    }
  }, [id, fetchWithRetry, setMinutes, mergeMinutes]);

  const refreshDetail = useCallback(async () => {
    if (!id) return;
    try {
      setDetailLoading(true);
      const corrResponse = await fetchWithRetry(() => apiFetch<ApiCorrespondence>(`/correspondence/items/${id}/`));
      const mappedCorrespondence = mapApiCorrespondence(corrResponse);
      setRemoteCorrespondence(mappedCorrespondence);
    } catch (error: unknown) {
      if (handleAuthenticationError(error)) return;
      logError('Failed to refresh correspondence detail', error);
    } finally {
      setDetailLoading(false);
    }
  }, [id, fetchWithRetry, setRemoteCorrespondence, setDetailLoading]);

  return { refreshMinutes, refreshDetail };
}
