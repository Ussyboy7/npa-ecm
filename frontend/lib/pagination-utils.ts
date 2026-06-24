import { apiFetch } from './api-client';
import { MAX_CATALOG_PAGE_SIZE, MAX_LIST_PAGE_SIZE } from './pagination-constants';

export interface PaginatedResponse<T> {
  results?: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

/** Fetch every page of a list endpoint (uses max allowed page size per request). */
export async function fetchAllPaginated<T>(
  path: string,
  pageSize = MAX_LIST_PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  for (;;) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await apiFetch<PaginatedResponse<T>>(
      `${path}${sep}page=${page}&page_size=${pageSize}`,
    );
    all.push(...(res.results ?? []));
    if (!res.next) break;
    page += 1;
  }
  return all;
}

/** Fetch every page of a catalog endpoint (larger page size ceiling). */
export async function fetchAllCatalogPaginated<T>(
  path: string,
  pageSize = MAX_CATALOG_PAGE_SIZE,
): Promise<T[]> {
  return fetchAllPaginated<T>(path, pageSize);
}

type FetchPageFn<T> = (page: number, pageSize: number) => Promise<PaginatedResponse<T>>;

/** Fetch every page via a callback (for typed API helpers). */
export async function fetchAllPaginatedResults<T>(
  fetchPage: FetchPageFn<T>,
  options?: { pageSize?: number; maxPages?: number },
): Promise<T[]> {
  const pageSize = options?.pageSize ?? MAX_LIST_PAGE_SIZE;
  const maxPages = options?.maxPages ?? 50;
  const all: T[] = [];
  let page = 1;
  let total: number | undefined;

  while (page <= maxPages) {
    const res = await fetchPage(page, pageSize);
    const batch = res.results ?? [];
    all.push(...batch);
    if (typeof res.count === 'number') total = res.count;
    if (batch.length < pageSize) break;
    if (total != null && all.length >= total) break;
    page += 1;
  }

  return all;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}
