/** Shared page-size limits for list and catalog API queries. */

/** Paginated operational lists (inbox, cases, documents, etc.). */
export const DEFAULT_LIST_PAGE_SIZE = 50;
export const LIST_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const MAX_LIST_PAGE_SIZE = 100;

/** Reference catalogs (org units, user pickers, templates). */
export const DEFAULT_CATALOG_PAGE_SIZE = 100;
export const CATALOG_SEARCH_PAGE_SIZE = 50;
export const MAX_CATALOG_PAGE_SIZE = 500;

/** Dashboard previews and single-row lookups. */
export const PREVIEW_PAGE_SIZE = 5;

/** Small recent-item lists. */
export const RECENT_LIST_PAGE_SIZE = 10;
