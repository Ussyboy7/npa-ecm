/**
 * Search autocomplete utilities for admin pages
 */

const STORAGE_KEY_PREFIX = 'admin_recent_searches_';

export function getRecentSearches(pageKey: string, maxItems: number = 5): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${pageKey}`);
    if (!stored) return [];
    const searches = JSON.parse(stored);
    return Array.isArray(searches) ? searches.slice(0, maxItems) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(pageKey: string, query: string): void {
  if (typeof window === 'undefined' || !query.trim()) return;
  
  try {
    const current = getRecentSearches(pageKey, 10);
    const updated = [query.trim(), ...current.filter(s => s.toLowerCase() !== query.trim().toLowerCase())].slice(0, 10);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${pageKey}`, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function clearRecentSearches(pageKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${pageKey}`);
}

export function getSearchSuggestions(
  query: string,
  allItems: Array<{ name?: string; email?: string; title?: string; [key: string]: unknown }>,
  maxResults: number = 5
): string[] {
  if (!query.trim() || !allItems.length) return [];
  
  const lowerQuery = query.toLowerCase();
  const suggestions = new Set<string>();
  
  for (const item of allItems) {
    if (suggestions.size >= maxResults) break;
    
    // Check name
    if (item.name && item.name.toLowerCase().includes(lowerQuery)) {
      suggestions.add(item.name);
    }
    
    // Check email
    if (item.email && item.email.toLowerCase().includes(lowerQuery)) {
      suggestions.add(item.email);
    }
    
    // Check title
    if (item.title && item.title.toLowerCase().includes(lowerQuery)) {
      suggestions.add(item.title);
    }
  }
  
  return Array.from(suggestions).slice(0, maxResults);
}

