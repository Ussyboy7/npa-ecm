/**
 * LocalStorage utilities for Role Switcher
 * Manages recent users and favorites
 */

const RECENT_USERS_KEY = 'role_switcher_recent';
const FAVORITE_USERS_KEY = 'role_switcher_favorites';
const COLLAPSED_GROUPS_KEY = 'role_switcher_collapsed_groups';
const MAX_RECENT = 10;
const MAX_FAVORITES = 20;

export interface StoredUser {
  id: string;
  name: string;
  username?: string;
  email?: string;
  timestamp: number;
}

/**
 * Get recent users from localStorage
 */
export function getRecentUsers(): StoredUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_USERS_KEY);
    if (!stored) return [];
    const users = JSON.parse(stored) as StoredUser[];
    // Sort by most recent first
    return users.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/**
 * Add a user to recent users
 */
export function addRecentUser(user: { id: string; name: string; username?: string; email?: string }): void {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentUsers();
    // Remove if already exists
    const filtered = recent.filter(u => u.id !== user.id);
    // Add to beginning
    const updated: StoredUser[] = [
      { ...user, timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore errors
  }
}

/**
 * Get favorite users from localStorage
 */
export function getFavoriteUsers(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FAVORITE_USERS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

/**
 * Add a user to favorites
 */
export function addFavoriteUser(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const favorites = getFavoriteUsers();
    if (!favorites.includes(userId)) {
      const updated = [...favorites, userId].slice(0, MAX_FAVORITES);
      localStorage.setItem(FAVORITE_USERS_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Remove a user from favorites
 */
export function removeFavoriteUser(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const favorites = getFavoriteUsers();
    const updated = favorites.filter(id => id !== userId);
    localStorage.setItem(FAVORITE_USERS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore errors
  }
}

/**
 * Check if a user is favorited
 */
export function isFavoriteUser(userId: string): boolean {
  return getFavoriteUsers().includes(userId);
}

/**
 * Get collapsed groups state
 */
export function getCollapsedGroups(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(COLLAPSED_GROUPS_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored) as string[]);
  } catch {
    return new Set();
  }
}

/**
 * Save collapsed groups state
 */
export function saveCollapsedGroups(collapsed: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(Array.from(collapsed)));
  } catch {
    // Ignore errors
  }
}

/**
 * Clear recent users
 */
export function clearRecentUsers(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_USERS_KEY);
  } catch {
    // Ignore errors
  }
}

const SEARCH_HISTORY_KEY = 'role_switcher_search_history';
const MAX_SEARCH_HISTORY = 10;

/**
 * Get search history
 */
export function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

/**
 * Add search to history
 */
export function addSearchHistory(query: string): void {
  if (typeof window === 'undefined' || !query.trim()) return;
  try {
    const history = getSearchHistory();
    const filtered = history.filter(q => q.toLowerCase() !== query.toLowerCase());
    const updated = [query.trim(), ...filtered].slice(0, MAX_SEARCH_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore errors
  }
}

/**
 * Clear search history
 */
export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // Ignore errors
  }
}

const GROUP_ORDER_KEY = 'role_switcher_group_order';

/**
 * Get custom group order
 */
export function getGroupOrder(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(GROUP_ORDER_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

/**
 * Save custom group order
 */
export function saveGroupOrder(order: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GROUP_ORDER_KEY, JSON.stringify(order));
  } catch {
    // Ignore errors
  }
}

