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

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function lsSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded */ }
}

function lsRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

export function getRecentUsers(): StoredUser[] {
  const users = lsGet<StoredUser[]>(RECENT_USERS_KEY, []);
  return users.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_RECENT);
}

export function addRecentUser(user: { id: string; name: string; username?: string; email?: string }): void {
  const recent = getRecentUsers().filter(u => u.id !== user.id);
  lsSet(RECENT_USERS_KEY, [{ ...user, timestamp: Date.now() }, ...recent].slice(0, MAX_RECENT));
}

export function getFavoriteUsers(): string[] {
  return lsGet<string[]>(FAVORITE_USERS_KEY, []);
}

export function addFavoriteUser(userId: string): void {
  const favorites = getFavoriteUsers();
  if (!favorites.includes(userId)) {
    lsSet(FAVORITE_USERS_KEY, [...favorites, userId].slice(0, MAX_FAVORITES));
  }
}

export function removeFavoriteUser(userId: string): void {
  lsSet(FAVORITE_USERS_KEY, getFavoriteUsers().filter(id => id !== userId));
}

export function getCollapsedGroups(): Set<string> {
  return new Set(lsGet<string[]>(COLLAPSED_GROUPS_KEY, []));
}

export function saveCollapsedGroups(collapsed: Set<string>): void {
  lsSet(COLLAPSED_GROUPS_KEY, Array.from(collapsed));
}

export function clearRecentUsers(): void {
  lsRemove(RECENT_USERS_KEY);
}

const SEARCH_HISTORY_KEY = 'role_switcher_search_history';
const MAX_SEARCH_HISTORY = 10;

export function getSearchHistory(): string[] {
  return lsGet<string[]>(SEARCH_HISTORY_KEY, []);
}

export function addSearchHistory(query: string): void {
  if (typeof window === 'undefined' || !query.trim()) return;
  const history = getSearchHistory().filter(q => q.toLowerCase() !== query.toLowerCase());
  lsSet(SEARCH_HISTORY_KEY, [query.trim(), ...history].slice(0, MAX_SEARCH_HISTORY));
}

export function clearSearchHistory(): void {
  lsRemove(SEARCH_HISTORY_KEY);
}

const GROUP_ORDER_KEY = 'role_switcher_group_order';

export function getGroupOrder(): string[] {
  return lsGet<string[]>(GROUP_ORDER_KEY, []);
}
