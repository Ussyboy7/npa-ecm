import { ERROR_AUTHENTICATION_REQUIRED } from '@/lib/constants';
import { apiFetch, hasTokens } from './api-client';
import { unwrapResults } from '@/lib/type-utils';
import type { DocumentCollection, CreateDocumentCollectionInput } from './dms-types';
import { mapCollection } from './dms-types';

let collectionsCache: DocumentCollection[] = [];

export const fetchCollections = async (): Promise<DocumentCollection[]> => {
  if (!hasTokens()) {
    collectionsCache = [];
    return collectionsCache;
  }

  const payload = await apiFetch<unknown>('/dms/collections/');
  collectionsCache = (unwrapResults(payload) as Record<string, unknown>[]).map(mapCollection);
  return collectionsCache;
};

export const fetchCollectionById = async (id: string): Promise<DocumentCollection> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const data = await apiFetch<Record<string, unknown>>(`/dms/collections/${id}/`);
  return mapCollection(data);
};

export const createCollection = async (input: CreateDocumentCollectionInput): Promise<DocumentCollection> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const payload: Record<string, unknown> = {
    name: input.name,
    description: input.description ?? '',
    document_ids: input.documentIds ?? [],
    member_ids: input.memberIds ?? [],
    is_public: input.isPublic ?? false,
  };

  const data = await apiFetch<Record<string, unknown>>('/dms/collections/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const collection = mapCollection(data);
  collectionsCache = [...collectionsCache, collection];
  return collection;
};

export const updateCollection = async (
  id: string,
  input: Partial<CreateDocumentCollectionInput>,
): Promise<DocumentCollection> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description;
  if (input.documentIds !== undefined) payload.document_ids = input.documentIds;
  if (input.memberIds !== undefined) payload.member_ids = input.memberIds;
  if (input.isPublic !== undefined) payload.is_public = input.isPublic;

  const data = await apiFetch<Record<string, unknown>>(`/dms/collections/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  const collection = mapCollection(data);
  collectionsCache = collectionsCache.map((c) => (c.id === id ? collection : c));
  return collection;
};

export const deleteCollection = async (id: string): Promise<void> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  await apiFetch(`/dms/collections/${id}/`, {
    method: 'DELETE',
  });

  collectionsCache = collectionsCache.filter((c) => c.id !== id);
};

export const addDocumentsToCollection = async (collectionId: string, documentIds: string[]): Promise<void> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  await apiFetch(`/dms/collections/${collectionId}/add-documents/`, {
    method: 'POST',
    body: JSON.stringify({ document_ids: documentIds }),
  });

  collectionsCache = [];
};

export const removeDocumentsFromCollection = async (collectionId: string, documentIds: string[]): Promise<void> => {
  if (!hasTokens()) {
    throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  }

  await apiFetch(`/dms/collections/${collectionId}/remove-documents/`, {
    method: 'POST',
    body: JSON.stringify({ document_ids: documentIds }),
  });

  collectionsCache = [];
};
