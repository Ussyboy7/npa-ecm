/**
 * Enhanced Search Functionality for Admin Pages
 * Provides full-text search, saved queries, and search history
 */

import { User } from './admin-api';

export interface SearchQuery {
  id: string;
  name: string;
  query: string;
  filters: Record<string, any>;
  createdAt: string;
  lastUsed: string;
}

export interface SearchHistory {
  query: string;
  timestamp: string;
  results: number;
}

const SAVED_QUERIES_KEY = 'admin_saved_queries';
const SEARCH_HISTORY_KEY = 'admin_search_history';
const MAX_HISTORY_ITEMS = 20;

/**
 * Save a search query for later use
 */
export function saveSearchQuery(
  name: string,
  query: string,
  filters: Record<string, any> = {}
): SearchQuery {
  const queries = getSavedQueries();
  
  const newQuery: SearchQuery = {
    id: `query_${Date.now()}`,
    name,
    query,
    filters,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  };
  
  queries.push(newQuery);
  localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(queries));
  
  return newQuery;
}

/**
 * Get all saved queries
 */
export function getSavedQueries(): SearchQuery[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(SAVED_QUERIES_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Delete a saved query
 */
export function deleteSavedQuery(id: string): void {
  const queries = getSavedQueries();
  const filtered = queries.filter(q => q.id !== id);
  localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(filtered));
}

/**
 * Update last used timestamp for a query
 */
export function markQueryUsed(id: string): void {
  const queries = getSavedQueries();
  const query = queries.find(q => q.id === id);
  
  if (query) {
    query.lastUsed = new Date().toISOString();
    localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(queries));
  }
}

/**
 * Add search to history
 */
export function addToSearchHistory(query: string, results: number): void {
  if (!query.trim()) return;
  
  const history = getSearchHistory();
  
  const newEntry: SearchHistory = {
    query,
    timestamp: new Date().toISOString(),
    results,
  };
  
  // Remove duplicate queries
  const filtered = history.filter(h => h.query !== query);
  
  // Add to beginning and limit size
  filtered.unshift(newEntry);
  const limited = filtered.slice(0, MAX_HISTORY_ITEMS);
  
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(limited));
}

/**
 * Get search history
 */
export function getSearchHistory(): SearchHistory[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Clear search history
 */
export function clearSearchHistory(): void {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

/**
 * Full-text search across user fields
 */
export function fullTextSearch(users: User[], query: string): User[] {
  if (!query.trim()) return users;
  
  const terms = query.toLowerCase().split(/\s+/);
  
  return users.filter(user => {
    const searchableText = [
      user.username,
      user.email,
      user.first_name,
      user.last_name,
      user.employee_id,
      user.grade_level,
      user.system_role_name,
      user.directorate_name,
      user.division_name,
      user.department_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    
    return terms.every(term => searchableText.includes(term));
  });
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const terms = query.split(/\s+/);
  let highlighted = text;
  
  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  
  return highlighted;
}

/**
 * Get search suggestions based on query
 */
export function getSearchSuggestions(
  query: string,
  users: User[],
  maxSuggestions: number = 5
): string[] {
  if (!query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  const suggestions = new Set<string>();
  
  // Add matching usernames
  users.forEach(user => {
    if (user.username.toLowerCase().includes(lowerQuery)) {
      suggestions.add(user.username);
    }
    if (user.email.toLowerCase().includes(lowerQuery)) {
      suggestions.add(user.email);
    }
    if (user.employee_id?.toLowerCase().includes(lowerQuery)) {
      suggestions.add(user.employee_id);
    }
  });
  
  return Array.from(suggestions).slice(0, maxSuggestions);
}

/**
 * Parse advanced search query
 * Supports operators like: field:value, "exact phrase", -exclude
 */
export function parseAdvancedQuery(query: string): {
  terms: string[];
  fields: Record<string, string>;
  excluded: string[];
  phrases: string[];
} {
  const terms: string[] = [];
  const fields: Record<string, string> = {};
  const excluded: string[] = [];
  const phrases: string[] = [];
  
  // Extract exact phrases
  const phraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = phraseRegex.exec(query)) !== null) {
    phrases.push(match[1]);
    query = query.replace(match[0], '');
  }
  
  // Extract field:value pairs
  const fieldRegex = /(\w+):(\S+)/g;
  while ((match = fieldRegex.exec(query)) !== null) {
    fields[match[1]] = match[2];
    query = query.replace(match[0], '');
  }
  
  // Extract excluded terms
  const excludeRegex = /-(\S+)/g;
  while ((match = excludeRegex.exec(query)) !== null) {
    excluded.push(match[1]);
    query = query.replace(match[0], '');
  }
  
  // Remaining terms
  terms.push(...query.trim().split(/\s+/).filter(Boolean));
  
  return { terms, fields, excluded, phrases };
}

/**
 * Apply advanced search
 */
export function advancedSearch(users: User[], query: string): User[] {
  const { terms, fields, excluded, phrases } = parseAdvancedQuery(query);
  
  return users.filter(user => {
    // Check field filters
    for (const [field, value] of Object.entries(fields)) {
      const userValue = (user as any)[field];
      if (!userValue || !userValue.toString().toLowerCase().includes(value.toLowerCase())) {
        return false;
      }
    }
    
    // Check excluded terms
    const searchableText = [
      user.username,
      user.email,
      user.first_name,
      user.last_name,
    ].join(' ').toLowerCase();
    
    for (const term of excluded) {
      if (searchableText.includes(term.toLowerCase())) {
        return false;
      }
    }
    
    // Check phrases
    for (const phrase of phrases) {
      if (!searchableText.includes(phrase.toLowerCase())) {
        return false;
      }
    }
    
    // Check terms
    for (const term of terms) {
      if (!searchableText.includes(term.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });
}

