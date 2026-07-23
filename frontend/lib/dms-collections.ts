"use client";

import { apiFetch } from "@/lib/api-client";
import type { DocumentCollection } from "./dms-types";
import { mapCollection } from "./dms-types";

export type { DocumentCollection };

export const fetchCollections = async (signal?: AbortSignal): Promise<DocumentCollection[]> => {
  const payload = await apiFetch<Record<string, unknown>>("/dms/collections/", { signal });
  const raw = Array.isArray(payload) ? payload : ((payload.results ?? []) as unknown[]);
  return raw.map((item) => mapCollection(item as Record<string, unknown>));
};

export const fetchCollectionById = async (id: string, signal?: AbortSignal): Promise<DocumentCollection> => {
  const payload = await apiFetch<Record<string, unknown>>(`/dms/collections/${id}/`, { signal });
  return mapCollection(payload);
};

export const createCollection = async (name: string, description?: string): Promise<DocumentCollection> => {
  const response = await apiFetch<Record<string, unknown>>("/dms/collections/", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
  return mapCollection(response);
};

export const updateCollection = async (id: string, data: Partial<{ name: string; description: string }>): Promise<DocumentCollection> => {
  const response = await apiFetch<Record<string, unknown>>(`/dms/collections/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return mapCollection(response);
};

export const addDocumentsToCollection = async (collectionId: string, documentIds: string[]): Promise<void> => {
  await apiFetch(`/dms/collections/${collectionId}/add-documents/`, {
    method: "POST",
    body: JSON.stringify({ document_ids: documentIds }),
  });
};

export const removeDocumentFromCollection = async (collectionId: string, documentId: string): Promise<void> => {
  await apiFetch(`/dms/collections/${collectionId}/remove-document/`, {
    method: "POST",
    body: JSON.stringify({ document_id: documentId }),
  });
};

export const removeDocumentsFromCollection = async (collectionId: string, documentIds: string[]): Promise<void> => {
  await apiFetch(`/dms/collections/${collectionId}/remove-documents/`, {
    method: "POST",
    body: JSON.stringify({ document_ids: documentIds }),
  });
};

export const deleteCollection = async (collectionId: string): Promise<void> => {
  await apiFetch(`/dms/collections/${collectionId}/`, { method: "DELETE" });
};

export const fetchDocumentsInCollection = async (
  collectionId: string,
  params?: { page?: number; pageSize?: number },
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("page_size", String(params.pageSize));
  const qs = query.toString();
  const url = `/dms/collections/${collectionId}/documents/${qs ? `?${qs}` : ""}`;
  return await apiFetch<Record<string, unknown>>(url, { signal });
};
