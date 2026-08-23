"use client";

import { logWarn } from '@/lib/client-logger';
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isRecord } from "@/lib/type-utils";
import type { User } from "@/lib/npa-structure";
import { OrganizationContext } from "@/contexts/OrganizationContext";
import { apiFetch, clearTokens, hasOriginalTokens, hasTokens, isImpersonatingUser, getOriginalUserId } from "@/lib/api-client";

const AUTH_CHANGED_EVENT = "npa_ecm_auth_changed";

const toOptionalString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  return String(value);
};

const mapApiUserToUser = (data: Record<string, unknown>): User => {
  const name = `${toOptionalString(data.first_name) ?? ""} ${toOptionalString(data.last_name) ?? ""}`.trim();
  // system_role is now a ForeignKey (UUID), but backend returns system_role_name for display
  const systemRoleObj = isRecord(data.system_role) ? data.system_role : undefined;
  let roleName = toOptionalString(data.system_role_name) ?? (systemRoleObj ? toOptionalString(systemRoleObj.name) : undefined) ?? "";
  // UUID pattern to detect if we accidentally got a UUID instead of a name
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // Never use UUID as role name
  if (uuidPattern.test(roleName)) {
    roleName = "";
  }
  const permissionsRaw = isRecord(data.permissions) ? data.permissions : undefined;
  const rolePermissions =
    permissionsRaw
      ? (Object.fromEntries(
          Object.entries(permissionsRaw)
            .filter(([key]) => typeof key === "string")
            .map(([key, value]) => [key, Boolean(value)]),
        ) as Record<string, boolean>)
      : undefined;
  return {
    id: String(data.id ?? data.username),
    username: typeof data.username === "string" ? data.username : toOptionalString(data.username),
    name: name.length > 0 ? name : (typeof data.username === "string" ? data.username : "User"),
    email: typeof data.email === "string" ? data.email : String(data.email ?? ""),
    employeeId: typeof data.employee_id === "string" ? data.employee_id : String(data.employee_id ?? ""),
    gradeLevel: typeof data.grade_level === "string" ? data.grade_level : String(data.grade_level ?? ""),
    directorate: toOptionalString(data.directorate ?? data.directorate_id),
    division: toOptionalString(data.division ?? data.division_id),
    department: toOptionalString(data.department ?? data.department_id),
    systemRole: roleName, // Use role name for display
    avatar: typeof data.avatar === "string" ? data.avatar : undefined,
    active: typeof data.is_active === "boolean" ? data.is_active : true,
    isSuperuser: typeof data.is_superuser === "boolean" ? data.is_superuser : false,
    phone: toOptionalString(data.phone),
    bio: toOptionalString(data.bio),
    jobTitle: toOptionalString(data.job_title),
    profilePhoto: typeof data.profile_photo === "string" ? data.profile_photo : undefined,
    rolePermissions,
  };
};

// Singleton state for current user - only one fetch should happen regardless of how many components use the hook
const globalUserState: {
  user: User | null;
  hydrated: boolean;
  loading: boolean;
} = {
  user: null,
  hydrated: false,
  loading: false,
};

let globalFetchPromise: Promise<User | null> | null = null;
const globalSubscribers = new Set<() => void>();

function notifySubscribers(): void {
  globalSubscribers.forEach((sub) => sub());
}

export function subscribeToStore(onStoreChange: () => void): () => void {
  globalSubscribers.add(onStoreChange);
  return () => {
    globalSubscribers.delete(onStoreChange);
  };
}

export function getCurrentUserSnapshot(): User | null {
  return globalUserState.user;
}

export function getHydratedSnapshot(): boolean {
  return globalUserState.hydrated;
}

export function getLoadingSnapshot(): boolean {
  return globalUserState.loading;
}

