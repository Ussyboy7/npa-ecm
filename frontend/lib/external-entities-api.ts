import { apiFetch } from './api-client';

export type ExternalEntityType = 'ministry' | 'agency' | 'company' | 'individual' | 'other';

export interface ExternalEntity {
  id: string;
  name: string;
  acronym: string;
  entity_type: ExternalEntityType;
  contact_email: string;
  contact_phone: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExternalEntityInput {
  name: string;
  acronym?: string;
  entity_type: ExternalEntityType;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active?: boolean;
}

const mapEntity = (item: Record<string, unknown>): ExternalEntity => ({
  id: String(item.id),
  name: String(item.name ?? ''),
  acronym: String(item.acronym ?? ''),
  entity_type: (item.entity_type as ExternalEntityType) ?? 'other',
  contact_email: String(item.contact_email ?? ''),
  contact_phone: String(item.contact_phone ?? ''),
  address: String(item.address ?? ''),
  is_active: Boolean(item.is_active ?? true),
  created_at: String(item.created_at ?? ''),
  updated_at: String(item.updated_at ?? ''),
});

export const fetchExternalEntities = async (params?: {
  search?: string;
  entityType?: ExternalEntityType;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.entityType) query.set('entity_type', params.entityType);
  if (params?.activeOnly) query.set('active_only', 'true');
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('page_size', String(params.pageSize));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await apiFetch<Record<string, unknown>>(`/correspondence/external-entities/${suffix || ''}`);
  const results = Array.isArray(response.results) ? response.results : Array.isArray(response) ? response : [];
  return {
    count: typeof response.count === 'number' ? response.count : results.length,
    results: results.map((item) => mapEntity(item as Record<string, unknown>)),
  };
};

export const createExternalEntity = async (payload: ExternalEntityInput) => {
  const response = await apiFetch<Record<string, unknown>>('/correspondence/external-entities/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapEntity(response);
};

export const updateExternalEntity = async (id: string, payload: Partial<ExternalEntityInput>) => {
  const response = await apiFetch<Record<string, unknown>>(`/correspondence/external-entities/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapEntity(response);
};

export const deleteExternalEntity = async (id: string) => {
  await apiFetch<void>(`/correspondence/external-entities/${id}/`, { method: 'DELETE' });
};
