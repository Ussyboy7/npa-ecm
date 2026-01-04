"use client";

import { logWarn } from '@/lib/client-logger';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@/lib/npa-structure";
import { OrganizationContext } from "@/contexts/OrganizationContext";
import { apiFetch, hasOriginalTokens, hasTokens } from "@/lib/api-client";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

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
    avatar: undefined,
    active: typeof data.is_active === "boolean" ? data.is_active : true,
    isSuperuser: typeof data.is_superuser === "boolean" ? data.is_superuser : false,
  };
};

// Singleton state for current user - only one fetch should happen regardless of how many components use the hook
let globalUserState: {
  user: User | null;
  hydrated: boolean;
  loading: boolean;
} = {
  user: null,
  hydrated: false,
  loading: false,
};

let globalFetchPromise: Promise<User | null> | null = null;
let globalSubscribers = new Set<(user: User | null, hydrated: boolean) => void>();

export const useCurrentUser = () => {
  const organization = useContext(OrganizationContext);
  const users = organization?.users ?? [];
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
        globalSubscribers.forEach(sub => sub(null, true));
        return null;
      }

      try {
        const response = await apiFetch<unknown>("/accounts/auth/me/");
        const user = isRecord(response) ? mapApiUserToUser(response) : null;
        globalUserState.user = user;
        globalUserState.hydrated = true;
        globalUserState.loading = false;
        
        // Notify all subscribers
        globalSubscribers.forEach(sub => sub(user, true));
        
        return user;
      } catch (error: unknown) {
        logWarn("Failed to hydrate current user from API", error);
        globalUserState.user = null;
        globalUserState.hydrated = true;
        globalUserState.loading = false;
        
        // Notify all subscribers
        globalSubscribers.forEach(sub => sub(null, true));
        
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
    const subscriber = (user: User | null, isHydrated: boolean) => {
      setRemoteUser(user);
      setHydrated(isHydrated);
    };
    globalSubscribers.add(subscriber);
    
    // If already hydrated, use cached value
    if (globalUserState.hydrated) {
      setRemoteUser(globalUserState.user);
      setHydrated(true);
    } else if (!globalUserState.loading) {
      // If not loading and not hydrated, start fetch
      void performGlobalFetch();
    }

    return () => {
      // Remove this component as a subscriber
      globalSubscribers.delete(subscriber);
    };
  }, []); // Empty deps - only run once on mount

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
    } satisfies User;
  }, [remoteUser, users]);

  const refresh = useCallback(async () => {
    setHydrated(false);
    await loadCurrentUser();
  }, [loadCurrentUser]);

  return {
    currentUser: resolvedUser,
    hydrated,
    refresh,
    isImpersonating: hasOriginalTokens(),
  };
};
