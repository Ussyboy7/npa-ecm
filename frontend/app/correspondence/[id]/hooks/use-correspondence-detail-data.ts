import { useEffect, useCallback, useRef } from 'react';
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { handleAuthenticationError } from '@/lib/auth-errors';
import { isAccessDeniedError } from '@/lib/api-error';
import { apiFetch, isAbortError } from '@/lib/api-client';
import { fetchDocumentById, type DocumentRecord } from '@/lib/api/dms';
import { mapApiCorrespondence, mapApiMinute } from '@/lib/api/correspondence-mappers';
import type { ApiCorrespondence, ApiMinute } from '@/lib/api/correspondence';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import type { CorrespondenceDetailState } from '../correspondence-state-reducer';
import type { useApiRetry } from '@/hooks/use-api-retry';

type FetchWithRetry = ReturnType<typeof useApiRetry>['fetchWithRetry'];
type BackendDelegation = CorrespondenceDetailState['backendDelegation'];

type DelegationUser = {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  username?: string;
};

type DelegationItem = {
  id: string;
  status: string;
  assistant?: { id: string } & DelegationUser;
  assistant_id?: string;
  principal?: { id: string } & DelegationUser;
  principal_id?: string;
  delegated_at?: string;
  delegatedAt?: string;
  expires_at?: string | null;
  is_active?: boolean;
};

/**
 * A delegation only counts while it is active and inside its expiry window.
 * The stored status can still read "active" after the expiry has passed.
 */
const isLiveDelegation = (delegation: DelegationItem): boolean => {
  if (delegation.status !== 'active' || delegation.is_active === false) return false;
  if (!delegation.expires_at) return true;
  const expiresAt = Date.parse(delegation.expires_at);
  return Number.isNaN(expiresAt) || expiresAt > Date.now();
};

type DelegationResponse = Array<DelegationItem> | { results: Array<DelegationItem> };

const delegationUserName = (user?: DelegationUser): string | undefined => {
  if (!user) return undefined;
  const fullName = [user.first_name, user.middle_name, user.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim();
  if (fullName) return fullName;
  return user.username?.trim() || undefined;
};

interface UseCorrespondenceDetailDataOptions {
  id: string;
  correspondence: Correspondence | null | undefined;
  minutes: Minute[];
  activeUserId: string | undefined;
  isCompleted: boolean;
  detailLoading: boolean;
  /** Archive view: use the archive-scoped detail endpoint and never write read receipts. */
  readOnly?: boolean;
  fetchWithRetry: FetchWithRetry;
  mergeMinutes: (minutes: Minute[]) => void;
  closeModal: () => void;
  setMinutes: (minutes: Minute[]) => void;
  setRemoteCorrespondence: (corr: Correspondence | null) => void;
  setDetailLoading: (loading: boolean) => void;
  setBackendDelegation: (del: BackendDelegation) => void;
  setLinkedDocuments: (docs: DocumentRecord[]) => void;
  setWithheldLinkedDocumentCount: (count: number) => void;
  setAccessDenied: (denied: boolean) => void;
}

export function useCorrespondenceDetailData({
  id,
  correspondence,
  minutes,
  activeUserId,
  isCompleted,
  detailLoading,
  readOnly = false,
  fetchWithRetry,
  mergeMinutes,
  closeModal,
  setMinutes,
  setRemoteCorrespondence,
  setDetailLoading,
  setBackendDelegation,
  setLinkedDocuments,
  setWithheldLinkedDocumentCount,
  setAccessDenied,
}: UseCorrespondenceDetailDataOptions) {
  const markedAsOpenedRef = useRef<Set<string>>(new Set());

  const linkedDocIdsKey = (correspondence?.linkedDocumentIds ?? []).join(',');
  // A recalled approved copy stays linked as evidence, but it is withdrawn, so
  // it is never fetched as an openable document; the panel lists it separately.
  const recalledDocIdsKey = (correspondence?.recalledDocuments ?? [])
    .map((doc) => doc.id)
    .join(',');

  useEffect(() => {
    const recalledIds = new Set(recalledDocIdsKey ? recalledDocIdsKey.split(',') : []);
    const linkedIds = (linkedDocIdsKey ? linkedDocIdsKey.split(',') : []).filter(
      (docId) => !recalledIds.has(docId),
    );
    if (linkedIds.length === 0) {
      setLinkedDocuments([]);
      setWithheldLinkedDocumentCount(0);
      return;
    }

    let ignore = false;

    const loadLinkedDocs = async () => {
      try {
        let withheld = 0;
        const results = await Promise.all(
          linkedIds.map(async (docId) => {
            try {
              return await fetchDocumentById(docId);
            } catch (error: unknown) {
              // A linked document the API refuses is an access gap on this
              // record, not a document that does not exist. Count it so the
              // panel can say the record carries something the reader cannot
              // open, instead of silently showing a shorter list.
              withheld += 1;
              logError(`Linked document ${docId} is not readable by this user`, error);
              return null;
            }
          }),
        );

        if (!ignore) {
          setLinkedDocuments(results.filter((doc): doc is DocumentRecord => Boolean(doc)));
          setWithheldLinkedDocumentCount(withheld);
        }
      } catch (error: unknown) {
        logError('Failed to load linked documents', error);
      }
    };

    void loadLinkedDocs();

    return () => {
      ignore = true;
    };
  }, [linkedDocIdsKey, recalledDocIdsKey, setLinkedDocuments, setWithheldLinkedDocumentCount]);

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
        const detailPath = readOnly
          ? `/correspondence/items/${id}/archive-record/`
          : `/correspondence/items/${id}/`;
        const [corrResponse, minutesResponse, delegationResponse] = await Promise.all([
          fetchWithRetry(() => apiFetch<ApiCorrespondence>(detailPath, { signal })),
          fetchWithRetry(() => apiFetch<MinutesResponse>(`/correspondence/minutes/?correspondence=${id}`, { signal })),
          fetchWithRetry(() =>
            apiFetch<DelegationResponse>(
              `/correspondence/correspondence-delegations/?correspondence=${id}&status=active`,
              { signal },
            ),
          ).catch(() => []),
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

          const delegations: DelegationItem[] = Array.isArray(delegationResponse)
            ? delegationResponse
            : delegationResponse?.results || [];
          const activeDel = delegations.find(isLiveDelegation);
          if (activeDel) {
            setBackendDelegation({
              id: activeDel.id,
              assistantId: activeDel.assistant?.id || activeDel.assistant_id || '',
              assistantName: delegationUserName(activeDel.assistant),
              principalId: activeDel.principal?.id || activeDel.principal_id || '',
              principalName: delegationUserName(activeDel.principal),
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
    if (readOnly || !correspondence?.id || !activeUserId || detailLoading) return;

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
  }, [readOnly, correspondence?.id, currentOfficeId, currentApproverId, activeUserId, detailLoading, minutes]);

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
      const detailPath = readOnly
        ? `/correspondence/items/${id}/archive-record/`
        : `/correspondence/items/${id}/`;
      const corrResponse = await fetchWithRetry(() => apiFetch<ApiCorrespondence>(detailPath));
      const mappedCorrespondence = mapApiCorrespondence(corrResponse);
      setRemoteCorrespondence(mappedCorrespondence);
    } catch (error: unknown) {
      if (handleAuthenticationError(error)) return;
      logError('Failed to refresh correspondence detail', error);
    } finally {
      setDetailLoading(false);
    }
  }, [id, readOnly, fetchWithRetry, setRemoteCorrespondence, setDetailLoading]);

  return { refreshMinutes, refreshDetail };
}