export const useCurrentUser = () => {
  const organization = useContext(OrganizationContext);
  const users = useMemo(() => organization?.users ?? [], [organization?.users]);
  const [remoteUser, setRemoteUser] = useState<User | null>(globalUserState.user);
  const [hydrated, setHydrated] = useState(globalUserState.hydrated);

  // Global fetch function that only runs once, then notifies all subscribers
  const performGlobalFetch = useCallback(async (): Promise<User | null> => {
    // If there's already a fetch in progress, wait for it
    if (globalFetchPromise) {
      try {
        return await globalFetchPromise;
      } catch {
        // If the promise failed, continue with new fetch
      }
    }

    // Start new fetch
    globalUserState.loading = true;
    globalFetchPromise = (async () => {
      if (!hasTokens()) {
        globalUserState.user = null;
        globalUserState.hydrated = true;
        globalUserState.loading = false;
        notifySubscribers();
        return null;
      }

      try {
        const response = await apiFetch<unknown>("/accounts/auth/me/");
        const user = isRecord(response) ? mapApiUserToUser(response) : null;
        globalUserState.user = user;
        globalUserState.hydrated = true;
        globalUserState.loading = false;
        
        // Notify all subscribers
        notifySubscribers();
        
        return user;
      } catch (error: unknown) {
        const status = typeof error === "object" && error && "status" in error
          ? Number((error as { status?: unknown }).status)
          : undefined;
        const message = error instanceof Error ? error.message : String(error ?? "");

        // Stale/invalid token payload can point to a deleted user and return 404 on /auth/me/.
        // Treat this as an auth reset so app stops retrying with bad tokens.
        if (status === 404 || message.toLowerCase().includes("user not found")) {
          clearTokens();
        }

        logWarn("Failed to hydrate current user from API", error);
        globalUserState.user = null;
        globalUserState.hydrated = true;
        globalUserState.loading = false;
        
        // Notify all subscribers
        notifySubscribers();
        
        return null;
      } finally {
        globalFetchPromise = null;
      }
    })();

    return await globalFetchPromise;
  }, []);

  // Subscribe to global user state
  useEffect(() => {
    // Add this component as a subscriber
    const syncFromGlobalState = () => {
      setRemoteUser(globalUserState.user);
      setHydrated(globalUserState.hydrated);
    };
    globalSubscribers.add(syncFromGlobalState);
    
    // Force refetch if tokens exist but we have no user (e.g., user just logged in)
    if (hasTokens() && !globalUserState.user && !globalUserState.loading) {
      void performGlobalFetch();
    } else if (globalUserState.hydrated) {
      // If already hydrated, use cached value
      setRemoteUser(globalUserState.user);
      setHydrated(true);
    } else if (!globalUserState.loading) {
      // If not loading and not hydrated, start fetch
      void performGlobalFetch();
    }

    return () => {
      globalSubscribers.delete(syncFromGlobalState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      if (globalUserState.loading) return;
      globalUserState.hydrated = false;
      void performGlobalFetch();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, handler);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, handler);
  }, [performGlobalFetch]);

  const loadCurrentUser = useCallback(async () => {
    await performGlobalFetch();
  }, [performGlobalFetch]);

  const resolvedUser = useMemo(() => {
    if (!remoteUser) return null;
    const orgMatch = users.find(
      (candidate) =>
        candidate.id === remoteUser.id ||
        (remoteUser.username && candidate.username === remoteUser.username),
    );

    if (!orgMatch) {
      return remoteUser;
    }

    return {
      ...orgMatch,
      ...remoteUser,
      directorate: orgMatch.directorate ?? remoteUser.directorate,
      division: orgMatch.division ?? remoteUser.division,
      department: orgMatch.department ?? remoteUser.department,
      systemRole: remoteUser.systemRole || orgMatch.systemRole,
      gradeLevel: remoteUser.gradeLevel || orgMatch.gradeLevel,
      active: orgMatch.active,
      // Preserve isSuperuser from remoteUser (API) as it's the source of truth
      isSuperuser: remoteUser.isSuperuser ?? orgMatch.isSuperuser ?? false,
      rolePermissions: remoteUser.rolePermissions ?? orgMatch.rolePermissions,
    } satisfies User;
  }, [remoteUser, users]);

  const refresh = useCallback(async () => {
    setHydrated(false);
    await loadCurrentUser();
  }, [loadCurrentUser]);

  return useMemo(() => ({
    currentUser: resolvedUser,
    hydrated,
    refresh,
    isImpersonating: isImpersonatingUser(resolvedUser?.id ?? null),
  }), [resolvedUser, hydrated, refresh]);
};
