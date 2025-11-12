"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@/lib/npa-structure";
import { OrganizationContext } from "@/contexts/OrganizationContext";
import { apiFetch, hasOriginalTokens, hasTokens } from "@/lib/api-client";

const toOptionalString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  return String(value);
};

const mapApiUserToUser = (data: any): User => {
  const name = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();
  return {
    id: String(data.id ?? data.username),
    username: data.username ?? undefined,
    name: name.length > 0 ? name : data.username ?? "User",
    email: data.email ?? "",
    employeeId: data.employee_id ?? "",
    gradeLevel: data.grade_level ?? "",
    directorate: toOptionalString(data.directorate ?? data.directorate_id),
    division: toOptionalString(data.division ?? data.division_id),
    department: toOptionalString(data.department ?? data.department_id),
    systemRole: data.system_role ?? "",
    avatar: undefined,
    active: data.is_active ?? true,
    isSuperuser: data.is_superuser ?? false,
  };
};

export const useCurrentUser = () => {
  const organization = useContext(OrganizationContext);
  const users = organization?.users ?? [];
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const loadCurrentUser = useCallback(async () => {
    if (!hasTokens()) {
      setRemoteUser(null);
      setHydrated(true);
      return;
    }

    try {
      const response = await apiFetch("/accounts/auth/me/");
      setRemoteUser(mapApiUserToUser(response));
    } catch (error) {
      console.warn("Failed to hydrate current user from API", error);
      setRemoteUser(null);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

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

